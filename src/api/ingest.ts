import { Hono } from 'hono';
import { DbClient } from '../db/client';
import { SentryAuth } from '../sentry/auth';
import { SentryEnvelopeParser } from '../sentry/envelope';
import { SentryFingerprint } from '../sentry/fingerprint';
import { SentryNormalizer } from '../sentry/normalizer';
import { Env, SentryEventPayload } from '../types';

export const ingestApp = new Hono<{ Bindings: Env }>();

/**
 * Common ingestion processor for Envelopes and Store payloads
 */
async function processEnvelopePayload(
  rawBody: string | ArrayBuffer,
  projectIdParam: string | undefined,
  req: Request,
  env: Env
): Promise<{ success: boolean; eventId: string }> {
  const dbClient = new DbClient(env.DB);
  const url = new URL(req.url);
  const auth = SentryAuth.parseAuth(req.headers, url);

  // Find project by public_key or project_id
  let project = auth?.sentry_key ? await dbClient.getProjectByPublicKey(auth.sentry_key) : null;
  if (!project && projectIdParam) {
    project = await dbClient.getProjectById(projectIdParam);
  }

  // Fallback to first project if none matched (for instant easy onboarding)
  if (!project) {
    const projects = await dbClient.listProjects();
    project = projects[0] || null;
  }

  if (!project) {
    throw new Error('Project not found or no projects configured in D1 database');
  }

  // 1. Try parsing as Sentry Envelope
  let envelope;
  try {
    envelope = SentryEnvelopeParser.parse(rawBody);
  } catch {
    // If not envelope format, might be legacy single JSON store payload
    let jsonPayload: SentryEventPayload;
    if (typeof rawBody === 'string') {
      jsonPayload = JSON.parse(rawBody);
    } else {
      jsonPayload = JSON.parse(new TextDecoder().decode(rawBody));
    }

    envelope = {
      header: { event_id: jsonPayload.event_id },
      items: [
        {
          header: { type: jsonPayload.type === 'transaction' ? 'transaction' : 'event' },
          payload: jsonPayload
        }
      ]
    };
  }

  const primaryEventId = envelope.header.event_id || SentryNormalizer.generateHexId(32);

  // 2. Iterate and process each envelope item
  for (const item of envelope.items) {
    const itemType = item.header.type;
    const payload = (item.payload || {}) as SentryEventPayload;

    if (itemType === 'transaction' || payload.type === 'transaction') {
      // Process APM Transaction
      const normalizedTx = SentryNormalizer.normalizeTransaction(payload);
      await dbClient.storeTransaction(
        {
          id: normalizedTx.id || primaryEventId,
          project_id: project.id,
          trace_id: normalizedTx.traceId,
          span_id: normalizedTx.spanId,
          name: normalizedTx.name,
          op: normalizedTx.op,
          status: normalizedTx.status,
          environment: normalizedTx.environment,
          start_timestamp: normalizedTx.startTimestamp,
          timestamp: normalizedTx.timestamp,
          duration_ms: normalizedTx.durationMs,
          tags_json: normalizedTx.tagsJson,
          contexts_json: normalizedTx.contextsJson,
          created_at: Date.now()
        },
        normalizedTx.spans.map(s => ({
          id: s.id,
          trace_id: s.traceId,
          span_id: s.spanId,
          parent_span_id: s.parentSpanId,
          op: s.op,
          description: s.description,
          status: s.status,
          start_timestamp: s.startTimestamp,
          timestamp: s.timestamp,
          duration_ms: s.durationMs,
          data_json: s.dataJson
        }))
      );
    } else if (itemType === 'event' || (!itemType && (payload.exception || payload.message))) {
      // Process Crash / Error Event
      const normalizedEvent = SentryNormalizer.normalizeEvent(payload);
      const fpResult = await SentryFingerprint.compute(payload);

      await dbClient.storeCrashEvent({
        projectId: project.id,
        fingerprint: fpResult.fingerprint,
        title: fpResult.title,
        culprit: fpResult.culprit,
        type: fpResult.type,
        level: fpResult.level,
        event: {
          id: normalizedEvent.eventId || primaryEventId,
          issue_id: '', // Handled in client.storeCrashEvent
          project_id: project.id,
          timestamp: normalizedEvent.timestamp,
          platform: normalizedEvent.platform,
          environment: normalizedEvent.environment,
          release: normalizedEvent.release,
          server_name: normalizedEvent.serverName,
          message: normalizedEvent.message,
          user_json: normalizedEvent.userJson,
          tags_json: normalizedEvent.tagsJson,
          contexts_json: normalizedEvent.contextsJson,
          request_json: normalizedEvent.requestJson,
          created_at: Date.now()
        },
        exceptions: normalizedEvent.exceptions.map(e => ({
          type: e.type,
          value: e.value,
          module: e.module,
          stacktrace_json: e.stacktraceJson
        })),
        breadcrumbs: normalizedEvent.breadcrumbs.map(b => ({
          timestamp: b.timestamp,
          category: b.category,
          level: b.level,
          type: b.type,
          message: b.message,
          data_json: b.dataJson
        }))
      });
    }
  }

  return {
    success: true,
    eventId: primaryEventId
  };
}

/**
 * Sentry Envelope Ingestion: POST /api/:projectId/envelope/
 */
ingestApp.post('/:projectId/envelope', async c => {
  const projectId = c.req.param('projectId');
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, projectId, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

ingestApp.post('/:projectId/envelope/', async c => {
  const projectId = c.req.param('projectId');
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, projectId, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

/**
 * Root Envelope Ingestion: POST /api/envelope/
 */
ingestApp.post('/envelope', async c => {
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, undefined, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

ingestApp.post('/envelope/', async c => {
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, undefined, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

/**
 * Sentry Store Ingestion: POST /api/:projectId/store/
 */
ingestApp.post('/:projectId/store', async c => {
  const projectId = c.req.param('projectId');
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, projectId, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

ingestApp.post('/:projectId/store/', async c => {
  const projectId = c.req.param('projectId');
  const body = await c.req.text();
  const res = await processEnvelopePayload(body, projectId, c.req.raw, c.env);
  return c.json({ id: res.eventId }, 200);
});

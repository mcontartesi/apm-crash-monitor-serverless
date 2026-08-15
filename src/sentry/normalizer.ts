import {
  SentryBreadcrumb,
  SentryEventPayload,
  SentryExceptionValue,
  SentrySpan,
  SentryStackFrame
} from '../types';

export interface NormalizedEvent {
  eventId: string;
  timestamp: number;
  platform: string;
  environment: string;
  release?: string;
  serverName?: string;
  message?: string;
  userJson: string;
  tagsJson: string;
  contextsJson: string;
  requestJson: string;
  exceptions: Array<{
    type: string;
    value: string;
    module?: string;
    stacktraceJson: string;
  }>;
  breadcrumbs: Array<{
    timestamp: number;
    category?: string;
    level?: string;
    type?: string;
    message?: string;
    dataJson: string;
  }>;
}

export interface NormalizedTransaction {
  id: string;
  traceId: string;
  spanId: string;
  name: string;
  op: string;
  status?: string;
  environment: string;
  startTimestamp: number;
  timestamp: number;
  durationMs: number;
  tagsJson: string;
  contextsJson: string;
  spans: Array<{
    id: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    op: string;
    description?: string;
    status?: string;
    startTimestamp: number;
    timestamp: number;
    durationMs: number;
    dataJson: string;
  }>;
}

/**
 * FlarePulse APM - Sentry Event Normalizer
 * Standardizes payloads from PHP (sentry-php), JavaScript, and other official SDKs
 */
export class SentryNormalizer {
  /**
   * Normalizes an error/exception event payload
   */
  static normalizeEvent(payload: SentryEventPayload): NormalizedEvent {
    const eventId = payload.event_id || this.generateHexId(32);
    const timestamp = this.parseTimestamp(payload.timestamp);
    const platform = payload.platform || 'php';
    const environment = payload.environment || 'production';
    const release = payload.release || undefined;
    const serverName = payload.server_name || undefined;

    let message = '';
    if (typeof payload.message === 'string') {
      message = payload.message;
    } else if (payload.message && typeof payload.message === 'object') {
      message = payload.message.formatted || payload.message.message || '';
    }

    // 1. Process Exceptions and Stacktraces
    const exceptions: NormalizedEvent['exceptions'] = [];
    const rawExceptions = payload.exception?.values || [];

    for (const ex of rawExceptions) {
      const frames = this.normalizeFrames(ex.stacktrace?.frames || ex.raw_stacktrace?.frames || []);
      exceptions.push({
        type: ex.type || 'Error',
        value: ex.value || '',
        module: ex.module || undefined,
        stacktraceJson: JSON.stringify(frames)
      });
    }

    // If no explicit exception structure, create one from message if available
    if (exceptions.length === 0 && message) {
      exceptions.push({
        type: payload.type || 'Message',
        value: message,
        stacktraceJson: JSON.stringify([])
      });
    }

    // 2. Process Breadcrumbs
    const breadcrumbs: NormalizedEvent['breadcrumbs'] = [];
    let rawBreadcrumbs: SentryBreadcrumb[] = [];

    if (Array.isArray(payload.breadcrumbs)) {
      rawBreadcrumbs = payload.breadcrumbs;
    } else if (payload.breadcrumbs && Array.isArray((payload.breadcrumbs as { values: SentryBreadcrumb[] }).values)) {
      rawBreadcrumbs = (payload.breadcrumbs as { values: SentryBreadcrumb[] }).values;
    }

    for (const bc of rawBreadcrumbs) {
      breadcrumbs.push({
        timestamp: this.parseTimestamp(bc.timestamp),
        category: bc.category || undefined,
        level: bc.level || 'info',
        type: bc.type || undefined,
        message: bc.message || undefined,
        dataJson: JSON.stringify(bc.data || {})
      });
    }

    // 3. Process Contexts, User, Tags, Request
    const userJson = JSON.stringify(payload.user || {});
    const tagsJson = JSON.stringify(payload.tags || {});
    const contextsJson = JSON.stringify(payload.contexts || {});
    const requestJson = JSON.stringify(payload.request || {});

    return {
      eventId,
      timestamp,
      platform,
      environment,
      release,
      serverName,
      message: message || undefined,
      userJson,
      tagsJson,
      contextsJson,
      requestJson,
      exceptions,
      breadcrumbs
    };
  }

  /**
   * Normalizes an APM Transaction payload and its child Spans
   */
  static normalizeTransaction(payload: SentryEventPayload): NormalizedTransaction {
    const id = payload.event_id || this.generateHexId(32);
    const traceContext = payload.contexts?.trace || {};
    const traceId = traceContext.trace_id || this.generateHexId(32);
    const spanId = traceContext.span_id || this.generateHexId(16);
    const name = payload.transaction || payload.message?.toString() || 'Unnamed Transaction';
    const op = traceContext.op || payload.type || 'http.server';
    const status = traceContext.status || undefined;
    const environment = payload.environment || 'production';

    const startTimestamp = this.parseHighResTimestamp(payload.start_timestamp || payload.timestamp);
    const timestamp = this.parseHighResTimestamp(payload.timestamp || payload.start_timestamp);
    const durationMs = Math.max(0, (timestamp - startTimestamp) * 1000);

    const tagsJson = JSON.stringify(payload.tags || {});
    const contextsJson = JSON.stringify(payload.contexts || {});

    const rawSpans: SentrySpan[] = payload.spans || [];
    const spans: NormalizedTransaction['spans'] = [];

    for (const span of rawSpans) {
      const spanStart = this.parseHighResTimestamp(span.start_timestamp);
      const spanEnd = this.parseHighResTimestamp(span.timestamp);
      const spanDurationMs = Math.max(0, (spanEnd - spanStart) * 1000);

      spans.push({
        id: this.generateHexId(16),
        traceId: span.trace_id || traceId,
        spanId: span.span_id,
        parentSpanId: span.parent_span_id || spanId,
        op: span.op || 'default',
        description: span.description || undefined,
        status: span.status || undefined,
        startTimestamp: spanStart,
        timestamp: spanEnd,
        durationMs: Number(spanDurationMs.toFixed(3)),
        dataJson: JSON.stringify(span.data || {})
      });
    }

    return {
      id,
      traceId,
      spanId,
      name,
      op,
      status,
      environment,
      startTimestamp,
      timestamp,
      durationMs: Number(durationMs.toFixed(3)),
      tagsJson,
      contextsJson,
      spans
    };
  }

  /**
   * Sanitizes and cleans stack trace frames
   */
  private static normalizeFrames(frames: SentryStackFrame[]): SentryStackFrame[] {
    return frames.map(frame => ({
      filename: frame.filename || frame.abs_path || 'unknown',
      abs_path: frame.abs_path || frame.filename,
      function: frame.function || '<anonymous>',
      module: frame.module || undefined,
      lineno: typeof frame.lineno === 'number' ? frame.lineno : undefined,
      colno: typeof frame.colno === 'number' ? frame.colno : undefined,
      in_app: frame.in_app !== undefined ? frame.in_app : true,
      context_line: frame.context_line || undefined,
      pre_context: Array.isArray(frame.pre_context) ? frame.pre_context : undefined,
      post_context: Array.isArray(frame.post_context) ? frame.post_context : undefined,
      vars: frame.vars && typeof frame.vars === 'object' ? frame.vars : undefined
    }));
  }

  /**
   * Parses various timestamp formats (seconds as float, ms as int, ISO string) into integer epoch ms
   */
  static parseTimestamp(val?: number | string): number {
    if (!val) return Date.now();
    if (typeof val === 'number') {
      // If seconds float or int (< 10000000000), convert to ms
      return val < 10000000000 ? Math.round(val * 1000) : Math.round(val);
    }
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }

  /**
   * Parses timestamp into floating-point seconds for high-precision APM metrics
   */
  static parseHighResTimestamp(val?: number | string): number {
    if (!val) return Date.now() / 1000;
    if (typeof val === 'number') {
      return val > 10000000000 ? val / 1000 : val;
    }
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? Date.now() / 1000 : parsed / 1000;
  }

  /**
   * Generates random hex ID (for events or spans)
   */
  static generateHexId(length = 32): string {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').substring(0, length);
  }
}

import { Hono } from 'hono';
import { DbClient } from '../db/client';
import { Env } from '../types';

export const issuesApp = new Hono<{ Bindings: Env }>();

/**
 * GET /api/issues
 */
issuesApp.get('/', async c => {
  const dbClient = new DbClient(c.env.DB);
  const projectId = c.req.query('projectId');
  const status = c.req.query('status');
  const level = c.req.query('level');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await dbClient.listIssues({
    projectId,
    status,
    level,
    search,
    limit,
    offset
  });

  return c.json(result);
});

/**
 * GET /api/issues/:id
 */
issuesApp.get('/:id', async c => {
  const id = c.req.param('id');
  const dbClient = new DbClient(c.env.DB);
  const detail = await dbClient.getIssueDetail(id);

  if (!detail) {
    return c.json({ error: 'Issue not found' }, 404);
  }

  // Parse JSON payloads for convenience
  const parsedDetail = {
    ...detail,
    latestEvent: detail.latestEvent
      ? {
          ...detail.latestEvent,
          user: detail.latestEvent.user_json ? JSON.parse(detail.latestEvent.user_json) : null,
          tags: detail.latestEvent.tags_json ? JSON.parse(detail.latestEvent.tags_json) : null,
          contexts: detail.latestEvent.contexts_json ? JSON.parse(detail.latestEvent.contexts_json) : null,
          request: detail.latestEvent.request_json ? JSON.parse(detail.latestEvent.request_json) : null
        }
      : null,
    exceptions: detail.exceptions.map(e => ({
      ...e,
      stacktrace: e.stacktrace_json ? JSON.parse(e.stacktrace_json) : []
    })),
    breadcrumbs: detail.breadcrumbs.map(b => ({
      ...b,
      data: b.data_json ? JSON.parse(b.data_json) : {}
    }))
  };

  return c.json(parsedDetail);
});

/**
 * PATCH /api/issues/:id
 */
issuesApp.patch('/:id', async c => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status?: 'unresolved' | 'resolved' | 'ignored' }>();

  if (!body.status || !['unresolved', 'resolved', 'ignored'].includes(body.status)) {
    return c.json({ error: 'Invalid status. Must be unresolved, resolved, or ignored' }, 400);
  }

  const dbClient = new DbClient(c.env.DB);
  const success = await dbClient.updateIssueStatus(id, body.status);
  return c.json({ success, status: body.status });
});

/**
 * DELETE /api/issues/:id
 */
issuesApp.delete('/:id', async c => {
  const id = c.req.param('id');
  const dbClient = new DbClient(c.env.DB);
  const success = await dbClient.deleteIssue(id);
  return c.json({ success });
});

import { Hono } from 'hono';
import { DbClient } from '../db/client';
import { Env } from '../types';

export const performanceApp = new Hono<{ Bindings: Env }>();

/**
 * GET /api/performance/transactions
 */
performanceApp.get('/transactions', async c => {
  const dbClient = new DbClient(c.env.DB);
  const projectId = c.req.query('projectId');
  const op = c.req.query('op');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await dbClient.listTransactions({
    projectId,
    op,
    search,
    limit,
    offset
  });

  return c.json(result);
});

/**
 * GET /api/performance/transactions/:id
 */
performanceApp.get('/transactions/:id', async c => {
  const id = c.req.param('id');
  const dbClient = new DbClient(c.env.DB);
  const detail = await dbClient.getTransactionDetail(id);

  if (!detail) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  // Parse JSON and compute relative timeline offset for waterfall
  const txStart = detail.transaction.start_timestamp;
  const spansWithRelativeTiming = detail.spans.map(span => ({
    ...span,
    relative_start_ms: Number(Math.max(0, (span.start_timestamp - txStart) * 1000).toFixed(2)),
    data: span.data_json ? JSON.parse(span.data_json) : {}
  }));

  return c.json({
    transaction: {
      ...detail.transaction,
      tags: detail.transaction.tags_json ? JSON.parse(detail.transaction.tags_json) : {},
      contexts: detail.transaction.contexts_json ? JSON.parse(detail.transaction.contexts_json) : {}
    },
    spans: spansWithRelativeTiming
  });
});

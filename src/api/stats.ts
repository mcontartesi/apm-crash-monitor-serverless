import { Hono } from 'hono';
import { DbClient } from '../db/client';
import { Env } from '../types';

export const statsApp = new Hono<{ Bindings: Env }>();

/**
 * GET /api/stats
 */
statsApp.get('/', async c => {
  const projectId = c.req.query('projectId');
  const dbClient = new DbClient(c.env.DB);
  const stats = await dbClient.getDashboardStats(projectId);
  return c.json(stats);
});

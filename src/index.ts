import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authApp } from './api/auth';
import { ingestApp } from './api/ingest';
import { issuesApp } from './api/issues';
import { performanceApp } from './api/performance';
import { projectsApp } from './api/projects';
import { statsApp } from './api/stats';
import { Config } from './config';
import { renderDashboardHtml } from './ui/html';
import { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware: CORS for Sentry SDK and Browser clients
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Sentry-Auth',
      'X-Sentry-Rate-Limits',
      'sentry-trace',
      'baggage'
    ],
    exposeHeaders: ['X-Sentry-Error', 'X-Sentry-Rate-Limits', 'Retry-After'],
    maxAge: 86400
  })
);

// Middleware: Request Logger
app.use('*', logger());

// Root & Dashboard UI Route
app.get('/', c => {
  const appName = Config.getAppName(c.env);
  return c.html(renderDashboardHtml(appName));
});

app.get('/dashboard', c => {
  const appName = Config.getAppName(c.env);
  return c.html(renderDashboardHtml(appName));
});

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    name: Config.getAppName(c.env),
    env: Config.getAppEnv(c.env),
    serverless: 'Cloudflare Workers + D1',
    timestamp: new Date().toISOString()
  });
});

// Mount Sub-Apps
// Sentry Ingestion endpoints (envelope, store)
app.route('/api', ingestApp);

// Authentication endpoints
app.route('/api/auth', authApp);

// Project Management & DSNs
app.route('/api/projects', projectsApp);

// Crash & Issues Management
app.route('/api/issues', issuesApp);

// APM Performance & Tracing
app.route('/api/performance', performanceApp);

// Dashboard KPI Analytics
app.route('/api/stats', statsApp);

// Global 404 Handler
app.notFound(c => {
  return c.json({ error: 'Endpoint not found', path: c.req.path }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message
    },
    500
  );
});

export default app;

import { describe, expect, it } from 'vitest';
import app from '../src/index';
import { Env } from '../src/types';

// Mock D1 Database
function createMockDb(): D1Database {
  const mockStmt = {
    bind: (..._values: unknown[]) => mockStmt,
    first: async () => null,
    all: async () => ({ results: [], success: true, meta: {} as any }),
    run: async () => ({ results: [], success: true, meta: {} as any }),
    raw: async () => []
  };

  return {
    prepare: (_query: string) => mockStmt as unknown as D1PreparedStatement,
    batch: async (_statements: D1PreparedStatement[]) => [],
    exec: async (_query: string) => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0)
  } as unknown as D1Database;
}

describe('FlarePulse APM Endpoints', () => {
  const env: Env = {
    DB: createMockDb(),
    ADMIN_USER: 'admin',
    ADMIN_PASSWORD: 'admin_password',
    JWT_SECRET: 'test-secret-at-least-32-chars-long-2025'
  };

  it('should return health status at /health', async () => {
    const res = await app.request('/health', {}, env);
    expect(res.status).toBe(200);
    const data = await res.json<{ status: string; serverless: string }>();
    expect(data.status).toBe('healthy');
    expect(data.serverless).toContain('Cloudflare');
  });

  it('should serve the dashboard HTML at /', async () => {
    const res = await app.request('/', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('apm-crash-monitor-serverless');
    expect(html).toContain('Sentry PHP');
  });
});

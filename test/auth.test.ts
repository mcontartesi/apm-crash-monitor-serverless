import { describe, expect, it } from 'vitest';
import { SentryAuth } from '../src/sentry/auth';
import { createSessionToken, verifySessionToken } from '../src/api/auth';
import { Env } from '../src/types';

describe('SentryAuth & Session Security', () => {
  it('should parse X-Sentry-Auth header correctly', () => {
    const headers = new Headers({
      'X-Sentry-Auth': 'Sentry sentry_version=7, sentry_client=sentry.php/4.1.0, sentry_key=4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b, sentry_secret=secret123'
    });
    const url = new URL('https://monitor.worker.dev/api/1/envelope/');

    const auth = SentryAuth.parseAuth(headers, url);
    expect(auth).not.toBeNull();
    expect(auth?.sentry_key).toBe('4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b');
    expect(auth?.sentry_client).toBe('sentry.php/4.1.0');
  });

  it('should parse sentry_key from query parameter fallback', () => {
    const headers = new Headers();
    const url = new URL('https://monitor.worker.dev/api/envelope/?sentry_key=custom_key_999');

    const auth = SentryAuth.parseAuth(headers, url);
    expect(auth).not.toBeNull();
    expect(auth?.sentry_key).toBe('custom_key_999');
  });

  it('should generate valid Sentry DSN', () => {
    const dsn = SentryAuth.generateDsn('pubkey123', 'worker.domain.com', 'proj_01', 'https');
    expect(dsn).toBe('https://pubkey123@worker.domain.com/proj_01');
  });

  it('should sign and verify JWT admin session tokens', async () => {
    const mockEnv: Env = {
      DB: {} as D1Database,
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: 'secure_password_test',
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars-long'
    };

    const token = await createSessionToken('admin', mockEnv);
    expect(token).toBeDefined();

    const payload = await verifySessionToken(token, mockEnv);
    expect(payload).not.toBeNull();
    expect(payload?.username).toBe('admin');
    expect(payload?.role).toBe('admin');
  });
});

import { describe, expect, it } from 'vitest';
import { SentryFingerprint } from '../src/sentry/fingerprint';
import { SentryEventPayload } from '../src/types';

describe('SentryFingerprint', () => {
  it('should generate deterministic fingerprint for PHP exception with stack trace', async () => {
    const event: SentryEventPayload = {
      level: 'error',
      platform: 'php',
      exception: {
        values: [
          {
            type: 'PDOException',
            value: 'SQLSTATE[HY000] [2002] Connection refused',
            stacktrace: {
              frames: [
                {
                  filename: 'app/Database.php',
                  function: 'connect',
                  lineno: 42,
                  in_app: true
                }
              ]
            }
          }
        ]
      }
    };

    const res1 = await SentryFingerprint.compute(event);
    const res2 = await SentryFingerprint.compute(event);

    expect(res1.fingerprint).toBe(res2.fingerprint);
    expect(res1.type).toBe('PDOException');
    expect(res1.title).toBe('PDOException: SQLSTATE[HY000] [2002] Connection refused');
    expect(res1.culprit).toBe('connect in app/Database.php:42');
  });

  it('should use custom fingerprint when provided in payload', async () => {
    const event: SentryEventPayload = {
      message: 'Payment Timeout',
      fingerprint: ['payment', 'timeout', 'gateway-stripe']
    };

    const res = await SentryFingerprint.compute(event);
    expect(res.fingerprint).toBeDefined();
    expect(res.fingerprint).toHaveLength(32);
    expect(res.title).toBe('Payment Timeout');
  });
});

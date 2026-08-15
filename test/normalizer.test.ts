import { describe, expect, it } from 'vitest';
import { SentryNormalizer } from '../src/sentry/normalizer';
import { SentryEventPayload } from '../src/types';

describe('SentryNormalizer', () => {
  it('should normalize a PHP crash event with stack trace and breadcrumbs', () => {
    const payload: SentryEventPayload = {
      event_id: '4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b',
      timestamp: 1700000000.5,
      platform: 'php',
      environment: 'production',
      server_name: 'php-srv-01',
      exception: {
        values: [
          {
            type: 'DivisionByZeroError',
            value: 'Division by zero',
            stacktrace: {
              frames: [
                {
                  filename: 'src/Calculator.php',
                  function: 'divide',
                  lineno: 15,
                  context_line: '    return $a / $b;',
                  pre_context: ['function divide($a, $b) {'],
                  post_context: ['}']
                }
              ]
            }
          }
        ]
      },
      breadcrumbs: [
        {
          timestamp: 1700000000,
          category: 'math',
          message: 'Executing division'
        }
      ],
      tags: {
        php_version: '8.3.2'
      }
    };

    const normalized = SentryNormalizer.normalizeEvent(payload);

    expect(normalized.eventId).toBe('4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b');
    expect(normalized.platform).toBe('php');
    expect(normalized.timestamp).toBe(1700000000500);
    expect(normalized.exceptions).toHaveLength(1);
    expect(normalized.exceptions[0].type).toBe('DivisionByZeroError');
    expect(normalized.breadcrumbs).toHaveLength(1);
    expect(JSON.parse(normalized.tagsJson).php_version).toBe('8.3.2');
  });

  it('should normalize an APM transaction and compute span durations', () => {
    const payload: SentryEventPayload = {
      event_id: 'tx_1234567890abcdef',
      type: 'transaction',
      transaction: 'GET /api/users',
      start_timestamp: 1000.0,
      timestamp: 1000.25, // 250ms duration
      contexts: {
        trace: {
          trace_id: 'trace_abcdef123456',
          span_id: 'span_root123',
          op: 'http.server'
        }
      },
      spans: [
        {
          trace_id: 'trace_abcdef123456',
          span_id: 'span_child1',
          parent_span_id: 'span_root123',
          op: 'db.sql.query',
          description: 'SELECT * FROM users',
          start_timestamp: 1000.05,
          timestamp: 1000.15 // 100ms duration
        }
      ]
    };

    const normalized = SentryNormalizer.normalizeTransaction(payload);

    expect(normalized.id).toBe('tx_1234567890abcdef');
    expect(normalized.name).toBe('GET /api/users');
    expect(normalized.durationMs).toBe(250);
    expect(normalized.spans).toHaveLength(1);
    expect(normalized.spans[0].durationMs).toBe(100);
    expect(normalized.spans[0].op).toBe('db.sql.query');
  });
});

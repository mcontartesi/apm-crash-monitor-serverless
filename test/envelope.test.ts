import { describe, expect, it } from 'vitest';
import { SentryEnvelopeParser } from '../src/sentry/envelope';
import { SentryEnvelope } from '../src/types';

describe('SentryEnvelopeParser', () => {
  it('should parse a standard Sentry envelope with event payload', () => {
    const rawEnvelope = [
      JSON.stringify({ event_id: '4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b', sent_at: '2025-02-14T10:00:00Z' }),
      JSON.stringify({ type: 'event', content_type: 'application/json' }),
      JSON.stringify({
        event_id: '4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b',
        level: 'error',
        platform: 'php',
        message: 'Test Exception in PHP'
      })
    ].join('\n');

    const parsed = SentryEnvelopeParser.parse(rawEnvelope);

    expect(parsed.header.event_id).toBe('4a8c9b2e1f0d3a7e5b6c8a9d0e1f2a3b');
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].header.type).toBe('event');
    expect((parsed.items[0].payload as { message: string }).message).toBe('Test Exception in PHP');
  });

  it('should parse a multi-item envelope with event and session', () => {
    const rawEnvelope = [
      JSON.stringify({ event_id: '11112222333344445555666677778888' }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify({ message: 'Crash 1' }),
      JSON.stringify({ type: 'session' }),
      JSON.stringify({ started: '2025-02-14T10:00:00Z', status: 'ok' })
    ].join('\n');

    const parsed = SentryEnvelopeParser.parse(rawEnvelope);

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].header.type).toBe('event');
    expect(parsed.items[1].header.type).toBe('session');
  });

  it('should serialize an envelope back to newline delimited string', () => {
    const envelope: SentryEnvelope = {
      header: { event_id: 'abc123' },
      items: [
        {
          header: { type: 'event' },
          payload: { message: 'hello' }
        }
      ]
    };

    const serialized = SentryEnvelopeParser.stringify(envelope);
    expect(serialized).toContain('{"event_id":"abc123"}');
    expect(serialized).toContain('{"type":"event"}');
    expect(serialized).toContain('{"message":"hello"}');
  });
});

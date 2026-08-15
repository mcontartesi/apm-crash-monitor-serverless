import { SentryEnvelope, SentryEnvelopeHeader, SentryEnvelopeItem, SentryEnvelopeItemHeader } from '../types';

/**
 * FlarePulse APM - Sentry Envelope Parser
 * Implements Sentry's multi-part newline-delimited envelope specification
 * Used by Sentry-PHP ^4.x, Sentry-JS, Sentry-Python, etc.
 */
export class SentryEnvelopeParser {
  /**
   * Parses a raw envelope string or ArrayBuffer into a structured SentryEnvelope object
   */
  static parse(raw: string | ArrayBuffer | Uint8Array): SentryEnvelope {
    let content: string;
    if (typeof raw === 'string') {
      content = raw;
    } else {
      const decoder = new TextDecoder('utf-8');
      content = decoder.decode(raw);
    }

    // Split lines while preserving data
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('Invalid Sentry envelope: Insufficient lines');
    }

    // Line 0: Envelope Header
    let header: SentryEnvelopeHeader = {};
    try {
      header = JSON.parse(lines[0]);
    } catch {
      throw new Error('Invalid Sentry envelope header JSON');
    }

    const items: SentryEnvelopeItem[] = [];
    let idx = 1;

    while (idx < lines.length) {
      const itemHeaderLine = lines[idx]?.trim();
      if (!itemHeaderLine) {
        idx++;
        continue;
      }

      let itemHeader: SentryEnvelopeItemHeader;
      try {
        itemHeader = JSON.parse(itemHeaderLine);
      } catch {
        idx++;
        continue;
      }

      idx++;
      if (idx >= lines.length) break;

      const payloadLine = lines[idx];
      let payload: unknown = payloadLine;

      // If content is JSON-based, parse it
      if (
        itemHeader.type === 'event' ||
        itemHeader.type === 'transaction' ||
        itemHeader.type === 'session' ||
        itemHeader.type === 'sessions' ||
        itemHeader.type === 'client_report' ||
        itemHeader.type === 'user_report' ||
        !itemHeader.content_type ||
        itemHeader.content_type.includes('json')
      ) {
        try {
          payload = JSON.parse(payloadLine);
        } catch {
          payload = payloadLine;
        }
      }

      items.push({
        header: itemHeader,
        payload
      });

      idx++;
    }

    return {
      header,
      items
    };
  }

  /**
   * Serializes an envelope back to newline-delimited format (useful for tests or proxies)
   */
  static stringify(envelope: SentryEnvelope): string {
    const parts: string[] = [JSON.stringify(envelope.header)];

    for (const item of envelope.items) {
      parts.push(JSON.stringify(item.header));
      if (typeof item.payload === 'string') {
        parts.push(item.payload);
      } else {
        parts.push(JSON.stringify(item.payload));
      }
    }

    return parts.join('\n') + '\n';
  }
}

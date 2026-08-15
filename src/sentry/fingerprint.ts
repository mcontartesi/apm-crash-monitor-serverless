import { SentryEventPayload } from '../types';

export interface FingerprintResult {
  fingerprint: string;
  title: string;
  culprit?: string;
  type: string;
  level: string;
}

/**
 * FlarePulse APM - Smart Issue Fingerprinting & Grouping
 * Groups related crashes together into actionable issue threads
 */
export class SentryFingerprint {
  /**
   * Generates a deterministic fingerprint hash, human-readable title, and culprit
   */
  static async compute(event: SentryEventPayload): Promise<FingerprintResult> {
    const level = event.level || 'error';

    // 1. If explicit custom fingerprint provided by user or SDK
    if (Array.isArray(event.fingerprint) && event.fingerprint.length > 0) {
      const rawKey = event.fingerprint.join('|');
      const hash = await this.sha256(rawKey);
      const title = this.extractTitle(event);
      return {
        fingerprint: hash,
        title,
        culprit: event.culprit || event.transaction,
        type: this.extractType(event),
        level
      };
    }

    // 2. If Exception is present
    const exceptions = event.exception?.values;
    if (Array.isArray(exceptions) && exceptions.length > 0) {
      // Sentry exception chains: last or first item
      const ex = exceptions[exceptions.length - 1] || exceptions[0];
      const exType = ex.type || 'Error';
      const exValue = ex.value || '';

      // Find top relevant stack frame
      const frames = ex.stacktrace?.frames || ex.raw_stacktrace?.frames;
      let topFrameSignature = '';
      let culprit = event.culprit || '';

      if (Array.isArray(frames) && frames.length > 0) {
        // Find top in_app frame or fallback to the last frame in the stack
        const inAppFrames = frames.filter(f => f.in_app !== false);
        const topFrame = inAppFrames[inAppFrames.length - 1] || frames[frames.length - 1];

        if (topFrame) {
          const fn = topFrame.function || topFrame.module || 'anonymous';
          const file = topFrame.filename || topFrame.abs_path || 'unknown';
          const line = topFrame.lineno ?? 0;
          topFrameSignature = `${file}:${line}:${fn}`;
          culprit = `${fn} in ${file}:${line}`;
        }
      }

      const rawKey = `exception|${exType}|${topFrameSignature || exValue || culprit}`;
      const hash = await this.sha256(rawKey);
      const title = exValue ? `${exType}: ${exValue}` : exType;

      return {
        fingerprint: hash,
        title,
        culprit: culprit || event.transaction || undefined,
        type: exType,
        level
      };
    }

    // 3. Fallback to Message / Default Event
    let message = '';
    if (typeof event.message === 'string') {
      message = event.message;
    } else if (event.message && typeof event.message === 'object') {
      message = event.message.formatted || event.message.message || '';
    }

    const type = event.type || (level === 'fatal' || level === 'error' ? 'Error' : 'Log');
    const culprit = event.culprit || event.transaction || '';
    const rawKey = `message|${type}|${message}|${culprit}`;
    const hash = await this.sha256(rawKey);

    return {
      fingerprint: hash,
      title: message || `${type} Event`,
      culprit: culprit || undefined,
      type,
      level
    };
  }

  private static extractTitle(event: SentryEventPayload): string {
    const ex = event.exception?.values?.[0];
    if (ex) {
      return ex.value ? `${ex.type}: ${ex.value}` : ex.type;
    }
    if (typeof event.message === 'string') return event.message;
    if (event.message?.formatted) return event.message.formatted;
    if (event.message?.message) return event.message.message;
    return 'Unhandled Event';
  }

  private static extractType(event: SentryEventPayload): string {
    const ex = event.exception?.values?.[0];
    if (ex?.type) return ex.type;
    return event.type || 'Error';
  }

  /**
   * Generates a 32-character SHA-256 hex string using Web Crypto API
   */
  private static async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
}

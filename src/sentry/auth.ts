import { SentryAuthHeaders } from '../types';

/**
 * FlarePulse APM - Sentry Auth Header & DSN Parser
 * Handles authenticating SDK requests (Sentry-PHP, Sentry-JS, etc.)
 */
export class SentryAuth {
  /**
   * Parses Sentry authentication information from request headers and URL parameters
   */
  static parseAuth(headers: Headers, url: URL): SentryAuthHeaders | null {
    // 1. Try X-Sentry-Auth header
    const xSentryAuth = headers.get('x-sentry-auth') || headers.get('X-Sentry-Auth');
    if (xSentryAuth) {
      const parsed = this.parseSentryAuthString(xSentryAuth);
      if (parsed?.sentry_key) {
        return parsed;
      }
    }

    // 2. Try Authorization header (Bearer or DSN)
    const authorization = headers.get('authorization') || headers.get('Authorization');
    if (authorization) {
      if (authorization.startsWith('Sentry ')) {
        const parsed = this.parseSentryAuthString(authorization.substring(7));
        if (parsed?.sentry_key) {
          return parsed;
        }
      } else if (authorization.startsWith('Bearer ')) {
        return {
          sentry_key: authorization.substring(7).trim()
        };
      }
    }

    // 3. Try URL query parameters (sentry_key=...)
    const sentryKey = url.searchParams.get('sentry_key') || url.searchParams.get('key');
    if (sentryKey) {
      return {
        sentry_key: sentryKey,
        sentry_version: url.searchParams.get('sentry_version') || '7',
        sentry_client: url.searchParams.get('sentry_client') || undefined,
        sentry_secret: url.searchParams.get('sentry_secret') || undefined
      };
    }

    return null;
  }

  /**
   * Helper to parse "Sentry sentry_version=7, sentry_client=..., sentry_key=..."
   */
  private static parseSentryAuthString(authStr: string): SentryAuthHeaders | null {
    const cleanStr = authStr.replace(/^Sentry\s+/i, '').trim();
    const parts = cleanStr.split(/,\s*/);
    const result: Record<string, string> = {};

    for (const part of parts) {
      const equalIdx = part.indexOf('=');
      if (equalIdx > 0) {
        const key = part.substring(0, equalIdx).trim();
        let val = part.substring(equalIdx + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        result[key] = val;
      }
    }

    if (!result.sentry_key && result.key) {
      result.sentry_key = result.key;
    }

    if (result.sentry_key) {
      return {
        sentry_key: result.sentry_key,
        sentry_version: result.sentry_version,
        sentry_client: result.sentry_client,
        sentry_secret: result.sentry_secret
      };
    }

    return null;
  }

  /**
   * Generates a standard Sentry DSN for a given public key and host
   * Format: https://<public_key>@<host>/<projectId>
   */
  static generateDsn(publicKey: string, host: string, projectId: string, protocol = 'https'): string {
    return `${protocol}://${publicKey}@${host}/${projectId}`;
  }
}

import { Env } from './types';

/**
 * FlarePulse APM - Configuration Manager
 */
export class Config {
  static getAdminUser(env: Env): string {
    return env.ADMIN_USER || 'admin';
  }

  static getAdminPassword(env: Env): string {
    return env.ADMIN_PASSWORD || 'admin123456';
  }

  static getJwtSecret(env: Env): Uint8Array {
    const secret = env.JWT_SECRET || 'flarepulse-default-jwt-secret-minimum-32-chars-key-2025';
    return new TextEncoder().encode(secret);
  }

  static getAppName(env: Env): string {
    return env.APP_NAME || 'FlarePulse APM';
  }

  static getAppEnv(env: Env): string {
    return env.APP_ENV || 'production';
  }
}

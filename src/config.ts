import { Env } from './types';

/**
 * apm-crash-monitor-serverless - Configuration Manager
 */
export class Config {
  static getAdminUser(env: Env): string {
    return env.ADMIN_USER || 'admin';
  }

  static getAdminPassword(env: Env): string {
    return env.ADMIN_PASSWORD || 'admin123456';
  }

  static getJwtSecret(env: Env): Uint8Array {
    const secret = env.JWT_SECRET || 'apm-crash-monitor-serverless-jwt-secret-minimum-32-chars-key';
    return new TextEncoder().encode(secret);
  }

  static getAppName(env: Env): string {
    return env.APP_NAME || 'apm-crash-monitor-serverless';
  }

  static getAppEnv(env: Env): string {
    return env.APP_ENV || 'production';
  }
}

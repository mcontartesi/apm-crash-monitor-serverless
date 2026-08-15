import { Hono, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { Config } from '../config';
import { AuthSessionPayload, Env } from '../types';

export const authApp = new Hono<{ Bindings: Env }>();

const COOKIE_NAME = 'flarepulse_session';

/**
 * Creates a signed JWT session cookie
 */
export async function createSessionToken(username: string, env: Env): Promise<string> {
  const secret = Config.getJwtSecret(env);
  return await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verifies a JWT session token
 */
export async function verifySessionToken(token: string, env: Env): Promise<AuthSessionPayload | null> {
  try {
    const secret = Config.getJwtSecret(env);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware: Requires Admin Authentication for API endpoints
 */
export const requireAuth: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // Check Authorization Bearer header or Cookie
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = getCookie(c, COOKIE_NAME);
  }

  if (!token) {
    return c.json({ error: 'Unauthorized: Authentication required' }, 401);
  }

  const payload = await verifySessionToken(token, c.env);
  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid or expired session' }, 401);
  }

  c.set('user' as never, payload as never);
  await next();
};

/**
 * POST /api/auth/login
 */
authApp.post('/login', async c => {
  const body = await c.req.json<{ username?: string; password?: string }>();
  const expectedUser = Config.getAdminUser(c.env);
  const expectedPassword = Config.getAdminPassword(c.env);

  if (!body.username || !body.password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  if (body.username !== expectedUser || body.password !== expectedPassword) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const token = await createSessionToken(body.username, c.env);

  // Set secure cookie
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 3600,
    path: '/'
  });

  return c.json({
    success: true,
    token,
    user: {
      username: body.username,
      role: 'admin'
    }
  });
});

/**
 * GET /api/auth/me
 */
authApp.get('/me', async c => {
  const token = getCookie(c, COOKIE_NAME) || c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ authenticated: false }, 401);
  }

  const payload = await verifySessionToken(token, c.env);
  if (!payload) {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({
    authenticated: true,
    user: {
      username: payload.username,
      role: payload.role
    }
  });
});

/**
 * POST /api/auth/logout
 */
authApp.post('/logout', async c => {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

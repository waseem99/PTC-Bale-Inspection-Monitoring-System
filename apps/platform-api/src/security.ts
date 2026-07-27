import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from './config';
import { AppError } from './errors';
import { SessionModel, UserModel, type Role } from './models';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export interface AuthContext {
  user: { id: string; username: string; displayName: string; role: Role };
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltEncoded, hashEncoded] = stored.split('$');
  if (algorithm !== 'scrypt' || !saltEncoded || !hashEncoded) return false;
  const expected = Buffer.from(hashEncoded, 'base64url');
  const actual = await scrypt(password, Buffer.from(saltEncoded, 'base64url'), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function getPresentedToken(request: Request, config: AppConfig): string | undefined {
  const cookie = parseCookie(request.headers.cookie, config.sessionCookieName);
  if (cookie) return cookie;
  const authorization = request.header('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  return undefined;
}

export async function createSession(userId: string, config: AppConfig): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);
  await SessionModel.create({ tokenHash: hashToken(token), userId, expiresAt, lastSeenAt: new Date() });
  return { token, expiresAt };
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date, config: AppConfig): void {
  response.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: Response, config: AppConfig): void {
  response.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/',
  });
}

export function authenticate(config: AppConfig) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const token = getPresentedToken(request, config);
      if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      const session = await SessionModel.findOne({
        tokenHash: hashToken(token),
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      }).lean();
      if (!session) throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.');
      const user = await UserModel.findOne({ _id: session.userId, enabled: true }).lean();
      if (!user) throw new AppError(401, 'USER_DISABLED', 'This account is unavailable.');
      response.locals.auth = {
        user: {
          id: String(user._id),
          username: user.username,
          displayName: user.displayName,
          role: user.role as Role,
        },
        sessionId: String(session._id),
      } satisfies AuthContext;
      await SessionModel.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRoles(...roles: Role[]) {
  return (_request: Request, response: Response, next: NextFunction): void => {
    const auth = response.locals.auth as AuthContext | undefined;
    if (!auth) return next(new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
    if (!roles.includes(auth.user.role)) return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    next();
  };
}

export function authContext(response: Response): AuthContext {
  const auth = response.locals.auth as AuthContext | undefined;
  if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return auth;
}

export async function revokePresentedSession(request: Request, config: AppConfig): Promise<void> {
  const token = getPresentedToken(request, config);
  if (token) await SessionModel.updateOne({ tokenHash: hashToken(token) }, { $set: { revokedAt: new Date() } });
}

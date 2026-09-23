import type { EventHandlerRequest, H3Event } from 'h3';

import type { AuthUser } from './auth-users';

import { getHeader } from 'h3';
import jwt from 'jsonwebtoken';

function requiredSecret(name: string, developmentFallback: string) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production')
    throw new Error(`${name} must be configured in production`);
  return developmentFallback;
}

const ACCESS_TOKEN_SECRET = requiredSecret(
  'ACCESS_TOKEN_SECRET',
  'development_access_token_secret',
);
const REFRESH_TOKEN_SECRET = requiredSecret(
  'REFRESH_TOKEN_SECRET',
  'development_refresh_token_secret',
);

export interface UserPayload extends AuthUser {
  iat: number;
  exp: number;
}

export function generateAccessToken(user: AuthUser) {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}

export function generateRefreshToken(user: AuthUser) {
  return jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(
  event: H3Event<EventHandlerRequest>,
): AuthUser | null {
  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2) return null;
  try {
    const decoded = jwt.verify(
      tokenParts[1] as string,
      ACCESS_TOKEN_SECRET,
    ) as unknown as UserPayload;
    return {
      id: decoded.id,
      realName: decoded.realName,
      roles: decoded.roles ?? [],
      username: decoded.username,
      homePath: decoded.homePath,
      mustChangePassword: decoded.mustChangePassword,
    };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as UserPayload;
    return {
      id: decoded.id,
      realName: decoded.realName,
      roles: decoded.roles ?? [],
      username: decoded.username,
      homePath: decoded.homePath,
      mustChangePassword: decoded.mustChangePassword,
    };
  } catch {
    return null;
  }
}

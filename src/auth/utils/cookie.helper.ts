import { randomBytes } from 'crypto';
import type { Response } from 'express';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const CSRF_TOKEN_COOKIE = 'csrf_token';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function parseExpirationToMs(expiration: string | number | undefined): number {
  if (!expiration) return 3600 * 1000; // default 1 hour

  if (typeof expiration === 'number') return expiration * 1000;

  const str = expiration.trim();
  const num = parseFloat(str);

  if (str.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  if (str.endsWith('h')) return num * 60 * 60 * 1000;
  if (str.endsWith('m')) return num * 60 * 1000;
  if (str.endsWith('s')) return num * 1000;

  return num * 1000;
}

type CookieOptions = {
  cookieSecure: boolean;
  jwtExpiresIn?: string | number;
  refreshExpiresIn?: string | number;
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
  options: CookieOptions,
): void {
  const { cookieSecure, jwtExpiresIn, refreshExpiresIn } = options;

  const baseOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'strict' as const,
  };

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    path: '/',
    maxAge: parseExpirationToMs(jwtExpiresIn),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    path: '/auth',
    maxAge: parseExpirationToMs(refreshExpiresIn),
  });

  // csrf_token is NOT httpOnly so frontend JS can read it
  res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false,
    secure: cookieSecure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: parseExpirationToMs(jwtExpiresIn),
  });
}

export function clearAuthCookies(res: Response, cookieSecure: boolean): void {
  const clearOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'strict' as const,
  };

  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...clearOptions, path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...clearOptions, path: '/auth' });
  res.clearCookie(CSRF_TOKEN_COOKIE, {
    httpOnly: false,
    secure: cookieSecure,
    sameSite: 'strict' as const,
    path: '/',
  });
}

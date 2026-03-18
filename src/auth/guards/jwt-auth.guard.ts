import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { AuthConfig, JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    const token = request.cookies?.['access_token'];
    if (!token) {
      throw new UnauthorizedException('Missing authentication cookie');
    }

    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');

    if (!authConfig.jwtSecret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: authConfig.jwtSecret,
      });

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!SAFE_METHODS.includes(request.method.toUpperCase())) {
      const csrfCookie = request.cookies?.['csrf_token'] as string | undefined;
      const csrfHeader = request.headers['x-csrf-token'] as string | undefined;

      if (!csrfCookie || !csrfHeader) {
        throw new ForbiddenException('Missing CSRF token');
      }

      try {
        const cookieBuf = Buffer.from(csrfCookie);
        const headerBuf = Buffer.from(csrfHeader);
        if (
          cookieBuf.length !== headerBuf.length ||
          !timingSafeEqual(cookieBuf, headerBuf)
        ) {
          throw new ForbiddenException('Invalid CSRF token');
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        throw new ForbiddenException('Invalid CSRF token');
      }
    }

    return true;
  }
}

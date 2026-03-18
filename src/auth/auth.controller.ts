import {
  swaggerErrorExample as errorExample,
  swaggerExample as wrapExample,
} from '@/core/swagger/swagger-example.helper';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthConfig } from './types';
import {
  clearAuthCookies,
  generateCsrfToken,
  setAuthCookies,
} from './utils/cookie.helper';

const EXAMPLE_USER = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. Tokens are set as HTTP-only cookies.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    content: {
      'application/json': {
        example: wrapExample(201, 'Created', { user: EXAMPLE_USER }),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    content: {
      'application/json': {
        example: errorExample(400, 'Bad Request', [
          {
            code: 'too_small',
            message: 'String must contain at least 8 character(s)',
            path: ['password'],
          },
        ]),
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
    content: {
      'application/json': {
        example: errorExample(409, 'User with this email already exists'),
      },
    },
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, ...result } =
      await this.authService.register(dto);
    const csrfToken = generateCsrfToken();
    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');
    setAuthCookies(res, accessToken, refreshToken, csrfToken, {
      cookieSecure: authConfig.cookieSecure,
      jwtExpiresIn: authConfig.jwtExpiresIn,
      refreshExpiresIn: authConfig.refreshExpiresIn,
    });
    return result;
  }

  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates a user with email and password. Tokens are set as HTTP-only cookies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', { user: EXAMPLE_USER }),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    content: {
      'application/json': {
        example: errorExample(400, 'Bad Request', [
          {
            code: 'too_small',
            message: 'String must contain at least 8 character(s)',
            path: ['password'],
          },
        ]),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password.',
    content: {
      'application/json': {
        example: errorExample(401, 'Invalid email or password'),
      },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, ...result } =
      await this.authService.login(dto);
    const csrfToken = generateCsrfToken();
    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');
    setAuthCookies(res, accessToken, refreshToken, csrfToken, {
      cookieSecure: authConfig.cookieSecure,
      jwtExpiresIn: authConfig.jwtExpiresIn,
      refreshExpiresIn: authConfig.refreshExpiresIn,
    });
    return result;
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Reads the refresh token from the HTTP-only cookie and issues new token cookies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', { message: 'Tokens refreshed' }),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
    content: {
      'application/json': {
        example: errorExample(401, 'Invalid or expired refresh token'),
      },
    },
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token cookie');
    }
    const tokens = await this.authService.refresh(refreshToken);
    const csrfToken = generateCsrfToken();
    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, csrfToken, {
      cookieSecure: authConfig.cookieSecure,
      jwtExpiresIn: authConfig.jwtExpiresIn,
      refreshExpiresIn: authConfig.refreshExpiresIn,
    });
    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiHeader({
    name: 'x-csrf-token',
    description: 'CSRF token read from the csrf_token cookie',
    required: true,
  })
  @Post('logout')
  @ApiOperation({
    summary: 'Log out',
    description: 'Invalidates the refresh token and clears all auth cookies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', { success: true }),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: {
      'application/json': {
        example: errorExample(401, 'Unauthorized'),
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token.',
    content: {
      'application/json': {
        example: errorExample(403, 'Invalid CSRF token'),
      },
    },
  })
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');
    await this.authService.logout(req.user.sub, req.user.email);
    clearAuthCookies(res, authConfig.cookieSecure);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the profile of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', EXAMPLE_USER),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: {
      'application/json': {
        example: errorExample(401, 'Unauthorized'),
      },
    },
  })
  me(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.authService.me(req.user.sub);
  }
}

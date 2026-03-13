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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const EXAMPLE_USER = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
};
const EXAMPLE_TOKENS = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.signature',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.refresh',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and returns access and refresh tokens.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    content: {
      'application/json': {
        example: wrapExample(201, 'Created', {
          user: EXAMPLE_USER,
          ...EXAMPLE_TOKENS,
        }),
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
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates a user with email and password, returns access and refresh tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', {
          user: EXAMPLE_USER,
          ...EXAMPLE_TOKENS,
        }),
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Exchanges a valid refresh token for new access and refresh tokens.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
    content: {
      'application/json': {
        example: wrapExample(200, 'OK', EXAMPLE_TOKENS),
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
            message: 'String must contain at least 1 character(s)',
            path: ['refreshToken'],
          },
        ]),
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
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary: 'Log out',
    description: 'Invalidates the refresh token for the authenticated user.',
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
  logout(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.authService.logout(req.user.sub, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

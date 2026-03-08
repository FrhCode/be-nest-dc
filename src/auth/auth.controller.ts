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
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
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
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
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
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary: 'Log out',
    description:
      'Invalidates the refresh token for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
  @ApiResponse({ status: 200, description: 'Current user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  me(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return this.authService.me(req.user.sub);
  }
}

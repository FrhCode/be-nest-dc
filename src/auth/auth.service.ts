import config from '@/core/config';
import { DrizzleService } from '@/core/orm/drizzle.service';
import { users } from '@/db/users';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { StringValue } from 'ms';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types';

type AuthConfig = {
  jwtSecret?: string;
  jwtExpiresIn?: StringValue | number;
  refreshSecret?: string;
  refreshExpiresIn?: StringValue | number;
  bcryptSaltRounds: number;
};

type PublicUser = {
  id: number;
  name: string;
  age: number;
  email: string;
};

type UserWithSecrets = PublicUser & {
  password_hash: string;
  refresh_token_hash: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ReturnType<typeof config>>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const authConfig: AuthConfig = this.getAuthConfig();
    const passwordHash = await bcrypt.hash(
      dto.password,
      authConfig.bcryptSaltRounds,
    );

    const [created] = await this.drizzleService.db
      .insert(users)
      .values({
        name: dto.name,
        age: dto.age,
        email: dto.email,
        password_hash: passwordHash,
        created_by: dto.email,
        modified_by: dto.email,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        age: users.age,
      });

    const tokens = await this.generateTokens({
      sub: created.id,
      email: created.email,
      name: created.name,
    });

    await this.updateRefreshToken(
      created.id,
      tokens.refreshToken,
      created.email,
    );

    return {
      user: created,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken, user.email);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const authConfig: AuthConfig = this.getAuthConfig();

    if (!authConfig.refreshSecret) {
      throw new UnauthorizedException('Refresh secret not configured');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: authConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.findUserById(payload.sub, true);
    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken, user.email);

    return {
      ...tokens,
    };
  }

  async logout(userId: number, email: string) {
    await this.drizzleService.db
      .update(users)
      .set({
        refresh_token_hash: null,
        modified_at: new Date(),
        modified_by: email,
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  async me(userId: number) {
    const user = await this.findUserById(userId, false);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private sanitizeUser(user: PublicUser | UserWithSecrets): PublicUser {
    return {
      id: user.id,
      name: user.name,
      age: user.age,
      email: user.email,
    };
  }

  private async findUserByEmail(
    email: string,
    includeSecrets: true,
  ): Promise<UserWithSecrets | null>;
  private async findUserByEmail(
    email: string,
    includeSecrets?: false,
  ): Promise<PublicUser | null>;
  private async findUserByEmail(
    email: string,
    includeSecrets = false,
  ): Promise<UserWithSecrets | PublicUser | null> {
    const [user] = await this.drizzleService.db
      .select({
        id: users.id,
        name: users.name,
        age: users.age,
        email: users.email,
        password_hash: users.password_hash,
        refresh_token_hash: users.refresh_token_hash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return null;
    }

    return includeSecrets ? user : this.sanitizeUser(user);
  }

  private async findUserById(
    userId: number,
    includeSecrets: true,
  ): Promise<UserWithSecrets | null>;
  private async findUserById(
    userId: number,
    includeSecrets?: false,
  ): Promise<PublicUser | null>;
  private async findUserById(
    userId: number,
    includeSecrets = false,
  ): Promise<UserWithSecrets | PublicUser | null> {
    const [user] = await this.drizzleService.db
      .select({
        id: users.id,
        name: users.name,
        age: users.age,
        email: users.email,
        password_hash: users.password_hash,
        refresh_token_hash: users.refresh_token_hash,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return includeSecrets ? user : this.sanitizeUser(user);
  }

  private async generateTokens(payload: JwtPayload) {
    const authConfig: AuthConfig = this.getAuthConfig();

    if (!authConfig.jwtSecret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    if (!authConfig.refreshSecret) {
      throw new UnauthorizedException('Refresh secret not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: authConfig.jwtSecret,
        expiresIn: authConfig.jwtExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: authConfig.refreshSecret,
        expiresIn: authConfig.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: number,
    refreshToken: string,
    email: string,
  ) {
    const authConfig: AuthConfig = this.getAuthConfig();
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      authConfig.bcryptSaltRounds,
    );

    await this.drizzleService.db
      .update(users)
      .set({
        refresh_token_hash: refreshTokenHash,
        modified_at: new Date(),
        modified_by: email,
      })
      .where(eq(users.id, userId));
  }

  private getAuthConfig(): AuthConfig {
    return this.configService.getOrThrow('auth');
  }
}

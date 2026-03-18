export type JwtPayload = {
  sub: number;
  email: string;
  name: string;
};

export type AuthConfig = {
  jwtSecret: string;
  jwtExpiresIn: number;
  refreshSecret: string;
  refreshExpiresIn: number;
  bcryptSaltRounds: number;
  cookieSecure: boolean;
};

export type PublicUser = {
  id: number;
  name: string;
  age: number;
  email: string;
};

export type UserWithSecrets = PublicUser & {
  password_hash: string;
  refresh_token_hash: string | null;
};

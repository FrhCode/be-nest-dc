export const config = () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    name: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    dialect: process.env.DB_DIALECT,
  },
  database_url: process.env.DATABASE_URL,
  cache: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
      ? parseInt(process.env.REDIS_PORT, 10)
      : undefined,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    ttl: process.env.REDIST_TTL
      ? parseInt(process.env.REDIST_TTL, 10)
      : undefined,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRATION,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION,
    bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
      : 10,
  },
});

export default config;

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run start:dev` (watch mode)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint with auto-fix)
- **Format:** `npm run format` (Prettier)
- **DB generate migration:** `npm run db:generate`
- **DB run migrations:** `npm run db:migrate`
- **DB studio:** `npm run studio` (Drizzle Kit Studio)
- **Start infra (Postgres + Redis):** `npm run docker:start`

## Workflow

- After every change (bug fix or new feature), verify the code compiles by running `npm run build`, then verify the app starts by running `timeout 10 npm run start || true` (expect it to either connect successfully or fail on missing DB/Redis — a module resolution or DI error means the code is broken). Only consider the task complete after both checks pass.

## Architecture

NestJS backend with PostgreSQL (Drizzle ORM) and Redis caching.

- **`src/core/`** — Global module providing shared infrastructure: config (`@nestjs/config`), Drizzle DB service, Winston logger, AsyncLocalStorage for request context, request-id and logger middleware, and a response transform interceptor.
- **`src/auth/`** — JWT authentication (access + refresh tokens) with bcrypt password hashing. Has register/login/refresh endpoints and a `JwtAuthGuard`.
- **`src/db/`** — Drizzle schema definitions (users, comments). This is the schema source for `drizzle.config.ts`.
- **`src/dto/`** — Shared DTOs.

## Key Conventions

- **Validation:** Uses Zod via `nestjs-zod` (not class-validator). DTOs extend `createZodDto()`. Global `ZodValidationPipe` and `ZodSerializerInterceptor` are registered in CoreModule.
- **Path aliases:** `@/*` maps to `src/*` (configured in tsconfig).
- **Module resolution:** Uses `nodenext` module resolution — imports require explicit extensions in some contexts.
- **Config:** Environment variables loaded via `@nestjs/config` with a typed config factory at `src/core/config/index.ts`.
- **Swagger:** Available at `/docs` endpoint with Bearer auth support.
- **Authorization:** Do NOT use NestJS guards for resource-level access control (member/admin/owner checks). Instead, use injectable **policy services** in `src/common/policies/`, provided via `CommonModule`. Services inject the policy and call it at the start of each method (e.g. `this.serverPolicy.assertAdmin(userId, serverId)`). Controllers only use `JwtAuthGuard` for identity, then pass `userId` to the service layer.

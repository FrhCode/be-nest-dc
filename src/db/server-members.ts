import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { servers } from './servers';
import { users } from './users';

export const serverRoleEnum = pgEnum('server_role', ['admin', 'member']);

export const serverMembers = pgTable(
  'server_members',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: integer()
      .notNull()
      .references(() => users.id),
    server_id: integer()
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    role: serverRoleEnum().notNull().default('member'),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.server_id)],
);

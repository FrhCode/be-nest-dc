import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const servers = pgTable('servers', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  icon_url: varchar({ length: 500 }),
  invite_code: varchar({ length: 20 }).notNull().unique(),
  owner_id: integer()
    .notNull()
    .references(() => users.id),
  created_at: timestamp().notNull().defaultNow(),
  created_by: varchar({ length: 255 }).notNull(),
  modified_at: timestamp().notNull().defaultNow(),
  modified_by: varchar({ length: 255 }).notNull(),
});

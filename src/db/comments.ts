import { users } from '@/db/users';
import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const comments = pgTable('comments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer()
    .notNull()
    .references(() => users.id),
  content: varchar({ length: 1000 }).notNull(),
  created_at: timestamp().notNull().defaultNow(),
  created_by: varchar({ length: 255 }).notNull(),
  modified_at: timestamp().notNull().defaultNow(),
  modified_by: varchar({ length: 255 }).notNull(),
});

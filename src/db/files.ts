import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const files = pgTable('files', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  original_name: varchar({ length: 500 }).notNull(),
  stored_path: varchar({ length: 500 }).notNull(),
  mime_type: varchar({ length: 100 }).notNull(),
  size: integer().notNull(),
  uploaded_by: integer()
    .notNull()
    .references(() => users.id),
  created_at: timestamp().notNull().defaultNow(),
});

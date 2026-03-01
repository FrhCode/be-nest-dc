import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password_hash: varchar({ length: 255 }).notNull(),
  refresh_token_hash: varchar({ length: 255 }),
  created_at: timestamp().notNull().defaultNow(),
  created_by: varchar({ length: 255 }).notNull(),
  modified_at: timestamp().notNull().defaultNow(),
  modified_by: varchar({ length: 255 }).notNull(),
});

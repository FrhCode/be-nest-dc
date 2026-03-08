import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { users } from './users';

export const messages = pgTable('messages', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  content: varchar({ length: 2000 }).notNull(),
  channel_id: integer()
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  sender_id: integer()
    .notNull()
    .references(() => users.id),
  created_at: timestamp().notNull().defaultNow(),
  modified_at: timestamp().notNull().defaultNow(),
});

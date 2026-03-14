import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { dmConversations } from './dm-conversations';
import { users } from './users';

export const directMessages = pgTable('direct_messages', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  content: varchar({ length: 2000 }),
  conversation_id: integer()
    .notNull()
    .references(() => dmConversations.id, { onDelete: 'cascade' }),
  sender_id: integer()
    .notNull()
    .references(() => users.id),
  attachment_url: varchar({ length: 500 }),
  quoted_content: varchar({ length: 2000 }),
  quoted_sender_name: varchar({ length: 255 }),
  created_at: timestamp().notNull().defaultNow(),
  modified_at: timestamp().notNull().defaultNow(),
});

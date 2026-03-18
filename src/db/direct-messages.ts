import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { dmConversations } from './dm-conversations';
import { files } from './files';
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
  attachment_id: integer().references(() => files.id, { onDelete: 'set null' }),
  reply_to_message_id: integer(),
  quoted_content: varchar({ length: 2000 }),
  quoted_sender_name: varchar({ length: 255 }),
  is_deleted: boolean().notNull().default(false),
  created_at: timestamp().notNull().defaultNow(),
  modified_at: timestamp().notNull().defaultNow(),
});

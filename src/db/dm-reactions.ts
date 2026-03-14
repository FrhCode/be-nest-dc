import {
  integer,
  pgTable,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { directMessages } from './direct-messages';
import { users } from './users';

export const dmReactions = pgTable(
  'dm_reactions',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    message_id: integer()
      .notNull()
      .references(() => directMessages.id, { onDelete: 'cascade' }),
    user_id: integer()
      .notNull()
      .references(() => users.id),
    emoji: varchar({ length: 50 }).notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.message_id, t.user_id, t.emoji)],
);

import { integer, pgTable, timestamp, unique } from 'drizzle-orm/pg-core';
import { directMessages } from './direct-messages';
import { users } from './users';

export const dmHiddenMessages = pgTable(
  'dm_hidden_messages',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    message_id: integer()
      .notNull()
      .references(() => directMessages.id, { onDelete: 'cascade' }),
    user_id: integer()
      .notNull()
      .references(() => users.id),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.message_id, t.user_id)],
);

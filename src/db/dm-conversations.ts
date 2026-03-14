import { integer, pgTable, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const dmConversations = pgTable(
  'dm_conversations',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_one_id: integer()
      .notNull()
      .references(() => users.id),
    user_two_id: integer()
      .notNull()
      .references(() => users.id),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.user_one_id, t.user_two_id)],
);

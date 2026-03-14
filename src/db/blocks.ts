import { integer, pgTable, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const blocks = pgTable(
  'blocks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    blocker_id: integer()
      .notNull()
      .references(() => users.id),
    blocked_id: integer()
      .notNull()
      .references(() => users.id),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.blocker_id, t.blocked_id)],
);

import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
]);

export const friendships = pgTable(
  'friendships',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    requester_id: integer()
      .notNull()
      .references(() => users.id),
    addressee_id: integer()
      .notNull()
      .references(() => users.id),
    status: friendshipStatusEnum().notNull().default('pending'),
    created_at: timestamp().notNull().defaultNow(),
    modified_at: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.requester_id, t.addressee_id)],
);

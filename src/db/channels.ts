import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { servers } from './servers';

export const channelTypeEnum = pgEnum('channel_type', [
  'video',
  'mic',
  'message',
]);

export const channels = pgTable('channels', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  type: channelTypeEnum().notNull(),
  server_id: integer()
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  created_at: timestamp().notNull().defaultNow(),
  created_by: varchar({ length: 255 }).notNull(),
  modified_at: timestamp().notNull().defaultNow(),
  modified_by: varchar({ length: 255 }).notNull(),
});

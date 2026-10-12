import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
  userId: text('user_id').primaryKey(), session: text('session').notNull(),
  connectedAt: integer('connected_at').notNull(), lastAttempt: integer('last_attempt'),
  lastSync: integer('last_sync'), status: text('status').notNull(),
  devices: text('devices').notNull().default('[]'), pets: text('pets').notNull().default('[]'),
  coverage: text('coverage').notNull().default('[]'),
});
export const events = sqliteTable('events', {
  userId: text('user_id').notNull(), key: text('key').notNull(), deviceId: text('device_id').notNull(),
  occurredAt: integer('occurred_at').notNull(), petId: text('pet_id'), payload: text('payload').notNull(),
}, t => [primaryKey({columns:[t.userId,t.key]})]);

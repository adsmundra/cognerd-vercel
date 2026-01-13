import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  type: text('type').notNull(), // e.g., 'aeo_report_generated', 'files_generated'
  message: text('message').notNull(),
  link: text('link'), // Optional link to the related resource
  assetId: text('asset_id'), // Optional ID of the associated asset (e.g., aeo_report_id)
  assetTable: text('asset_table'), // Optional name of the table where the asset is stored
  status: text('status').default('not_sent').notNull(), // e.g., 'not_sent', 'sent', 'read'
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  userProfile: one(notifications, {
    fields: [notifications.userId],
    references: [notifications.userId],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

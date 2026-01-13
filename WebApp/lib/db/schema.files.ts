import { timestamptz } from 'drizzle-orm/gel-core';
import { pgTable, text, timestamp, uuid, jsonb , serial , uniqueIndex} from 'drizzle-orm/pg-core';


export const fileGenerationJobs = pgTable('file_generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  url: text('url').notNull(),
  brand: text('brand'),
  category: text('category'),
  competitors: jsonb('competitors'),
  prompts: text('prompts'),
  status: text('status').notNull().default('pending'), // pending | in_progress | completed | failed
  nonce: text('nonce').notNull(),
  result: jsonb('result'),
  error: text('error'),
  webhookAttemptedAt: timestamp('webhook_attempted_at'),
  webhookResponseCode: text('webhook_response_code'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const files = pgTable('files',{
  id: uuid('id').primaryKey().defaultRandom(),
  userId : text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  brand: text('brand'),
  url: text('url'),
  llms: text('llms'),
  robots: text('robots'),
  site_schema: text('site_schema'),
  faqs: text('faqs'),
  createdAT: timestamp('created_at').defaultNow()
});
 
export const topicSuggestions = pgTable("topic_suggestions",{
    id: serial("id").primaryKey(),
    emailId: text("email_id"),
    brandName: text("brand_name").notNull(),
    topics: jsonb("topics").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      emailBrandUnique: uniqueIndex("topic_suggestions_email_id_brand_name_key").on(table.emailId, table.brandName),
    };
  }
);


export const blogs = pgTable("blogs", {
  id: serial("id").primaryKey(),
  companyUrl: text("company_url").notNull(),
  emailId: text("email_id"),
  brandName: text("brand_name"),
  blog: text("blog").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
    topic: text("topic"),
});

export type FileGenerationJob = typeof fileGenerationJobs.$inferSelect;
export type NewFileGenerationJob = typeof fileGenerationJobs.$inferInsert;

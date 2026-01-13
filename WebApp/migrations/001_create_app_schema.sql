-- Application Schema
-- This migration creates all application-specific tables
-- Better Auth tables (user, session, account, verification) are managed separately by Better Auth

-- Create custom types
DO $$ BEGIN
    CREATE TYPE "role" AS ENUM('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "theme" AS ENUM('light', 'dark');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Brand Monitor Analyses
CREATE TABLE IF NOT EXISTS "brand_analyses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL,
    "url" text NOT NULL,
    "company_name" text,
    "industry" text,
    "analysis_data" jsonb,
    "competitors" jsonb,
    "prompts" jsonb,
    "credits_used" integer DEFAULT 10,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL,
    "title" text,
    "last_message_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL,
    "role" "role" NOT NULL,
    "content" text NOT NULL,
    "token_count" integer,
    "created_at" timestamp DEFAULT now()
);

-- Message Feedback
CREATE TABLE IF NOT EXISTS "message_feedback" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL,
    "rating" integer,
    "feedback" text,
    "created_at" timestamp DEFAULT now()
);

-- User Profile
CREATE TABLE IF NOT EXISTS "user_profile" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL UNIQUE,
    "display_name" text,
    "avatar_url" text,
    "bio" text,
    "phone" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- User Settings
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL UNIQUE,
    "theme" "theme" DEFAULT 'light',
    "email_notifications" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT false,
    "default_model" text DEFAULT 'gpt-3.5-turbo',
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_brand_analyses_user_id" ON "brand_analyses"("user_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_user_id" ON "conversations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_user_id" ON "messages"("user_id");
CREATE INDEX IF NOT EXISTS "idx_message_feedback_message_id" ON "message_feedback"("message_id");
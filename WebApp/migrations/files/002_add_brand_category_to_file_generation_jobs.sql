-- Migration: add brand and category columns to file_generation_jobs
-- Safe for repeated runs using IF NOT EXISTS

ALTER TABLE file_generation_jobs
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS category text;

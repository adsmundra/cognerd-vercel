CREATE TABLE IF NOT EXISTS file_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  url TEXT NOT NULL,
  competitors JSONB,
  prompts TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  nonce TEXT NOT NULL,
  result JSONB,
  error TEXT,
  webhook_attempted_at TIMESTAMP,
  webhook_response_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to update updated_at automatically (optional if using app-layer updates)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_file_jobs ON file_generation_jobs;
CREATE TRIGGER trg_set_updated_at_file_jobs
BEFORE UPDATE ON file_generation_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

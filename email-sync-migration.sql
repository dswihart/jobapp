DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emailsyncclassification') THEN
    CREATE TYPE "EmailSyncClassification" AS ENUM ('INTERVIEW', 'REJECTION', 'UPDATE', 'OTHER');
  END IF;
END
$$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_sync_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_sync_lookback_days integer DEFAULT 14;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sync_at timestamp(3);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sync_error text;

CREATE TABLE IF NOT EXISTS email_sync_events (
  id text PRIMARY KEY,
  message_id text NOT NULL UNIQUE,
  thread_id text,
  subject text,
  from_address text,
  from_name text,
  received_at timestamp(3) NOT NULL,
  classification "EmailSyncClassification" NOT NULL DEFAULT 'OTHER',
  matched_company text,
  snippet text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id text REFERENCES applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS email_sync_events_user_id_received_at_idx ON email_sync_events(user_id, received_at);
CREATE INDEX IF NOT EXISTS email_sync_events_application_id_idx ON email_sync_events(application_id);

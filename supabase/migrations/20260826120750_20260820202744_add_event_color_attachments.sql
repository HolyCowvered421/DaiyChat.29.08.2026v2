-- Add color and attachments columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS color text DEFAULT 'blue';
ALTER TABLE events ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
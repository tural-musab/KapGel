-- Migration: Update notifications table for web push
-- Description: Add columns to store push subscription keys and metadata
-- Created: 2025-01-10

-- Add new columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS keys JSONB,
  ADD COLUMN IF NOT EXISTS device_type TEXT CHECK (device_type IN ('mobile', 'desktop')),
  ADD COLUMN IF NOT EXISTS device_os TEXT,
  ADD COLUMN IF NOT EXISTS device_browser TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_channel
  ON notifications(user_id, channel, is_active);

-- Add comment
COMMENT ON COLUMN notifications.keys IS
  'JSONB object containing p256dh and auth keys for web push subscriptions';

COMMENT ON COLUMN notifications.device_type IS
  'Device type: mobile or desktop';

COMMENT ON COLUMN notifications.device_os IS
  'Operating system: iOS, Android, Windows, macOS, Linux';

COMMENT ON COLUMN notifications.device_browser IS
  'Browser: Chrome, Firefox, Safari, Edge';

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies if not exists
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification subscriptions" ON notifications;
CREATE POLICY "Users can view own notification subscriptions"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notification subscriptions" ON notifications;
CREATE POLICY "Users can insert own notification subscriptions"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification subscriptions" ON notifications;
CREATE POLICY "Users can update own notification subscriptions"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notification subscriptions" ON notifications;
CREATE POLICY "Users can delete own notification subscriptions"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

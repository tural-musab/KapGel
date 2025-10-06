-- Migration: Application Logs Table
-- Created: 2025-10-05
-- Description: Optional table for storing application logs
-- Note: This is for production logging. In development, console logs are sufficient.

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id bigserial PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  message text NOT NULL,
  service text DEFAULT 'kapgel-api',
  environment text,
  
  -- Context fields
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  courier_id uuid REFERENCES couriers(id) ON DELETE SET NULL,
  request_id text,
  action text,
  
  -- Additional context (JSONB for flexibility)
  context jsonb,
  
  -- Error details
  error_message text,
  error_stack text,
  error_code text,
  
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_user_id ON logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_logs_order_id ON logs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_logs_action ON logs(action) WHERE action IS NOT NULL;

-- Partitioning by date (optional, for high-volume production)
-- This can be added later if needed

-- RLS Policies (logs are admin-only)
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs"
  ON logs FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- System can insert logs (no user context needed)
CREATE POLICY "System can insert logs"
  ON logs FOR INSERT
  WITH CHECK (true);

-- Retention policy: Delete logs older than 30 days
-- This should be run as a cron job or pg_cron
CREATE OR REPLACE FUNCTION delete_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM logs
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION delete_old_logs() TO service_role;

COMMENT ON TABLE logs IS 'Application logs for production monitoring and debugging';
COMMENT ON FUNCTION delete_old_logs IS 'Cleanup function: Deletes logs older than 30 days';

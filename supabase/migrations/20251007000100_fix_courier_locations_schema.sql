-- Migration: Fix courier_locations table schema
-- Created: 2025-10-07
-- Description: Adds missing columns to courier_locations table to match RPC function

-- =============================================================================
-- ADD MISSING COLUMNS TO COURIER_LOCATIONS TABLE
-- =============================================================================

-- Add missing columns that the insert_courier_location RPC function expects
ALTER TABLE courier_locations 
  ADD COLUMN IF NOT EXISTS accuracy double precision,
  ADD COLUMN IF NOT EXISTS heading double precision,
  ADD COLUMN IF NOT EXISTS speed double precision,
  ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

-- Add constraints for data validation (PostgreSQL compatible)
DO $$
BEGIN
  -- Add heading constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_courier_locations_heading') THEN
    ALTER TABLE courier_locations 
      ADD CONSTRAINT check_courier_locations_heading 
      CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360));
  END IF;

  -- Add accuracy constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_courier_locations_accuracy') THEN
    ALTER TABLE courier_locations 
      ADD CONSTRAINT check_courier_locations_accuracy 
      CHECK (accuracy IS NULL OR accuracy >= 0);
  END IF;

  -- Add speed constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_courier_locations_speed') THEN
    ALTER TABLE courier_locations 
      ADD CONSTRAINT check_courier_locations_speed 
      CHECK (speed IS NULL OR speed >= 0);
  END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_courier_locations_courier_id_updated_at 
  ON courier_locations(courier_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_courier_locations_order_id 
  ON courier_locations(order_id) 
  WHERE order_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN courier_locations.accuracy IS 'GPS accuracy in meters (optional)';
COMMENT ON COLUMN courier_locations.heading IS 'Direction of movement in degrees 0-360 (optional)';
COMMENT ON COLUMN courier_locations.speed IS 'Speed in meters per second (optional)';
COMMENT ON COLUMN courier_locations.is_manual IS 'Whether location was manually entered or GPS-based';

-- Update table comment
COMMENT ON TABLE courier_locations IS 'Real-time GPS locations of couriers during deliveries';
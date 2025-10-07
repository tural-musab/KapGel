-- Migration: Add business_type to vendors table
-- Created: 2025-10-07
-- Description: Enable vendor business type classification for future feature differentiation
-- Related: specs/001-kapsam-roller-m/data-model.md#business-type-classification

-- Create business type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_business_type') THEN
    CREATE TYPE public.vendor_business_type AS ENUM ('restaurant', 'market', 'grocery', 'cafe');
  END IF;
END$$;

-- Add business_type column to vendors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' 
    AND column_name = 'business_type'
  ) THEN
    ALTER TABLE public.vendors 
    ADD COLUMN business_type vendor_business_type DEFAULT 'restaurant' NOT NULL;
  END IF;
END$$;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.vendors.business_type IS 'Business type classification for feature differentiation and analytics. MVP focuses on restaurants.';

-- Update existing vendors to have business_type (if any exist)
UPDATE public.vendors 
SET business_type = 'restaurant' 
WHERE business_type IS NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check if enum was created
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_business_type') THEN
    RAISE EXCEPTION 'Migration failed: vendor_business_type enum not created';
  END IF;

  -- Check if column was added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'business_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: business_type column not added';
  END IF;

  RAISE NOTICE 'Migration completed successfully: vendor business_type added';
END$$;
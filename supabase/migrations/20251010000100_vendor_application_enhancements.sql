-- Vendor application metadata enhancements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'vendor_business_type'::regtype
      AND enumlabel = 'pharmacy'
  ) THEN
    ALTER TYPE public.vendor_business_type ADD VALUE 'pharmacy';
  END IF;
END$$;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS business_type public.vendor_business_type DEFAULT 'restaurant';

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

UPDATE public.vendor_applications
SET business_type = COALESCE(business_type, 'restaurant')
WHERE business_type IS NULL;

ALTER TABLE public.vendor_applications
  ALTER COLUMN business_type SET NOT NULL;

ALTER TABLE public.vendor_applications
  ALTER COLUMN business_type SET DEFAULT 'restaurant';

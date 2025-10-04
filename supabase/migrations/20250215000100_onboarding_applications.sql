-- Update users.role to support pending states
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'pending';
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('pending', 'customer', 'vendor_admin', 'courier', 'admin', 'vendor_admin_pending', 'courier_pending'));

-- Application status type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END$$;

-- Vendor applications table
CREATE TABLE IF NOT EXISTS public.vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Courier applications table
CREATE TABLE IF NOT EXISTS public.courier_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_applications ENABLE ROW LEVEL SECURITY;

-- Users insert policy for self-managed records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can insert their own data'
  ) THEN
    CREATE POLICY "Users can insert their own data"
      ON public.users
      FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END
$$;

-- Vendor application policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_applications'
      AND policyname = 'Users can view their vendor applications'
  ) THEN
    CREATE POLICY "Users can view their vendor applications" ON public.vendor_applications
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_applications'
      AND policyname = 'Users can insert vendor applications'
  ) THEN
    CREATE POLICY "Users can insert vendor applications" ON public.vendor_applications
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_applications'
      AND policyname = 'Admins can manage vendor applications'
  ) THEN
    CREATE POLICY "Admins can manage vendor applications" ON public.vendor_applications
      FOR ALL
      USING (public.get_my_role() = 'admin');
  END IF;
END
$$;

-- Courier application policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courier_applications'
      AND policyname = 'Users can view their courier applications'
  ) THEN
    CREATE POLICY "Users can view their courier applications" ON public.courier_applications
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courier_applications'
      and policyname = 'Users can insert courier applications'
  ) THEN
    CREATE POLICY "Users can insert courier applications" ON public.courier_applications
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courier_applications'
      AND policyname = 'Admins can manage courier applications'
  ) THEN
    CREATE POLICY "Admins can manage courier applications" ON public.courier_applications
      FOR ALL
      USING (public.get_my_role() = 'admin');
  END IF;
END
$$;
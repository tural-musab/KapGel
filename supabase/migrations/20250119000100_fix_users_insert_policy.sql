-- Migration: Fix users table INSERT policy
-- Created: 2025-01-19
-- Description: Add missing INSERT policy for users table to allow new user registration

-- Add INSERT policy for users table
CREATE POLICY "Users can insert their own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- Also add policy for vendor_applications and courier_applications INSERT
CREATE POLICY "Users can create their own vendor applications" 
  ON public.vendor_applications 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create their own courier applications" 
  ON public.courier_applications 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Add SELECT policies for applications so users can view their own applications
CREATE POLICY "Users can view their own vendor applications" 
  ON public.vendor_applications 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own courier applications" 
  ON public.courier_applications 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Allow admins to manage all applications
CREATE POLICY "Admins can manage all vendor applications" 
  ON public.vendor_applications 
  FOR ALL 
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can manage all courier applications" 
  ON public.courier_applications 
  FOR ALL 
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
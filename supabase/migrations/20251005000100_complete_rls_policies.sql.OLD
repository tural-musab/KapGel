-- Migration: Complete RLS Policies
-- Created: 2025-10-05
-- Description: Comprehensive RLS policies with state machine guards, 
--              INSERT/UPDATE policies, and admin bypass

-- Drop existing policies to recreate
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_my_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get courier_id for current user
CREATE OR REPLACE FUNCTION get_my_courier_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM couriers WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get vendor_id for current user
CREATE OR REPLACE FUNCTION get_my_vendor_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM vendors WHERE owner_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ORDERS TABLE POLICIES (Most Critical)
-- =============================================================================

-- SELECT policies
CREATE POLICY "Customers can view their own orders" 
  ON orders FOR SELECT 
  USING (customer_id = auth.uid());

CREATE POLICY "Vendor admins can view their branch orders" 
  ON orders FOR SELECT 
  USING (
    EXISTS (
      SELECT 1
      FROM branches b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = orders.branch_id
        AND v.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Couriers can view their assigned orders" 
  ON orders FOR SELECT 
  USING (courier_id = get_my_courier_id());

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

-- INSERT policies
CREATE POLICY "Customers can create orders" 
  ON orders FOR INSERT 
  WITH CHECK (
    customer_id = auth.uid()
    AND get_my_role() = 'customer'
  );

-- UPDATE policies with state machine guards
CREATE POLICY "Vendor admins can update their branch orders" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1
      FROM branches b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = orders.branch_id
        AND v.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM branches b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = orders.branch_id
        AND v.owner_user_id = auth.uid()
    )
    -- State machine guards for vendors
    AND (
      (OLD.status = 'NEW' AND status IN ('CONFIRMED', 'REJECTED')) OR
      (OLD.status = 'CONFIRMED' AND status IN ('PREPARING', 'CANCELED_BY_VENDOR')) OR
      (OLD.status = 'PREPARING' AND status IN ('READY', 'CANCELED_BY_VENDOR'))
    )
  );

CREATE POLICY "Couriers can update their assigned orders"
  ON orders FOR UPDATE
  USING (courier_id = get_my_courier_id())
  WITH CHECK (
    courier_id = get_my_courier_id()
    -- Courier state transitions
    AND (
      (OLD.status = 'READY' AND status = 'PICKED_UP') OR
      (OLD.status = 'PICKED_UP' AND status = 'ON_ROUTE') OR
      (OLD.status = 'ON_ROUTE' AND status = 'DELIVERED')
    )
  );

CREATE POLICY "Customers can cancel early orders"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND OLD.status = 'NEW'
    AND status = 'CANCELED_BY_USER'
    AND (EXTRACT(EPOCH FROM (now() - created_at)) < 120) -- Within 2 minutes
  );

CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (is_admin());

-- =============================================================================
-- COURIER_LOCATIONS TABLE POLICIES
-- =============================================================================

CREATE POLICY "Couriers can insert their own locations"
  ON courier_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.id = courier_locations.courier_id
        AND c.user_id = auth.uid()
        AND c.shift_status = 'online'
    )
  );

CREATE POLICY "Customers can view delivery courier location"
  ON courier_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = courier_locations.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view their branch delivery locations"
  ON courier_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN vendors v ON v.id = b.vendor_id
      WHERE o.id = courier_locations.order_id
        AND v.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Couriers can view their own locations"
  ON courier_locations FOR SELECT
  USING (courier_id = get_my_courier_id());

CREATE POLICY "Admins can view all locations"
  ON courier_locations FOR SELECT
  USING (is_admin());

-- =============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Server-side only

CREATE POLICY "Admins can manage all notifications"
  ON notifications FOR ALL
  USING (is_admin());

-- =============================================================================
-- ORDER_ITEMS POLICIES
-- =============================================================================

CREATE POLICY "Customers can view their order items" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Vendor admins can view their branch order items" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN vendors v ON v.id = b.vendor_id
      WHERE o.id = order_id
        AND v.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Couriers can view their assigned order items" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.id = order_id
        AND o.courier_id = get_my_courier_id()
    )
  );

CREATE POLICY "Order items inserted with orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
    )
  );

-- =============================================================================
-- PRODUCTS POLICIES
-- =============================================================================

CREATE POLICY "Public can view available products" 
  ON products FOR SELECT 
  USING (
    (is_available = true AND deleted_at IS NULL)
    OR vendor_id = get_my_vendor_id()
    OR is_admin()
  );

CREATE POLICY "Vendor admins can manage their own products" 
  ON products FOR ALL 
  USING (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  )
  WITH CHECK (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  );

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Total RLS policies created: %', policy_count;
  
  IF policy_count < 30 THEN
    RAISE EXCEPTION 'Expected at least 30 policies, got %', policy_count;
  END IF;
END $$;

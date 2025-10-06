-- =============================================================================
-- KAPGEL RLS POLICIES - COMPREHENSIVE VERSION
-- Last Updated: 2025-10-05
-- Status: Complete with all INSERT, UPDATE, DELETE policies
-- =============================================================================

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_applications ENABLE ROW LEVEL SECURITY;

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
-- USERS TABLE
-- =============================================================================

CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own data" 
  ON users FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  USING (is_admin());

-- =============================================================================
-- VENDORS TABLE
-- =============================================================================

CREATE POLICY "Vendor admins can view their own vendor" 
  ON vendors FOR SELECT 
  USING (owner_user_id = auth.uid() OR is_admin());

CREATE POLICY "Vendor admins can update their own vendor"
  ON vendors FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all vendors" 
  ON vendors FOR ALL 
  USING (is_admin());

-- =============================================================================
-- BRANCHES TABLE
-- =============================================================================

CREATE POLICY "Public can view active branches" 
  ON branches FOR SELECT 
  USING (is_active = true OR owner_user_id = auth.uid() OR is_admin());

CREATE POLICY "Vendor admins can manage their own branches" 
  ON branches FOR ALL 
  USING (
    (SELECT owner_user_id FROM vendors WHERE id = vendor_id) = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    (SELECT owner_user_id FROM vendors WHERE id = vendor_id) = auth.uid()
    OR is_admin()
  );

-- =============================================================================
-- PRODUCTS TABLE
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

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================

CREATE POLICY "Public can view categories" 
  ON categories FOR SELECT 
  USING (true);

CREATE POLICY "Vendor admins can manage their own categories" 
  ON categories FOR ALL 
  USING (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  )
  WITH CHECK (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  );

-- =============================================================================
-- INVENTORIES TABLE
-- =============================================================================

CREATE POLICY "Vendor admins can manage their own inventories" 
  ON inventories FOR ALL 
  USING (
    branch_id IN (
      SELECT id FROM branches 
      WHERE vendor_id = get_my_vendor_id()
    )
    OR is_admin()
  )
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches 
      WHERE vendor_id = get_my_vendor_id()
    )
    OR is_admin()
  );

-- =============================================================================
-- ORDERS TABLE
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

-- UPDATE policies
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
    -- State machine guards
    AND (
      -- Vendor can only transition to specific states
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

-- DELETE policies
CREATE POLICY "Admins can delete orders" 
  ON orders FOR DELETE 
  USING (is_admin());

-- =============================================================================
-- ORDER_ITEMS TABLE
-- =============================================================================

-- SELECT policies
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

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

-- INSERT policies (only during order creation)
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
-- EVENTS TABLE (Order Event Sourcing)
-- =============================================================================

CREATE POLICY "Users can view events for their orders"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = events.order_id
        AND (
          o.customer_id = auth.uid()
          OR o.courier_id = get_my_courier_id()
          OR EXISTS (
            SELECT 1 FROM branches b
            JOIN vendors v ON v.id = b.vendor_id
            WHERE b.id = o.branch_id
              AND v.owner_user_id = auth.uid()
          )
        )
    )
    OR is_admin()
  );

CREATE POLICY "System can insert events"
  ON events FOR INSERT
  WITH CHECK (true); -- Server-side only

-- =============================================================================
-- COURIER_LOCATIONS TABLE
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
-- COURIERS TABLE
-- =============================================================================

CREATE POLICY "Vendors can view their own couriers"
  ON couriers FOR SELECT
  USING (
    vendor_id = get_my_vendor_id()
    OR user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Vendor admins can manage their couriers" 
  ON couriers FOR ALL 
  USING (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  )
  WITH CHECK (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  );

CREATE POLICY "Couriers can update their own status"
  ON couriers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- NOTIFICATIONS TABLE
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
-- VENDOR APPLICATIONS TABLE
-- =============================================================================

CREATE POLICY "Users can view their vendor applications" 
  ON vendor_applications FOR SELECT 
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert vendor applications" 
  ON vendor_applications FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update pending applications"
  ON vendor_applications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can manage all vendor applications" 
  ON vendor_applications FOR ALL 
  USING (is_admin());

-- =============================================================================
-- COURIER APPLICATIONS TABLE
-- =============================================================================

CREATE POLICY "Users can view their courier applications" 
  ON courier_applications FOR SELECT 
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert courier applications" 
  ON courier_applications FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update pending applications"
  ON courier_applications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can manage all courier applications" 
  ON courier_applications FOR ALL 
  USING (is_admin());

-- =============================================================================
-- GEOGRAPHY TABLES (Public Read)
-- =============================================================================

CREATE POLICY "Public can view cities"
  ON cities FOR SELECT
  USING (true);

CREATE POLICY "Public can view districts"
  ON districts FOR SELECT
  USING (true);

CREATE POLICY "Public can view neighborhoods"
  ON neighborhoods FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage geography"
  ON cities FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage districts"
  ON districts FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage neighborhoods"
  ON neighborhoods FOR ALL
  USING (is_admin());

-- =============================================================================
-- PLANS & SUBSCRIPTIONS
-- =============================================================================

CREATE POLICY "Public can view active plans"
  ON plans FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage plans"
  ON plans FOR ALL
  USING (is_admin());

CREATE POLICY "Vendors can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    vendor_id = get_my_vendor_id()
    OR is_admin()
  );

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin());

-- =============================================================================
-- END OF RLS POLICIES
-- =============================================================================

COMMENT ON TABLE users IS 'RLS: Users can view/update own data, admins have full access';
COMMENT ON TABLE orders IS 'RLS: Role-based access with state machine guards';
COMMENT ON TABLE courier_locations IS 'RLS: Couriers insert own, customers/vendors view related';
COMMENT ON TABLE notifications IS 'RLS: Users view/update own, system inserts';

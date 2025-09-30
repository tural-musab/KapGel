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

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (id = auth.uid());

-- VENDORS
CREATE POLICY "Admins can manage vendors" ON vendors FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "Vendor admins can view their own vendor" ON vendors FOR SELECT USING (owner_user_id = auth.uid());

-- BRANCHES
CREATE POLICY "Public can view branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Vendor admins can manage their own branches" ON branches FOR ALL USING (
  (SELECT owner_user_id FROM vendors WHERE id = vendor_id) = auth.uid()
);

-- ORDERS
CREATE POLICY "Customers can view their own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendor admins can view their branch orders" ON orders FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE b.id = branch_id
      AND v.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Vendor admins can update their branch orders" ON orders FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE b.id = branch_id
      AND v.owner_user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE b.id = branch_id
      AND v.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Vendor admins can delete their branch orders" ON orders FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE b.id = branch_id
      AND v.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Couriers can view their assigned orders" ON orders FOR SELECT USING (
  courier_id = (SELECT id FROM couriers WHERE user_id = auth.uid())
);

-- ORDER ITEMS
CREATE POLICY "Customers can view their order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_id
      AND o.customer_id = auth.uid()
  )
);

CREATE POLICY "Vendor admins can view their branch order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM orders o
    JOIN branches b ON b.id = o.branch_id
    JOIN vendors v ON v.id = b.vendor_id
    WHERE o.id = order_id
      AND v.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Couriers can view their assigned order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM orders o
    JOIN couriers c ON c.id = o.courier_id
    WHERE o.id = order_id
      AND c.user_id = auth.uid()
  )
);

-- COURIERS
CREATE POLICY "Vendor admins can manage their couriers" ON couriers FOR ALL USING (
  vendor_id IN (SELECT id FROM vendors WHERE owner_user_id = auth.uid())
) WITH CHECK (
  vendor_id IN (SELECT id FROM vendors WHERE owner_user_id = auth.uid())
);

-- PRODUCTS, CATEGORIES, INVENTORIES
CREATE POLICY "Public can view products and categories" ON products FOR SELECT USING (true);
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Vendor admins can manage their own products" ON products FOR ALL USING (
  vendor_id = (SELECT id FROM vendors WHERE owner_user_id = auth.uid())
);
CREATE POLICY "Vendor admins can manage their own categories" ON categories FOR ALL USING (
  vendor_id = (SELECT id FROM vendors WHERE owner_user_id = auth.uid())
);
CREATE POLICY "Vendor admins can manage their own inventories" ON inventories FOR ALL USING (
  branch_id IN (SELECT id FROM branches WHERE vendor_id = (SELECT id FROM vendors WHERE owner_user_id = auth.uid()))
);

-- Default DENY
-- (No explicit DENY needed, RLS defaults to deny)

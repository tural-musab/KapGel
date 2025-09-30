-- Supabase canonical schema and RLS policies for KapGel
-- Generated from db/schema.sql and db/rls.sql

-- Schema definition
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor_admin', 'courier', 'admin')),
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tax_no TEXT,
    owner_user_id UUID REFERENCES users(id),
    is_pickup_enabled BOOLEAN DEFAULT false,
    has_own_couriers BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address_text TEXT,
    geo_point GEOGRAPHY(Point),
    delivery_zone_geojson JSONB
);

CREATE TABLE couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    vehicle_type TEXT,
    shift_status TEXT DEFAULT 'offline' CHECK (shift_status IN ('online', 'offline'))
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort INTEGER
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    is_active BOOLEAN DEFAULT true,
    photo_url TEXT
);

CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    stock_policy TEXT DEFAULT 'infinite' CHECK (stock_policy IN ('infinite', 'finite')),
    qty INTEGER,
    UNIQUE(branch_id, product_id)
);

CREATE TYPE order_type AS ENUM ('delivery', 'pickup');
CREATE TYPE order_status AS ENUM ('NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED', 'REJECTED', 'CANCELED_BY_USER', 'CANCELED_BY_VENDOR');
CREATE TYPE payment_method AS ENUM ('cash', 'card_on_pickup');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    courier_id UUID REFERENCES couriers(id),
    type order_type NOT NULL,
    address_text TEXT,
    geo_point GEOGRAPHY(Point),
    status order_status DEFAULT 'NEW',
    items_total NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    name_snapshot TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    qty INTEGER NOT NULL,
    total NUMERIC(10, 2) NOT NULL
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    type TEXT NOT NULL,
    payload_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE notification_channel AS ENUM ('webpush', 'email', 'sms');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    token_or_addr TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TYPE plan_type AS ENUM ('fixed', 'revenue_target');

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type plan_type NOT NULL,
    price_monthly NUMERIC(10, 2),
    revenue_threshold NUMERIC(10, 2)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    status TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
);

CREATE TABLE courier_locations (
    id BIGSERIAL PRIMARY KEY,
    courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    position GEOGRAPHY(Point) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE neighborhoods (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- RLS configuration
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

CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage vendors" ON vendors FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "Vendor admins can view their own vendor" ON vendors FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "Public can view branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Vendor admins can manage their own branches" ON branches FOR ALL USING (
  (SELECT owner_user_id FROM vendors WHERE id = vendor_id) = auth.uid()
);

CREATE POLICY "Customers can view their own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendor admins can view their branch orders" ON orders FOR SELECT USING (
  branch_id IN (SELECT id FROM branches WHERE vendor_id = (SELECT vendor_id FROM branches WHERE id = branch_id LIMIT 1))
);
CREATE POLICY "Couriers can view their assigned orders" ON orders FOR SELECT USING (courier_id = (SELECT id FROM couriers WHERE user_id = auth.uid()));

CREATE POLICY "Vendor admins can manage their couriers" ON couriers FOR ALL USING (
  vendor_id = (SELECT vendor_id FROM branches WHERE id IN (SELECT branch_id FROM orders WHERE courier_id = id) LIMIT 1)
);

CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
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

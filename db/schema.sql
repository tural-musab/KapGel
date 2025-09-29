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

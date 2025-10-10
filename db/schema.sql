CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('pending', 'customer', 'vendor_admin', 'courier', 'admin', 'vendor_admin_pending', 'courier_pending')),
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE vendor_business_type AS ENUM ('restaurant', 'market', 'grocery', 'cafe', 'pharmacy');

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tax_no TEXT,
    owner_user_id UUID REFERENCES users(id),
    is_pickup_enabled BOOLEAN DEFAULT false,
    has_own_couriers BOOLEAN DEFAULT false,
    business_type vendor_business_type DEFAULT 'restaurant',
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

CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE vendor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT,
    business_type vendor_business_type NOT NULL DEFAULT 'restaurant',
    contact_phone TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id)
);

CREATE TABLE courier_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id)
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

-- Functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  order_input jsonb,
  items_input jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order public.orders;
  inserted_items jsonb := '[]'::jsonb;
  order_items_total numeric := nullif(order_input->>'items_total', '')::numeric;
  order_total numeric := nullif(order_input->>'total', '')::numeric;
  order_delivery_fee numeric := coalesce(nullif(order_input->>'delivery_fee', '')::numeric, 0);
  requested_customer_id uuid := nullif(order_input->>'customer_id', '')::uuid;
  authenticated_customer_id uuid := auth.uid();
  caller_role text := public.get_my_role();
  sanitized_courier_id uuid := null;
  sanitized_branch_id uuid := nullif(order_input->>'branch_id', '')::uuid;
  branch_vendor_id uuid;
  courier_vendor_id uuid;
  calculated_items_total numeric := 0;
  calculated_order_total numeric := 0;
  sanitized_payment_method public.payment_method;
  sanitized_order_type public.order_type;
  sanitized_address text := nullif(order_input->>'address_text', '');
  sanitized_geo geography := NULL;
  item_record jsonb;
  item_unit_price numeric;
  item_qty integer;
  item_total numeric;
  provided_item_total numeric;
  mismatch_tolerance numeric := 0.01;
BEGIN
  IF order_input IS NULL THEN
    RAISE EXCEPTION 'order_input cannot be null';
  END IF;

  IF items_input IS NULL OR jsonb_typeof(items_input) <> 'array' OR jsonb_array_length(items_input) = 0 THEN
    RAISE EXCEPTION 'items_input must be a non-empty array';
  END IF;

  IF authenticated_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required to create order';
  END IF;

  IF requested_customer_id IS NOT NULL AND requested_customer_id <> authenticated_customer_id THEN
    RAISE EXCEPTION 'customer_id mismatch between payload and auth context';
  END IF;

  IF sanitized_branch_id IS NULL THEN
    RAISE EXCEPTION 'branch_id is required to create order';
  END IF;

  SELECT vendor_id INTO branch_vendor_id FROM public.branches WHERE id = sanitized_branch_id;

  IF branch_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Invalid branch_id supplied';
  END IF;

  IF sanitized_address IS NULL THEN
    RAISE EXCEPTION 'address_text is required';
  END IF;

  IF nullif(order_input->>'payment_method', '') IS NULL THEN
    RAISE EXCEPTION 'payment_method is required';
  END IF;

  sanitized_payment_method := (order_input->>'payment_method')::public.payment_method;

  IF nullif(order_input->>'type', '') IS NULL THEN
    RAISE EXCEPTION 'type is required';
  END IF;

  sanitized_order_type := (order_input->>'type')::public.order_type;

  IF order_delivery_fee < 0 THEN
    RAISE EXCEPTION 'delivery_fee cannot be negative';
  END IF;

  FOR item_record IN
    SELECT value FROM jsonb_array_elements(items_input) AS item(value)
  LOOP
    IF nullif(item_record->>'product_id', '') IS NULL THEN
      RAISE EXCEPTION 'Each order item must include product_id';
    END IF;

    item_unit_price := (item_record->>'unit_price')::numeric;
    item_qty := (item_record->>'qty')::integer;

    IF item_unit_price < 0 THEN
      RAISE EXCEPTION 'Item unit_price cannot be negative';
    END IF;

    IF item_qty <= 0 THEN
      RAISE EXCEPTION 'Item qty must be greater than zero';
    END IF;

    item_total := item_unit_price * item_qty;

    IF item_record ? 'total' THEN
      provided_item_total := (item_record->>'total')::numeric;

      IF abs(provided_item_total - item_total) > mismatch_tolerance THEN
        RAISE EXCEPTION 'Item total does not match unit_price * qty';
      END IF;
    END IF;

    calculated_items_total := calculated_items_total + item_total;
  END LOOP;

  IF calculated_items_total <= 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item with a positive total';
  END IF;

  order_items_total := calculated_items_total;
  calculated_order_total := calculated_items_total + order_delivery_fee;

  IF order_total IS NOT NULL AND abs(order_total - calculated_order_total) > mismatch_tolerance THEN
    RAISE EXCEPTION 'Order total must equal items_total + delivery_fee';
  END IF;

  order_total := calculated_order_total;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unable to determine caller role';
  END IF;

  IF caller_role = 'customer' THEN
    IF nullif(order_input->>'courier_id', '') IS NOT NULL THEN
      RAISE EXCEPTION 'Customers cannot assign courier_id';
    END IF;
    sanitized_courier_id := NULL;
  ELSIF caller_role IN ('vendor_admin', 'admin') THEN
    sanitized_courier_id := nullif(order_input->>'courier_id', '')::uuid;
  ELSE
    IF nullif(order_input->>'courier_id', '') IS NOT NULL THEN
      RAISE EXCEPTION 'Role % cannot assign courier_id', caller_role;
    END IF;
    sanitized_courier_id := NULL;
  END IF;

  IF sanitized_courier_id IS NOT NULL THEN
    SELECT vendor_id INTO courier_vendor_id FROM public.couriers WHERE id = sanitized_courier_id;

    IF courier_vendor_id IS NULL THEN
      RAISE EXCEPTION 'Courier does not exist';
    END IF;

    IF courier_vendor_id <> branch_vendor_id THEN
      RAISE EXCEPTION 'Courier does not belong to branch vendor';
    END IF;
  END IF;

  IF nullif(order_input->>'geo_point', '') IS NOT NULL THEN
    sanitized_geo := nullif(order_input->>'geo_point', '')::geography;
  END IF;

  INSERT INTO public.orders (
    customer_id,
    branch_id,
    courier_id,
    address_text,
    geo_point,
    payment_method,
    items_total,
    delivery_fee,
    total,
    type
  )
  VALUES (
    authenticated_customer_id,
    sanitized_branch_id,
    sanitized_courier_id,
    sanitized_address,
    sanitized_geo,
    sanitized_payment_method,
    order_items_total,
    order_delivery_fee,
    order_total,
    sanitized_order_type
  )
  RETURNING * INTO new_order;

  WITH inserted AS (
    INSERT INTO public.order_items (
      order_id,
      product_id,
      name_snapshot,
      unit_price,
      qty,
      total
    )
    SELECT
      new_order.id,
      (item->>'product_id')::uuid,
      item->>'name_snapshot',
      (item->>'unit_price')::numeric,
      (item->>'qty')::integer,
      (item->>'total')::numeric
    FROM jsonb_array_elements(items_input) AS item
    RETURNING *
  )
  SELECT coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  INTO inserted_items
  FROM inserted;

  RETURN jsonb_build_object(
    'order', to_jsonb(new_order),
    'items', inserted_items
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

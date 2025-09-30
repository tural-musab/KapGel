-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- Enumerated types
create type public.notification_channel as enum ('webpush', 'email', 'sms');
create type public.order_status as enum (
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'PICKED_UP',
  'ON_ROUTE',
  'DELIVERED',
  'REJECTED',
  'CANCELED_BY_USER',
  'CANCELED_BY_VENDOR'
);
create type public.order_type as enum ('delivery', 'pickup');
create type public.payment_method as enum ('cash', 'card_on_pickup');
create type public.plan_type as enum ('fixed', 'revenue_target');

-- Core tables
create table public.users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('customer', 'vendor_admin', 'courier', 'admin')),
  phone text unique,
  email text unique,
  created_at timestamptz default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_no text,
  owner_user_id uuid references public.users(id),
  is_pickup_enabled boolean default false,
  has_own_couriers boolean default false,
  verified boolean default false
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  name text not null,
  phone text,
  address_text text,
  geo_point geography(point, 4326),
  delivery_zone_geojson jsonb
);

create table public.couriers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  is_active boolean default true,
  vehicle_type text,
  shift_status text default 'offline' check (shift_status in ('online', 'offline'))
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  sort integer
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  price numeric(10, 2) not null,
  currency text default 'TRY',
  is_active boolean default true,
  photo_url text
);

create table public.inventories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  stock_policy text default 'infinite' check (stock_policy in ('infinite', 'finite')),
  qty integer,
  constraint inventories_branch_product_unique unique (branch_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.users(id),
  branch_id uuid references public.branches(id),
  courier_id uuid references public.couriers(id),
  type public.order_type not null,
  address_text text,
  geo_point geography(point, 4326),
  status public.order_status default 'NEW',
  items_total numeric(10, 2) not null,
  delivery_fee numeric(10, 2) default 0,
  total numeric(10, 2) not null,
  payment_method public.payment_method not null,
  created_at timestamptz default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  name_snapshot text not null,
  unit_price numeric(10, 2) not null,
  qty integer not null,
  total numeric(10, 2) not null
);

create table public.events (
  id bigserial primary key,
  order_id uuid references public.orders(id),
  type text not null,
  payload_json jsonb,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  channel public.notification_channel not null,
  token_or_addr text not null,
  is_active boolean default true
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.plan_type not null,
  price_monthly numeric(10, 2),
  revenue_threshold numeric(10, 2)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  plan_id uuid references public.plans(id),
  status text,
  period_start timestamptz,
  period_end timestamptz
);

create table public.courier_locations (
  id bigserial primary key,
  courier_id uuid references public.couriers(id) on delete cascade,
  order_id uuid references public.orders(id),
  position geography(point, 4326) not null,
  updated_at timestamptz default now()
);

create table public.cities (
  id serial primary key,
  name text not null
);

create table public.districts (
  id serial primary key,
  city_id integer references public.cities(id) on delete cascade,
  name text not null
);

create table public.neighborhoods (
  id serial primary key,
  district_id integer references public.districts(id) on delete cascade,
  name text not null
);

-- Row Level Security toggles
alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.branches enable row level security;
alter table public.couriers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.courier_locations enable row level security;
alter table public.cities enable row level security;
alter table public.districts enable row level security;
alter table public.neighborhoods enable row level security;

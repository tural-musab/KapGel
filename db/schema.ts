/**
 * Canonical database schema lives in the SQL migrations under `supabase/migrations/`.
 *
 * This TypeScript module is intentionally maintained as a read-only helper for
 * IDE autocomplete and type inference when writing Supabase queries. Update the
 * shapes below after running `supabase db push` or generating fresh TypeScript
 * types with `supabase gen types typescript --linked`. Do not import runtime
 * libraries here.
 */

export type UUID = string;
export type ISODateString = string; // e.g. `2025-02-04T12:00:00Z`
export type NumericString = string; // preserves precision for NUMERIC columns

export type OrderType = 'delivery' | 'pickup';
export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'PICKED_UP'
  | 'ON_ROUTE'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELED_BY_USER'
  | 'CANCELED_BY_VENDOR';
export type PaymentMethod = 'cash' | 'card_on_pickup';
export type NotificationChannel = 'webpush' | 'email' | 'sms';
export type PlanType = 'fixed' | 'revenue_target';

export type GeographyPoint = string; // WKT or GeoJSON text handled via PostGIS

export interface UsersRow {
  id: UUID;
  role: 'customer' | 'vendor_admin' | 'courier' | 'admin';
  phone: string | null;
  email: string | null;
  created_at: ISODateString | null;
}

export interface VendorsRow {
  id: UUID;
  name: string;
  tax_no: string | null;
  owner_user_id: UUID | null;
  is_pickup_enabled: boolean | null;
  has_own_couriers: boolean | null;
  verified: boolean | null;
}

export interface BranchesRow {
  id: UUID;
  vendor_id: UUID | null;
  name: string;
  phone: string | null;
  address_text: string | null;
  geo_point: GeographyPoint | null;
  delivery_zone_geojson: Record<string, unknown> | null;
}

export interface CouriersRow {
  id: UUID;
  vendor_id: UUID | null;
  user_id: UUID | null;
  is_active: boolean | null;
  vehicle_type: string | null;
  shift_status: 'online' | 'offline' | null;
}

export interface CategoriesRow {
  id: UUID;
  vendor_id: UUID | null;
  name: string;
  is_active: boolean | null;
  sort: number | null;
}

export interface ProductsRow {
  id: UUID;
  vendor_id: UUID | null;
  category_id: UUID | null;
  name: string;
  price: NumericString;
  currency: string | null;
  is_active: boolean | null;
  photo_url: string | null;
}

export interface InventoriesRow {
  id: UUID;
  branch_id: UUID | null;
  product_id: UUID | null;
  stock_policy: 'infinite' | 'finite' | null;
  qty: number | null;
}

export interface OrdersRow {
  id: UUID;
  customer_id: UUID | null;
  branch_id: UUID | null;
  courier_id: UUID | null;
  type: OrderType;
  address_text: string | null;
  geo_point: GeographyPoint | null;
  status: OrderStatus | null;
  items_total: NumericString;
  delivery_fee: NumericString | null;
  total: NumericString;
  payment_method: PaymentMethod;
  created_at: ISODateString | null;
}

export interface OrderItemsRow {
  id: UUID;
  order_id: UUID | null;
  product_id: UUID | null;
  name_snapshot: string;
  unit_price: NumericString;
  qty: number;
  total: NumericString;
}

export interface EventsRow {
  id: number;
  order_id: UUID | null;
  type: string;
  payload_json: Record<string, unknown> | null;
  created_at: ISODateString | null;
}

export interface NotificationsRow {
  id: UUID;
  user_id: UUID | null;
  channel: NotificationChannel;
  token_or_addr: string;
  is_active: boolean | null;
}

export interface PlansRow {
  id: UUID;
  name: string;
  type: PlanType;
  price_monthly: NumericString | null;
  revenue_threshold: NumericString | null;
}

export interface SubscriptionsRow {
  id: UUID;
  vendor_id: UUID | null;
  plan_id: UUID | null;
  status: string | null;
  period_start: ISODateString | null;
  period_end: ISODateString | null;
}

export interface CourierLocationsRow {
  id: number;
  courier_id: UUID | null;
  order_id: UUID | null;
  position: GeographyPoint;
  updated_at: ISODateString | null;
}

export interface CitiesRow {
  id: number;
  name: string;
}

export interface DistrictsRow {
  id: number;
  city_id: number | null;
  name: string;
}

export interface NeighborhoodsRow {
  id: number;
  district_id: number | null;
  name: string;
}

export interface DatabaseTables {
  users: UsersRow;
  vendors: VendorsRow;
  branches: BranchesRow;
  couriers: CouriersRow;
  categories: CategoriesRow;
  products: ProductsRow;
  inventories: InventoriesRow;
  orders: OrdersRow;
  order_items: OrderItemsRow;
  events: EventsRow;
  notifications: NotificationsRow;
  plans: PlansRow;
  subscriptions: SubscriptionsRow;
  courier_locations: CourierLocationsRow;
  cities: CitiesRow;
  districts: DistrictsRow;
  neighborhoods: NeighborhoodsRow;
}

export interface Database {
  public: {
    Tables: DatabaseTables;
  };
}

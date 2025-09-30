import { pgTable, uuid, text, boolean, integer, numeric, jsonb, timestamp, pgEnum, serial, customType } from 'drizzle-orm/pg-core';

/**
 * Drizzle models are retained purely for type inference – Supabase SQL files under `db/`
 * remain the canonical source of truth for the schema.
 */

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(point,4326)';
  },
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role').notNull(), // 'customer', 'vendor_admin', 'courier', 'admin'
  phone: text('phone').unique(),
  email: text('email').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  taxNo: text('tax_no'),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  isPickupEnabled: boolean('is_pickup_enabled').default(false),
  hasOwnCouriers: boolean('has_own_couriers').default(false),
  verified: boolean('verified').default(false),
});

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  addressText: text('address_text'),
  geoPoint: geographyPoint('geo_point'),
  deliveryZoneGeojson: jsonb('delivery_zone_geojson'),
});

export const couriers = pgTable('couriers', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true),
  vehicleType: text('vehicle_type'),
  shiftStatus: text('shift_status').default('offline'), // 'online', 'offline'
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true),
  sort: integer('sort'),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('TRY'),
  isActive: boolean('is_active').default(true),
  photoUrl: text('photo_url'),
});

export const inventories = pgTable('inventories', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  stockPolicy: text('stock_policy').default('infinite'), // 'infinite', 'finite'
  qty: integer('qty'),
});

export const orderTypeEnum = pgEnum('order_type', ['delivery', 'pickup']);
export const orderStatusEnum = pgEnum('order_status', ['NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED', 'REJECTED', 'CANCELED_BY_USER', 'CANCELED_BY_VENDOR']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card_on_pickup']);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => users.id),
  branchId: uuid('branch_id').references(() => branches.id),
  courierId: uuid('courier_id').references(() => couriers.id),
  type: orderTypeEnum('type').notNull(),
  addressText: text('address_text'),
  geoPoint: geographyPoint('geo_point'),
  status: orderStatusEnum('status').default('NEW'),
  itemsTotal: numeric('items_total', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  nameSnapshot: text('name_snapshot').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  qty: integer('qty').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  orderId: uuid('order_id').references(() => orders.id),
  type: text('type').notNull(),
  payloadJson: jsonb('payload_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationChannelEnum = pgEnum('notification_channel', ['webpush', 'email', 'sms']);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  tokenOrAddr: text('token_or_addr').notNull(),
  isActive: boolean('is_active').default(true),
});

export const planTypeEnum = pgEnum('plan_type', ['fixed', 'revenue_target']);

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: planTypeEnum('type').notNull(),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 }),
  revenueThreshold: numeric('revenue_threshold', { precision: 10, scale: 2 }),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => plans.id),
  status: text('status'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
});

export const courierLocations = pgTable('courier_locations', {
  id: serial('id').primaryKey(),
  courierId: uuid('courier_id').references(() => couriers.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id),
  position: geographyPoint('position').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  cityId: integer('city_id').references(() => cities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const neighborhoods = pgTable('neighborhoods', {
  id: serial('id').primaryKey(),
  districtId: integer('district_id').references(() => districts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

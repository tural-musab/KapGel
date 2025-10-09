import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Modern Test Data Seeder for KapGel
// Rich, realistic data for development and testing
// Location: Baku, Azerbaijan

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('❌ Supabase credentials missing in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Helper: Random element from array
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Generate geo point (Baku coordinates)
const bakuCoords = {
  center: { lat: 40.4093, lng: 49.8671 },
  range: 0.05 // ~5km radius
};

const randomGeoPoint = () => {
  const lat = bakuCoords.center.lat + (Math.random() - 0.5) * bakuCoords.range;
  const lng = bakuCoords.center.lng + (Math.random() - 0.5) * bakuCoords.range;
  return `POINT(${lng} ${lat})`; // PostGIS format
};

async function clearDatabase() {
  console.log('🧹 Cleaning existing data...');

  const tables = [
    'courier_locations',
    'events',
    'order_items',
    'orders',
    'inventories',
    'products',
    'categories',
    'couriers',
    'branches',
    'vendors',
    'notifications',
    'courier_applications',
    'vendor_applications',
    'users',
    'neighborhoods',
    'districts',
    'cities'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete();
    if (error && !error.message.includes('violates foreign key')) {
      console.warn(`⚠️  Error clearing ${table}:`, error.message);
    }
  }

  console.log('✅ Database cleaned\n');
}

async function seedGeography() {
  console.log('🌍 Seeding geography data...');

  // Baku
  const { data: city } = await supabase
    .from('cities')
    .insert([{ name: 'Baku' }])
    .select()
    .single();

  // Districts
  const { data: districts } = await supabase
    .from('districts')
    .insert([
      { city_id: city.id, name: 'Nasimi' },
      { city_id: city.id, name: 'Sabail' },
      { city_id: city.id, name: 'Yasamal' },
      { city_id: city.id, name: 'Nizami' },
    ])
    .select();

  // Neighborhoods
  await supabase.from('neighborhoods').insert([
    { district_id: districts[0].id, name: 'Koroglu' },
    { district_id: districts[0].id, name: 'Uzeyir Hacibeyov' },
    { district_id: districts[1].id, name: 'Old City (Icheri Sheher)' },
    { district_id: districts[1].id, name: 'Fountains Square' },
    { district_id: districts[2].id, name: 'Ganjlik' },
    { district_id: districts[3].id, name: 'Nizami Street' },
  ]);

  console.log('✅ Geography seeded\n');
  return { city, districts };
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  const { data: users } = await supabase
    .from('users')
    .insert([
      // Admins
      { role: 'admin', email: 'admin@kapgel.az', phone: '+994501234567' },
      
      // Vendor Admins (5)
      { role: 'vendor_admin', email: 'owner@bellissimo.az', phone: '+994502345678' },
      { role: 'vendor_admin', email: 'owner@kebabhouse.az', phone: '+994503456789' },
      { role: 'vendor_admin', email: 'owner@freshmarket.az', phone: '+994504567890' },
      { role: 'vendor_admin', email: 'owner@coffeelab.az', phone: '+994505678901' },
      { role: 'vendor_admin', email: 'owner@orientstar.az', phone: '+994506789012' },
      
      // Couriers (10)
      ...Array.from({ length: 10 }, (_, i) => ({
        role: 'courier',
        email: `courier${i + 1}@kapgel.az`,
        phone: `+99450${7000000 + i}`
      })),
      
      // Customers (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        role: 'customer',
        email: `customer${i + 1}@test.az`,
        phone: `+99455${1000000 + i}`
      })),
    ])
    .select();

  console.log(`✅ Seeded ${users.length} users\n`);
  return users;
}

async function seedVendorsAndBranches(users) {
  console.log('🏪 Seeding vendors and branches...');

  const vendorAdmins = users.filter(u => u.role === 'vendor_admin');
  
  const vendorsData = [
    {
      name: 'Bellissimo Ristorante',
      business_type: 'restaurant',
      owner: vendorAdmins[0],
      verified: true,
      has_own_couriers: true,
      branches: [
        { name: 'Bellissimo Center', address: '28 May Street, Nasimi District' },
        { name: 'Bellissimo Sahil', address: 'Baku Boulevard, Sabail District' }
      ]
    },
    {
      name: 'Kebab House Baku',
      business_type: 'restaurant',
      owner: vendorAdmins[1],
      verified: true,
      has_own_couriers: true,
      branches: [
        { name: 'Kebab House Main', address: 'Nizami Street 45, Nizami District' }
      ]
    },
    {
      name: 'Fresh Market Baku',
      business_type: 'market',
      owner: vendorAdmins[2],
      verified: true,
      has_own_couriers: true,
      branches: [
        { name: 'Fresh Market Ganjlik', address: 'Nobel Avenue, Yasamal District' },
        { name: 'Fresh Market Center', address: 'Azadliq Square, Nasimi District' }
      ]
    },
    {
      name: 'Coffee Lab',
      business_type: 'cafe',
      owner: vendorAdmins[3],
      verified: true,
      has_own_couriers: false,
      branches: [
        { name: 'Coffee Lab Fountains', address: 'Fountains Square, Sabail District' }
      ]
    },
    {
      name: 'Orient Star Restaurant',
      business_type: 'restaurant',
      owner: vendorAdmins[4],
      verified: true,
      has_own_couriers: true,
      branches: [
        { name: 'Orient Star Premium', address: 'Port Baku Mall, Sabail District' }
      ]
    }
  ];

  const vendors = [];
  const branches = [];

  for (const vData of vendorsData) {
    // Insert vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        name: vData.name,
        business_type: vData.business_type,
        owner_user_id: vData.owner.id,
        verified: vData.verified,
        has_own_couriers: vData.has_own_couriers
      })
      .select()
      .single();

    vendors.push(vendor);

    // Insert branches
    for (const branchData of vData.branches) {
      const { data: branch } = await supabase
        .from('branches')
        .insert({
          vendor_id: vendor.id,
          name: branchData.name,
          address_text: branchData.address,
          phone: `+99412${Math.floor(Math.random() * 9000000 + 1000000)}`
        })
        .select()
        .single();

      branches.push(branch);
    }
  }

  console.log(`✅ Seeded ${vendors.length} vendors with ${branches.length} branches\n`);
  return { vendors, branches };
}

async function seedCategories(vendors) {
  console.log('📂 Seeding categories...');

  const categoriesData = {
    restaurant: ['Pizza & Pasta', 'Burgers & Sandwiches', 'Salads', 'Desserts', 'Beverages'],
    market: ['Fresh Fruits', 'Vegetables', 'Dairy Products', 'Bakery', 'Beverages'],
    cafe: ['Coffee', 'Tea', 'Pastries', 'Sandwiches', 'Beverages']
  };

  const categories = [];

  for (const vendor of vendors) {
    const categoryNames = categoriesData[vendor.business_type] || categoriesData.restaurant;
    
    for (let i = 0; i < categoryNames.length; i++) {
      const { data: category } = await supabase
        .from('categories')
        .insert({
          vendor_id: vendor.id,
          name: categoryNames[i],
          sort: i,
          is_active: true
        })
        .select()
        .single();

      categories.push(category);
    }
  }

  console.log(`✅ Seeded ${categories.length} categories\n`);
  return categories;
}

async function seedProducts(vendors, categories) {
  console.log('🍕 Seeding products...');

  const productsByCategory = {
    'Pizza & Pasta': [
      { name: 'Margherita Pizza', price: 28.90, desc: 'Classic tomato, mozzarella, fresh basil' },
      { name: 'Pepperoni Pizza', price: 32.90, desc: 'Spicy pepperoni, mozzarella, tomato sauce' },
      { name: 'Four Cheese Pizza', price: 34.90, desc: 'Mozzarella, gorgonzola, parmesan, fontina' },
      { name: 'Spaghetti Carbonara', price: 24.90, desc: 'Classic Italian pasta with bacon and eggs' },
      { name: 'Penne Arrabiata', price: 22.90, desc: 'Spicy tomato sauce with garlic' },
    ],
    'Burgers & Sandwiches': [
      { name: 'Classic Burger', price: 18.90, desc: 'Beef patty, lettuce, tomato, special sauce' },
      { name: 'Cheeseburger', price: 21.90, desc: 'Double cheese, beef, pickles' },
      { name: 'Chicken Burger', price: 19.90, desc: 'Grilled chicken, mayo, lettuce' },
      { name: 'Club Sandwich', price: 16.90, desc: 'Triple decker with turkey and bacon' },
    ],
    'Coffee': [
      { name: 'Espresso', price: 4.50, desc: 'Single shot Italian espresso' },
      { name: 'Cappuccino', price: 6.90, desc: 'Espresso with steamed milk foam' },
      { name: 'Latte', price: 7.50, desc: 'Smooth espresso with milk' },
      { name: 'Americano', price: 5.50, desc: 'Espresso with hot water' },
      { name: 'Flat White', price: 8.50, desc: 'Double shot espresso with microfoam' },
    ],
    'Fresh Fruits': [
      { name: 'Organic Apples', price: 8.90, desc: 'Fresh red apples (1 kg)' },
      { name: 'Bananas', price: 5.90, desc: 'Sweet yellow bananas (1 kg)' },
      { name: 'Strawberries', price: 12.90, desc: 'Fresh strawberries (500g)' },
      { name: 'Oranges', price: 7.90, desc: 'Juicy oranges (1 kg)' },
    ],
    'Salads': [
      { name: 'Caesar Salad', price: 15.90, desc: 'Romaine, parmesan, croutons, Caesar dressing' },
      { name: 'Greek Salad', price: 14.90, desc: 'Tomatoes, cucumber, feta, olives' },
      { name: 'Caprese Salad', price: 16.90, desc: 'Fresh mozzarella, tomatoes, basil' },
    ],
    'Desserts': [
      { name: 'Tiramisu', price: 12.90, desc: 'Classic Italian coffee dessert' },
      { name: 'Chocolate Cake', price: 11.90, desc: 'Rich chocolate layer cake' },
      { name: 'Cheesecake', price: 13.90, desc: 'New York style cheesecake' },
    ]
  };

  let totalProducts = 0;

  for (const vendor of vendors) {
    const vendorCategories = categories.filter(c => c.vendor_id === vendor.id);

    for (const category of vendorCategories) {
      const products = productsByCategory[category.name] || [
        { name: `${category.name} Item 1`, price: 15.00, desc: 'Delicious option' },
        { name: `${category.name} Item 2`, price: 18.00, desc: 'Popular choice' },
      ];

      for (const product of products) {
        await supabase.from('products').insert({
          vendor_id: vendor.id,
          category_id: category.id,
          name: product.name,
          price: product.price,
          currency: 'AZN',
          is_active: true,
          photo_url: null // Placeholder for future image upload
        });

        totalProducts++;
      }
    }
  }

  console.log(`✅ Seeded ${totalProducts} products\n`);
}

async function seedCouriers(users, vendors) {
  console.log('🚴 Seeding couriers...');

  const courierUsers = users.filter(u => u.role === 'courier');
  const vehicleTypes = ['motorcycle', 'bicycle', 'car'];
  const couriers = [];

  let courierIndex = 0;
  for (const vendor of vendors) {
    if (!vendor.has_own_couriers) continue;

    // Each vendor with couriers gets 2-3 couriers
    const courierCount = Math.floor(Math.random() * 2) + 2; // 2 or 3

    for (let i = 0; i < courierCount && courierIndex < courierUsers.length; i++) {
      const { data: courier } = await supabase
        .from('couriers')
        .insert({
          user_id: courierUsers[courierIndex].id,
          vendor_id: vendor.id,
          vehicle_type: random(vehicleTypes),
          shift_status: Math.random() > 0.5 ? 'online' : 'offline',
          is_active: true
        })
        .select()
        .single();

      couriers.push(courier);
      courierIndex++;
    }
  }

  console.log(`✅ Seeded ${couriers.length} couriers\n`);
  return couriers;
}

async function seedOrders(users, branches, couriers) {
  console.log('📦 Seeding sample orders...');

  const customers = users.filter(u => u.role === 'customer');
  const statuses = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED'];
  const orderTypes = ['delivery', 'pickup'];
  const paymentMethods = ['cash', 'card_on_pickup'];

  const orders = [];

  // Create 20 sample orders
  for (let i = 0; i < 20; i++) {
    const customer = random(customers);
    const branch = random(branches);
    const orderType = random(orderTypes);
    const status = random(statuses);
    
    // Get products for this branch
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', branch.vendor_id)
      .eq('is_active', true)
      .limit(5);

    if (!products || products.length === 0) continue;

    // Pick 1-3 random products
    const orderProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    const itemsTotal = orderProducts.reduce((sum, p) => sum + Number(p.price), 0);
    const deliveryFee = orderType === 'delivery' ? 5.00 : 0;
    const total = itemsTotal + deliveryFee;

    // Assign courier if status requires it
    let assignedCourier = null;
    if (['PICKED_UP', 'ON_ROUTE', 'DELIVERED'].includes(status)) {
      const vendorCouriers = couriers.filter(c => c.vendor_id === branch.vendor_id);
      if (vendorCouriers.length > 0) {
        assignedCourier = random(vendorCouriers);
      }
    }

    const { data: order } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        branch_id: branch.id,
        courier_id: assignedCourier?.id,
        type: orderType,
        status: status,
        items_total: itemsTotal,
        delivery_fee: deliveryFee,
        total: total,
        payment_method: random(paymentMethods),
        address_text: orderType === 'delivery' ? 
          `${Math.floor(Math.random() * 100) + 1} ${random(['Nizami', '28 May', 'Nobel', 'Azadliq'])} Street, Baku` : 
          null,
      })
      .select()
      .single();

    if (order) {
      orders.push(order);

      // Insert order items
      for (const product of orderProducts) {
        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: product.id,
          name_snapshot: product.name,
          unit_price: product.price,
          qty: 1,
          total: product.price
        });
      }

      // Insert order events for status history
      await supabase.from('events').insert({
        order_id: order.id,
        type: `order_${status.toLowerCase()}`,
        payload_json: { status, timestamp: new Date().toISOString() }
      });
    }
  }

  console.log(`✅ Seeded ${orders.length} orders with items\n`);
  return orders;
}

async function seedCourierLocations(couriers, orders) {
  console.log('📍 Seeding courier locations...');

  let locationCount = 0;

  for (const courier of couriers) {
    if (courier.shift_status !== 'online') continue;

    // Find active orders for this courier
    const activeOrders = orders.filter(o => 
      o.courier_id === courier.id && 
      ['PICKED_UP', 'ON_ROUTE'].includes(o.status)
    );

    if (activeOrders.length === 0) {
      // Add random location for online courier
      await supabase.rpc('insert_courier_location', {
        _courier_id: courier.id,
        _lat: bakuCoords.center.lat + (Math.random() - 0.5) * bakuCoords.range,
        _lng: bakuCoords.center.lng + (Math.random() - 0.5) * bakuCoords.range,
        _order_id: null,
        _accuracy: 10 + Math.random() * 20,
        _heading: Math.random() * 360,
        _speed: Math.random() * 10,
        _is_manual: false
      });
      locationCount++;
    } else {
      // Add location for each active order
      for (const order of activeOrders) {
        await supabase.rpc('insert_courier_location', {
          _courier_id: courier.id,
          _lat: bakuCoords.center.lat + (Math.random() - 0.5) * bakuCoords.range,
          _lng: bakuCoords.center.lng + (Math.random() - 0.5) * bakuCoords.range,
          _order_id: order.id,
          _accuracy: 10 + Math.random() * 20,
          _heading: Math.random() * 360,
          _speed: Math.random() * 15,
          _is_manual: false
        });
        locationCount++;
      }
    }
  }

  console.log(`✅ Seeded ${locationCount} courier locations\n`);
}

async function main() {
  console.log('\n🚀 KapGel Modern Data Seeder\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Clear existing data
    await clearDatabase();
    
    // Step 2: Seed geography
    const { city, districts } = await seedGeography();
    
    // Step 3: Seed users
    const users = await seedUsers();
    
    // Step 4: Seed vendors and branches
    const { vendors, branches } = await seedVendorsAndBranches(users);
    
    // Step 5: Seed categories
    const categories = await seedCategories(vendors);
    
    // Step 6: Seed products
    await seedProducts(vendors, categories);
    
    // Step 7: Seed couriers
    const couriers = await seedCouriers(users, vendors);
    
    // Step 8: Seed orders
    const orders = await seedOrders(users, branches, couriers);
    
    // Step 9: Seed courier locations
    await seedCourierLocations(couriers, orders);
    
    console.log('=' .repeat(50));
    console.log('\n✅ SEEDING COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Vendors: ${vendors.length}`);
    console.log(`   • Branches: ${branches.length}`);
    console.log(`   • Categories: ${categories.length}`);
    console.log(`   • Couriers: ${couriers.length}`);
    console.log(`   • Orders: ${orders.length}`);
    console.log('\n🎉 Database is ready for development!\n');
    
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

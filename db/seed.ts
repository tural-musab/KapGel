import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this in production!
// This script is for development purposes only.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is not defined in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('Seeding database...');

  // Create Users
  const { data: users, error: usersError } = await supabase.from('users').insert([
    { role: 'customer', email: 'customer1@example.com' },
    { role: 'vendor_admin', email: 'vendor1@example.com' },
    { role: 'courier', email: 'courier1@example.com' },
    { role: 'admin', email: 'admin@example.com' },
  ]).select();

  if (usersError) {
    console.error('Error seeding users:', usersError);
    return;
  }
  console.log('Seeded users');

  const vendorAdmin = users.find(u => u.role === 'vendor_admin');

  // Create Vendor
  const { data: vendor, error: vendorError } = await supabase.from('vendors').insert([
    { name: 'Lezzetli Burger', owner_user_id: vendorAdmin.id, has_own_couriers: true, verified: true },
  ]).select().single();

  if (vendorError) {
    console.error('Error seeding vendor:', vendorError);
    return;
  }
  console.log('Seeded vendor');

  // Create Branch
  const { data: branch, error: branchError } = await supabase.from('branches').insert([
    { vendor_id: vendor.id, name: 'Merkez Şube', address_text: '123 Burger Sokak, Lezzet Mahallesi' },
  ]).select().single();

  if (branchError) {
    console.error('Error seeding branch:', branchError);
    return;
  }
  console.log('Seeded branch');

  // Create Products
  const { error: productsError } = await supabase.from('products').insert([
    { vendor_id: vendor.id, name: 'Klasik Burger', price: 150.00 },
    { vendor_id: vendor.id, name: 'Cheeseburger', price: 160.00 },
    { vendor_id: vendor.id, name: 'Patates Kızartması', price: 50.00 },
  ]);

  if (productsError) {
    console.error('Error seeding products:', productsError);
  }
  else {
    console.log('Seeded products');
  }

  console.log('Database seeding complete.');
}

main();

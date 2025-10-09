import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// WARNING: This script deletes user data! Only for development!
// ⚠️  UYARI: Bu script kullanıcı verilerini siler! Sadece development için!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is not defined in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanupNonAdminUsers() {
  console.log('🧹 Starting user cleanup (keeping only admin users)...');
  
  try {
    // 1. First, get all users to see what we're dealing with
    console.log('\n📊 Current users in database:');
    const { data: allUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('✅ No users found in database.');
      return;
    }

    console.table(allUsers);

    // 2. Identify users to keep vs delete
    const adminUsers = allUsers.filter(user => user.role === 'admin');
    const nonAdminUsers = allUsers.filter(user => user.role !== 'admin');

    console.log(`\n🎯 Users to KEEP (admins): ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`  ✅ ${user.email} (${user.role})`);
    });

    console.log(`\n🗑️  Users to DELETE (non-admins): ${nonAdminUsers.length}`);
    nonAdminUsers.forEach(user => {
      console.log(`  ❌ ${user.email} (${user.role})`);
    });

    if (nonAdminUsers.length === 0) {
      console.log('\n✅ No non-admin users to delete. Database is clean!');
      return;
    }

    // 3. Get user IDs to delete
    const userIdsToDelete = nonAdminUsers.map(user => user.id);

    console.log('\n🚀 Starting cleanup process...');

    // 4. Delete related data first (foreign key dependencies)
    
    // Delete courier locations
    console.log('🧹 Cleaning courier_locations...');
    const { error: courierLocError } = await supabase
      .from('courier_locations')
      .delete()
      .in('courier_id', 
        await supabase
          .from('couriers')
          .select('id')
          .in('user_id', userIdsToDelete)
          .then(res => res.data?.map(c => c.id) || [])
      );

    if (courierLocError) console.warn('⚠️  courier_locations cleanup:', courierLocError.message);

    // Delete order events
    console.log('🧹 Cleaning order events...');
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .in('order_id',
        await supabase
          .from('orders')
          .select('id')
          .in('customer_id', userIdsToDelete)
          .then(res => res.data?.map(o => o.id) || [])
      );

    if (eventsError) console.warn('⚠️  events cleanup:', eventsError.message);

    // Delete order items
    console.log('🧹 Cleaning order_items...');
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .in('order_id',
        await supabase
          .from('orders')
          .select('id')
          .in('customer_id', userIdsToDelete)
          .then(res => res.data?.map(o => o.id) || [])
      );

    if (orderItemsError) console.warn('⚠️  order_items cleanup:', orderItemsError.message);

    // Delete orders
    console.log('🧹 Cleaning orders...');
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .in('customer_id', userIdsToDelete);

    if (ordersError) console.warn('⚠️  orders cleanup:', ordersError.message);

    // Delete couriers
    console.log('🧹 Cleaning couriers...');
    const { error: couriersError } = await supabase
      .from('couriers')
      .delete()
      .in('user_id', userIdsToDelete);

    if (couriersError) console.warn('⚠️  couriers cleanup:', couriersError.message);

    // Delete inventories (via branches owned by vendors)
    console.log('🧹 Cleaning inventories...');
    const { error: inventoriesError } = await supabase
      .from('inventories')
      .delete()
      .in('branch_id',
        await supabase
          .from('branches')
          .select('id')
          .in('vendor_id',
            await supabase
              .from('vendors')
              .select('id')
              .in('owner_user_id', userIdsToDelete)
              .then(res => res.data?.map(v => v.id) || [])
          )
          .then(res => res.data?.map(b => b.id) || [])
      );

    if (inventoriesError) console.warn('⚠️  inventories cleanup:', inventoriesError.message);

    // Delete products
    console.log('🧹 Cleaning products...');
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .in('vendor_id',
        await supabase
          .from('vendors')
          .select('id')
          .in('owner_user_id', userIdsToDelete)
          .then(res => res.data?.map(v => v.id) || [])
      );

    if (productsError) console.warn('⚠️  products cleanup:', productsError.message);

    // Delete categories  
    console.log('🧹 Cleaning categories...');
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .in('vendor_id',
        await supabase
          .from('vendors')
          .select('id')
          .in('owner_user_id', userIdsToDelete)
          .then(res => res.data?.map(v => v.id) || [])
      );

    if (categoriesError) console.warn('⚠️  categories cleanup:', categoriesError.message);

    // Delete branches
    console.log('🧹 Cleaning branches...');
    const { error: branchesError } = await supabase
      .from('branches')
      .delete()
      .in('vendor_id',
        await supabase
          .from('vendors')
          .select('id')
          .in('owner_user_id', userIdsToDelete)
          .then(res => res.data?.map(v => v.id) || [])
      );

    if (branchesError) console.warn('⚠️  branches cleanup:', branchesError.message);

    // Delete vendors
    console.log('🧹 Cleaning vendors...');
    const { error: vendorsError } = await supabase
      .from('vendors')
      .delete()
      .in('owner_user_id', userIdsToDelete);

    if (vendorsError) console.warn('⚠️  vendors cleanup:', vendorsError.message);

    // Delete applications
    console.log('🧹 Cleaning vendor_applications...');
    const { error: vendorAppsError } = await supabase
      .from('vendor_applications')
      .delete()
      .in('user_id', userIdsToDelete);

    if (vendorAppsError) console.warn('⚠️  vendor_applications cleanup:', vendorAppsError.message);

    console.log('🧹 Cleaning courier_applications...');
    const { error: courierAppsError } = await supabase
      .from('courier_applications')
      .delete()
      .in('user_id', userIdsToDelete);

    if (courierAppsError) console.warn('⚠️  courier_applications cleanup:', courierAppsError.message);

    // Delete notifications
    console.log('🧹 Cleaning notifications...');
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .in('user_id', userIdsToDelete);

    if (notificationsError) console.warn('⚠️  notifications cleanup:', notificationsError.message);

    // 5. Finally, delete the users themselves from public.users
    console.log('🧹 Cleaning public.users table...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .in('id', userIdsToDelete);

    if (usersError) {
      throw new Error(`Failed to delete users from public.users: ${usersError.message}`);
    }

    // 6. 🔥 CRITICAL: Delete users from auth.users using admin client
    console.log('🧹 Cleaning auth.users (Supabase Auth)...');
    
    // We need to delete auth users one by one
    const authDeleteResults = [];
    for (const userId of userIdsToDelete) {
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          authDeleteResults.push({ userId, success: false, error: authDeleteError.message });
          console.warn(`⚠️  Failed to delete auth user ${userId}: ${authDeleteError.message}`);
        } else {
          authDeleteResults.push({ userId, success: true });
          console.log(`✅ Deleted auth user: ${userId}`);
        }
      } catch (error) {
        authDeleteResults.push({ userId, success: false, error: error.message });
        console.warn(`⚠️  Error deleting auth user ${userId}: ${error.message}`);
      }
    }

    const successfulAuthDeletes = authDeleteResults.filter(r => r.success).length;
    const failedAuthDeletes = authDeleteResults.filter(r => !r.success).length;
    
    console.log(`📊 Auth deletion summary: ${successfulAuthDeletes} successful, ${failedAuthDeletes} failed`);

    // 7. Verify cleanup
    console.log('\n✅ Cleanup completed! Verifying...');
    
    // Check public.users
    const { data: remainingUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role')
      .order('created_at');

    if (verifyError) {
      console.warn('⚠️  Could not verify public.users cleanup:', verifyError.message);
    } else {
      console.log('\n📊 Remaining users in public.users:');
      console.table(remainingUsers);
    }

    // Check auth.users
    try {
      console.log('\n🔍 Checking auth.users...');
      const { data: authUsers, error: authVerifyError } = await supabase.auth.admin.listUsers();
      
      if (authVerifyError) {
        console.warn('⚠️  Could not verify auth.users:', authVerifyError.message);
      } else {
        console.log('\n📊 Remaining users in auth.users:');
        const authUsersSummary = authUsers.users.map(u => ({
          id: u.id,
          email: u.email,
          role: u.user_metadata?.role || u.app_metadata?.role || 'unknown',
          created_at: u.created_at
        }));
        console.table(authUsersSummary);
        
        const remainingAuthAdmins = authUsersSummary.filter(u => u.role === 'admin').length;
        const remainingAuthNonAdmins = authUsersSummary.filter(u => u.role !== 'admin').length;
        
        console.log(`\n🎯 Final Summary:`);
        console.log(`  ✅ Public users remaining: ${remainingUsers?.length || 0}`);
        console.log(`  ✅ Auth users remaining: ${authUsers.users.length}`);
        console.log(`  ✅ Admin users kept: ${remainingAuthAdmins}`);
        console.log(`  ⚠️  Non-admin auth users remaining: ${remainingAuthNonAdmins}`);
        
        if (remainingAuthNonAdmins === 0 && remainingAuthAdmins > 0) {
          console.log('\n🎉 SUCCESS: All non-admin users removed from both public.users and auth.users!');
        } else if (remainingAuthNonAdmins > 0) {
          console.log('\n⚠️  WARNING: Some non-admin users still remain in auth.users. Manual check needed.');
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not verify auth.users:', error.message);
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupNonAdminUsers()
  .then(() => {
    console.log('\n✅ User cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ User cleanup failed:', error);
    process.exit(1);
  });
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is not defined in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkAuthUsers() {
  console.log('🔍 Checking auth.users status...');
  
  try {
    // Check public.users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at');

    console.log('\n📊 Current users in public.users:');
    if (publicError) {
      console.error('❌ Error fetching public users:', publicError.message);
    } else if (!publicUsers || publicUsers.length === 0) {
      console.log('✅ No users in public.users table.');
    } else {
      console.table(publicUsers);
    }

    // Check auth.users
    console.log('\n🔍 Checking auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
    } else {
      console.log('\n📊 Current users in auth.users:');
      const authUsersSummary = authUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.user_metadata?.role || u.app_metadata?.role || 'unknown',
        created_at: u.created_at,
        confirmed_at: u.confirmed_at,
        last_sign_in_at: u.last_sign_in_at
      }));
      
      if (authUsersSummary.length === 0) {
        console.log('✅ No users in auth.users table.');
      } else {
        console.table(authUsersSummary);
        
        const adminUsers = authUsersSummary.filter(u => u.role === 'admin');
        const nonAdminUsers = authUsersSummary.filter(u => u.role !== 'admin');
        
        console.log(`\n📊 Auth Users Summary:`);
        console.log(`  Total users: ${authUsersSummary.length}`);
        console.log(`  Admin users: ${adminUsers.length}`);
        console.log(`  Non-admin users: ${nonAdminUsers.length}`);
        
        if (nonAdminUsers.length > 0) {
          console.log('\n🗑️  Non-admin users to clean:');
          nonAdminUsers.forEach(user => {
            console.log(`  ❌ ${user.email} (${user.role}) - ID: ${user.id}`);
          });
          
          console.log('\n💡 To clean these users, run the cleanup script again or manually delete them.');
        } else {
          console.log('\n✅ All auth.users are admins - database is clean!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

// Run the check
checkAuthUsers()
  .then(() => {
    console.log('\n✅ Auth users check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Auth users check failed:', error);
    process.exit(1);
  });
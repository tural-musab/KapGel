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

async function cleanupAuthUsers() {
  console.log('🧹 Starting auth.users cleanup (keeping only admin users)...');
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    if (!authUsers || authUsers.users.length === 0) {
      console.log('✅ No users found in auth.users.');
      return;
    }

    // Identify users by role
    const authUsersSummary = authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || u.app_metadata?.role || 'unknown',
      created_at: u.created_at
    }));

    const adminUsers = authUsersSummary.filter(u => u.role === 'admin');
    const nonAdminUsers = authUsersSummary.filter(u => u.role !== 'admin');

    console.log('\n📊 Current auth.users:');
    console.table(authUsersSummary);

    console.log(`\n🎯 Users to KEEP (admins): ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`  ✅ ${user.email} (${user.role})`);
    });

    console.log(`\n🗑️  Users to DELETE (non-admins): ${nonAdminUsers.length}`);
    nonAdminUsers.forEach(user => {
      console.log(`  ❌ ${user.email} (${user.role})`);
    });

    if (nonAdminUsers.length === 0) {
      console.log('\n✅ No non-admin users to delete. Auth is clean!');
      return;
    }

    // Delete non-admin users from auth.users
    console.log('\n🚀 Starting auth users cleanup...');
    
    const deleteResults = [];
    for (const user of nonAdminUsers) {
      try {
        console.log(`🧹 Deleting auth user: ${user.email} (${user.id})`);
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          deleteResults.push({ 
            userId: user.id, 
            email: user.email, 
            success: false, 
            error: deleteError.message 
          });
          console.error(`  ❌ Failed: ${deleteError.message}`);
        } else {
          deleteResults.push({ 
            userId: user.id, 
            email: user.email, 
            success: true 
          });
          console.log(`  ✅ Success!`);
        }
      } catch (error) {
        deleteResults.push({ 
          userId: user.id, 
          email: user.email, 
          success: false, 
          error: error.message 
        });
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    // Summary
    const successful = deleteResults.filter(r => r.success);
    const failed = deleteResults.filter(r => !r.success);

    console.log(`\n📊 Deletion Summary:`);
    console.log(`  ✅ Successful deletions: ${successful.length}`);
    console.log(`  ❌ Failed deletions: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed deletions:');
      failed.forEach(f => {
        console.log(`  - ${f.email}: ${f.error}`);
      });
    }

    // Verify final state
    console.log('\n🔍 Verifying cleanup...');
    const { data: finalAuthUsers, error: finalError } = await supabase.auth.admin.listUsers();
    
    if (finalError) {
      console.warn('⚠️  Could not verify final state:', finalError.message);
    } else {
      const finalSummary = finalAuthUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.user_metadata?.role || u.app_metadata?.role || 'unknown'
      }));

      console.log('\n📊 Final auth.users state:');
      if (finalSummary.length === 0) {
        console.log('⚠️  WARNING: No users remain in auth.users! This might be problematic.');
      } else {
        console.table(finalSummary);
        
        const finalAdmins = finalSummary.filter(u => u.role === 'admin').length;
        const finalNonAdmins = finalSummary.filter(u => u.role !== 'admin').length;
        
        console.log(`\n🎯 Final Summary:`);
        console.log(`  ✅ Total auth users: ${finalSummary.length}`);
        console.log(`  ✅ Admin users remaining: ${finalAdmins}`);
        console.log(`  ⚠️  Non-admin users remaining: ${finalNonAdmins}`);
        
        if (finalNonAdmins === 0 && finalAdmins > 0) {
          console.log('\n🎉 SUCCESS: All non-admin users removed from auth.users!');
        } else if (finalNonAdmins > 0) {
          console.log('\n⚠️  WARNING: Some non-admin users still remain.');
        } else if (finalAdmins === 0) {
          console.log('\n🚨 CRITICAL: No admin users remain! You may need to restore admin access.');
        }
      }
    }

  } catch (error) {
    console.error('❌ Auth cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupAuthUsers()
  .then(() => {
    console.log('\n✅ Auth users cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Auth users cleanup failed:', error);
    process.exit(1);
  });
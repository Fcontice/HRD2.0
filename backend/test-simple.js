/**
 * Simple Supabase Connection Test
 * Tests basic connectivity without table queries
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('\n🔍 Testing Supabase Connection...\n')
console.log('Environment Variables:')
console.log('  SUPABASE_URL:', supabaseUrl)
console.log('  SERVICE_ROLE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ MISSING')
console.log('  ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables!')
  process.exit(1)
}

// Create client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConnection() {
  try {
    console.log('\n📡 Testing connection...\n')

    // Test 1: Simple health check
    console.log('Test 1: Health check')
    const { data: healthData, error: healthError } = await supabase
      .from('User')
      .select('count', { count: 'exact', head: true })

    if (healthError) {
      console.error('  ❌ Error:', healthError.message)
      console.error('  Code:', healthError.code)
      console.error('  Details:', healthError.details)
      console.error('  Hint:', healthError.hint)
      throw healthError
    }

    console.log('  ✅ Connected successfully!')

    // Test 2: Check if we can query
    console.log('\nTest 2: Querying User table')
    const { data: users, error: queryError, count } = await supabase
      .from('User')
      .select('id, username, email', { count: 'exact' })
      .limit(3)

    if (queryError) {
      throw queryError
    }

    console.log(`  ✅ Query successful! Found ${count || 0} users`)
    if (users && users.length > 0) {
      console.log('  Sample users:')
      users.forEach(u => console.log(`    - ${u.username} (${u.email})`))
    }

    console.log('\n✅ ALL TESTS PASSED!\n')
    console.log('Your Supabase connection is working correctly.')
    console.log('You can now start your backend: npm run dev\n')

  } catch (error) {
    console.error('\n❌ CONNECTION TEST FAILED!')
    console.error('\nError details:')
    console.error('  Message:', error.message)
    if (error.code) console.error('  Code:', error.code)
    if (error.details) console.error('  Details:', error.details)
    if (error.hint) console.error('  Hint:', error.hint)

    console.error('\n🔧 Troubleshooting:')
    console.error('  1. Verify your SERVICE_ROLE_KEY is correct')
    console.error('  2. Make sure you copied the "service_role" key, not the "anon" key')
    console.error('  3. Check Supabase Dashboard → Settings → API')
    console.error('  4. Ensure your project URL is correct\n')

    process.exit(1)
  }
}

testConnection()

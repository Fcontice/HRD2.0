/**
 * Test Supabase Connection
 * Run this to verify your Supabase API keys are working
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n🔍 Testing Supabase Connection...\n')
console.log('📍 SUPABASE_URL:', supabaseUrl)
console.log('🔑 SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Configured' : '✗ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ ERROR: Missing Supabase environment variables!')
  console.log('\nPlease add to your .env file:')
  console.log('  SUPABASE_URL="https://YOUR-PROJECT.supabase.co"')
  console.log('  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
  console.log('\nFind these in: Supabase Dashboard → Settings → API\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConnection() {
  try {
    // Test 1: Check if we can query the user table
    console.log('Test 1: Querying User table...')
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, username, email')
      .limit(5)

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('  ✓ user table exists (no users found)')
      } else {
        throw userError
      }
    } else {
      console.log(`  ✓ user table exists (${users.length} users found)`)
      if (users.length > 0) {
        console.log('    Sample user:', users[0].username)
      }
    }

    // Test 2: Check if we can query the player table
    console.log('\nTest 2: Querying Player table...')
    const { data: players, error: playerError, count } = await supabase
      .from('Player')
      .select('id, name, teamAbbr', { count: 'exact' })
      .limit(5)

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        console.log('  ✓ player table exists (no players found)')
      } else {
        throw playerError
      }
    } else {
      console.log(`  ✓ player table exists (${count || 0} players total, showing ${players.length})`)
      if (players.length > 0) {
        console.log('    Sample player:', players[0].name, '-', players[0].teamAbbr)
      }
    }

    // Test 3: Check if we can query the team table
    console.log('\nTest 3: Querying Team table...')
    const { data: teams, error: teamError } = await supabase
      .from('Team')
      .select('id, name')
      .is('deletedAt', null)
      .limit(5)

    if (teamError) {
      if (teamError.code === 'PGRST116') {
        console.log('  ✓ team table exists (no teams found)')
      } else {
        throw teamError
      }
    } else {
      console.log(`  ✓ team table exists (${teams.length} teams found)`)
      if (teams.length > 0) {
        console.log('    Sample team:', teams[0].name)
      }
    }

    console.log('\n✅ SUCCESS! Supabase connection is working!\n')
    console.log('Next steps:')
    console.log('  1. Start the backend: npm run dev')
    console.log('  2. Test authentication endpoints')
    console.log('  3. Import player data if needed: npm run import:players\n')

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!')
    console.error('Error:', error.message)
    console.error('\nTroubleshooting:')
    console.error('  1. Check that your SUPABASE_URL is correct')
    console.error('  2. Check that your SUPABASE_SERVICE_ROLE_KEY is correct')
    console.error('  3. Verify tables exist in Supabase Dashboard → Table Editor')
    console.error('  4. Check RLS policies allow service role access\n')
    process.exit(1)
  }
}

testConnection()

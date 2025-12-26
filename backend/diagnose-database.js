/**
 * Diagnose Database Issues
 * Checks table names, RLS status, and access permissions
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function diagnose() {
  console.log('\n🔍 Diagnosing Database...\n')

  try {
    // Query PostgreSQL system tables to list all tables
    console.log('📋 Checking what tables exist...')
    const { data: tables, error: tablesError } = await supabase.rpc('execute_sql', {
      query_text: `
        SELECT
          table_name,
          table_schema
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `
    })

    if (tablesError) {
      console.log('\n⚠️  Cannot query system tables directly.')
      console.log('Trying alternative method...\n')

      // Try different case variations
      const tablesToTry = [
        'User', 'user', 'users', 'Users',
        'Player', 'player', 'players', 'Players',
        'Team', 'team', 'teams', 'Teams'
      ]

      console.log('Testing table name variations:\n')

      for (const tableName of tablesToTry) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error) {
          console.log(`  ✓ Table "${tableName}" - ACCESSIBLE`)
        } else if (error.code === 'PGRST116') {
          console.log(`  ✓ Table "${tableName}" - EXISTS (no rows)`)
        } else if (error.code === '42P01') {
          console.log(`  ✗ Table "${tableName}" - DOES NOT EXIST`)
        } else if (error.message.includes('permission denied')) {
          console.log(`  ⚠️  Table "${tableName}" - EXISTS but PERMISSION DENIED (RLS enabled)`)
        } else {
          console.log(`  ? Table "${tableName}" - Error: ${error.message}`)
        }
      }

      console.log('\n💡 SOLUTION: We need to disable RLS or use correct table names')
      console.log('\nTo fix RLS issues, run these SQL commands in Supabase SQL Editor:\n')
      console.log('-- Disable RLS on all tables')
      console.log('ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "Player" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "Team" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "TeamPlayer" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "PlayerStats" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "Leaderboard" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;')

      console.log('\n-- OR, if tables are lowercase:')
      console.log('ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "player" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "team" DISABLE ROW LEVEL SECURITY;')
      console.log('ALTER TABLE "team_player" DISABLE ROW LEVEL SECURITY;')

    } else {
      console.log('\n✓ Found tables:\n')
      tables.forEach(table => {
        console.log(`  - ${table.table_schema}.${table.table_name}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n🔧 NEXT STEPS:\n')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Run the commands shown above to disable RLS')
    console.log('3. Run test-supabase-connection.js again\n')
    console.log('OR\n')
    console.log('1. Check Supabase Dashboard → Table Editor')
    console.log('2. Find the correct table names (might be lowercase)')
    console.log('3. Update the db.ts service to use correct names\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

diagnose()

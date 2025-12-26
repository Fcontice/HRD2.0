/**
 * Environment Variable Loader
 * This MUST be imported first in server.ts before any other local modules
 */

import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate critical environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing critical Supabase environment variables!')
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('Check your .env file in the backend directory')
  process.exit(1)
}

console.log('✅ Environment variables loaded')

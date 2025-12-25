import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    console.log('📍 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')) // Hide password

    // Test connection by running a simple query
    await prisma.$connect()
    console.log('✅ Database connection successful!')

    // Try to query the database
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('✅ Database query successful!')
    console.log('📊 PostgreSQL version:', result)

  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('\n💡 Troubleshooting tips:')
    console.error('   1. Check if your Supabase project is active (not paused)')
    console.error('   2. Verify DATABASE_URL in .env file')
    console.error('   3. Check if you can access the database from Supabase dashboard')
    console.error('   4. Ensure your IP is allowed in Supabase network settings')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

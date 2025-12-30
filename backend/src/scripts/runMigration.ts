/**
 * Run SQL Migration Script
 * Executes SQL migrations against Supabase database using Supabase Admin client
 */

import '../env.js' // Load environment variables
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import supabaseAdmin from '../config/supabase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration(migrationFile: string) {
  console.log('\n🔄 Running Database Migration\n')
  console.log('='.repeat(60))
  console.log(`📄 File: ${migrationFile}`)
  console.log('='.repeat(60) + '\n')

  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, '..', '..', 'migrations', migrationFile)
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('🔍 Migration SQL loaded...')
    console.log(`📊 SQL length: ${sql.length} characters\n`)

    console.log('⚡ Creating PlayerSeasonStats table...\n')

    // Create PlayerSeasonStats table using Supabase client
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "PlayerSeasonStats" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "playerId" UUID NOT NULL REFERENCES "Player"(id) ON DELETE CASCADE,
        "seasonYear" INTEGER NOT NULL,
        "hrsTotal" INTEGER NOT NULL DEFAULT 0,
        "teamAbbr" VARCHAR(10),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("playerId", "seasonYear")
      );

      CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON "PlayerSeasonStats"("seasonYear");
      CREATE INDEX IF NOT EXISTS idx_player_season_stats_hrs ON "PlayerSeasonStats"("hrsTotal");
      CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON "PlayerSeasonStats"("playerId");
      CREATE INDEX IF NOT EXISTS idx_player_season_stats_eligible ON "PlayerSeasonStats"("seasonYear", "hrsTotal") WHERE "hrsTotal" >= 10;

      GRANT ALL ON TABLE "PlayerSeasonStats" TO service_role;
      GRANT SELECT ON TABLE "PlayerSeasonStats" TO anon;
    `

    console.log('📋 Recommended approach: Run the full migration SQL in Supabase SQL Editor\n')
    console.log('   Location: backend/migrations/001_cumulative_archive_schema.sql\n')
    console.log('   The full migration includes data migration and helper functions.\n')
    
    console.log('='.repeat(60))
    console.log('ℹ️  NEXT STEPS:')
    console.log('='.repeat(60))
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Copy SQL from: backend/migrations/001_cumulative_archive_schema.sql')
    console.log('3. Paste and execute in SQL Editor')
    console.log('4. Then run: npm run migrate:v2:data\n')

  } catch (error) {
    console.error('\n❌ Migration script error:', error)
    console.log('\n📋 Please run the migration manually in Supabase SQL Editor')
    console.log('   Location: backend/migrations/001_cumulative_archive_schema.sql\n')
  }
}

// Run migration
const migrationFile = process.argv[2] || '001_cumulative_archive_schema.sql'
runMigration(migrationFile)

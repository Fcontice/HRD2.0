/**
 * Run SQL Migrations
 * Executes SQL migration files against the database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n🚀 Starting database migration...\n');
    console.log(`📍 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]}\n`);

    // Read migration file
    const migrationPath = join(__dirname, '../../migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file: 001_initial_schema.sql');
    console.log('⏳ Executing migration...\n');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created:');
    console.log('   - 6 Enums');
    console.log('   - 7 Tables (User, Team, Player, TeamPlayer, PlayerStats, Leaderboard, Notification)');
    console.log('   - 14 Indexes\n');

    // Verify tables
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('✅ Verified tables in database:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('\n🎉 Database is ready!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

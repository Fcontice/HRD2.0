/**
 * Seed Players Script
 * Run this script to scrape Baseball Reference and populate the Players table
 *
 * Usage:
 *   npm run seed:players
 *   or
 *   tsx src/scripts/seedPlayers.ts
 */

import { scrapeAndSeedPlayers } from '../services/scraperService.js';

async function main() {
  const seasonYear = parseInt(process.argv[2] || '2025');

  console.log(`\n🎯 Seeding players for ${seasonYear} season...`);

  try {
    await scrapeAndSeedPlayers(seasonYear);
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

main();

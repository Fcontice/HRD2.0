/**
 * Import 2025 Season Players
 * Reads CSV file and imports 2025 season player data into database
 * These players are stored with seasonYear: 2026 (for potential 2026 contest)
 * Based on their 2025 actual performance
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface CSVPlayer {
  name: string;
  team: string;
  homeRuns: number;
}

function parseCSV(csvContent: string): CSVPlayer[] {
  const lines = csvContent.trim().split('\n');
  const players: CSVPlayer[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [name, team, homeRunsStr] = line.split(',');
    const homeRuns = parseInt(homeRunsStr);

    if (name && team && homeRuns >= 10) {
      players.push({
        name: name.trim(),
        team: team.trim(),
        homeRuns,
      });
    }
  }

  return players;
}

async function import2025Season() {
  console.log('\n📥 Starting 2025 season stats import from CSV...\n');

  try {
    // Read CSV file
    const csvPath = join(__dirname, '../../data/players_2025_season.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    console.log(`📄 Reading CSV file: players_2025_season.csv`);

    // Parse CSV
    const players = parseCSV(csvContent);
    console.log(`✅ Parsed ${players.length} players from 2025 season CSV\n`);

    // Import to database using PlayerStats table
    console.log('💾 Importing 2025 season stats to PlayerStats table...\n');

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let missingPlayerCount = 0;

    for (const player of players) {
      try {
        // Generate mlbId from name (lowercase, hyphens)
        const mlbId = player.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/--+/g, '-');

        // Find the player record
        const existingPlayer = await prisma.player.findUnique({
          where: { mlbId },
        });

        if (!existingPlayer) {
          // Player doesn't exist in Player table, skip
          console.log(`   ⚠️  Player not found: ${player.name} (${mlbId})`);
          missingPlayerCount++;
          continue;
        }

        // Use end of 2025 season date (September 28, 2025)
        const seasonEndDate = new Date('2025-09-28');

        // Upsert stats for this player for 2025 season
        await prisma.playerStats.upsert({
          where: {
            playerId_seasonYear_date: {
              playerId: existingPlayer.id,
              seasonYear: 2025,
              date: seasonEndDate,
            },
          },
          update: {
            hrsTotal: player.homeRuns,
            hrsRegularSeason: player.homeRuns,
            hrsPostseason: 0,
          },
          create: {
            playerId: existingPlayer.id,
            seasonYear: 2025,
            date: seasonEndDate,
            hrsTotal: player.homeRuns,
            hrsRegularSeason: player.homeRuns,
            hrsPostseason: 0,
          },
        });

        const wasUpdate = await prisma.playerStats.findFirst({
          where: {
            playerId: existingPlayer.id,
            seasonYear: 2025,
            date: seasonEndDate,
          },
        });

        if (wasUpdate) {
          updatedCount++;
        } else {
          createdCount++;
        }

        // Progress indicator
        if ((createdCount + updatedCount) % 20 === 0) {
          console.log(`   Imported ${createdCount + updatedCount}/${players.length} player stats...`);
        }

      } catch (error) {
        console.error(`⚠️  Failed to import ${player.name}:`, error);
        skippedCount++;
      }
    }

    console.log(`\n📊 2025 Season Stats Import complete:`);
    console.log(`   ✅ Created: ${createdCount}`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Missing Players: ${missingPlayerCount}`);
    console.log(`   📈 Total stats in database: ${createdCount + updatedCount} records\n`);

    // Verify import
    const totalStats = await prisma.playerStats.count({
      where: { seasonYear: 2025 },
    });

    console.log(`✅ Verified: ${totalStats} player stats in database (2025 season)\n`);

    // Show top 10 HR leaders from 2025 season
    const topStats = await prisma.playerStats.findMany({
      where: { seasonYear: 2025 },
      include: { player: true },
      orderBy: { hrsTotal: 'desc' },
      take: 10,
    });

    console.log('🏆 Top 10 HR Leaders (2025 Season):');
    topStats.forEach((stat, i) => {
      console.log(`   ${i + 1}. ${stat.player.name} (${stat.player.teamAbbr}) - ${stat.hrsTotal} HRs`);
    });

    // Compare with 2024 stats
    console.log('\n📊 Year-over-Year Comparison Available:');
    console.log('   - Player base data: Player table (seasonYear = 2025, using 2024 stats)');
    console.log('   - 2025 season stats: PlayerStats table (seasonYear = 2025)');
    console.log('   Users can now compare player performance across seasons!\n');

    console.log('🎉 2025 season stats import successful!\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

import2025Season();

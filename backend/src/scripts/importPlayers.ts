/**
 * Import Players from CSV
 * Reads CSV file and imports player data into database
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

async function importPlayers() {
  console.log('\n📥 Starting player import from CSV...\n');

  try {
    // Read CSV file
    const csvPath = join(__dirname, '../../data/players_2025.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    console.log(`📄 Reading CSV file: players_2025.csv`);

    // Parse CSV
    const players = parseCSV(csvContent);
    console.log(`✅ Parsed ${players.length} players from CSV\n`);

    // Import to database
    console.log('💾 Importing players to database...\n');

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const player of players) {
      try {
        // Generate mlbId from name (lowercase, hyphens)
        const mlbId = player.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/--+/g, '-');

        // Upsert player
        await prisma.player.upsert({
          where: { mlbId },
          update: {
            name: player.name,
            teamAbbr: player.team,
            hrsPreviousSeason: player.homeRuns,
            isEligible: player.homeRuns >= 10,
            updatedAt: new Date(),
          },
          create: {
            mlbId,
            name: player.name,
            teamAbbr: player.team,
            seasonYear: 2025,
            hrsPreviousSeason: player.homeRuns,
            isEligible: player.homeRuns >= 10,
          },
        });

        createdCount++;

        // Progress indicator
        if ((createdCount + updatedCount) % 20 === 0) {
          console.log(`   Imported ${createdCount + updatedCount}/${players.length} players...`);
        }

      } catch (error) {
        console.error(`⚠️  Failed to import ${player.name}:`, error);
        skippedCount++;
      }
    }

    console.log(`\n📊 Import complete:`);
    console.log(`   ✅ Created/Updated: ${createdCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   📈 Total in database: ${createdCount - skippedCount} players\n`);

    // Verify import
    const totalPlayers = await prisma.player.count({
      where: { seasonYear: 2025 },
    });

    console.log(`✅ Verified: ${totalPlayers} players in database (2025 season)\n`);

    // Show top 10 HR leaders
    const topPlayers = await prisma.player.findMany({
      where: { seasonYear: 2025 },
      orderBy: { hrsPreviousSeason: 'desc' },
      take: 10,
    });

    console.log('🏆 Top 10 HR Leaders (2024 stats for 2025 season):');
    topPlayers.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.teamAbbr}) - ${p.hrsPreviousSeason} HRs`);
    });

    console.log('\n🎉 Player import successful!\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importPlayers();

/**
 * Baseball Reference Scraper Service
 * Scrapes MLB player home run statistics from Baseball Reference
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlayerData {
  name: string;
  mlbId: string;
  teamAbbr: string;
  homeRuns: number;
  photoUrl?: string;
}

/**
 * Scrape MLB player home run stats from Baseball Savant
 * Target: Players with ≥10 HRs in specified season
 */
export async function scrapePlayerStats(seasonYear: number = 2025): Promise<PlayerData[]> {
  const url = `https://baseballsavant.mlb.com/leaderboard/custom?year=${seasonYear}&type=batter&filter=&min=q&selections=home_run&chart=false&x=home_run&y=home_run&r=no&chartType=beeswarm&sort=home_run&sortDir=desc`;

  console.log(`📡 Fetching data from Baseball Savant (MLB Official)...`);
  console.log(`🔗 URL: ${url}`);

  try {
    // Fetch the page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(response.data);
    const players: PlayerData[] = [];

    // Baseball Savant uses a table with class="leaderboard-toggle"
    // Each row contains player data
    $('table tbody tr').each((index, element) => {
      const $row = $(element);

      // Extract player name from first column
      const playerName = $row.find('td').eq(0).text().trim();

      // Extract team from second column (before comma, e.g., "NYY, AL")
      const teamText = $row.find('td').eq(1).text().trim();
      const teamAbbr = teamText.split(',')[0]?.trim() || '';

      // Extract home runs - usually in the last data column
      const homeRunsText = $row.find('td').last().text().trim();
      const homeRuns = parseInt(homeRunsText) || 0;

      // Generate MLB ID from name (simplified - use name as ID for now)
      // Format: lowercase, replace spaces with hyphens
      const mlbId = playerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `player-${index}`;

      // Only include players with valid data and ≥10 HRs
      if (playerName && teamAbbr && homeRuns >= 10) {
        players.push({
          name: playerName,
          mlbId,
          teamAbbr,
          homeRuns,
        });
      }
    });

    console.log(`✅ Successfully scraped ${players.length} eligible players (≥10 HRs)`);
    return players;

  } catch (error) {
    console.error('❌ Error scraping Baseball Savant:', error);
    throw new Error(`Failed to scrape player data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save scraped player data to database
 * Season year determines which year's data to use for eligibility
 */
export async function seedPlayersToDatabase(players: PlayerData[], seasonYear: number = 2025): Promise<void> {
  console.log(`\n💾 Saving ${players.length} players to database...`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    try {
      // Upsert player (create or update if exists)
      const result = await prisma.player.upsert({
        where: {
          mlbId: player.mlbId,
        },
        update: {
          name: player.name,
          teamAbbr: player.teamAbbr,
          hrsPreviousSeason: player.homeRuns,
          isEligible: player.homeRuns >= 10,
          photoUrl: player.photoUrl,
          updatedAt: new Date(),
        },
        create: {
          mlbId: player.mlbId,
          name: player.name,
          teamAbbr: player.teamAbbr,
          seasonYear,
          hrsPreviousSeason: player.homeRuns,
          isEligible: player.homeRuns >= 10,
          photoUrl: player.photoUrl,
        },
      });

      // Check if it was a create or update
      const existingPlayer = await prisma.player.findUnique({
        where: { mlbId: player.mlbId },
      });

      if (existingPlayer && existingPlayer.createdAt.getTime() === result.createdAt.getTime()) {
        createdCount++;
      } else {
        updatedCount++;
      }

    } catch (error) {
      console.error(`⚠️  Failed to save player ${player.name}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n📊 Database seeding complete:`);
  console.log(`   ✅ Created: ${createdCount}`);
  console.log(`   🔄 Updated: ${updatedCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
  console.log(`   📈 Total: ${createdCount + updatedCount} players in database\n`);
}

/**
 * Full scrape and seed pipeline
 */
export async function scrapeAndSeedPlayers(seasonYear: number = 2025): Promise<void> {
  console.log(`\n🏟️  Starting Baseball Savant scraper for ${seasonYear} season...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    // Step 1: Scrape data
    const players = await scrapePlayerStats(seasonYear);

    if (players.length === 0) {
      console.log('⚠️  No players found. Check the Baseball Reference URL or selectors.');
      return;
    }

    // Step 2: Save to database
    await seedPlayersToDatabase(players, seasonYear);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Scraping complete! ${players.length} eligible players ready.\n`);

  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

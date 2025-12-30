/**
 * Baseball Reference Scraper Service
 * Scrapes MLB player home run statistics from Baseball Reference
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db.js';

export interface PlayerData {
  name: string;
  mlbId: string;
  teamAbbr: string;
  homeRuns: number;
  photoUrl?: string;
}

/**
 * Scrape MLB player home run stats from Baseball Savant CSV export
 * Target: Players with ≥10 HRs in specified season
 */
export async function scrapePlayerStats(seasonYear: number = 2025): Promise<PlayerData[]> {
  // Use CSV export which is more reliable than HTML scraping
  const url = `https://baseballsavant.mlb.com/leaderboard/custom?year=${seasonYear}&type=batter&filter=&min=q&selections=home_run&chart=false&x=home_run&y=home_run&r=no&chartType=beeswarm&sort=home_run&sortDir=desc&csv=true`;

  console.log(`📡 Fetching data from Baseball Savant (MLB Official)...`);
  console.log(`🔗 URL: ${url}`);

  try {
    // Fetch CSV data
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv',
      },
    });

    const players: PlayerData[] = [];
    const csvLines = response.data.split('\n').filter((line: string) => line.trim());

    // Skip header row
    for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i];

      // Parse CSV line (format: "last_name, first_name",player_id,year,home_run)
      const match = line.match(/"([^"]+)",(\d+),(\d+),(\d+)/);

      if (match) {
        const [, fullName, playerId, year, homeRunsStr] = match;
        const homeRuns = parseInt(homeRunsStr);

        // Parse "Last, First" format
        const nameParts = fullName.split(',').map(s => s.trim());
        const playerName = nameParts.length >= 2
          ? `${nameParts[1]} ${nameParts[0]}` // "First Last"
          : fullName;

        // Generate MLB ID from player_id
        const mlbId = `mlb-${playerId}`;

        // We don't have team data in this CSV, use placeholder
        // You may need to fetch team from another source or use a different endpoint
        const teamAbbr = 'UNK'; // Unknown - will be updated when we have team data

        // Only include players with ≥10 HRs
        if (homeRuns >= 10) {
          players.push({
            name: playerName,
            mlbId,
            teamAbbr,
            homeRuns,
          });
        }
      }
    }

    console.log(`✅ Successfully scraped ${players.length} eligible players (≥10 HRs)`);
    return players;

  } catch (error) {
    console.error('❌ Error scraping Baseball Savant:', error);
    throw new Error(`Failed to scrape player data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save scraped player data to database using cumulative archive design
 * 1. Upsert Player (permanent identity - no seasonYear)
 * 2. Create PlayerSeasonStats record (historical archive)
 */
export async function seedPlayersToDatabase(players: PlayerData[], seasonYear: number = 2025): Promise<void> {
  console.log(`\n💾 Saving ${players.length} players to database...`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    try {
      // Step 1: Upsert Player (permanent identity)
      const playerRecord = await db.player.upsert(
        { mlbId: player.mlbId },
        {
          mlbId: player.mlbId,
          name: player.name,
          teamAbbr: player.teamAbbr,
          photoUrl: player.photoUrl || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          // Update team if player was traded
          teamAbbr: player.teamAbbr,
          updatedAt: new Date().toISOString(),
        }
      )

      // Step 2: Upsert PlayerSeasonStats (historical archive)
      await db.playerSeasonStats.upsert(
        { playerId: playerRecord.id, seasonYear },
        {
          playerId: playerRecord.id,
          seasonYear,
          hrsTotal: player.homeRuns,
          teamAbbr: player.teamAbbr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          hrsTotal: player.homeRuns,
          teamAbbr: player.teamAbbr,
          updatedAt: new Date().toISOString(),
        }
      )

      createdCount++

    } catch (error) {
      console.error(`⚠️  Failed to save player ${player.name}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n📊 Database seeding complete:`);
  console.log(`   ✅ Players saved: ${createdCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
  console.log(`   📈 Season ${seasonYear}: ${createdCount} player records\n`);
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
    await db.$disconnect();
  }
}

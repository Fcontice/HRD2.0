/**
 * Import Players Cumulative Archive
 * Imports players from multiple seasons to create a comprehensive player archive for the contest
 * Uses live scraping from Baseball Savant (MLB Official Stats)
 */

import '../env.js' // Load environment variables
import { scrapePlayerStats, seedPlayersToDatabase } from '../services/scraperService.js'
import { db } from '../services/db.js'

// Seasons to import for cumulative archive
const SEASONS_TO_IMPORT = [2024, 2025]

async function importCumulativePlayerArchive() {
  console.log('\n🏟️  HRD 2.0 - Cumulative Player Archive Import\n')
  console.log('=' .repeat(60))
  console.log(`📅 Importing seasons: ${SEASONS_TO_IMPORT.join(', ')}`)
  console.log('=' .repeat(60) + '\n')

  let totalImported = 0
  const seasonResults: { [key: number]: { count: number; topPlayer: string } } = {}

  try {
    for (const seasonYear of SEASONS_TO_IMPORT) {
      console.log(`\n📊 Season ${seasonYear}`)
      console.log('-'.repeat(40))

      try {
        // Scrape player data from Baseball Savant
        console.log(`🔍 Scraping ${seasonYear} season data...`)
        const players = await scrapePlayerStats(seasonYear)

        if (players.length === 0) {
          console.log(`⚠️  No players found for ${seasonYear} - skipping`)
          continue
        }

        console.log(`✅ Found ${players.length} eligible players (≥10 HRs)`)

        // Save to database
        await seedPlayersToDatabase(players, seasonYear)

        // Get top player for this season
        const topPlayer = players.reduce((top, current) =>
          current.homeRuns > top.homeRuns ? current : top
        )

        seasonResults[seasonYear] = {
          count: players.length,
          topPlayer: `${topPlayer.name} (${topPlayer.teamAbbr}) - ${topPlayer.homeRuns} HRs`,
        }

        totalImported += players.length

        console.log(`✅ Season ${seasonYear} complete!`)

        // Small delay between seasons to avoid rate limiting
        if (seasonYear !== SEASONS_TO_IMPORT[SEASONS_TO_IMPORT.length - 1]) {
          console.log('⏳ Waiting 2 seconds before next season...')
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`❌ Failed to import season ${seasonYear}:`, error)
        console.log(`   Continuing with next season...\n`)
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 CUMULATIVE ARCHIVE SUMMARY')
    console.log('='.repeat(60) + '\n')

    for (const [season, result] of Object.entries(seasonResults)) {
      console.log(`${season}: ${result.count} players`)
      console.log(`   🏆 Top: ${result.topPlayer}`)
    }

    console.log(`\n📈 Total players imported: ${totalImported}`)

    // Get unique players across all seasons
    const uniquePlayers = await db.player.findMany({})
    console.log(`👥 Unique players in archive: ${uniquePlayers.length}`)

    // Get statistics from PlayerSeasonStats
    const stats = await db.playerSeasonStats.aggregate({
      _count: true,
      _avg: { hrsTotal: true },
      _max: { hrsTotal: true },
      _min: { hrsTotal: true },
    })

    console.log('\n📊 Archive Statistics:')
    console.log(`   Total season records: ${stats._count}`)
    console.log(`   Average HRs: ${stats._avg.hrsTotal?.toFixed(1)}`)
    console.log(`   Max HRs: ${stats._max.hrsTotal}`)
    console.log(`   Min HRs: ${stats._min.hrsTotal}`)

    // Show top 10 all-time HR leaders across all seasons
    console.log('\n🏆 Top 10 Single-Season Performances (All Seasons):')
    const allTimeLeaders = await db.playerSeasonStats.findMany(
      {},
      {
        orderBy: { hrsTotal: 'desc' },
        take: 10,
      }
    )

    allTimeLeaders.forEach((stat, i) => {
      console.log(
        `   ${i + 1}. ${stat.player.name} (${stat.teamAbbr}) - ${stat.hrsTotal} HRs [${stat.seasonYear}]`
      )
    })

    // Show players available for 2026 contest (2025 season stats)
    const eligible2026 = await db.playerSeasonStats.getEligibleForContest(2026)
    console.log(`\n🎮 Players eligible for 2026 contest: ${eligible2026.length}`)
    console.log(`   (Based on 2025 season performance with ≥10 HRs)`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ CUMULATIVE ARCHIVE IMPORT COMPLETE!')
    console.log('='.repeat(60) + '\n')

    console.log('💡 Next steps:')
    console.log('   1. Start the backend: npm run dev')
    console.log('   2. Verify data: GET /api/players?seasonYear=2025')
    console.log('   3. Check all seasons: GET /api/players (no filter)\n')
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run the import
importCumulativePlayerArchive()

/**
 * Debug scraper - see what HTML we're actually getting
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

async function debug() {
  const url = 'https://baseballsavant.mlb.com/leaderboard/custom?year=2025&type=batter&filter=&min=q&selections=home_run&chart=false&x=home_run&y=home_run&r=no&chartType=beeswarm&sort=home_run&sortDir=desc';

  console.log('Fetching:', url);

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  // Save full HTML to file
  writeFileSync('debug-output.html', response.data);
  console.log('✅ Saved HTML to debug-output.html');

  // Load with Cheerio
  const $ = cheerio.load(response.data);

  console.log('\n📊 Analysis:');
  console.log('Total tables:', $('table').length);
  console.log('Table rows:', $('table tbody tr').length);
  console.log('Table cells:', $('table tbody tr td').length);

  // Try to find any data
  console.log('\n🔍 First 5 rows:');
  $('table tbody tr').slice(0, 5).each((i, el) => {
    const $row = $(el);
    console.log(`Row ${i}:`, $row.text().trim().substring(0, 100));
  });
}

debug();

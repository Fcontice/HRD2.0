-- ============================================
-- Migration 001: Cumulative Archive Schema
-- ============================================
-- Migrates from snapshot-based to cumulative archive design
--
-- CHANGES:
-- 1. Player table = permanent identity (no seasonYear)
-- 2. PlayerSeasonStats = historical archive (one per player per season)
-- 3. PlayerStats = live tracking (current season only)

-- ==================== STEP 1: Create PlayerSeasonStats Table ====================

CREATE TABLE IF NOT EXISTS "PlayerSeasonStats" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES "Player"(id) ON DELETE CASCADE,
  "seasonYear" INTEGER NOT NULL,
  "hrsTotal" INTEGER NOT NULL DEFAULT 0,
  "teamAbbr" VARCHAR(10),  -- Team at end of season (players can be traded)
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One record per player per season
  UNIQUE("playerId", "seasonYear")
);

-- Indexes for performance
CREATE INDEX idx_player_season_stats_season ON "PlayerSeasonStats"("seasonYear");
CREATE INDEX idx_player_season_stats_hrs ON "PlayerSeasonStats"("hrsTotal");
CREATE INDEX idx_player_season_stats_player ON "PlayerSeasonStats"("playerId");
CREATE INDEX idx_player_season_stats_eligible ON "PlayerSeasonStats"("seasonYear", "hrsTotal")
  WHERE "hrsTotal" >= 10;

-- ==================== STEP 2: Migrate Existing Data ====================

-- Migrate existing Player records to PlayerSeasonStats
-- ONLY if Player table currently has data with seasonYear field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Player'
    AND column_name = 'seasonYear'
  ) THEN
    -- Migrate data from old Player structure
    INSERT INTO "PlayerSeasonStats" ("playerId", "seasonYear", "hrsTotal", "teamAbbr", "createdAt")
    SELECT
      id as "playerId",
      "seasonYear",
      COALESCE("hrsPreviousSeason", 0) as "hrsTotal",
      "teamAbbr",
      "createdAt"
    FROM "Player"
    WHERE COALESCE("hrsPreviousSeason", 0) >= 10
    ON CONFLICT ("playerId", "seasonYear") DO UPDATE
      SET "hrsTotal" = EXCLUDED."hrsTotal",
          "teamAbbr" = EXCLUDED."teamAbbr";

    RAISE NOTICE 'Migrated % records to PlayerSeasonStats',
      (SELECT COUNT(*) FROM "PlayerSeasonStats");
  END IF;
END $$;

-- ==================== STEP 3: Update Player Table Structure ====================

-- Remove season-specific fields (if they exist)
ALTER TABLE "Player" DROP COLUMN IF EXISTS "seasonYear";
ALTER TABLE "Player" DROP COLUMN IF EXISTS "hrsPreviousSeason";
ALTER TABLE "Player" DROP COLUMN IF EXISTS "isEligible";

-- Ensure Player table has correct structure (permanent identity)
-- Player table should now have:
--   - id (PK)
--   - mlbId (unique) - permanent MLB identifier
--   - name - current player name
--   - teamAbbr - current team (can change via trades)
--   - photoUrl - optional photo
--   - createdAt, updatedAt

-- ==================== STEP 4: Update PlayerStats Table ====================

-- PlayerStats already exists for live tracking (daily updates)
-- No changes needed - it tracks current season only

-- ==================== STEP 5: Grant Permissions ====================

-- Service role (backend)
GRANT ALL ON TABLE "PlayerSeasonStats" TO service_role;

-- Anon role (frontend - read only)
GRANT SELECT ON TABLE "PlayerSeasonStats" TO anon;

-- ==================== STEP 6: Create Helper Functions ====================

-- Function: Get eligible players for a contest year
-- Example: For 2026 contest, get 2025 players with ≥10 HRs
CREATE OR REPLACE FUNCTION get_eligible_players_for_contest(contest_year INTEGER)
RETURNS TABLE (
  player_id UUID,
  player_name VARCHAR,
  mlb_id VARCHAR,
  team_abbr VARCHAR,
  photo_url VARCHAR,
  previous_year_hrs INTEGER,
  season_year INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as player_id,
    p.name as player_name,
    p."mlbId" as mlb_id,
    pss."teamAbbr" as team_abbr,
    p."photoUrl" as photo_url,
    pss."hrsTotal" as previous_year_hrs,
    pss."seasonYear" as season_year
  FROM "PlayerSeasonStats" pss
  JOIN "Player" p ON p.id = pss."playerId"
  WHERE pss."seasonYear" = contest_year - 1
    AND pss."hrsTotal" >= 10
  ORDER BY pss."hrsTotal" DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get player season history
CREATE OR REPLACE FUNCTION get_player_season_history(player_id_param UUID)
RETURNS TABLE (
  season_year INTEGER,
  hrs_total INTEGER,
  team_abbr VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    "seasonYear" as season_year,
    "hrsTotal" as hrs_total,
    "teamAbbr" as team_abbr
  FROM "PlayerSeasonStats"
  WHERE "playerId" = player_id_param
  ORDER BY "seasonYear" DESC;
END;
$$ LANGUAGE plpgsql;

-- ==================== VERIFICATION ====================

-- Verify migration
DO $$
DECLARE
  player_count INTEGER;
  season_stats_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO player_count FROM "Player";
  SELECT COUNT(*) INTO season_stats_count FROM "PlayerSeasonStats";

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Player records (permanent identities): %', player_count;
  RAISE NOTICE 'PlayerSeasonStats records (archive): %', season_stats_count;
  RAISE NOTICE '==============================================';
END $$;

-- Show sample data
SELECT
  p.name,
  COUNT(pss.id) as seasons,
  STRING_AGG(pss."seasonYear"::TEXT || ': ' || pss."hrsTotal"::TEXT || ' HRs', ', ' ORDER BY pss."seasonYear") as history
FROM "Player" p
LEFT JOIN "PlayerSeasonStats" pss ON pss."playerId" = p.id
GROUP BY p.id, p.name
ORDER BY COUNT(pss.id) DESC
LIMIT 10;

-- ============================================
-- Fix Row Level Security (RLS) Issues
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- OPTION 1: Disable RLS entirely (recommended for server-side apps)
-- This allows your service role key to access all tables

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Player" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamPlayer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerStats" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Leaderboard" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;

-- If the command above fails with "relation does not exist",
-- try lowercase table names:

-- ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "player" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "team" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "team_player" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "player_stats" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "leaderboard" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "notification" DISABLE ROW LEVEL SECURITY;

-- After running this, test your connection again:
-- node test-supabase-connection.js

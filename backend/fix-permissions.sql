-- ============================================
-- Fix PostgreSQL Role Permissions
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Grant full access to service_role on all tables
GRANT ALL ON TABLE "User" TO service_role;
GRANT ALL ON TABLE "Player" TO service_role;
GRANT ALL ON TABLE "Team" TO service_role;
GRANT ALL ON TABLE "TeamPlayer" TO service_role;
GRANT ALL ON TABLE "PlayerStats" TO service_role;
GRANT ALL ON TABLE "Leaderboard" TO service_role;
GRANT ALL ON TABLE "Notification" TO service_role;

-- Grant usage on sequences (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant access to anon role as well (for potential client-side use)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO anon;
GRANT SELECT ON TABLE "Player" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Team" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TeamPlayer" TO anon;
GRANT SELECT ON TABLE "PlayerStats" TO anon;
GRANT SELECT ON TABLE "Leaderboard" TO anon;
GRANT SELECT, UPDATE ON TABLE "Notification" TO anon;

-- Verify permissions were granted
SELECT
    tablename,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
GROUP BY tablename
ORDER BY tablename;

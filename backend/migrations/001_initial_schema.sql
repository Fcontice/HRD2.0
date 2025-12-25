-- Home Run Derby 2.0 - Initial Database Schema
-- Migration 001: Create all tables

-- ==================== ENUMS ====================

DO $$ BEGIN
    CREATE TYPE "AuthProvider" AS ENUM ('email', 'google');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('draft', 'pending', 'paid', 'rejected', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EntryStatus" AS ENUM ('draft', 'entered', 'locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaderboardType" AS ENUM ('overall', 'monthly', 'allstar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('email', 'in_app');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== TABLES ====================

-- Users Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'email',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "avatarUrl" TEXT,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Teams Table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" VARCHAR(50) NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'draft',
    "stripePaymentId" TEXT,
    "entryStatus" "EntryStatus" NOT NULL DEFAULT 'draft',
    "totalHrs2024" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Players Table
CREATE TABLE IF NOT EXISTS "Player" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "mlbId" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "teamAbbr" VARCHAR(10) NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "hrsPreviousSeason" INTEGER NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TeamPlayers Junction Table
CREATE TABLE IF NOT EXISTS "TeamPlayer" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE,
    "playerId" UUID NOT NULL REFERENCES "Player"("id") ON DELETE CASCADE,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("teamId", "playerId")
);

-- PlayerStats Table
CREATE TABLE IF NOT EXISTS "PlayerStats" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" UUID NOT NULL REFERENCES "Player"("id") ON DELETE CASCADE,
    "seasonYear" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "hrsTotal" INTEGER NOT NULL DEFAULT 0,
    "hrsRegularSeason" INTEGER NOT NULL DEFAULT 0,
    "hrsPostseason" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("playerId", "seasonYear", "date")
);

-- Leaderboards Table
CREATE TABLE IF NOT EXISTS "Leaderboard" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE,
    "leaderboardType" "LeaderboardType" NOT NULL,
    "month" INTEGER,
    "rank" INTEGER NOT NULL,
    "totalHrs" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("teamId", "leaderboardType", "month")
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES "User"("id") ON DELETE CASCADE,
    "type" "NotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP
);

-- ==================== INDEXES ====================

-- User indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");

-- Team indexes
CREATE INDEX IF NOT EXISTS "Team_userId_idx" ON "Team"("userId");
CREATE INDEX IF NOT EXISTS "Team_entryStatus_idx" ON "Team"("entryStatus");
CREATE INDEX IF NOT EXISTS "Team_seasonYear_idx" ON "Team"("seasonYear");

-- Player indexes
CREATE INDEX IF NOT EXISTS "Player_seasonYear_idx" ON "Player"("seasonYear");
CREATE INDEX IF NOT EXISTS "Player_isEligible_idx" ON "Player"("isEligible");

-- TeamPlayer indexes
CREATE INDEX IF NOT EXISTS "TeamPlayer_teamId_idx" ON "TeamPlayer"("teamId");
CREATE INDEX IF NOT EXISTS "TeamPlayer_playerId_idx" ON "TeamPlayer"("playerId");

-- PlayerStats indexes
CREATE INDEX IF NOT EXISTS "PlayerStats_playerId_idx" ON "PlayerStats"("playerId");
CREATE INDEX IF NOT EXISTS "PlayerStats_seasonYear_idx" ON "PlayerStats"("seasonYear");
CREATE INDEX IF NOT EXISTS "PlayerStats_date_idx" ON "PlayerStats"("date");

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS "Leaderboard_leaderboardType_idx" ON "Leaderboard"("leaderboardType");
CREATE INDEX IF NOT EXISTS "Leaderboard_rank_idx" ON "Leaderboard"("rank");
CREATE INDEX IF NOT EXISTS "Leaderboard_month_idx" ON "Leaderboard"("month");

-- Notification indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_sentAt_idx" ON "Notification"("sentAt");

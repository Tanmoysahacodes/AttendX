-- ============================================================
-- AttendX Multi-Sport Expansion Migration
-- Safe, additive migration — preserves all existing data
-- 
-- Changes:
-- 1. Add Sport, Category, Squad tables
-- 2. Add squadId (nullable) to User
-- 3. Add squadId (nullable) to AttendanceSession
-- 4. Drop date-only unique on AttendanceSession; replace with date+squadId unique
-- 5. Drop global unique constraint on jerseyNumber (now optional per-squad)
-- 6. Add email column to User
-- ============================================================

-- Step 1: Create Sport table
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#f97316',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- Step 2: Create Category table
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_sportId_key" ON "Category"("name", "sportId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Create Squad table
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Squad_name_categoryId_key" ON "Squad"("name", "categoryId");
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Add squadId to User (nullable — existing staff have no squad, players get assigned in seed)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "squadId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add squadId to AttendanceSession (nullable — existing sessions get assigned in seed)
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "squadId" TEXT;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Drop old unique constraint (date only) and replace with (date, squadId)
-- The old constraint name from the initial migration
ALTER TABLE "AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_date_key";
-- Add new composite unique: (date, squadId) — allows same date in different squads
-- NULL squadId rows are treated as distinct by PostgreSQL UNIQUE (NULLs are not equal)
-- so existing null-squadId rows won't conflict with each other
CREATE UNIQUE INDEX "AttendanceSession_date_squadId_key" ON "AttendanceSession"("date", "squadId");

-- Step 7: Drop global unique constraint on jerseyNumber
-- Jersey numbers are now optional and managed per-squad at application level
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_jerseyNumber_key";

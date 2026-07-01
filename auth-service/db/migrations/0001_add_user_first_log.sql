-- ============================================================================
-- 0001_add_user_first_log.sql   (database: auth_db)
--
-- Adds the onboarding flag `users.first_log` used to auto-launch the first-run
-- tutorial exactly once for brand-new accounts.
--
--   • New signups          → first_log = false  (they see the tour once)
--   • All existing users   → first_log = true   (already onboarded, no tour)
--
-- SAFE TO RE-RUN: the whole thing is guarded on the column not existing yet, so
-- a second run is a no-op and can NEVER re-flip a genuinely-new user back to
-- "seen". Runs in a single transaction.
--
-- Apply on the server (from infra/), see the deploy notes below the file.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'first_log'
  ) THEN
    -- 1) add the column (all existing rows get the false default atomically)
    ALTER TABLE "users"
      ADD COLUMN "first_log" boolean NOT NULL DEFAULT false;

    -- 2) mark everyone who already exists as onboarded so shipping this does
    --    NOT trigger the tutorial for current users. Only runs on first apply.
    UPDATE "users" SET "first_log" = true;
  END IF;
END $$;

COMMIT;

-- Rollback (only if you must fully revert):
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "first_log";

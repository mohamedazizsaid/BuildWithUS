-- ============================================================================
-- 0002_backfill_internal_plan.sql   (database: auth_db)
--
-- Backfills every EXISTING tenant to the internal, unlimited plan.
--
-- Context: all tenants that exist right now belong to our own company, so they
-- must have unlimited access and never be billed. The 'internal' plan is NOT
-- purchasable and never appears on /pricing — it is assigned by us only (today
-- via this script, later from the super-admin page).
--
--   • Existing tenants (plan = 'free' or NULL)  → 'internal'  (unlimited, no billing)
--   • New signups after this runs               → 'free'      (column default, unchanged)
--
-- SAFETY: only touches tenants still on 'free'/NULL, so it will NEVER downgrade
-- or clobber a tenant already moved to a paid plan ('pro', 'pro_org'). Runs in a
-- single transaction.
--
-- RUN ONCE, NOW — before any external (paying) customer signs up. After external
-- customers exist, re-running would wrongly upgrade any new free tenant.
--
-- Apply on the server the same way as 0001 (from infra/), see 0001 deploy notes.
-- ============================================================================

BEGIN;

UPDATE "tenants"
SET "plan" = 'internal',
    "updated_at" = now()
WHERE "plan" = 'free' OR "plan" IS NULL;

COMMIT;

-- Verify
SELECT id, name, plan, created_at
FROM "tenants"
ORDER BY created_at DESC;

-- Rollback (only if you must revert the internal tenants back to free):
--   UPDATE "tenants" SET "plan" = 'free' WHERE "plan" = 'internal';

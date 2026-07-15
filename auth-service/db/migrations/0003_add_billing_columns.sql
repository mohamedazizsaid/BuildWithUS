-- ============================================================================
-- 0003_add_billing_columns.sql   (database: auth_db)
--
-- Adds the payment/subscription columns introduced by the Stripe billing feature
-- to the `tenants` table. In production TypeORM `synchronize` is OFF, so these
-- columns are NOT created automatically on deploy — this migration adds them.
--
-- MUST run BEFORE deploying the new backend code. The new auth-service reads and
-- writes these columns on tenant queries; without them, it errors on every call.
--
-- SAFE TO RE-RUN: every column uses ADD COLUMN IF NOT EXISTS, so a second run is
-- a no-op and never touches existing data. Runs in a single transaction.
--
-- Mirrors auth-service/src/auth/infrastructure/persistence/entities/
--   tenant.orm-entity.ts exactly (column names, types, defaults, nullability).
--
-- Apply on the server the same way as 0001/0002 (from infra/), see 0001 notes.
-- ============================================================================

BEGIN;

-- Stripe subscription state — nullable, only set once a tenant subscribes.
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "billing_cycle"          varchar(20)  NULL,
  ADD COLUMN IF NOT EXISTS "subscription_status"    varchar(50)  NULL,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id"     varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255) NULL;

-- Plan-usage counters — monotonic lifetime totals, never NULL.
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "email_templates_created" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_interactions_used"    integer NOT NULL DEFAULT 0;

COMMIT;

-- Verify the new columns exist:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;

-- Rollback (only if you must fully revert this migration):
--   ALTER TABLE "tenants"
--     DROP COLUMN IF EXISTS "billing_cycle",
--     DROP COLUMN IF EXISTS "subscription_status",
--     DROP COLUMN IF EXISTS "stripe_customer_id",
--     DROP COLUMN IF EXISTS "stripe_subscription_id",
--     DROP COLUMN IF EXISTS "email_templates_created",
--     DROP COLUMN IF EXISTS "ai_interactions_used";

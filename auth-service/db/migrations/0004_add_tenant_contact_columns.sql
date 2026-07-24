-- ============================================================================
-- 0004_add_tenant_contact_columns.sql   (database: auth_db)
--
-- Adds the company contact/billing details collected at signup and forwarded to
-- the CRM (phone + structured address). In production TypeORM `synchronize` is
-- OFF, so these columns are NOT created automatically on deploy — this migration
-- adds them.
--
-- MUST run BEFORE deploying the new backend code. The new auth-service reads and
-- writes these columns on tenant queries; without them, it errors on every call.
--
-- SAFE TO RE-RUN: every column uses ADD COLUMN IF NOT EXISTS, so a second run is
-- a no-op and never touches existing data. Runs in a single transaction.
--
-- Existing tenants (created before this feature) keep these columns NULL — that
-- is expected and fine; only NEW signups are required to fill them in the UI.
--
-- Mirrors auth-service/src/auth/infrastructure/persistence/entities/
--   tenant.orm-entity.ts exactly (column names, types, nullability).
--
-- Apply on the server (from infra/) the same way as 0001/0002/0003.
-- ============================================================================

BEGIN;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "phone"        varchar(40)  NULL,
  ADD COLUMN IF NOT EXISTS "address_line" varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS "postal_code"  varchar(20)  NULL,
  ADD COLUMN IF NOT EXISTS "city"         varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS "country"      varchar(80)  NULL;

COMMIT;

-- Verify the new columns exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name IN
  ('phone', 'address_line', 'postal_code', 'city', 'country')
ORDER BY ordinal_position;

-- Rollback (only if you must fully revert this migration):
--   ALTER TABLE "tenants"
--     DROP COLUMN IF EXISTS "phone",
--     DROP COLUMN IF EXISTS "address_line",
--     DROP COLUMN IF EXISTS "postal_code",
--     DROP COLUMN IF EXISTS "city",
--     DROP COLUMN IF EXISTS "country";

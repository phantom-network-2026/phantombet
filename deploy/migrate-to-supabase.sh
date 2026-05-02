#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Phantom Network — migrate live data from Lovable Cloud to a new Supabase
# project. Schema must already be loaded (deploy/db/01-schema.sql).
#
# Usage:
#   export SOURCE_DB="postgresql://postgres:PASS@db.muuucuwaaxsticfuelck.supabase.co:5432/postgres"
#   export TARGET_DB="postgresql://postgres:PASS@db.NEW_REF.supabase.co:5432/postgres"
#   bash deploy/migrate-to-supabase.sh
# ----------------------------------------------------------------------------
set -euo pipefail

: "${SOURCE_DB:?Set SOURCE_DB to the Lovable Cloud connection string}"
: "${TARGET_DB:?Set TARGET_DB to the new Supabase connection string}"

DUMP_DIR="${DUMP_DIR:-/tmp/phantom-migration}"
mkdir -p "$DUMP_DIR"

echo "==> 1/4  Dumping auth.users from source"
pg_dump "$SOURCE_DB" \
  --data-only --no-owner --no-acl \
  -t auth.users -t auth.identities \
  > "$DUMP_DIR/auth.sql"

echo "==> 2/4  Dumping all public tables (data only)"
pg_dump "$SOURCE_DB" \
  --data-only --no-owner --no-acl \
  --schema=public \
  --exclude-table=public.scratch_card_pool \
  > "$DUMP_DIR/public.sql"

echo "==> 3/4  Loading auth.users into target"
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$DUMP_DIR/auth.sql"

echo "==> 4/4  Loading public data into target"
psql "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$DUMP_DIR/public.sql"

echo
echo "Done. Next:"
echo "  1. Deploy edge functions:  supabase functions deploy --project-ref <NEW_REF>"
echo "  2. Update .env with new VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY"
echo "  3. Re-create secrets in the new project (TRON_*, LIVEKIT_*, LOVABLE_API_KEY, etc.)"
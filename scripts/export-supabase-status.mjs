#!/usr/bin/env node
// Reads `supabase status -o json` output and prints GITHUB_ENV lines for
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY, which
// tests/rls/helpers.ts needs to reach the ephemeral local Supabase CI started.
//
// Not done with `-o env` + grep: that format was observed prefixing lines with
// `export ` (or similar), so `grep '^API_URL='` silently matched nothing and
// wrote an EMPTY value into $GITHUB_ENV -- worse than failing, because the
// empty string overrides helpers.ts's own localhost fallback instead of
// leaving it unset. JSON keys are unambiguous, and this script fails loudly
// if any of the three is missing rather than exporting a blank value.
//
// Usage: node scripts/export-supabase-status.mjs <path-to-status.json>

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: export-supabase-status.mjs <status.json>");
  process.exit(1);
}

const status = JSON.parse(readFileSync(path, "utf8"));

const wanted = {
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
};

const missing = Object.entries(wanted)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(
    `Missing from supabase status -o json: ${missing.join(", ")}. ` +
      `Available keys: ${Object.keys(status).join(", ")}`,
  );
  process.exit(1);
}

for (const [name, value] of Object.entries(wanted)) {
  console.log(`${name}=${value}`);
}

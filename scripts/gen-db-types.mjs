#!/usr/bin/env node
// Normalizes `supabase gen types typescript` output before it becomes
// lib/supabase/database.types.ts, and before CI diffs a fresh regeneration
// against the committed file.
//
// Strips the `__InternalSupabase: { PostgrestVersion: "X.Y" }` block. That
// block records the Postgrest server version the CLI happened to talk to,
// not anything about the schema -- and it differs between a `--local`
// Docker Postgrest (whatever version this CLI release bundles) and a
// `--linked` hosted project's Postgrest (whatever Supabase is currently
// running), even against identical migrations. Without stripping it, CI's
// "regenerate --local and diff against committed" check fails forever on a
// version label that carries no information about a missed migration.
// Safe to drop: `DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">`
// already treats it as optional, and no code reads it.
//
// Usage: supabase gen types typescript ... | node scripts/gen-db-types.mjs

import { readFileSync } from "node:fs";

const input = readFileSync(0, "utf8");

const normalized = input
  .replace(/\n {2}\/\/ Allows to automatically instantiate[\s\S]*?\n {2}\}\n/, "\n")
  // A --local and a --linked generation have also been observed to differ only in
  // trailing blank lines. Collapse to exactly one trailing newline so that noise
  // can't fail the CI diff either.
  .replace(/\n+$/, "\n");

process.stdout.write(
  "// GENERATED. Never hand-edited.\n" +
    "// Regenerate with: npm run db:types\n\n" +
    normalized,
);

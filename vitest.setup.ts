import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// tests/rls/ needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
// The installed vitest does not support Node's --env-file flag, so this loads them
// from .env.local instead (Gate C, Session 7: the service-role key goes into
// .env.local and Vercel only, never into the repository). A no-op when the file
// doesn't exist — CI exports these three directly into the environment after
// starting local Supabase.
config({ path: ".env.local", quiet: true });

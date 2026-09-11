import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { env } from "@/lib/env";

const signup = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .transform((name) => name.replace(/\s+/g, " ")),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  locale: z.enum(["en", "hi"]),
  website: z.string().max(200).nullish(),
});

export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 2048) return Response.json({ error: "Request too large" }, { status: 413 });
  let data;
  try {
    data = signup.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!data.success) return Response.json({ error: "Invalid signup" }, { status: 400 });
  if (data.data.website) return Response.json({ ok: true });

  try {
    // Use the existing public key, never a service-role key. The database exposes
    // only the validated signup function; the waitlist itself stays private.
    const supabase = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    );
    const { error } = await supabase
      .rpc("join_waitlist", {
        p_name: data.data.name,
        p_email: data.data.email,
        p_locale: data.data.locale,
      })
      .abortSignal(AbortSignal.timeout(8000));
    if (error) throw new Error("Signup could not be saved");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Waitlist unavailable" }, { status: 503 });
  }
}

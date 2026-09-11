import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
};

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("names the missing variable when one is absent", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects a Supabase URL that is not a URL", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow();
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabase, getLocale, from, getUser, insert } = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  getLocale: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("@/i18n/locale", () => ({ getLocale }));

import { saveCheckin } from "@/app/actions/checkin";

const rules = [
  { id: "r-urgent", locale: "en", match_terms: ["bleeding"], severity: "urgent", guidance_title: "Please contact your clinic now", guidance_body: "Call your doctor or clinic right away.", priority: 90, is_active: true },
  { id: "r-general", locale: "en", match_terms: ["tired"], severity: "general", guidance_title: "That sounds normal", guidance_body: "Rest when you can.", priority: 10, is_active: true },
];

function ruleQuery() {
  const query = { select: () => query, eq: () => query, then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rules, error: null }).then(resolve) };
  return query;
}

beforeEach(() => {
  getUser.mockReset();
  from.mockReset();
  insert.mockReset();
  getLocale.mockReset();
  createServerSupabase.mockReset();
  getLocale.mockResolvedValue("en");
  insert.mockResolvedValue({ error: null });
  from.mockImplementation((table: string) => {
    if (table === "symptom_rules") return ruleQuery();
    if (table === "checkins") return { insert: (row: unknown) => insert(row) };
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("saveCheckin", () => {
  it("stores the deterministic triage result alongside the body and feeling", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    const result = await saveCheckin({ body: "I have some bleeding today", inputMethod: "text", feeling: "worried" });

    expect(result).toEqual({
      ok: true,
      severity: "urgent",
      guidance: { title: "Please contact your clinic now", body: "Call your doctor or clinic right away." },
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "auth-user",
      body: "I have some bleeding today",
      input_method: "text",
      severity: "urgent",
      matched_rule_id: "r-urgent",
      feeling: "worried",
    });
  });

  it("stores no severity and no guidance when nothing matches", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    const result = await saveCheckin({ body: "I watched a film today", inputMethod: "text", feeling: null });

    expect(result).toEqual({ ok: true, severity: null, guidance: null });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ severity: null, matched_rule_id: null, feeling: null }),
    );
  });

  it("never trusts a client-supplied user id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await saveCheckin({ body: "tired again", inputMethod: "text", feeling: "new" });

    expect(insert.mock.calls[0]![0]).toMatchObject({ user_id: "auth-user" });
  });

  it("rejects empty or whitespace-only text before touching the database", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "auth-user" } } });

    await expect(saveCheckin({ body: "   ", inputMethod: "text", feeling: null })).resolves.toEqual({
      ok: false,
      error: "empty_body",
    });
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns an authentication error without writing when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(saveCheckin({ body: "tired", inputMethod: "text", feeling: null })).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

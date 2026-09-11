// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { rpc, abortSignal } = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc }),
}));

function request(body: unknown, origin = "http://localhost:3025") {
  return new Request("http://localhost:3025/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  rpc.mockReset().mockReturnValue({ abortSignal });
  abortSignal.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("waitlist signup", () => {
  it.each([
    { name: "", email: "you@example.com", locale: "en" },
    { name: "   ", email: "you@example.com", locale: "en" },
    { name: "a".repeat(81), email: "you@example.com", locale: "en" },
    { name: "Asha", email: "wrong", locale: "en" },
    { name: "Asha", email: "you@example.com", locale: "unsupported" },
    { email: "you@example.com", locale: "en" },
  ])("rejects invalid name, email or language before contacting Supabase", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests without storing anything", async () => {
    expect(
      (
        await POST(
          request(
            { name: "Asha", email: "you@example.com", locale: "en" },
            "https://unrelated.example",
          ),
        )
      ).status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("normalizes name and email and submits both with the selected language", async () => {
    expect(
      (await POST(request({ name: "  आशा   शर्मा  ", email: " You@Example.com ", locale: "hi" })))
        .status,
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith("join_waitlist", {
      p_name: "आशा शर्मा",
      p_email: "you@example.com",
      p_locale: "hi",
    });
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("does not confirm before Supabase acknowledges the write", async () => {
    let save = () => {};
    abortSignal.mockImplementation(
      () =>
        new Promise((resolve) => {
          save = () => resolve({ error: null });
        }),
    );
    const completed = vi.fn();
    const response = POST(request({ name: "Asha", email: "you@example.com", locale: "en" })).then(
      completed,
    );
    await vi.waitFor(() => expect(abortSignal).toHaveBeenCalled());
    expect(completed).not.toHaveBeenCalled();
    save();
    await response;
    expect(completed.mock.calls[0]![0].status).toBe(200);
  });

  it("allows retry on a database error", async () => {
    abortSignal.mockResolvedValue({ error: { code: "42501", message: "Denied" } });
    const response = await POST(request({ name: "Asha", email: "you@example.com", locale: "en" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Waitlist unavailable" });
  });

  it("allows retry on a network failure", async () => {
    abortSignal.mockRejectedValue(new Error("Network failed"));
    expect(
      (await POST(request({ name: "Asha", email: "you@example.com", locale: "en" }))).status,
    ).toBe(503);
  });

  it("silently drops honeypot submissions", async () => {
    expect(
      (
        await POST(
          request({ name: "Bot", email: "you@example.com", locale: "en", website: "spam" }),
        )
      ).status,
    ).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});

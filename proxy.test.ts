// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "http://localhost:3025"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("launch gate", () => {
  it("lets the coming-soon page and the waitlist API through", () => {
    expect(proxy(request("/")).status).toBe(200);
    expect(proxy(request("/api/waitlist")).status).toBe(200);
  });

  it("lets static assets through regardless of path", () => {
    expect(proxy(request("/motif.svg")).status).toBe(200);
    expect(proxy(request("/brand/logo-icon.png")).status).toBe(200);
    expect(proxy(request("/favicon.ico")).status).toBe(200);
  });

  it("404s everything else, including the dev component gallery", () => {
    expect(proxy(request("/dev/components")).status).toBe(404);
    expect(proxy(request("/dashboard")).status).toBe(404);
  });

  it("opens up completely once the app has launched", () => {
    vi.stubEnv("APP_LAUNCHED", "true");
    expect(proxy(request("/dev/components")).status).toBe(200);
    expect(proxy(request("/dashboard")).status).toBe(200);
  });
});

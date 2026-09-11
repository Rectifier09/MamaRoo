import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Launch gate: until APP_LAUNCHED=true, only the coming-soon page and its
// waitlist API are public. Everything else -- the /dev component gallery
// today, real app routes as future sessions add them -- 404s, so half-built
// product never reaches visitors just because it landed on main. Static
// assets (anything with a file extension: _next output, public/, favicon)
// are always let through; they carry no product surface on their own.
const PUBLIC_ROUTES = new Set(["/", "/api/waitlist"]);
const HAS_FILE_EXTENSION = /\.[a-zA-Z0-9]+$/;

export function proxy(request: NextRequest) {
  if (process.env.APP_LAUNCHED === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_ROUTES.has(pathname) || HAS_FILE_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }

  return new NextResponse("Not found", { status: 404 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// /api/cards authenticates with its own bearer token (INGEST_TOKEN), so it must
// bypass the session-cookie gate here.
const PUBLIC_PATHS = ["/login", "/api/tick", "/api/cards"];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get("trinity_session")?.value;
  const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token && path === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/health).*)"],
};

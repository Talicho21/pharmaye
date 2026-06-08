import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_KEY = "pharmacy_session_token";

const PROTECTED_PATHS = ["/", "/analytics", "/stock-entry"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_KEY)?.value;

  if (pathname === "/login") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/analytics/:path*", "/stock-entry/:path*"],
};
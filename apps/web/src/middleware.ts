import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate: bounce visitors without a session cookie away from private routes.
 * The API remains the source of truth and validates every request.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("fm_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/onboarding/:path*"],
};

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/auth",
  "/api/markets",
  "/api/markets/history",
  "/api/leaderboard",
  "/api/events",
  "/api/og",
  "/api/telegram/webhook",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /api/ routes (skip pages, static assets, etc.)
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Allow public routes
  if (isPublicRoute(pathname)) return NextResponse.next();

  // Check for valid session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

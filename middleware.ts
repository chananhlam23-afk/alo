import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default withAuth(
  function middleware(req) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    const res = NextResponse.next();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Public API paths — no auth needed
        const PUBLIC = [
          "/api/v1/auth/",
          "/api/v1/webhooks/",
          "/api/v1/cron/",
          "/api/auth/",
        ];
        if (PUBLIC.some((p) => pathname.startsWith(p))) return true;

        // All other /api/v1 routes need a session
        if (pathname.startsWith("/api/v1/")) return !!token;

        // UI pages: /login is public
        if (pathname.startsWith("/login")) return true;

        // Dashboard pages require login
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/api/v1/:path*", "/admin/:path*", "/driver/:path*", "/customer/:path*"],
};

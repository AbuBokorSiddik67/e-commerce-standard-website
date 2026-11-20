import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") {
    // Do not redirect using an optimistic/stale JWT: the server may have revoked it.
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user?.id || req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};

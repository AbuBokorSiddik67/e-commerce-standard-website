import type { NextAuthConfig, Session } from "next-auth";

// Shared with proxy: token projection is only an optimistic navigation check.
// The full Auth.js configuration additionally validates the database session.
export const authConfig = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && typeof token.id === "string" && (token.role === "ADMIN" || token.role === "CUSTOMER")) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      if (typeof token.absoluteExpiry === "string") (session as Session).expires = token.absoluteExpiry;
      return session;
    },
  },
  trustHost: process.env.NODE_ENV !== "production" || process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: process.env.NODE_ENV === "production" ? true : undefined,
} satisfies NextAuthConfig;

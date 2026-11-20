import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { logError } from "@/lib/errors";
import { issueSession, readSession, revokeSession, verifyCredentials } from "@/server/services/auth-security";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    name: "Credentials",
    credentials: { email: {}, password: {}, portal: {} },
    async authorize(credentials, request) {
      try { return await verifyCredentials(credentials, request.headers); }
      catch (error) { logError("auth.authorize", error); return null; }
    },
  })],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id && user.role && typeof user.authVersion === "number") {
        const { handle, expires } = await issueSession({ id: user.id, role: user.role, authVersion: user.authVersion });
        return { ...token, id: user.id, role: user.role, authVersion: user.authVersion, handle, absoluteExpiry: expires.toISOString() };
      }
      if (typeof token.handle !== "string" || typeof token.id !== "string" || (token.role !== "ADMIN" && token.role !== "CUSTOMER") || typeof token.authVersion !== "number") return null;
      try {
        const state = await readSession(token.handle, { id: token.id, role: token.role, authVersion: token.authVersion });
        if (!state) return null;
        return { ...token, name: state.user.name, email: state.user.email, absoluteExpiry: state.expiresAt.toISOString() };
      } catch (error) { logError("auth.session", error); return null; }
    },
  },
  events: {
    async signOut(message) { if ("token" in message) await revokeSession(message.token?.handle); },
  },
  // Auth.js exceptions may embed request credentials or backend error details.
  logger: { error(error) { if (!(error instanceof CredentialsSignin)) logError("auth.framework", error); }, warn() {}, debug() {} },
});

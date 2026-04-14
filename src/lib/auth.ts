import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";

/**
 * NextAuth v5 config with Google SSO and Supabase adapter.
 *
 * When env vars are missing, auth is configured with no providers
 * and a dummy secret — the /api/auth/session endpoint returns {}
 * and useSession() returns null. Fully graceful.
 */

const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Use a dummy secret when not configured — session endpoint returns empty
  secret: process.env.AUTH_SECRET || "dev-secret-not-for-production",
  adapter: hasSupabase
    ? SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      })
    : undefined,
  providers: hasGoogle
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  session: {
    strategy: hasSupabase ? "database" : "jwt",
  },
  callbacks: {
    session({ session, user, token }) {
      if (user?.id) {
        session.user.id = user.id;
      } else if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

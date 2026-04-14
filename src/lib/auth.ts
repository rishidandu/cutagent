import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";

/**
 * NextAuth v5 config with Google SSO.
 *
 * Uses JWT sessions (no database adapter) — user info stored in the cookie.
 * On first sign-in, we upsert the user into Supabase ourselves via the
 * signIn callback. This avoids the @auth/supabase-adapter which requires
 * old-format JWT service_role keys.
 */

const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "dev-secret-not-for-production",
  providers: hasGoogle
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      // Upsert user into Supabase on every sign-in
      if (isSupabaseConfigured() && user.email) {
        try {
          const supabase = getServiceSupabase();
          await supabase.from("users").upsert(
            {
              email: user.email,
              name: user.name ?? profile?.name ?? null,
              image: user.image ?? (profile as Record<string, unknown>)?.picture ?? null,
            },
            { onConflict: "email" },
          );
        } catch {
          // Don't block sign-in if DB write fails
        }
      }
      return true;
    },
    async jwt({ token, profile }) {
      // On first sign-in, persist Google profile into JWT
      if (profile) {
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.picture;

        // Look up Supabase user ID for this email
        if (isSupabaseConfigured() && profile.email) {
          try {
            const supabase = getServiceSupabase();
            const { data } = await supabase
              .from("users")
              .select("id")
              .eq("email", profile.email)
              .single();
            if (data?.id) token.sub = data.id;
          } catch {
            // Use Google sub as fallback ID
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

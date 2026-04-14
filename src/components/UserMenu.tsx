"use client";

import { useSession, signIn, signOut } from "next-auth/react";

/**
 * User avatar + name + sign out button.
 * Renders nothing when auth is not configured or user is not signed in.
 */
export default function UserMenu() {
  const { data: session, status } = useSession();

  // Still loading or auth not configured
  if (status === "loading") return null;

  // Not signed in — show sign-in button (only if auth is likely configured)
  if (!session?.user) {
    // Don't show sign-in button if there's no auth at all
    // The middleware handles redirects; this is just a fallback
    return null;
  }

  return (
    <div className="flex items-center gap-2.5">
      {session.user.image && (
        <img
          src={session.user.image}
          alt=""
          className="h-8 w-8 rounded-full border border-white/10"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="text-xs text-zinc-300 max-w-[120px] truncate">
        {session.user.name}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="mono-ui text-[10px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300"
      >
        Sign out
      </button>
    </div>
  );
}

import { signIn } from "@/lib/auth";
import Link from "next/link";

export default async function SignInPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-64 w-64 rounded-full bg-amber-300/12 blur-3xl" />
      </div>

      <div className="glass-panel-strong relative z-10 w-full max-w-sm rounded-3xl p-8 text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-lg font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
          CA
        </div>

        <h1 className="hero-title mb-2 text-2xl font-semibold text-white">
          Sign in to CutAgent
        </h1>
        <p className="mb-8 text-sm text-zinc-400">
          Open-source AI video studio for product ads and UGC.
        </p>

        {/* Google sign-in */}
        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: searchParams.callbackUrl ?? "/",
            });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-zinc-100 transition"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-[11px] text-zinc-600">
          Or use the{" "}
          <Link href="https://github.com/rishidandu/cutagent" className="text-cyan-400 hover:underline">
            open-source version
          </Link>{" "}
          with your own API key.
        </p>
      </div>
    </div>
  );
}

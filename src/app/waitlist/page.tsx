"use client";

import Link from "next/link";
import { useState } from "react";

const featurePills = [
  "Product URL to storyboard",
  "Multi-model routing",
  "Style harness continuity",
  "UGC templates",
  "Batch hook variations",
  "One fal.ai key",
];

const workflow = [
  {
    step: "01",
    title: "Paste a product URL",
    body: "Pull in product data, images, and ad-ready context without starting from a blank canvas.",
  },
  {
    step: "02",
    title: "Get a scene-by-scene storyboard",
    body: "Assign the right model to the hook, reveal, social proof, and CTA instead of forcing one model to do everything.",
  },
  {
    step: "03",
    title: "Generate variations fast",
    body: "Spin multiple hooks, carry visual continuity across scenes, and iterate toward a winning ad faster.",
  },
];

const signalCards = [
  { label: "Models wired in", value: "20+", tone: "text-cyan-300" },
  { label: "Scene templates", value: "5", tone: "text-amber-300" },
  { label: "Variation styles", value: "8", tone: "text-rose-300" },
];

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch { /* Network error — still show success UX */ }
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-64 w-64 rounded-full bg-amber-300/12 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-400/10 blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
            CA
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-zinc-100">CutAgent</div>
            <div className="mono-ui text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              storyboard-first AI video
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/rishidandu/cutagent"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
            GitHub
          </a>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:bg-white/10"
          >
            Open Editor
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-14 pt-6 sm:px-8 lg:min-h-[calc(100vh-5rem)]">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-8">
            <div className="section-badge">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.8)]" />
              Open source, creator-owned workflow
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="hero-title max-w-4xl text-5xl font-semibold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                Turn a product page into a stack of ad-ready AI videos.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                CutAgent is a storyboard-first AI video studio for creators, marketers, and
                performance teams who need more than one pretty clip. Paste a product URL, build
                the right scenes, route each shot to the right model, and keep the look cohesive
                across the whole edit.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {featurePills.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  {feature}
                </span>
              ))}
            </div>

            <div className="glass-panel-strong rounded-[2rem] p-6 sm:p-7">
              {!submitted ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="mono-ui text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
                      Early access
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      Join the hosted launch list
                    </h2>
                    <p className="max-w-xl text-sm leading-6 text-zinc-400">
                      Get notified when the hosted version goes live with sign-in, saved projects,
                      referrals, and a smoother onboarding flow.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@brand.com"
                      required
                      className="mono-ui h-13 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/15"
                    />
                    <button
                      type="submit"
                      className="h-13 rounded-2xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(83,212,255,0.28)] hover:bg-cyan-300"
                    >
                      Join Waitlist
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span>No spam.</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                    <span>Open-source editor already available.</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                    <span>Hosted launch updates only.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/14 text-emerald-300">
                      ✓
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">You’re on the list.</p>
                      <p className="text-sm text-zinc-400">
                        We’ll send launch details when the hosted CutAgent beta opens.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100/90">
                    In the meantime, you can already open the editor and test the BYOK workflow.
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {signalCards.map((card) => (
                <div key={card.label} className="glass-panel rounded-[1.5rem] p-5">
                  <div className={`hero-title text-3xl font-semibold ${card.tone}`}>{card.value}</div>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="glass-panel-strong rounded-[2rem] p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-ui text-[11px] uppercase tracking-[0.22em] text-amber-300/85">
                  Why it feels different
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Built for multi-scene ads, not single-clip demos
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="mono-ui text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    {item.step}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-cyan-400/15 bg-cyan-400/[0.07] p-5">
              <p className="mono-ui text-[11px] uppercase tracking-[0.22em] text-cyan-300/85">
                Current positioning
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-200">
                Most AI video tools make clips. CutAgent is aiming to make campaigns: storyboarded,
                model-aware, and easier to iterate when you need hooks, benefits, and CTAs rather
                than just one hero shot.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

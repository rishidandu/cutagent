"use client";

import Link from "next/link";
import { useState } from "react";

const models = [
  { name: "Veo 3", provider: "Google", tag: "Realism + audio" },
  { name: "Kling 2.5", provider: "Kuaishou", tag: "Action, motion" },
  { name: "Seedance 1.5", provider: "ByteDance", tag: "Multi-shot" },
  { name: "Wan 2.5", provider: "Alibaba", tag: "Stylized" },
  { name: "MiniMax", provider: "MiniMax", tag: "Fast, cheap" },
  { name: "Luma Ray 2", provider: "Luma", tag: "Creative" },
  { name: "Veo 2", provider: "Google", tag: "Realism" },
  { name: "HunyuanVideo", provider: "Tencent", tag: "Open source" },
];

const steps = [
  {
    num: "1",
    title: "Paste a product URL",
    desc: "Drop a Shopify, Amazon, or any product link. CutAgent scrapes images, title, price, and writes the ad script for you.",
    accent: "text-cyan-400",
  },
  {
    num: "2",
    title: "Get a 4-scene storyboard",
    desc: "Hook, product reveal, social proof, CTA — each scene auto-assigned to the best AI model for that shot type.",
    accent: "text-amber-300",
  },
  {
    num: "3",
    title: "Generate and iterate",
    desc: "One click generates all scenes. Compare models side-by-side, swap hooks with batch variations, add voiceover, export as one video.",
    accent: "text-emerald-400",
  },
];

const differentiators = [
  {
    title: "Multi-model, not single-model",
    desc: "Hook with Kling for motion. Product shot with Veo for realism. CTA with Seedance for audio. Right model for each job.",
  },
  {
    title: "Style Engine keeps it cohesive",
    desc: "Frame chaining, style briefs, and product references flow across scenes so different models produce a unified ad.",
  },
  {
    title: "Built for volume, not one-offs",
    desc: "Batch 8 hook variations, auto-fit voiceover to scene length, export stitched MP4 with audio. Campaign-level output.",
  },
  {
    title: "Open source, bring your own key",
    desc: "Self-host for free with your fal.ai API key. No vendor lock-in, no per-video pricing, full control.",
  },
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
    } catch { /* still show success */ }
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-cyan-400/12 blur-[100px]" />
        <div className="absolute right-[-8rem] top-10 h-80 w-80 rounded-full bg-amber-300/10 blur-[80px]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-violet-400/8 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/waitlist" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold">CA</div>
          <span className="text-sm font-semibold text-zinc-100">CutAgent</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/rishidandu/cutagent"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
            Star on GitHub
          </a>
          <Link href="/" className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300">
            Open Editor
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-12 pb-16 text-center sm:px-8 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-4 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Open source &middot; MIT licensed
          </div>

          <h1 className="hero-title text-5xl font-semibold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Paste a product URL.<br />Get ad-ready AI videos.
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-400">
            CutAgent builds multi-scene video ads by routing each shot to the right AI model.
            Hook with Kling. Product shot with Veo. CTA with Seedance.
            One storyboard, multiple models, cohesive output.
          </p>
        </div>

        {/* Waitlist CTA — above the fold */}
        <div className="mx-auto mt-10 max-w-lg">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brand.com"
                required
                className="h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/15"
              />
              <button
                type="submit"
                className="h-12 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(83,212,255,0.25)] hover:bg-cyan-300 transition"
              >
                Join waitlist
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-5 py-3">
              <span className="text-emerald-300 text-lg">&#10003;</span>
              <span className="text-sm text-emerald-100">You're on the list. We'll email you when hosted launch is live.</span>
            </div>
          )}
          <p className="mt-3 text-xs text-zinc-600">
            Or{" "}
            <Link href="/" className="text-cyan-400 hover:underline">use the editor now</Link>
            {" "}with your own fal.ai key. No account needed.
          </p>
        </div>
      </section>

      {/* Model strip */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <p className="mb-4 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          One API key. Eight frontier models.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {models.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2"
            >
              <span className="text-xs font-medium text-zinc-200">{m.name}</span>
              <span className="text-[10px] text-zinc-500">{m.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 mb-2">How it works</p>
          <h2 className="hero-title text-3xl font-semibold text-white sm:text-4xl">
            Three steps. One storyboard. Multiple AI models.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="glass-panel rounded-[1.6rem] p-6">
              <div className={`hero-title text-4xl font-bold ${s.accent}`}>{s.num}</div>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why CutAgent */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80 mb-2">Why CutAgent</p>
          <h2 className="hero-title text-3xl font-semibold text-white sm:text-4xl">
            Built for ad campaigns, not single clips
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {differentiators.map((d) => (
            <div key={d.title} className="glass-panel rounded-[1.6rem] p-6">
              <h3 className="text-base font-semibold text-white">{d.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="glass-panel-strong rounded-[2rem] p-8 text-center sm:p-12">
          <h2 className="hero-title text-3xl font-semibold text-white sm:text-4xl">
            Ready to build better ads?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">
            Use the open-source editor now with your own API key, or join the waitlist for the hosted version with saved projects, team features, and managed billing.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-xl bg-cyan-400 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(83,212,255,0.25)] hover:bg-cyan-300 transition"
            >
              Open the editor
            </Link>
            <a
              href="https://github.com/rishidandu/cutagent"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-8 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 transition"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/6 py-6 text-center text-xs text-zinc-600">
        <p>
          CutAgent &middot; Open source under MIT &middot;{" "}
          <a href="https://github.com/rishidandu/cutagent" className="text-zinc-500 hover:text-zinc-300">GitHub</a>
        </p>
      </footer>
    </div>
  );
}

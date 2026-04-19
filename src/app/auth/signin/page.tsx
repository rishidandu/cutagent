import { signIn } from "@/lib/auth";
import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * Landing + sign-in page.
 * Single-column flow: hero + CTA, storyboard demo, capabilities,
 * differentiators, model marquee, how-it-works, pricing, footer.
 */
export default async function SignInPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams.callbackUrl ?? "/";

  // Reusable sign-in form action
  const signInAction = async () => {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Animated aurora backdrop ── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora-blob-1 absolute left-[-14rem] top-[-10rem] h-[40rem] w-[40rem] rounded-full bg-cyan-400/[0.16] blur-[140px]" />
        <div className="aurora-blob-2 absolute right-[-10rem] top-[6rem] h-[34rem] w-[34rem] rounded-full bg-violet-500/[0.16] blur-[130px]" />
        <div className="aurora-blob-3 absolute bottom-[-12rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-amber-300/[0.12] blur-[140px]" />
        <div className="aurora-blob-1 absolute right-1/4 bottom-[10rem] h-[26rem] w-[26rem] rounded-full bg-rose-400/[0.08] blur-[120px]" />
      </div>

      {/* Film grain + scanlines */}
      <div className="film-grain pointer-events-none fixed inset-0 -z-10" />
      <div className="scanlines pointer-events-none fixed inset-0 -z-10 opacity-[0.35]" />

      {/* ── Nav ── */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={38} />
          <span className="hero-title text-[15px] font-semibold tracking-tight text-white">
            CutAgent
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="#features"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08] sm:inline-flex"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08] sm:inline-flex"
          >
            Pricing
          </a>
          <a
            href="https://github.com/rishidandu/cutagent"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08]"
          >
            <span className="inline-flex items-center gap-1.5">
              <GitHubMark />
              Star
            </span>
          </a>
          <form action={signInAction}>
            <button
              type="submit"
              className="rounded-full bg-cyan-400 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_6px_20px_rgba(83,212,255,0.25)] hover:bg-cyan-300"
            >
              Sign in
            </button>
          </form>
        </div>
      </nav>

      {/* ── Hero (centered single-column) ── */}
      <main className="relative z-10">
        <section className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 text-center sm:px-8 sm:pt-16">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
            <span className="status-pulse inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
            URL &rarr; AI video ad &middot; in seconds
          </div>

          {/* Headline */}
          <h1 className="hero-title mx-auto mt-6 text-[3.2rem] font-semibold leading-[0.95] text-white sm:text-[4rem] lg:text-[5.5rem]">
            Turn any URL into{" "}
            <span className="gradient-shift bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200 bg-clip-text text-transparent">
              an AI&#8209;generated ad.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            Paste a product page, SaaS app, or landing site. CutAgent reads your content, writes the
            script, storyboards four scenes with the best AI video model for each shot, then exports
            a cinematic ad with voiceover baked in.
            <span className="block text-zinc-500"> No cameras. No crew. No post.</span>
          </p>

          {/* Primary CTA row */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <form action={signInAction}>
              <button
                type="submit"
                className="cta-glow flex items-center justify-center gap-3 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition"
              >
                <GoogleMark />
                Continue with Google
              </button>
            </form>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.08] transition"
            >
              See how it works
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
          </div>

          {/* Trust microcopy */}
          <p className="mt-5 text-[11px] text-zinc-500">
            Paste your first URL free &middot; $1 in AI credits on signup &middot; no credit card
          </p>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-y-8 sm:grid-cols-4">
            <Stat value="1" label="URL to start" accent="text-cyan-300" />
            <Stat value="60s" label="URL → ad" accent="text-amber-200" />
            <Stat value="10+" label="AI models" accent="text-violet-300" />
            <Stat value="&infin;" label="Hook remixes" accent="text-rose-300" />
          </div>
        </section>

        {/* ── Live storyboard demo ── */}
        <section className="relative mx-auto max-w-5xl px-5 pb-12 sm:px-8">
          <StoryboardDemo />
        </section>

        {/* ── Routes-across trust line ── */}
        <section className="relative mx-auto max-w-6xl px-5 pb-10 sm:px-8">
          <p className="mb-4 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            Your URL &rarr; script &rarr; storyboard &rarr; rendered by frontier video models
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-zinc-300">
            <span>Kling</span>
            <span className="text-zinc-700">·</span>
            <span>Veo 3</span>
            <span className="text-zinc-700">·</span>
            <span>Seedance</span>
            <span className="text-zinc-700">·</span>
            <span>MiniMax</span>
            <span className="text-zinc-700">·</span>
            <span>Luma Ray</span>
            <span className="text-zinc-700">·</span>
            <span>Wan 2.5</span>
            <span className="text-zinc-700">·</span>
            <span>HunyuanVideo</span>
          </div>
        </section>
      </main>

      {/* ── Features: agency-in-a-box ── */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl scroll-mt-16 px-5 pb-16 pt-6 sm:px-8">
        <SectionHeader
          eyebrow="How one URL becomes an ad"
          eyebrowColor="text-amber-300/80"
          title="Every role on a creative team, automated."
          subtitle="Paste a URL and CutAgent handles the writing, storyboarding, directing, voiceover, and editing — all from your link."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Capability
            emoji="✍️"
            title="Copywriter"
            desc="Hook · problem · proof · CTA. Written from your URL in the language your audience already scrolls."
          />
          <Capability
            emoji="🎬"
            title="Storyboard artist"
            desc="4-scene plan with roles, durations, aspect ratios, and model assignments tuned for each shot."
          />
          <Capability
            emoji="🎥"
            title="Director"
            desc="Style-locked prefixes, negative prompts, and continuity cues keep every cut visually cohesive."
          />
          <Capability
            emoji="🎙️"
            title="VO + editor"
            desc="Emotion-tagged TTS auto-fits scene length. Native FFmpeg burn-in for captions. Export in one click."
          />
        </div>
      </section>

      {/* ── Why CutAgent differentiators ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <SectionHeader
          eyebrow="Why CutAgent"
          eyebrowColor="text-violet-300/80"
          title="Your URL. A complete ad. Not just a clip."
          subtitle="Every other AI video tool makes you prompt from scratch. We read your page, write the ad, and route each scene to the best model — automatically."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Differentiator
            title="Multi-model, not single-model"
            desc="Hook with Kling for motion. Product shot with Veo for realism. CTA with Seedance. Right model, right job — automatically."
          />
          <Differentiator
            title="Style Engine keeps it cohesive"
            desc="Frame chaining, style briefs, and product references flow across scenes so different models produce one unified ad."
          />
          <Differentiator
            title="Hook Lab + batch variations"
            desc="Generate 8 distinct hook variations in one click. A/B test openings without re-shooting the whole ad."
          />
          <Differentiator
            title="Avatar & voiceover scenes"
            desc="Splice cinematic b-roll with AI spokesperson scenes. Emotion-tagged TTS auto-fits voiceover to scene length."
          />
        </div>
      </section>

      {/* ── Model marquee ── */}
      <section className="relative z-10 py-8">
        <p className="mb-5 text-center text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          One studio &middot; every frontier model
        </p>
        <ModelMarquee />
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-4 sm:px-8">
        <SectionHeader
          eyebrow="How it works"
          eyebrowColor="text-cyan-300/80"
          title="Paste a URL. Walk away with an ad."
        />
        <div className="grid gap-5 md:grid-cols-3">
          <HowStep
            num="01"
            title="Drop any URL"
            desc="Product page, SaaS app, App Store link, landing site — CutAgent reads your content, images, and CTA automatically."
            accent="text-cyan-300"
            ring="ring-cyan-400/30"
          />
          <HowStep
            num="02"
            title="AI writes the ad"
            desc="Script, 4-scene storyboard, model assignments, durations, and voiceover — generated from your URL in seconds. Edit anything."
            accent="text-violet-300"
            ring="ring-violet-400/30"
          />
          <HowStep
            num="03"
            title="Render & ship"
            desc="Generate all scenes in parallel, preview inline, then export a stitched MP4 with captions and voiceover baked in."
            accent="text-amber-200"
            ring="ring-amber-400/30"
          />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl scroll-mt-16 px-5 pb-16 pt-4 sm:px-8">
        <SectionHeader
          eyebrow="Pricing"
          eyebrowColor="text-rose-300/80"
          title="Simple, credit-based pricing."
          subtitle="Credits are spent as you generate — bring your own fal.ai key or let us handle it."
        />
        <div className="grid items-stretch gap-4 sm:grid-cols-3">
          <PricingTier
            label="Free"
            price="$0"
            period=""
            credits="$1 AI credits"
            creditsColor="text-zinc-400"
            creditsBg="bg-white/5 border-white/10"
            features={[
              "All 10+ frontier models",
              "Export with captions",
              "Local project save",
              "Community support",
            ]}
            missing={["Priority queue", "Cloud projects", "Hook Lab & Batch"]}
            cta="Start free"
            ctaClass="w-full rounded-xl border border-white/10 bg-white/6 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 transition"
            signInAction={signInAction}
          />
          <PricingTier
            label="Premium"
            price="$20"
            period="/mo"
            credits="$15 AI credits"
            creditsColor="text-cyan-300"
            creditsBg="bg-cyan-400/10 border-cyan-400/20"
            highlight
            features={[
              "All 10+ frontier models",
              "Priority generation queue",
              "Cloud project save (unlimited)",
              "Avatar & voiceover scenes",
              "Export with captions",
            ]}
            missing={[]}
            cta="Upgrade to Premium"
            ctaClass="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(83,212,255,0.25)] hover:bg-cyan-300 transition"
            signInAction={signInAction}
          />
          <PricingTier
            label="Pro"
            price="$50"
            period="/mo"
            credits="$45 AI credits"
            creditsColor="text-violet-300"
            creditsBg="bg-violet-400/10 border-violet-400/20"
            features={[
              "Everything in Premium",
              "Hook Lab + batch variations",
              "Early access to new models",
              "Team sharing (up to 3 seats)",
              "Dedicated support",
            ]}
            missing={[]}
            cta="Go Pro"
            ctaClass="w-full rounded-xl border border-violet-400/30 bg-violet-400/8 py-3 text-sm font-medium text-zinc-200 hover:bg-violet-400/15 transition"
            signInAction={signInAction}
          />
        </div>
        <p className="mt-6 text-center text-[11px] text-zinc-600">
          🔒 Secure payments via Stripe &middot; Cancel anytime &middot; Prorated upgrades
        </p>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <div className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-8 text-center sm:p-12">
          {/* Inner glow */}
          <div className="pointer-events-none absolute -inset-20 opacity-50">
            <div className="aurora-blob-1 absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/15 blur-[100px]" />
          </div>
          <div className="relative">
            <h2 className="hero-title text-3xl font-semibold text-white sm:text-[2.8rem]">
              Paste your URL.{" "}
              <span className="gradient-shift bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200 bg-clip-text text-transparent">
                Your ad is ready in 60 seconds.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400">
              Sign in free and turn your first URL into a video ad in under a
              minute. No cameras, no crew, no credit card.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <form action={signInAction}>
                <button
                  type="submit"
                  className="cta-glow flex items-center justify-center gap-3 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition"
                >
                  <GoogleMark />
                  Sign in with Google
                </button>
              </form>
              <a
                href="https://github.com/rishidandu/cutagent"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.08] transition"
              >
                <GitHubMark />
                Run open-source with your own key
              </a>
            </div>

            <p className="mt-6 text-[10px] text-zinc-600">
              By signing in you agree to our friendly terms and privacy. You can delete your account and data any time.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center text-[11px] text-zinc-600">
        <p>
          CutAgent &middot; Open-source AI video studio &middot;{" "}
          <a href="#features" className="hover:text-zinc-400">Features</a>
          {" · "}
          <a href="#pricing" className="hover:text-zinc-400">Pricing</a>
          {" · "}
          <a
            href="https://github.com/rishidandu/cutagent"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-400"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Components
// ═════════════════════════════════════════════════════════════════════════

function Stat({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="text-center">
      <div
        className={`hero-title text-4xl font-semibold ${accent} sm:text-5xl`}
        dangerouslySetInnerHTML={{ __html: value }}
      />
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  eyebrowColor,
  title,
  subtitle,
}: {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className={`text-[10px] uppercase tracking-[0.28em] ${eyebrowColor}`}>
        {eyebrow}
      </p>
      <h2 className="hero-title mt-2 text-3xl font-semibold text-white sm:text-[2.4rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Capability({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-panel group relative overflow-hidden rounded-2xl p-5 transition hover:bg-white/[0.06]">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 transition duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-lg">
          {emoji}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}

function Differentiator({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{desc}</p>
    </div>
  );
}

function HowStep({
  num,
  title,
  desc,
  accent,
  ring,
}: {
  num: string;
  title: string;
  desc: string;
  accent: string;
  ring: string;
}) {
  return (
    <div className={`glass-panel relative overflow-hidden rounded-[1.4rem] p-6 ring-1 ${ring}`}>
      <div className={`mono-ui ${accent} text-xs tracking-[0.3em]`}>{num}</div>
      <h3 className="hero-title mt-2 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{desc}</p>
    </div>
  );
}

// ── Pricing tier ────────────────────────────────────────────────────────
function PricingTier({
  label,
  price,
  period,
  credits,
  creditsColor,
  creditsBg,
  features,
  missing,
  cta,
  ctaClass,
  highlight,
  signInAction,
}: {
  label: string;
  price: string;
  period: string;
  credits: string;
  creditsColor: string;
  creditsBg: string;
  features: string[];
  missing: string[];
  cta: string;
  ctaClass: string;
  highlight?: boolean;
  signInAction: () => Promise<void>;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-[1.6rem] p-6 ${
        highlight
          ? "glass-panel ring-1 ring-cyan-400/40 shadow-[0_0_40px_rgba(83,212,255,0.08)]"
          : "glass-panel"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3 py-0.5 text-[10px] font-semibold text-slate-950">
          Most popular
        </div>
      )}

      <div className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold text-white">{price}</span>
          {period && <span className="text-sm text-zinc-500">{period}</span>}
        </div>
        <span
          className={`mt-2 inline-block rounded-lg border px-2 py-0.5 text-[10px] font-medium ${creditsColor} ${creditsBg}`}
        >
          {credits}
        </span>
      </div>

      <ul className="mb-6 flex flex-grow flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 text-emerald-400">✓</span>
            {f}
          </li>
        ))}
        {missing.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 line-through">
            <span className="mt-0.5">✗</span>
            {f}
          </li>
        ))}
      </ul>

      <form action={signInAction}>
        <button type="submit" className={ctaClass}>
          {cta}
        </button>
      </form>
    </div>
  );
}

// ── Storyboard demo ─────────────────────────────────────────────────────
function StoryboardDemo() {
  const scenes = [
    {
      role: "HOOK",
      model: "Kling 2.5 Turbo",
      dur: "5s",
      tint: "from-cyan-400/25 to-cyan-400/0",
      bar: "scene-progress-1",
      float: "card-float-1",
      status: "Ready",
    },
    {
      role: "SOLUTION",
      model: "Veo 3",
      dur: "8s",
      tint: "from-violet-400/25 to-violet-400/0",
      bar: "scene-progress-2",
      float: "card-float-2",
      status: "Generating",
    },
    {
      role: "PROOF",
      model: "Seedance 1.5",
      dur: "6s",
      tint: "from-amber-300/25 to-amber-300/0",
      bar: "scene-progress-3",
      float: "card-float-3",
      status: "Queued",
    },
    {
      role: "CTA",
      model: "Luma Ray 2",
      dur: "8s",
      tint: "from-rose-400/25 to-rose-400/0",
      bar: "scene-progress-4",
      float: "card-float-4",
      status: "Queued",
    },
  ];

  return (
    <div className="glass-panel-strong relative overflow-hidden rounded-[1.6rem] p-5 sm:p-6">
      {/* Top status bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mono-ui flex-1 truncate text-[11px] text-zinc-500">
          cutagent.ai / storyboard /{" "}
          <span className="text-cyan-300">new-product-launch.mp4</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] font-medium text-cyan-200">
          <span className="spin-slow inline-block h-3 w-3 rounded-full border border-cyan-400/30 border-t-cyan-300" />
          Rendering
        </div>
      </div>

      {/* URL bar */}
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2.5">
        <span className="text-base">🔗</span>
        <div className="mono-ui flex-1 truncate text-[12px] text-zinc-300">
          https://linear.app
          <span className="blink ml-0.5 inline-block h-3 w-[2px] translate-y-[2px] bg-cyan-300" />
        </div>
        <div className="rounded-md bg-cyan-400 px-2.5 py-1 text-[10px] font-semibold text-slate-950">
          Import
        </div>
      </div>

      {/* Scene cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {scenes.map((s, i) => (
          <SceneCardMock key={s.role} {...s} index={i} />
        ))}
      </div>

      {/* Timeline track */}
      <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="mono-ui text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Timeline · 27s · 9:16
          </span>
          <span className="mono-ui text-[10px] text-zinc-600">00:12 / 00:27</span>
        </div>
        <div className="flex h-8 gap-1 overflow-hidden rounded-md">
          <div className="flex-[5] rounded-md bg-gradient-to-r from-cyan-500/40 to-cyan-400/20" />
          <div className="flex-[8] rounded-md bg-gradient-to-r from-violet-500/40 to-violet-400/20" />
          <div className="flex-[6] rounded-md bg-gradient-to-r from-amber-400/40 to-amber-300/20" />
          <div className="flex-[8] rounded-md bg-gradient-to-r from-rose-500/40 to-rose-400/20" />
        </div>
        {/* Waveform */}
        <div className="mt-3 flex h-5 items-center gap-[2px]">
          {Array.from({ length: 52 }).map((_, i) => (
            <div
              key={i}
              className="vu-bar flex-1 rounded-full bg-gradient-to-t from-cyan-400/50 via-violet-400/50 to-amber-300/50"
              style={{
                animationDelay: `${(i % 9) * 0.1}s`,
                height: `${30 + Math.abs(Math.sin(i * 0.8)) * 70}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Corner label */}
      <div className="absolute right-4 top-4 hidden lg:block">
        <div className="mono-ui rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-zinc-400">
          Live preview
        </div>
      </div>
    </div>
  );
}

function SceneCardMock({
  role,
  model,
  dur,
  tint,
  bar,
  float,
  status,
  index,
}: {
  role: string;
  model: string;
  dur: string;
  tint: string;
  bar: string;
  float: string;
  status: string;
  index: number;
}) {
  const statusColor =
    status === "Ready"
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : status === "Generating"
        ? "text-cyan-300 border-cyan-400/30 bg-cyan-400/10"
        : "text-zinc-500 border-white/10 bg-white/5";

  return (
    <div className={`${float} relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint} opacity-70`} />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="mono-ui text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
            {role}
          </span>
          <span className={`mono-ui rounded-sm border px-1.5 py-0.5 text-[8px] uppercase tracking-wider ${statusColor}`}>
            {status}
          </span>
        </div>

        <div className="mt-2.5 flex aspect-[9/16] items-center justify-center overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-8 w-8 text-white/20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {status === "Generating" && (
              <div className="sweep-highlight absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            )}
            <div className="mono-ui absolute left-1.5 top-1.5 rounded-sm bg-black/50 px-1 text-[8px] text-white/70">
              #{index + 1}
            </div>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-zinc-400">
          <div className="truncate text-zinc-200">{model}</div>
          <div className="mono-ui text-zinc-500">{dur} · 9:16</div>
        </div>

        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/5">
          <div className={`${bar} h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300`} />
        </div>
      </div>
    </div>
  );
}

// ── Model marquee ───────────────────────────────────────────────────────
function ModelMarquee() {
  const models = [
    { name: "Kling 2.5 Turbo", by: "Kuaishou" },
    { name: "Veo 3", by: "Google" },
    { name: "Seedance 1.5", by: "ByteDance" },
    { name: "MiniMax Hailuo", by: "MiniMax" },
    { name: "Luma Ray 2", by: "Luma" },
    { name: "Wan 2.5", by: "Alibaba" },
    { name: "HunyuanVideo", by: "Tencent" },
    { name: "Kling Avatar", by: "Kuaishou" },
    { name: "SadTalker", by: "OSS" },
    { name: "Veo 2", by: "Google" },
  ];

  const strip = [...models, ...models];

  return (
    <div className="marquee-mask relative overflow-hidden">
      <div className="marquee-track flex w-max items-center gap-3">
        {strip.map((m, i) => (
          <div
            key={`${m.name}-${i}`}
            className="flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2"
          >
            <span className="text-sm font-semibold text-zinc-100">{m.name}</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
              {m.by}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Google G mark ───────────────────────────────────────────────────────
function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── GitHub mark ─────────────────────────────────────────────────────────
function GitHubMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.96c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.83 1.19 3.09 0 4.43-2.69 5.41-5.26 5.69.41.36.77 1.05.77 2.12v3.14c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

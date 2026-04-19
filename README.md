<p align="center">
  <img src="https://img.shields.io/badge/status-hosted%20beta-cyan?style=flat-square" alt="Hosted Beta" />
  <img src="https://img.shields.io/badge/models-8-violet?style=flat-square" alt="8 Models" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT" />
  <img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome" />
</p>

<h1 align="center">CutAgent</h1>

<p align="center">
  <strong>AI ad production for DTC agencies.</strong><br />
  Paste a product URL. Ship a stack of ad variants. One subscription, unlimited client brands.
</p>

<p align="center">
  <a href="#what-it-does">What It Does</a> &nbsp;·&nbsp;
  <a href="#for-agencies">For Agencies</a> &nbsp;·&nbsp;
  <a href="#run-it-yourself">Run It Yourself</a> &nbsp;·&nbsp;
  <a href="#supported-models">Models</a> &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;·&nbsp;
  <a href="#contributing">Contributing</a>
</p>

---

## The Problem

Your agency runs 10+ Shopify clients. Every new account needs 30–50 ad variants in the first 60 days. UGC creators charge $150–500 per video. With a coordinator and a roster of creators you still ship 5–8 videos per client per week. Meta's algorithm wants 20+.

CutAgent replaces the UGC production pipeline with an ad-creative production layer. Paste a product URL, get a 4-scene storyboard, generate a full stack of variants — each scene routed to the frontier model that fits the shot.

```
Product URL  ──→  4-scene storyboard  ──→  Hook (Kling) → Reveal (Veo) → Proof (MiniMax) → CTA (Seedance)
                  ↑ auto-generated          ↑ per-scene model routing
                  ↑ voiceover scripts        ↑ Style Engine chains visual continuity across shots
                  ↑ brand kit per client     ↑ Hook Lab generates 8 hook variations in one click
```

## What It Does

CutAgent has two products in one repo:

**Hosted (cutagent.com)** — the agency SaaS. Google sign-in, Stripe billing, managed fal.ai credits, cloud project storage, per-client brand kits, white-label export, Hook Lab, AI avatar scenes, auto-captions. This is what agencies buy.

**Open-source (this repo)** — the full editor as a Next.js app you can run locally with your own fal.ai key. No auth, no billing, no cloud save. MIT licensed. Fork it, embed it, ship it.

## For Agencies

If you're running an agency with 10+ e-commerce clients and want to see the hosted product in action, book a 15-minute demo and we'll generate ads for one of your actual client brands on the call. Pricing starts at $199/mo for Agency Starter, $499/mo for Agency Pro with unlimited clients and white-label export.

See [business/LANDING_AGENCY_VARIANT.md](business/LANDING_AGENCY_VARIANT.md) for the full agency pitch.

## Run It Yourself

```bash
git clone https://github.com/rishidandu/cutagent.git
cd cutagent
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000), paste your [fal.ai API key](https://fal.ai/dashboard/keys) in the editor (free tier available), and generate your first ad.

The open-source path runs without auth, Stripe, or Supabase. Just a fal.ai key. If you want to self-host the full hosted feature set (auth + cloud saves + billing), see [business/SELF_HOSTING.md](business/SELF_HOSTING.md) (coming soon).

## How It Works

### 1. Paste a Product URL

Drop any Shopify, Amazon, Etsy, or eBay link. CutAgent scrapes the product data via the Shopify JSON API (with HTML scraper fallback), normalizes images (bypasses CDN restrictions, validates 300×300 minimum, upscales thumbnails, uploads to fal.ai storage), and builds a 4-scene storyboard automatically.

### 2. Each Scene Gets the Right Model

Not all models are equal. Kling excels at motion. Veo nails realism. Seedance handles native audio. CutAgent routes each scene to the model that fits its purpose:

| Scene Role | What It Does | Default Model | Why |
|:-----------|:-------------|:--------------|:----|
| **Hook** | Pattern interrupt, grabs attention in 3s | Kling 2.5 Turbo | Fast motion, dynamic angles |
| **Reveal** | Product showcase, the "aha" moment | Kling / Veo 2 | Clean product shots, realism |
| **Proof** | Social proof, testimonial feel | MiniMax Live | Authentic, fast |
| **CTA** | Hero shot, end-frame for text overlay | Seedance 1.5 | Cinematic, audio support |

### 3. Hook Lab — Batch Variation That Meta's Algorithm Actually Wants

One click, 8 distinct hook variants per storyboard. Different angles, emotional triggers, and pacing. Ship all 8, let the ad account sort it out. This is the feature the media buyers ask for, not the clips.

### 4. AI Avatars + Auto-Captions

Splice cinematic b-roll with AI spokesperson scenes. Emotion-tagged TTS auto-fits voiceover to scene length. Captions burn in on export with server-side FFmpeg drawtext rendering.

### 5. Style Engine Keeps It Cohesive

Different models = different visual styles. The Style Engine solves this:

```
Scene 1 completes → extract last frame → pass as img2vid reference to Scene 2
                                                    ↓
Scene 2 completes → extract last frame → pass to Scene 3
                                                    ↓
                                          ...visual continuity across models
```

Plus a **style brief** prepended to every prompt (lighting, color palette, product description) and **product reference images** passed to every generation.

### 6. Voiceover Fits the Scene

Each scene gets a voiceover script auto-written from product data with a **hard word budget** tied to duration. A 5-second scene gets max 11 words. TTS auto-speeds up if text is borderline too long. Never overflows.

### 7. Export

FFmpeg.wasm stitches scenes + voiceover + music into a single MP4 in-browser. Optional server-side caption burn-in via `/api/add-captions` for export with subtitles. Brand kit logo overlay (hosted only; OSS version shipping soon).

## Features

### Generation Pipeline
- **8 AI video models** via fal.ai (Kling 2.5, Veo 2/3, Seedance 1.5, Luma Ray 2, MiniMax Live, Wan 2.5, HunyuanVideo)
- **AI Avatar scenes** via avatar-specific model adapters (TTS → avatar endpoint)
- **Role-based prompt engine** with anti-hallucination rules (negative prompts to prevent invented text/logos)
- **Model-specific adapters** for correct parameter formatting per model
- **Image normalization** — server-side download, dimension validation, CDN upscaling, fal storage upload
- **Job recovery** — resume incomplete generations after page reload

### Agency Features (Hosted)
- **Per-client brand kits** — logo, colors, tagline, watermark position
- **Cloud project storage** — Supabase Storage for permanent video URLs + project JSON
- **Auto-save sidebar** — ChatGPT-style project list with auto-naming and switching
- **Stripe billing** — 3-tier subscription with credit-based metering and atomic RPC deduction
- **Managed fal.ai credentials** — no API key management for paid tiers

### Product Import
- **Shopify JSON API** integration with full gallery image extraction
- **HTML scraper** fallback for Amazon, Etsy, eBay, and any e-commerce site
- **Auto-storyboard** generation with role assignment, model routing, and voiceover scripts
- **5 narrative angles** (convenience, quality, social proof, value, unboxing) randomly selected per import

### Templates & Variations
- **5 templates** — UGC Ad, Product Showcase, Explainer, Before/After, Social Proof
- **Hook Lab** — test 20+ hooks fast (sequential generation with rate-limit staggering), expand winners into full storyboards
- **Batch variations** — 8 hook styles, generate N versions with one click
- **Script import** — paste a script, AI splits into scenes and assigns models

### Audio
- **Per-scene voiceover** — Kokoro ($0.02/1K chars) or ElevenLabs ($0.05/1K chars)
- **Duration-aware** word budgets, auto-fit speed control
- **Background music** — CassetteAI ($0.02/min) or Stable Audio 2.5
- **Smart muting** — video muted when TTS exists

### Style & Consistency
- **Style brief** — global prompt prefix for lighting, color palette, character
- **Reference images** — character, style, product, and last-frame types with per-scene overrides
- **Auto-chain** — last frame from each scene automatically feeds into the next

### Editor
- **Drag-to-reorder** scenes with re-indexing
- **Trim controls** per scene
- **Side-by-side comparison** — generate same scene with 2–4 models, pick the best
- **Preview player** — play full storyboard back-to-back
- **Cost tracking** — real-time spend display, per-model pricing, database-recorded history
- **Project save/load** — JSON export/import with field migration for compatibility
- **Credit balance badge** — live Stripe-synced credits in the UI with upgrade modal on insufficient funds

## Supported Models

| Model | Provider | Aspect Ratios | Best For | Cost/sec |
|:------|:---------|:--------------|:---------|:---------|
| HunyuanVideo | Tencent | 16:9, 9:16 | Cheapest option | $0.075 |
| Wan 2.5 | Alibaba | 16:9, 9:16, 1:1 | Anime, stylized | $0.05 |
| MiniMax Live | MiniMax | Auto (no control) | Fast, cheap | $0.10 |
| Kling 2.5 Turbo | Kuaishou | 16:9, 9:16, 1:1 | Action, motion | $0.07 |
| Luma Ray 2 | Luma | All ratios | Dreamy, creative | $0.10 |
| Seedance 1.5 | ByteDance | All ratios | Audio, multi-shot | $0.08 |
| Veo 2 | Google | 16:9, 9:16 | Photorealism | $0.25 |
| Veo 3 | Google | 16:9, 9:16 | Realism + audio | $0.40 |

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Main editor (1,290+ lines)
│   ├── waitlist/page.tsx           # Landing page (/ for unauth'd users)
│   ├── auth/signin/page.tsx        # Google SSO entry point
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth v5 route
│   │   ├── billing/                # Stripe: balance, checkout, portal, sync, webhook
│   │   ├── projects/               # Cloud project CRUD
│   │   ├── storage/                # Supabase Storage upload/read
│   │   ├── generations/            # Generation history recording
│   │   ├── scrape/                 # Product URL scraper
│   │   ├── normalize-images/       # Image validation + upscaling
│   │   ├── proxy-image/            # CORS bypass for restricted CDNs
│   │   ├── add-captions/           # Server-side caption burn-in
│   │   └── waitlist/               # Email capture to Supabase
│   └── middleware.ts               # Session gate, rewrites / → /waitlist for unauth'd
├── components/                     # 18 components
│   ├── SceneCard.tsx               # Per-scene editor with role badges
│   ├── HookLab.tsx                 # 8-hook batch variation UI
│   ├── ProjectSidebar.tsx          # ChatGPT-style auto-save sidebar
│   ├── CreditsBadge.tsx            # Live credit balance display
│   ├── UpgradeModal.tsx            # Stripe Checkout entry point
│   ├── BrandKitPanel.tsx           # Per-client brand configuration
│   ├── CompareModal.tsx            # Multi-model comparison
│   └── ...
├── lib/                            # 22 modules
│   ├── fal.ts                      # fal.ai SDK + image proxy + queue polling
│   ├── auth.ts                     # NextAuth v5 + Supabase upsert
│   ├── stripe.ts                   # Tier config + customer ensure
│   ├── credits.ts                  # Atomic deduct + refill + ledger
│   ├── hook-lab.ts                 # Sequential hook generation
│   ├── avatar.ts                   # Avatar model adapters + TTS chain
│   ├── prompt-engine.ts            # Role-specific prompt builder
│   ├── model-adapters.ts           # Per-model parameter formatting
│   ├── style-engine.ts             # Frame chaining + generation ordering
│   ├── storyboard-generator.ts     # Product data → storyboard
│   ├── video-export.ts             # FFmpeg.wasm stitching + audio mixing
│   ├── video-storage.ts            # Supabase Storage persistence
│   ├── job-recovery.ts             # Active job tracking for reload resume
│   ├── brand-kit.ts                # Brand kit → prompt brief (visual overlay WIP)
│   └── ...
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # Users, accounts, sessions, projects, history, waitlist
│       └── 002_billing.sql         # Credits, transactions, atomic deduct RPC
└── types/
    └── index.ts                    # Model catalog + type definitions
```

**6,000+ lines of TypeScript.** Full-stack Next.js 15 with client-side fal.ai generation, server-side billing/auth, and Supabase for persistence.

## Roadmap

### Shipped (v0.3 — Hosted Beta)
- [x] Multi-model generation pipeline (8 models)
- [x] Style Engine (last-frame chaining + style brief + reference images)
- [x] Product URL → auto-storyboard (Shopify + HTML)
- [x] Role-based prompt engine with anti-hallucination
- [x] Per-scene voiceover with duration fitting + word budgets
- [x] Templates, batch variations, script import
- [x] FFmpeg.wasm multi-scene export with audio mixing
- [x] Image normalization + CORS proxy
- [x] Cost tracking, project save/load
- [x] **Google SSO via NextAuth v5 + Supabase**
- [x] **Cloud project storage (Supabase) + ChatGPT-style sidebar**
- [x] **Stripe billing with credit-based metering**
- [x] **Hook Lab — 20+ hooks fast**
- [x] **AI Avatar scenes + Auto-Captions**
- [x] **Landing page + waitlist + Google SSO**

### Next (v0.4 — Agency Shipping)
- [ ] Managed fal.ai key server-side proxy (remove BYOK requirement for paid users)
- [ ] Agency pricing tiers ($199 / $499 / $1200) in Stripe + landing
- [ ] Brand kit visual watermark overlay on export
- [ ] Custom export filenames per client
- [ ] Multi-client workspace (client table + per-client brand kit switching)
- [ ] Public `/gallery` page with curated outputs

### Later (v0.5 — Scale)
- [ ] Shopify App Store listing
- [ ] Team workspaces with shared brand kits
- [ ] Agency API for programmatic batch generation
- [ ] Script-to-storyboard LLM fine-tuned on winning ads
- [ ] A/B test recommendations from ad spend data
- [ ] Meta/TikTok Ads Manager integration

### Vision (v1.0)
- [ ] Real-time preview during generation
- [ ] Custom model fine-tuning per brand
- [ ] Marketplace for templates and style presets
- [ ] Self-hosted enterprise edition with SSO

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Framework | Next.js 15, React 19 |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth v5 (Google SSO, JWT sessions) |
| Database | Supabase Postgres + Storage |
| Billing | Stripe Checkout + webhooks + atomic credit RPC |
| AI Models | fal.ai (single SDK, 20+ models) |
| Video Export | FFmpeg.wasm (client) + server-side caption burn |
| TTS | Kokoro, ElevenLabs (via fal.ai) |
| Music | CassetteAI, Stable Audio 2.5 (via fal.ai) |
| Analytics | Vercel Analytics |
| Language | TypeScript throughout |

## Contributing

Contributions are welcome. Here's how to help:

1. **Report bugs** — open an issue with the model name, error message, and scene config
2. **Add a model** — add an entry to `MODEL_CATALOG` in `types/index.ts` and a builder in `model-adapters.ts`
3. **Add a template** — add to the `TEMPLATES` array in `templates.ts`
4. **Improve prompts** — the prompt engine in `prompt-engine.ts` drives output quality. Better prompts = better ads.
5. **Add a TTS voice or music provider** — wire it in `audio.ts`

```bash
# Dev setup
npm install
npm run dev      # localhost:3000
npm run build    # production build
```

### Environment variables

See `.env.local.example` for the full list. Required for OSS dev: none (falls back to BYOK fal.ai). Required for full hosted feature set:

```
# Auth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PREMIUM=
STRIPE_PRICE_PRO=
# (Agency tiers: STRIPE_PRICE_STARTER, STRIPE_PRICE_AGENCY_PRO, STRIPE_PRICE_ENTERPRISE — next release)

# Fal.ai (managed key for hosted users)
FAL_API_KEY=
```

## Why Open Source?

The AI video space is moving too fast for any one company to own the whole stack. Models improve weekly. New providers launch monthly. An open-source storyboard layer that routes to the best model for each shot — and lets the community improve the prompt engineering — will outpace any closed tool.

**CutAgent is the orchestration layer.** The models are the instruments. You're the director.

## License

MIT — use it, fork it, sell with it.

---

<p align="center">
  <strong>Built with <a href="https://fal.ai">fal.ai</a></strong><br />
  <sub>Star this repo if you want to see AI video ads done right.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-alpha-cyan?style=flat-square" alt="Alpha" />
  <img src="https://img.shields.io/badge/models-8-violet?style=flat-square" alt="8 Models" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT" />
  <img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome" />
</p>

<h1 align="center">CutAgent</h1>

<p align="center">
  <strong>Paste a product URL. Get a stack of AI video ads.</strong><br />
  Open-source, storyboard-first, multi-model video editor powered by fal.ai.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &nbsp;·&nbsp;
  <a href="#how-it-works">How It Works</a> &nbsp;·&nbsp;
  <a href="#features">Features</a> &nbsp;·&nbsp;
  <a href="#supported-models">Models</a> &nbsp;·&nbsp;
  <a href="#roadmap">Roadmap</a> &nbsp;·&nbsp;
  <a href="#contributing">Contributing</a>
</p>

---

## The Problem

You need 50 ad creatives this week. Every AI video tool gives you **one model, one clip, no structure**. You paste a prompt, wait 3 minutes, get one video. Then you do it again. And again.

CutAgent is different. It treats video ads as **storyboards** — structured sequences of scenes where each shot uses the right model for the job.

```
Product URL  ──→  4-scene storyboard  ──→  Hook (Kling) → Solution (Veo) → Proof (MiniMax) → CTA (Seedance)
                  ↑ auto-generated          ↑ model-per-scene routing
                  ↑ voiceover scripts        ↑ style harness chains visual continuity across shots
```

**One fal.ai API key. 8 frontier models. Zero backend.**

## Quick Start

```bash
git clone https://github.com/rishidandu/cutagent.git
cd cutagent
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000), paste your [fal.ai API key](https://fal.ai/dashboard/keys) (free tier available), and generate your first ad.

## How It Works

### 1. Paste a Product URL

Drop any Shopify, Amazon, or e-commerce link. CutAgent scrapes the product data, normalizes images (bypasses CDN restrictions, validates dimensions for AI models), and builds a 4-scene storyboard automatically.

### 2. Each Scene Gets the Right Model

Not all models are equal. Kling excels at motion. Veo nails realism. Seedance handles audio. CutAgent routes each scene to the model that fits its purpose:

| Scene Role | What It Does | Default Model | Why |
|:-----------|:-------------|:--------------|:----|
| **Hook** | Pattern interrupt, grabs attention in 3s | Kling 2.5 Turbo | Fast motion, dynamic angles |
| **Solution** | Product reveal, the "aha" moment | Kling / Veo 2 | Clean product shots, realism |
| **Proof** | Social proof, testimonial feel | MiniMax Live | Authentic, fast |
| **CTA** | Hero shot, end-frame for text overlay | Seedance 1.5 | Cinematic, audio support |

### 3. Style Harness Keeps It Cohesive

Different models = different visual styles. The Style Harness solves this:

```
Scene 1 completes → extract last frame → pass as img2vid reference to Scene 2
                                                    ↓
Scene 2 completes → extract last frame → pass to Scene 3
                                                    ↓
                                          ...visual continuity across models
```

Plus a **Style Brief** prepended to every prompt (lighting, color palette, product description) and **product reference images** passed to every generation.

### 4. Voiceover Fits the Scene

Each scene gets a voiceover script auto-written from the product data, with a **hard word budget** tied to the scene's duration. A 5-second scene gets max 11 words. TTS auto-speeds up if text is borderline too long. Never overflows.

### 5. Export

FFmpeg.wasm stitches scenes + voiceover + background music into a single MP4. In-browser. No server.

## Features

### Generation Pipeline
- **8 AI video models** via a single fal.ai API key
- **Role-based prompt engine** — each scene role (hook/solution/proof/CTA) gets distinct visual treatment, camera style, lighting, and energy
- **Anti-hallucination rules** — prevents models from inventing text, logos, or labels on products
- **Model-specific adapters** — correct parameter formatting per model (duration format, aspect ratio support, audio toggles)
- **Image normalization** — downloads product images server-side, validates 300x300 minimum, upscales CDN thumbnails, uploads to fal.ai storage

### Product Import
- **Shopify JSON API** integration (rich product data with all gallery images)
- **HTML scraper** fallback for Amazon, Etsy, eBay, and any e-commerce site
- **Auto-storyboard** — generates 4 scenes with role assignments, model routing, and voiceover scripts
- **5 narrative angles** — convenience, quality, social proof, value, unboxing (randomly selected per import)

### Templates & Variations
- **5 templates** — UGC Ad, Product Showcase, Explainer, Before/After, Social Proof
- **Batch variations** — 8 hook styles, generate N versions with one click
- **Script import** — paste a script, AI splits into scenes and assigns models

### Audio
- **Per-scene voiceover** — Kokoro ($0.02/1K chars) or ElevenLabs ($0.05/1K chars)
- **Duration-aware** — word budgets, auto-fit, speed control
- **Background music** — CassetteAI ($0.02/min) or Stable Audio 2.5
- **Smart muting** — video muted when TTS exists, Seedance/Veo native audio disabled when voiceover is planned

### Style & Consistency
- **Style brief** — global prompt prefix for lighting, color palette, character description
- **Reference images** — character, style, product, and last-frame types with per-scene overrides
- **Auto-chain** — last frame from each scene automatically feeds into the next
- **Brand kit** — logo, colors, tagline, watermark position

### Editor
- **Drag-to-reorder** scenes
- **Trim controls** per scene
- **Side-by-side comparison** — generate same scene with 2-4 models, pick the best
- **Preview player** — play full storyboard back-to-back
- **Cost tracking** — real-time spend display, per-model pricing
- **Project save/load** — JSON export/import with field migration for compatibility

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
│   ├── page.tsx                    # Main editor (830 lines)
│   ├── api/
│   │   ├── scrape/                 # Product URL scraper (Shopify JSON + HTML fallback)
│   │   ├── normalize-images/       # Image dimension validation + CDN upscaling
│   │   └── proxy-image/            # CORS bypass for restricted CDNs
│   └── waitlist/                   # Landing page
├── components/                     # 11 components
│   ├── SceneCard.tsx               # Per-scene editor with role badges
│   ├── AudioPanel.tsx              # Script overview + voice controls
│   ├── StylePanel.tsx              # Style brief + reference images
│   ├── CompareModal.tsx            # Multi-model comparison
│   └── ...
├── lib/                            # 15 modules
│   ├── prompt-engine.ts            # Role-specific prompt builder
│   ├── model-adapters.ts           # Per-model parameter formatting
│   ├── fal.ts                      # fal.ai SDK with image proxy + queue polling
│   ├── style-engine.ts             # Frame chaining + generation ordering
│   ├── storyboard-generator.ts     # Product data → scene storyboard
│   └── ...
└── types/
    └── index.ts                    # Model catalog + type definitions
```

**5,800+ lines of TypeScript.** No backend for generation — everything runs in the browser via fal.ai.

## Roadmap

### Now (v0.1 — Open Source Alpha)
- [x] Multi-model generation pipeline (8 models)
- [x] Style Harness (last-frame chaining + style brief)
- [x] Product URL → auto-storyboard
- [x] Role-based prompt engine with anti-hallucination
- [x] Per-scene voiceover with duration fitting
- [x] Templates, batch variations, script import
- [x] FFmpeg.wasm export
- [x] Image normalization + CORS proxy
- [x] Cost tracking, project save/load

### Next (v0.2 — Hosted Beta)
- [ ] Auth (NextAuth + GitHub/Google OAuth)
- [ ] Cloud project storage (Supabase)
- [ ] Stripe billing with usage metering
- [ ] Waitlist → onboarding flow
- [ ] Job recovery on page reload
- [ ] Gallery of example outputs

### Later (v0.3 — Growth)
- [ ] Shopify App Store listing
- [ ] LLM-powered script layer (fine-tuned on winning ads)
- [ ] Modular creative matrix (10 hooks x 10 bodies x 3 CTAs = 300 variants)
- [ ] Team workspaces
- [ ] API for external integrations
- [ ] Mobile responsive editor

### Vision (v1.0)
- [ ] Real-time preview during generation
- [ ] AI-powered A/B test recommendations
- [ ] Integration with Meta/TikTok ad managers
- [ ] Custom model fine-tuning per brand
- [ ] Marketplace for templates and style presets

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Framework | Next.js 15, React 19 |
| Styling | Tailwind CSS 4 |
| AI Models | fal.ai (single SDK, 20+ models) |
| Video Export | FFmpeg.wasm |
| TTS | Kokoro, ElevenLabs (via fal.ai) |
| Music | CassetteAI, Stable Audio (via fal.ai) |
| Language | TypeScript throughout |

## Contributing

Contributions are welcome. Here's how to help:

1. **Report bugs** — open an issue with the model name, error message, and scene config
2. **Add a model** — add an entry to `MODEL_CATALOG` in `types/index.ts` and a builder in `model-adapters.ts`
3. **Add a template** — add to the `TEMPLATES` array in `templates.ts`
4. **Improve prompts** — the prompt engine in `prompt-engine.ts` drives output quality. Better prompts = better ads.

```bash
# Dev setup
npm install
npm run dev      # localhost:3000
npm run build    # production build
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

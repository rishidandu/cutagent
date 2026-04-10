# CutAgent — Business Model & Wedge Strategy

## Product

Open-source multi-model AI video editor powered by fal.ai. Storyboard-first workflow for e-commerce sellers and performance marketers who need high-volume ad creatives with consistent style across scenes.

---

## Competitive Landscape

### Direct competitors (storyboard-to-video)

| Tool | Multi-model? | Price | Open source? | Gap |
|---|---|---|---|---|
| LTX Studio | Yes (LTX-2, Veo, Kling) | $15-125/mo | No (LTX-2 model is OSS) | Closed, pushes own model first |
| Higgsfield | Yes (Kling 3, Sora 2, Veo 3.1, Wan) | $15-84/mo | No | No style harness between models |
| Katalist | Undisclosed | Paid | No | Agency-focused, not creator-accessible |

### Adjacent tools (single-clip or avatar-locked)

| Category | Tools | Why they're not the same |
|---|---|---|
| Single-clip generators | Runway, Pika, Luma, Haiper | No multi-scene, no storyboard |
| Avatar-based | Synthesia ($146M ARR), HeyGen ($95M ARR), Colossyan | Talking heads only, not generative video |
| Ad-template | Creatify, Topview, Arcads | Template-driven, limited model choice |
| Open-source pipeline | ComfyUI | Node-based, developer-only, no editor UI |

### What nobody has built

An open-source, multi-model storyboard editor with style consistency and an e-commerce-first workflow. That's us.

---

## Target Audience

### Wedge: E-commerce sellers and dropshippers

| Signal | Data |
|---|---|
| Pain | UGC costs $150-500/video, need 5-10 variants per product for TikTok/Meta |
| Current spend | $30-50/mo on Creatify/Zeely, $500-3K/mo total creative budget |
| Volume need | 50-100 ad creatives/month |
| Willingness to pay | $29/mo tool replacing one $300 UGC creator is instant ROI |
| Acquisition | Shopify app store, TikTok communities, dropshipping Reddit/Discord |

### Expansion path

```
E-commerce sellers (wedge)
  → Agencies managing e-commerce accounts ($5-50K/mo creative budgets)
  → All performance marketing agencies (50-100+ variants/month/client)
  → Enterprise L&D / internal comms ($500-10K/mo, longer contracts)
```

### Killer workflow

```
1. Paste Shopify product URL
2. AI extracts: product images, title, description, price
3. Auto-generates 4-scene storyboard:
   - Hook (3s)    → Kling (motion, action)
   - Problem (3s) → Veo (realism, emotion)
   - Solution (3s)→ product showcase via MiniMax (fast/cheap)
   - CTA (3s)     → Veo (native audio)
4. Style Harness chains scenes for visual consistency
5. Generate 10 variations (different hooks, models, styles)
6. Export all → upload to TikTok/Meta ad manager
```

---

## The Style Harness (Technical Moat)

The intelligence layer between user and models:

1. **Character Consistency Engine** — extract reference frames from completed scenes, auto-feed as img2vid input to next scene
2. **Prompt Normalization** — translate creative intent into model-specific prompts (each model interprets "cinematic warm lighting" differently)
3. **Color/Style Matching** — post-process outputs so clips from different models feel like one video
4. **Scene Planner** — user writes script, AI picks best model per shot and splits into scenes

---

## Market Opportunity

| Segment | Size | Our angle |
|---|---|---|
| AI video generator market | $946M (2026) → $3.4B (2033) | Multi-model orchestration layer |
| UGC platform market | $8.5B (2026) → $64B (2034) | Open-source alternative to Creatify/Arcads |
| Video ad production | $5-15K/min traditional → $100-500/min AI | 10x cost reduction |

---

## Business Model (Layered)

### Layer 1: Open Source Editor (Free)
- Full storyboard + generation + timeline + export
- Users bring own fal.ai key
- Drives adoption, community contributions, GitHub stars
- **Goal:** become the default open-source AI video editor

### Layer 2: Hosted Platform (Freemium SaaS)
- Hosted version — no setup, no API keys needed
- Free: 5 videos/month, watermark, 720p
- Pro ($29/mo): unlimited, 1080p, no watermark, priority queue
- Team ($79/mo): collaboration, shared brand kits, batch generation
- **Margin:** fal.ai cost ~$0.20-1.00/video, charge $3-5/video = 70-80% gross margin

### Layer 3: Template Marketplace (Commission)
- Community-created storyboard templates
  - "Product showcase": intro → close-up → lifestyle → CTA
  - "UGC ad": hook → problem → solution → social proof
  - "Explainer": concept → demo → benefits → pricing
- 70/30 split (creator/platform)
- Templates are model-agnostic

### Layer 4: Agency API (Enterprise)
- REST API for programmatic batch generation
- "Generate 100 variations of this ad concept"
- Per-video pricing or % of ad spend
- White-label for agencies to resell

---

## Revenue Path

```
Month 1-3:  Open source launch, fal.ai integration, community building
Month 4-6:  Hosted platform, free + pro tiers, Shopify app store
Month 7-9:  Template marketplace, product URL import, brand kit
Month 10+:  Agency API, enterprise contracts, batch generation

Year 1: 10K free users, 500 pro subscribers = ~$175K ARR
Year 2: 50K users, 2K pro + 50 teams = ~$1M ARR
Year 3: marketplace + agency API = $5M+ ARR
```

---

## Why Open Source Wins

1. **Trust** — creators see exactly what happens with their content and API keys
2. **Distribution** — GitHub stars → HN → organic (OpenCut got 27K+ stars in months)
3. **Extensibility** — community builds Shopify plugin, Premiere bridge, etc.
4. **Moat** — Style Harness algorithm becomes the standard
5. **Hiring** — contributors become team members

---

## Tech Stack

```
Frontend only (no backend for generation):
├── Next.js + React + Tailwind
├── @fal-ai/client          ← calls fal.ai directly from browser
├── Zustand                  ← state (scenes, timeline, API keys)
└── FFmpeg.wasm              ← client-side video stitching + export
```

---

## Build Sprints

| Sprint | What | Why |
|---|---|---|
| 1 | fal.ai integration + model dropdown + working generation | Prove it works |
| 2 | Multi-scene storyboard + parallel generation | Core product shape |
| 3 | Style Harness v1 (img2vid chaining between scenes) | The differentiator |
| 4 | Timeline + trim + transitions + FFmpeg export | Shippable product |
| 5 | Product URL import (paste Shopify link → auto storyboard) | E-commerce wedge |
| 6 | Template system + 5 built-in templates | Reduce blank-canvas friction |

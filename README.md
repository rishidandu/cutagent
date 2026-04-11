# CutAgent

Open-source multi-model AI video editor. Create multi-scene videos using different AI models for each shot, with a Style Harness that maintains visual consistency across scenes.

**One fal.ai key. 8 models. Storyboard-first workflow.**

## Features

### Core Editor
- **Multi-model generation** — Veo 3, Kling 2.5, Wan 2.5, HunyuanVideo, MiniMax, Seedance, Luma Ray 2 via fal.ai
- **Style Harness** — extracts the last frame from each scene and chains it as an img2vid reference to the next scene, keeping characters and style consistent across different models
- **Storyboard-first** — plan your video as scenes, pick the best model per shot, generate all at once
- **Per-scene cost estimates** — see exactly what each scene costs before generating
- **Undo/redo** — 30-step history on all scene edits
- **Job recovery** — in-progress generations survive page refresh via localStorage
- **Export** — download completed scenes as MP4, or batch download all scenes
- **No backend** — runs entirely in the browser, calls fal.ai directly

### Import
- **Product URL import** — paste a Shopify, Amazon, Etsy, or eBay link; auto-scrapes title, images, price, and description; auto-generates a 4-scene ad storyboard with smart model assignments
- **Script import** — paste a free-form script; AI detects scene boundaries, assigns models per scene, extracts voiceover vs. visual directions, and previews the storyboard before creating it

### Templates & Variations
- **Templates** — 5 pre-built storyboard templates (UGC Ad, Product Showcase, Explainer, Before/After, Social Proof) with optimized model-per-scene selection
- **Batch variations** — generate N versions of your storyboard with 8 different hook styles (Surprise, Problem, POV, ASMR, Testimonial, Trending, Luxury, Comedy)

### Audio
- **Voiceover** — Kokoro TTS (fast/cheap) and ElevenLabs (premium) via fal.ai, with per-scene text editing and duration fitting
- **Background music** — CassetteAI and Stable Audio 2.5 via fal.ai

### Style & Brand
- **Style panel** — write a global style brief applied to all scene prompts; upload character, product, and style reference images; toggle auto-chaining of last frames
- **Brand kit** — upload logo, set primary/secondary colors, tagline, and watermark position — applied consistently across all exports
- **Model comparison** — generate the same scene with 2–4 models in parallel and pick the best result side-by-side

### Project Management
- **Project save/load** — export/import full project state as JSON (scenes, audio, style context)
- **localStorage persistence** — your project survives page refreshes automatically
- **Cost tracker** — tracks generation spend per session using model pricing

## Quick Start

```bash
git clone https://github.com/yourusername/cutagent.git
cd cutagent
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste your [fal.ai API key](https://fal.ai/dashboard/keys), and start generating.

## How the Style Harness Works

```
Scene 1 (Kling) generates → completes → extract last frame
                                              ↓
Scene 2 (Veo) receives frame as img2vid ref → generates with visual continuity
                                                     ↓ extract last frame
Scene 3 (MiniMax) receives Scene 2's frame →         ↓
                                              ...consistent video
```

Toggle **Style Harness** on in the toolbar. When on, scenes generate sequentially to chain frames. When off, all scenes generate in parallel.

## Workflows

### Paste URL → Get Ad
1. Click **Import Product URL**
2. Paste any Shopify, Amazon, Etsy, or eBay URL
3. CutAgent scrapes the title, images, price, and description
4. Auto-generates a 4-scene ad storyboard (Hook → Reveal → Benefits → CTA)
5. Hit **Generate All**

### Script → Storyboard
1. Click **Import Script**
2. Paste your script (voiceover lines, scene directions, or both)
3. AI splits it into scenes, assigns models, separates voiceover from visuals
4. Preview the parsed storyboard and confirm
5. Hit **Generate All**

### Use a Template
1. Click **Templates**
2. Pick from UGC Ad, Product Showcase, Explainer, Before/After, or Social Proof
3. Enter your product name — prompts auto-fill with `[PRODUCT]` replaced
4. Each template assigns the optimal model per scene

### Batch Variations
1. Build your storyboard (manually, via template, or via import)
2. Click **Batch Variations**
3. Pick hook styles and count
4. Get N versions with different Scene 1 hooks, same scenes 2–4

### Model Comparison
1. On any scene, open **Compare Models**
2. Select 2–4 models to run in parallel
3. Review side-by-side and keep the best result

## Supported Models

| Model | Provider | Best for | Cost |
|---|---|---|---|
| HunyuanVideo | Tencent | Cheapest, open-source | ~$0.08/s |
| MiniMax Live | MiniMax | Fast, cheap | ~$0.10/s |
| Wan 2.5 | Alibaba | Anime, stylized | ~$0.05/s |
| Kling 2.5 Turbo | Kuaishou | Action, motion | ~$0.07/s |
| Luma Ray 2 | Luma | Dreamy, creative | ~$0.10/s |
| Seedance 1.5 | ByteDance | Multi-shot, audio | ~$0.08/s |
| Veo 2 | Google | Realism | ~$0.25/s |
| Veo 3 | Google | Realism + audio | ~$0.40/s |

## Tech Stack

- **Next.js 15** + React 19 + Tailwind CSS 4
- **@fal-ai/client** — direct browser-to-fal.ai generation (no backend needed for generation)
- **TypeScript** throughout

## Project Structure

```
src/
  app/
    page.tsx                   # Main storyboard editor
    layout.tsx                 # App shell
    globals.css                # Tailwind imports
    api/
      scrape/route.ts          # Server-side product URL scraper
      normalize-images/        # Image validation and normalization for fal.ai upload
      proxy-image/             # CORS proxy for fetching remote product images
    waitlist/                  # Marketing landing page with waitlist signup
  components/
    SceneCard.tsx              # Individual scene editor with model selector
    Timeline.tsx               # Bottom timeline bar
    AudioPanel.tsx             # Voiceover and background music controls
    BatchPanel.tsx             # Batch variations modal
    BrandKitPanel.tsx          # Brand kit settings (logo, colors, watermark)
    CompareModal.tsx           # Side-by-side multi-model comparison
    PreviewPlayer.tsx          # Full-screen sequential scene preview player
    ProductImport.tsx          # Product URL import modal
    ScriptImport.tsx           # Script-to-storyboard import modal
    StylePanel.tsx             # Global style brief and reference image uploads
    TemplateGallery.tsx        # Template picker modal
  lib/
    fal.ts                     # fal.ai SDK wrapper with manual queue polling
    audio.ts                   # TTS/music model catalog and generation helpers
    brand-kit.ts               # Brand kit types and prompt injection
    cost-tracker.ts            # Per-session generation cost tracking
    frame-extractor.ts         # Style Harness frame extraction
    job-recovery.ts            # Resume in-progress jobs after page refresh
    model-adapters.ts          # Model-specific request builders for each video model
    project-io.ts              # JSON project export/import
    prompt-engine.ts           # Role-based prompt builder with product context
    script-to-storyboard.ts    # Script parser → scene list
    storyboard-generator.ts    # Auto-generate storyboard from product data
    style-engine.ts            # Frame chaining and generation order planning
    templates.ts               # Template definitions and applicator
    undo.ts                    # Undo/redo stack (30 entries)
    video-export.ts            # Scene download/export
  types/
    index.ts                   # Model catalog, Scene/Project/AudioTrack types
```

## Roadmap

See [BUILD_PRIORITIES.md](BUILD_PRIORITIES.md) for the full roadmap.

**Next up:**
- Hosted version (auth + billing) for non-BYOK users
- FFmpeg.wasm single-file export (stitch all scenes into one MP4)
- Shopify App Store listing

## Contributing

Contributions welcome. Open an issue or submit a PR.

## License

MIT

# CutAgent

Open-source multi-model AI video editor. Create multi-scene videos using different AI models for each shot, with a Style Harness that maintains visual consistency across scenes.

**One fal.ai key. 20+ models. Storyboard-first workflow.**

## Features

- **Multi-model generation** — Veo 3, Kling 2.5, Wan 2.5, HunyuanVideo, MiniMax, Seedance, Luma Ray via fal.ai
- **Style Harness** — extracts the last frame from each scene and chains it as an img2vid reference to the next scene, keeping characters and style consistent across different models
- **Storyboard-first** — plan your video as scenes, pick the best model per shot, generate all at once
- **Per-scene cost estimates** — see exactly what each scene will cost before generating
- **Export** — download completed scenes as MP4
- **No backend** — runs entirely in the browser, calls fal.ai directly
- **localStorage persistence** — your project survives page refreshes

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

Toggle "Style Harness" on in the toolbar. When on, scenes generate sequentially to chain frames. When off, all scenes generate in parallel.

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
| Veo 3 | Google | Realism, audio | ~$0.40/s |

## Tech Stack

- **Next.js 15** + React 19 + Tailwind CSS 4
- **@fal-ai/client** — direct browser-to-fal.ai generation (no backend)
- **TypeScript** throughout

## Project Structure

```
src/
  app/
    page.tsx          # Main storyboard editor
    layout.tsx        # App shell
    globals.css       # Tailwind imports
  components/
    SceneCard.tsx     # Individual scene editor with model selector
    Timeline.tsx      # Bottom timeline bar
  lib/
    fal.ts            # fal.ai SDK wrapper with manual queue polling
    frame-extractor.ts # Style Harness frame extraction
    video-export.ts   # Scene download/export
  types/
    index.ts          # Model catalog, Scene/Project types
```

## Roadmap

See [BUILD_PRIORITIES.md](BUILD_PRIORITIES.md) for the full roadmap.

**Next up:**
- Product URL import (paste Shopify link, get ad storyboard)
- Built-in templates (UGC Ad, Product Showcase, Explainer)
- FFmpeg.wasm single-file export
- Script-to-storyboard AI

## Contributing

Contributions welcome. Open an issue or submit a PR.

## License

MIT

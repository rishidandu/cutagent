# CutAgent — Build Priorities

## Tier 1 — Ship to GitHub (this week)

| # | Feature | Why | Effort |
|---|---|---|---|
| 1 | **Style Harness v1** — when Scene 1 completes, extract last frame, auto-set as referenceImageUrl on Scene 2 | THE differentiator. No one else does this. | Medium |
| 2 | **Video export** — stitch all completed scenes into one MP4 via FFmpeg.wasm | Can't ship without this. Users need a downloadable file. | Medium |
| 3 | **Drag-to-reorder scenes** | Basic storyboard UX | Small |
| 4 | **Persist state to localStorage** | Page refresh shouldn't kill your project | Small |

## Tier 2 — E-commerce wedge (next 2 weeks)

| # | Feature | Why | Effort |
|---|---|---|---|
| 5 | **Product URL import** — paste Shopify/Amazon URL, scrape title/images/price, auto-generate 4-scene storyboard | The killer workflow. "Paste URL, get ad." | Large |
| 6 | **Template system** — pre-built storyboard templates ("UGC ad", "Product showcase", "Explainer") with pre-assigned models per scene | Reduces blank-canvas anxiety | Medium |
| 7 | **Batch variations** — "Generate 5 versions of this storyboard with different hooks" | Volume is the value prop for e-commerce | Medium |

## Tier 3 — Polish for launch (month 2)

| # | Feature | Why | Effort |
|---|---|---|---|
| 8 | **Audio track** — add voiceover (ElevenLabs via fal.ai) or music | Videos without audio feel incomplete | Medium |
| 9 | **Trim/split on timeline** — adjust clip start/end points | Basic NLE functionality | Medium |
| 10 | **Project save/load** — JSON export/import of full project state | Let users save and share projects | Small |
| 11 | **Landing page + waitlist** — hosted version signup | Start collecting users before hosted launch | Small |

## Tier 4 — Moat features (month 3+)

| # | Feature | Why |
|---|---|---|
| 12 | **Script-to-storyboard AI** — paste a script, LLM splits into scenes + picks models | Magic moment |
| 13 | **Brand kit** — upload logo, colors, fonts, applied to all generations | Agency feature |
| 14 | **Side-by-side comparison** — generate same scene with 3 models, pick best | Multi-model value prop |
| 15 | **Shopify app store listing** | Distribution channel |

# CutAgent — Build Priorities

**Last updated: 2026-04-17**

The product is past MVP. The monetization rail (auth + Stripe + cloud storage) is live. The question is no longer "what do we build" — it's "what's blocking agency sales today?"

Current posture: **feature freeze, demo-readiness only, until 5 paying agencies are onboarded.** See `business/DEMO_READINESS_AUDIT.md` for the detailed gap list and `business/SPRINT_14_DAY.md` for the outbound plan.

---

## Tier 0 — Blocking agency sales. Ship this week.

| # | Feature | Why | Effort |
|---|---|---|---|
| 1 | **Managed fal.ai key (server-side proxy)** | Landing says "no API key needed." Code disagrees. P0 credibility gap. | 1 day |
| 2 | **Agency pricing tiers in Stripe ($199/$499/$1200)** | Current tiers ($20/$50) can't accept the deals in the GTM plan. | 0.5 day |
| 3 | **Brand kit visual watermark overlay on export** | White-label claim doesn't match output. Agencies demo out on this. | 0.5 day |
| 4 | **Seeded demo account + demo runbook** | First 30s of every demo is currently dead air on an empty editor. | 0.5 day |

---

## Tier 1 — Ship the agency differentiators (next 2–3 weeks, in parallel with outbound).

| # | Feature | Why | Effort |
|---|---|---|---|
| 5 | **Multi-client workspace (clients table + per-client brand kit)** | Agency-with-20-clients is the core persona. Current flat projects doesn't serve them. | 1–2 weeks |
| 6 | **Custom export filenames per client** | Agency deliverable. Files named `client-campaign-date.mp4`, not `cutagent-export.mp4`. | 0.25 day |
| 7 | **Retry-with-fallback-model on generation failure** | Single-model failures during live demos kill deals. | 0.5 day |
| 8 | **Public `/gallery` page with 10–20 curated outputs** | Prospects who don't demo need something to skim. Also the asset to share on LinkedIn. | 1 day |

---

## Tier 2 — Scale what's working (month 2+, only if there's pull).

| # | Feature | Why | Gate |
|---|---|---|---|
| 9 | **Team seats + shared brand kits** | Unlocks Agency Pro upsell from Starter. | 3+ Starter customers asking for team access. |
| 10 | **Shopify App Store listing** | Long-term distribution. 4–6 week review cycle — submit when demo flow is clean. | Tier 0 complete. |
| 11 | **Agency API for programmatic generation** | Enterprise deal unlock ($1,200+/mo tier). | 1+ Enterprise prospect in active conversation. |
| 12 | **Self-hosted edition docs** | Community adoption; also answers "can we deploy inside our VPC" objection for enterprise. | 1+ enterprise prospect raises it. |

---

## Tier 3 — Longer-bet features. Don't touch until Tier 0–2 are done.

| # | Feature | Why |
|---|---|---|
| 13 | **Script-to-storyboard LLM fine-tuned on winning ads** | Magic-moment feature. High R&D cost, unproven ROI vs. the current prompt engine. |
| 14 | **Meta/TikTok Ads Manager integration** | Removes one export step. Nice, not critical. |
| 15 | **A/B test recommendation engine** | Closes the loop from generation to ad performance. Requires customer ad spend data access — complex deal mechanics. |
| 16 | **Marketplace for templates/style presets** | Community flywheel. Only matters at 1K+ paying users. |
| 17 | **Real-time preview during generation** | UX polish. Low ROI on sales conversion. |

---

## Feature freeze criteria

**Do not ship a new feature unless at least one of the following is true:**

1. It's in Tier 0 (demo-blocking).
2. Three separate paying customers have independently asked for it.
3. A specific deal worth $500+/mo is blocked on it and will close within 30 days if shipped.

If none of those are true, the time is better spent on demos, content, or Tier 0/1 items that are already in the queue.

This rule exists because the product has more features than most agencies need, and the current bottleneck is distribution, not capability. Every feature shipped without a specific revenue reason increases the surface area of things that can break in a demo while moving no closer to closing a deal.

---

## What's already shipped (don't rebuild)

Every item below is live at HEAD. Check git log if you're unsure. See `README.md` for the full feature list.

- Multi-model generation (8 models), Style Engine, product URL import
- Templates (5), batch variations (8), Hook Lab (20+)
- Per-scene voiceover (Kokoro, ElevenLabs), background music (CassetteAI, Stable Audio)
- FFmpeg.wasm export with audio mixing + server-side caption burn
- Google SSO via NextAuth v5
- Cloud project storage via Supabase + ChatGPT-style sidebar
- Stripe billing with atomic credit deduction RPC
- AI Avatar scenes + auto-captions
- Landing page + waitlist
- Drag-to-reorder, trim, compare modal, preview player
- Cost tracking (client + server), project save/load JSON
- Job recovery, Vercel Analytics

Stop listing these as "to build." They're built.

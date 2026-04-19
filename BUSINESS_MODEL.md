# CutAgent — Business Model

**Last updated: 2026-04-17**

## One-line

CutAgent is ad-creative production infrastructure for DTC agencies. One subscription, unlimited client brands, full white-label. Replaces per-client UGC creator spend with a single per-agency platform fee.

## The shift from the original plan

The repo was originally positioned as an open-source multi-model video editor for individual e-commerce sellers. That positioning still lives in old docs. **It is no longer the primary business.** The updated plan (see `business/UPDATED_TIMELINE.md` and `business/GROWTH_PLAN_AGENCY_SPRINT.md`) is agency-first:

- Same product. Different buyer.
- 1 agency at $499/mo ≈ 17 solo sellers at $29/mo. Higher ARPU, lower CAC, slower churn.
- Outbound-closable in 1 call. Solo sellers are an inbound / content funnel — a 7+ month grind.
- Open-source stays alive as the community/trust moat and the inbound floor. It is not the growth engine.

## The buyer

**Primary persona:** Creative Director or Head of Creative at a DTC growth agency managing 10–30 Shopify clients, currently spending $15–50K/month on UGC coordinators and creators, consistently under-supplied on ad variants.

**Secondary persona:** Founder/CEO of a boutique performance marketing agency doing $1–5M/yr in revenue, looking to increase margin by replacing variable UGC spend with fixed tooling spend.

**Not the buyer (right now):** Solo dropshippers, individual creators, enterprise L&D teams, internal comms departments. These might be accessible later via self-serve and API tiers but are not the focus of the current sales motion.

## The pitch

"You're spending $1,500–5,000 per month per client on UGC creators to ship ad variants your media buyer needs to iterate. At 10 clients that's $15–50K a month before management fee margin.

CutAgent is $499/month total. White-label exports with your agency's logo. Unlimited client brand kits. 500 videos a month across your whole roster. Paste a product URL, get a stack of ad variants with Hook Lab and Style Engine keeping them cohesive.

Your clients never see our brand. Your media buyer gets the volume they need. You keep the creative production margin that used to go to UGC."

## Pricing

Current code (`src/lib/stripe.ts`) ships consumer tiers — those exist for the self-serve inbound floor and the open-source community. The **agency tiers are the business**:

| Tier | Price | Target | What agencies get |
|---|---|---|---|
| **Agency Starter** | $199/mo | Boutique agencies, 3–10 clients | 10 client brand kits, 100 videos/month, CutAgent branding on exports |
| **Agency Pro** | $499/mo | Growth agencies, 10–30 clients | Unlimited brand kits, 500 videos/month, white-label export |
| **Agency Enterprise** | $1,200–2,000/mo | 25+ clients or in-house creative | Unlimited everything, custom domain, dedicated onboarding, SLA, API access |
| **Design Partner** | $3–10K/mo | 2–3 hand-picked partners | Weekly co-dev calls, roadmap input, locked 12-month pricing, named as founding partner |

Consumer tiers (kept as inbound floor, not the focus):

| Tier | Price | Target |
|---|---|---|
| Free | $0 | OSS community, trial, funnel capture |
| Premium | $20/mo | Individual creators, small Shopify operators |
| Pro | $50/mo | Power creators, small brands in-house |

## Target mix at $1M ARR (stretch case)

Per `business/GROWTH_PLAN_AGENCY_SPRINT.md`, achievable in 4–5 months if agency close rate holds at 25–30%:

| Segment | Customers | ARPU | MRR |
|---|---|---|---|
| Agency Starter | 50 | $199 | $9,950 |
| Agency Pro | 45 | $499 | $22,455 |
| Agency Enterprise | 12 | $1,500 | $18,000 |
| Design Partners | 3 | $6,000 | $18,000 |
| Pro self-serve | 200 | $29 | $5,800 |
| **Total** | **310** | — | **$74,205** |

Close 3 more Agency Pro to hit $83,333 MRR = $1M ARR.

**Realistic base case** (per `business/REALISTIC_REVENUE_TIMELINE.md`): first revenue late May 2026, $10K MRR by August, $22–35K MRR by October. Treat $1M-in-5-months as the ceiling, not the default.

## The moat

CutAgent has three defensibility layers. None of them are permanent — they are compounding leads, not permanent walls:

**1. The Style Engine (technical)**
Frame chaining between scenes, shared style briefs, reference images per prompt. No other tool in the storyboard-to-video space does this. The moat is the **integration** of these techniques into one workflow, not any single technique.

**2. Agency workflow (product)**
Per-client brand kits, white-label export, multi-client workspace, Hook Lab volume primitives. Built-for-agency features that consumer tools (LTX Studio, Higgsfield) and ad-template tools (Creatify, Arcads) don't prioritize. The first serious competitor to replicate these is 3–6 months out minimum.

**3. Open source + community (distribution)**
MIT-licensed editor on GitHub. Drives trust, contributions, organic discovery. Hard for a funded closed competitor to replicate without forking. Compounds over time if maintained.

None of these are permanent. Models improve weekly; the Style Engine needs continuous adaptation. Agency workflow can be copied in 3–6 months. Community needs ongoing founder investment. The real moat is **speed of iteration with feedback from real agencies** — the design partner program is the structural commitment to keep that loop tight.

## Competitive landscape (updated April 2026)

### Direct competitors (multi-model storyboard)

| Tool | Multi-model | Price | Open source | Agency focus |
|---|---|---|---|---|
| LTX Studio | Yes (LTX-2, Veo, Kling) | $15–125/mo | No | No — pushes own model first |
| Higgsfield | Yes (Kling, Sora 2, Veo, Wan) | $15–84/mo | No | No — creator-first |
| Katalist | Undisclosed | Paid | No | Yes — but closed, expensive, agency-lock |

### Adjacent tools

| Category | Tools | Why they don't overlap |
|---|---|---|
| Single-clip | Runway, Pika, Luma, Haiper | No multi-scene, no storyboard |
| Avatar-based | Synthesia, HeyGen, Colossyan | Talking heads only |
| Ad template | Creatify, Topview, Arcads | Template-driven, limited model choice, no white-label per client |
| OSS pipeline | ComfyUI | Developer-only, no editor UI |

### What nobody has built

An open-source, multi-model storyboard editor with:
- Per-client brand kits and white-label export
- Batch variation primitives (Hook Lab) built for media-buyer workflows
- Style Engine for visual cohesion across different AI models
- Agency-tier pricing ($199–$1,200/mo per agency, not per seat)

That's the defensible position. That's CutAgent.

## Revenue layers (long-term)

### Layer 1: Agency SaaS (current focus)
Subscription revenue at $199–$2,000/mo per agency. Target $750K–$1M ARR by end of Year 1.

### Layer 2: Self-serve consumer floor
$29 Premium and $50 Pro as inbound capture for people who find the open-source repo, the Shopify App Store listing, or the gallery. Not a growth engine; a floor. Target $5–10K MRR.

### Layer 3: Agency API (Year 2)
REST API for programmatic batch generation. Per-video pricing or % of ad spend. White-label for agencies to build their own tooling on top. Target $10–30K MRR from 20–50 enterprise contracts.

### Layer 4: Template marketplace (Year 2+)
Community-created storyboard templates with 70/30 creator/platform split. Compounds Open Source credibility and creator LTV. Not the growth lever; an add-on.

## Why this plan works

**1. The product is past the hard part.** 8 models wired, Style Engine shipped, Hook Lab shipped, avatars + captions shipped, auth + Stripe + cloud storage shipped. The usual 6–12 month build sprint is done. What remains is 3–4 targeted Tier 0 fixes (see `BUILD_PRIORITIES.md`) before outbound starts.

**2. The math is better than consumer SaaS.** 310 customers to $1M ARR vs. 2,400 customers to the same revenue. 4–5 month aggressive timeline vs. 7–12 month consumer slog. Founder-led outbound is feasible at 310 customers; not feasible at 2,400.

**3. The wedge is sharp and specific.** "DTC agency running 10+ Shopify clients, paying $15K+/mo on UGC." The persona is nameable, findable on LinkedIn, and has a measurable pain with a measurable spend. That's the definition of a sellable wedge.

**4. The competitive window is open.** Multi-model + storyboard + agency-white-label is a gap in the market. LTX and Higgsfield are building upmarket consumer; template tools are cheap; avatar tools are niche. Nobody is owning the agency creative-production middle. 6–12 month window before someone else figures it out.

## What could kill this

**1. The 3 P0 fixes don't ship.** Managed fal.ai key, agency pricing, brand kit watermark. Without these, every demo ends in an objection. See `business/DEMO_READINESS_AUDIT.md`.

**2. Founder continues to build instead of sell.** The strongest anti-pattern at this stage. The rule in `BUILD_PRIORITIES.md` — no new features unless 3 paying prospects ask — is the structural countermove.

**3. Agency sales cycles are longer than expected.** Realistic worst case: 4-week sales cycle, 20% close rate, $25K MRR by month 5 instead of $75K. Mitigation: cold email volume + referral flywheel from the first 3–5 closes.

**4. A well-funded competitor ships white-label agency features first.** Low probability in the 6-month window, but non-zero. Mitigation: sign 2–3 design partners fast. Locked 12-month pricing and co-development intimacy makes agency churn to a competitor structurally harder.

**5. fal.ai pricing shifts or a model provider pulls access.** The model dependency is real. Mitigation: no single-model lock-in (8 models live, more coming); switching cost is low because the product is model-agnostic. If fal.ai disappears, the 6-month rebuild is to a different model aggregator — annoying but survivable.

## One decision to revisit quarterly

Primary GTM motion: **agency outbound, founder-led, $199–$499 ARPU** for the first 10–30 customers. Self-serve stays as the floor, not the engine.

The trigger to shift: if the Shopify App Store listing drives 50+ organic installs/week and Pro conversion is 5%+, the consumer self-serve motion may become viable at scale. Until then, founder-led agency sales is the one thing that can compound fast enough.

Revisit in July 2026 with actual funnel data.

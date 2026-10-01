# TORRENT — Customer Update Script

**Deck:** `docs/presentation.pdf` (10 slides)  
**Audience:** Customer / stakeholder progress review  
**Purpose:** Report current status, confirmed scope, and next steps — not a first-time idea pitch  
**Suggested length:** approximately 10–12 minutes, plus 3 minutes for questions  
**Tone:** Formal, factual, and accountable. Emphasize what has been decided, what is in progress, and what remains.

**How to use this script**
- Text under each slide is intended to be spoken nearly as written.
- *(Italics in parentheses)* are presenter cues — do not read aloud.
- Frame every section as an **update**: progress, decisions, risks, and asks — not a cold pitch.

---

## Slide 1 — Title

**Say:**

Good morning. We are the TORRENT development team: Napat Kulnarong, Sethtatad Kijkanjanarat, and Jirakorn Chaitanaporn.

This session is a **progress update** on TORRENT — the BMA software procurement platform we are building for you.

As a reminder of scope: TORRENT monitors software-related Terms of Reference (TORs) under the Bangkok Metropolitan Administration and notifies qualified vendors — software studios, freelancers, and agencies — when relevant opportunities appear.

Today we will cover: the problem we are addressing, the solution as currently defined, implementation status, the technology approach, timeline, team responsibilities, and the Year-1 operating budget.

*(Open as a status meeting, not a sales pitch.)*

---

## Slide 2 — Name meaning

**Say:**

Briefly, on the product name.

TORRENT refers to a rapid, high-volume flow. That matches the operational reality we are solving: procurement notices move continuously across BMA units, and vendors either face noise or miss relevant work.

We retain the name as the working product identity for this engagement.

*(Keep to 15–20 seconds. Move on.)*

---

## Slide 3 — Introduction — current product definition

**Say:**

This is the product model we are implementing.

BMA publishes software-related TORs across many units, primarily through the e-GP portal. Today, vendors must search for those opportunities themselves.

TORRENT reverses that flow, as follows:

1. **Government TORs** are published across departments and district offices via e-GP.  
2. **TORRENT** ingests those records, retains software-related entries, and tracks each item from draft through publication.  
3. **Matched vendors** — software studios, freelancers, and agencies — receive automatic notification.

Status update: this model is the agreed product direction. Our current work is translating it into a working system — ingestion, classification, matching, and the public interfaces.

*(Point to the three-step diagram while stating 1 → 2 → 3.)*

---

## Slide 4 — Problem — why this work continues to matter

**Say:**

We restate the problem so today’s status stays anchored to the customer need.

**One portal. No software-specific filtering. Limited early visibility.**

The landscape remains: 16 departments, 50 district offices, and additional entities such as hospitals and transit authorities — publishing to e-GP without software filters, proactive alerts, or usable historical pricing for comparable projects.

**Impact on vendors** (software studios, freelancers, and agencies):

- Difficulty discovering relevant opportunities early  
- Limited ability to judge whether a budget is competitive  
- Disadvantage for smaller teams relative to large incumbents  
- Significant time spent monitoring portals manually  

**Impact on BMA:**

- Fragmented visibility across procurement units  
- Difficulty demonstrating fair and competitive practice  
- Reduced exposure for smaller or newer vendors  
- Structural advantage for larger incumbents, independent of merit  

*(Frame this as the ongoing rationale for the project, not a new pitch.)*

---

## Slide 5 — Solution — what we are delivering

**Say:**

The solution remains organized into four capabilities. This is what we are building against.

**1. TOR Ingestion and Tracking**  
Retrieve procurement data from e-GP; track draft and published TORs separately; filter for software-related work.

**2. Matching and Notification Engine**  
Compare each TOR to registered vendor profiles; notify qualified vendors, preferably from draft stage.

**3. Public Dashboard**  
Publish budget benchmarks across comparable historical projects for vendors and the public.

**4. Showcase View**  
Present how different teams have approached similar TORs — supporting differentiation and transparency.

Status: interface and information architecture for these capabilities are in active development. Backend ingestion and live e-GP connection remain on the critical path for production readiness.

*(Do not present this as “we propose.” Present it as “this is the delivery scope.”)*

---

## Slide 6 — Value and technology — decisions locked in

**Say:**

The outcomes we are targeting remain:

- Early visibility into draft TORs, not only final publications  
- A centralized, software-filtered view of a fragmented landscape  
- Public budget and pricing benchmarking  
- Greater transparency for agencies that procure in good faith  

**Technology decisions currently in use or planned:**

| Component | Role | Status note |
|-----------|------|-------------|
| **Next.js** | Web application and API surface | Frontend prototype deployed and iterating |
| **Node.js worker** | Scheduled ingestion, separate from the live app | Design / build phase |
| **MongoDB Atlas** | Document storage | Connected in the backend stack |
| **Vertex AI (Gemini)** | Classification and matching support | Planned; rules-based path first for MVP |

Architectural decision confirmed: ingestion runs as a **scheduled worker**, not inside request-path handlers, so portal instability does not take down the public site.

*(If asked about AI: keyword rules first; Gemini for Thai text and ambiguous cases; low-confidence items go to admin review.)*

---

## Slide 7 — Demonstration — current interface status

**Say:**

This slide reflects **current interface progress**, not a final handoff.

We are aligning on two primary views:

**Public dashboard — budget benchmarking:**  
Aggregate TOR value and filters (software, draft, published, period) so stakeholders can compare similar historical work.

**Showcase view — differentiated approaches:**  
Side-by-side vendor approaches — method, timeline, and estimated cost — for comparable TOR types.

Status: a working UI prototype is available for walkthrough. Data is still largely mock; production depends on completing ingestion and live e-GP feed. We request feedback on layout and information priority so we can freeze the next design iteration.

*(If live: Home → Budgets → Showcase → TORs, about one minute. Label it clearly as prototype progress.)*

---

## Slide 8 — Timeline — where we are in the plan

**Say:**

The delivery plan remains **ten weeks in four phases**. This update maps work to that plan.

| Weeks | Phase | Focus | How we use this update |
|-------|--------|--------|-------------------------|
| **1–2** | Sign-off / Discovery | e-GP investigation; entity scope; notification approach; repo/Git | Confirm or adjust open decisions with you |
| **3–6** | Design | Schema, ingestion architecture, Thai classification rules, wireframes | Align on design outputs before heavy build |
| **7–9** | Implementation | Worker, classifier, matching, email, dashboard, showcase | Primary build window |
| **10** | Deployment | End-to-end test, limited beta, deploy, final demo | Acceptance-oriented close |

Recommendation we continue to hold: start with **16 departments and 3 offices**, not all 50 district offices, until the pipeline is stable.

*(State honestly which phase you are in today — e.g. discovery/design with UI prototype ahead of ingestion.)*

---

## Slide 9 — Team and workflow — how we are executing

**Say:**

Execution ownership is unchanged.

| Member | Responsibilities |
|--------|------------------|
| **Napat Kulnarong** | Project management, frontend, UX/UI |
| **Sethtatad Kijkanjanarat** | Backend, CI/CD, testing |
| **Jirakorn Chaitanaporn** | Backend, QA, AI integration |

**Working process we are following:**

- Daily task updates: `[nickname] – Task 1 – Task 2`  
- Weekly sync: 45–60 minutes, Saturday or Sunday at approximately 19:00  
- Git: no direct pushes to `main`; one approval per pull request; branches deleted after merge  
- Naming: commits `<type>(<scope>): <description>`; branches `<type>/<area>/<description>`

*(Offer to share current sprint focus if the customer asks.)*

---

## Slide 10 — Cost — Year-1 operating budget (strict MVP)

**Say:**

For this update we present the **Year-1 operating budget** for the **strict MVP** scope — sixteen departments and three offices — based on current public pricing for services already in, or planned for, our stack. Exchange rate used: approximately **35 THB per USD**.

| Item | USD / month | THB / month | THB / year |
|------|-------------|-------------|------------|
| Vercel Pro (1 deploying seat) | 20 | 700 | 8,400 |
| MongoDB Atlas Flex | 20 | 700 | 8,400 |
| Gemini API (Flash-Lite class) | 30 | 1,050 | 12,600 |
| Ingestion worker | 10 | 350 | 4,200 |
| Resend (Free, then Pro as volume grows) | 10 | 350 | 4,200 |
| Domain and miscellaneous | 2 | 70 | 840 |
| **Operating subtotal** | **≈ 92** | **≈ 3,220** | **≈ 38,640** |
| Operating contingency (25%) | ≈ 23 | ≈ 805 | ≈ 9,660 |
| **Year-1 operating total** | **≈ 115** | **≈ 4,025** | **≈ 48,300** |

We round Year-1 operations to approximately **50,000 THB** for planning discussions.

**Line rationale:**

- **Vercel Pro** — production hosting for the Next.js application already in use for the prototype.  
- **MongoDB Atlas Flex** — managed database for early production beyond the free prototype tier.  
- **Gemini** — classification and matching; token cost remains modest at strict scope.  
- **Ingestion worker** — scheduled polling; increase if Playwright automation is required.  
- **Resend** — match notification email.  

**Risk note for the customer:** expanding to all **50 district offices** increases Year-1 operating cost to an estimated **120,000–180,000 THB**. We recommend keeping the strict scope for the first production year.

*(Ask for confirmation that this operating envelope is acceptable for the next phase.)*

---

## Closing

**Say:**

To close this update:

1. The problem and product model remain unchanged: software TORs are hard to discover; TORRENT reverses discovery for vendors and improves transparency for BMA.  
2. Delivery scope is fixed around four capabilities; UI prototype work is visible; ingestion and live data remain the main production gap.  
3. On the current plan, we can complete an MVP in ten weeks, with Year-1 operating cost around **50,000 THB** under a focused entity scope.

We request your feedback on: **entity scope**, **e-GP access**, **notification expectations**, and any priorities for the next design iteration.

---

## Anticipated questions

| Question | Response |
|----------|----------|
| Is this still a proposal? | No. This is a **status update** on agreed product direction and delivery. |
| Will TORRENT replace e-GP? | No. We surface and notify; formal bidding stays on the official process. |
| When is live data available? | After discovery confirms access method and the ingestion worker is online — that is the critical path. |
| What if classification is wrong? | Low-confidence items go to an **admin review queue** before vendors see them. |
| Who are “vendors”? | Software studios, freelancers, and agencies that would bid on software-related BMA TORs. |
| Why not all 50 districts now? | Volume, cost, and risk. Expand after the pipeline is proven. |
| Prototype vs production? | Current UI is a **prototype with mock data**. Production needs ingestion and live e-GP feed. |

---

## Timing reference

| Slides | Minutes |
|--------|---------|
| 1–2 Opening and name | 1.0 |
| 3 Product definition | 1.5 |
| 4 Problem (context) | 1.5 |
| 5–6 Delivery scope and tech | 2.5 |
| 7 Demo / UI status | 1.5 |
| 8 Timeline status | 1.5 |
| 9 Team | 1.0 |
| 10 Cost and close | 1.5 |
| **Total** | **≈ 12** |

If limited to **seven minutes**: omit slide 2; shorten slide 9; keep demo to 30 seconds and spend remaining time on timeline status and the operating-budget ask.

# **TORRENT: Software Procurement Platform Project Proposal**

## **Index**

1. Introduction  
2. Client Problem / Challenge  
3. Our Solution  
4. Demo / UI Mockups  
5. Timeline & Roadmap  
6. Team & Roles  
7. Cost Breakdown

---

## **1\. Introduction**

The BMA Software Procurement Platform is a centralized system that tracks software-related procurement opportunities (TORs) issued under the Bangkok Metropolitan Administration (BMA) and proactively matches and notifies qualified software vendors, studios, freelancers, and agencies, about relevant opportunities. It functions as a "reversed job board": instead of vendors searching for work, the platform surfaces and pushes relevant government software TORs directly to them.

This proposal outlines the problem we're solving, our proposed solution, the current state of design work, our development timeline, team structure, and estimated costs.

---

## **2\. Client Problem / Challenge**

Government software procurement TORs under BMA are scattered across dozens of independent sub-units: 16 departments, 50 district offices, and affiliated entities like hospitals and transit authorities. All of it is published on a single e-GP portal, but with no software-specific filtering, no proactive notification, and no historical price comparison.

This creates two concrete problems:

* **For vendors**: especially smaller studios and freelancers, there is no efficient way to discover relevant opportunities early, or to benchmark whether a bid is competitively priced. They either miss opportunities entirely or spend significant time manually checking dozens of portals.  
* **For BMA**: procurement is fragmented and opaque. There's no easy way for the public or for good-faith agencies to demonstrate fair, competitive procurement practices, or for smaller/newer vendors to get visibility against larger incumbents.

---

## **3\. Our Solution**

The BMA Software Procurement Platform addresses this with four core capabilities:

**TOR Ingestion & Tracking** Pulls procurement data from BMA's e-GP portal (egp2.bangkok.go.th), tracking both draft-stage (ร่าง TOR) and final published TORs separately, and filters specifically for software-related projects.

**Matching & Notification Engine** Analyzes each TOR's requirements, matches them against registered vendor profiles/capabilities, and notifies qualified vendors when a relevant opportunity appears: at draft stage or publication.

**Public Dashboard** Provides budget/pricing benchmarking across similar past projects, giving a mass comparison view of BMA software project costs to promote transparency.

**Differentiated Proposal / Showcase View** Rather than a generic bid listing, this surfaces how different teams have approached the same TOR or requirement differently, helping vendors position themselves and giving BMA visibility into varied approaches.

**Key value propositions:**

* Early visibility into upcoming/draft TORs, not just final published ones  
* A centralized, software-filtered view of a fragmented procurement landscape  
* Public price/budget benchmarking across similar past projects  
* Increased transparency and exposure for agencies procuring in good faith

**Tech stack:** Next.js (App Router) and Node.js for frontend/backend, MongoDB Atlas for data storage (with Atlas Search/Vector Search under consideration for semantic vendor-to-TOR matching), and Vertex AI (Gemini models) for TOR text extraction, classification, and vendor-matching. Ingestion runs as a separate scheduled worker (cron job or headless-browser tooling via Playwright) rather than live in the Next.js API routes.

---

## **4\. Demo / UI Mockups**

*\[left blank\]*

---

## **5\. Timeline & Roadmap**

### ***Timeline (10 weeks total)***

***Week 1–2: Sign-off / Discovery***

* *Investigate egp2.bangkok.go.th via DevTools — find the real data API, check if it's public or needs a session/CSRF token, check rate limits*  
* *Finalize entity scope (strict: 16 departments \+ 3 offices — recommend going strict given the timeline)*  
* *Define the vendor notification/engagement process (likely just email for MVP)*  
* *Set up repo, branch protection, and confirm the Git workflow with the team*  
* *Deliverable: signed-off scope \+ confirmed technical approach → this is what you present for signoff*

***Week 3–6: Design (4 weeks)***

* *MongoDB schema design for TOR documents (draft vs. published, versioned lifecycle)*  
* *Architecture design for the ingestion worker (Node.js \+ Playwright if the API needs rendering)*  
* *Design the keyword-based classification rules (software vs. non-software categories in Thai)*  
* *Design vendor profile schema \+ matching logic (rules-based first, not AI, to save time)*  
* *Wireframes for dashboard (budget comparison view) and showcase view*  
* *Deliverable: schema \+ architecture diagram \+ wireframes, ready to build against*

***Week 7–9: Code (3 weeks)***

* *Build ingestion worker, connect to Mongo, run scheduled polling*  
* *Build keyword classifier filter*  
* *Build vendor matching logic \+ email notification trigger*  
* *Build dashboard (budget/pricing comparison) and showcase view in Next.js*  
* *Integrate Vertex AI classification only if time allows — treat as stretch, not core path*  
* *Testing happens continuously here: test ingestion accuracy, classification accuracy, and matching as each piece lands, not saved for the end*

***Week 10: Deploy***

* *End-to-end test of the full pipeline (ingestion → classification → matching → notification)*  
* *Small beta with a few vendors if feasible*  
* *Deploy, final fixes, prep for demo/presentation*

---

## **6\. Team & Roles**

| Name | Role |
| ----- | ----- |
| Napat Kulnarong | Developer: backend/data pipeline, AI integration |
| Sethtatad Kijkanjanarat | Developer: fullstack developer |
| Jirakorn Chaitanaporn | Developer: fullstack developer |

**Team workflow:**

* Daily updates: short post of tasks worked on (`[nickname]- Task 1- Task 2`) to track momentum and time spent per feature and to encourage team to think of tasks to do daily.  
* Weekly updates: more detailed recap posted after the weekly sync, to realign understanding and surface miscommunication early for around 45 minutes to 1 hour.  
* Git process: no direct pushes to `main`, everything goes through a PR requiring at least 1 approval from one of the other teammates, with branches deleted immediately after merge.  
  * Note: any update to git will be tracked using github webhook as well.  
* Commit format: `<type>(<scope>): <short description, ≤50 chars>` (types: feat, fix, docs, refactor, test, chore).  
* Branch naming: `<type>/<area>/<short description>` (areas: frontend, backend, fullstack) final naming convention still pending team confirmation.

*(Note: the source project plan mentions "1 approval from one of the other 2 teammates," implying a 3-person team, but only two names were available to me, you'll want to fill in the third.)*

---

## **7\. Cost Breakdown**

*(These are illustrative, estimated figures based on the proposed tech stack, not confirmed pricing. Replace with actual quotes/estimates before presenting to the client.)*

| Category | Item | Estimated Monthly Cost |
| ----- | ----- | ----- |
| Hosting | Next.js app hosting (e.g., Vercel Pro or equivalent) | $20–$50 |
| Database | MongoDB Atlas (shared/dedicated tier depending on data volume) | $0–$60 |
| AI/ML | Vertex AI (Gemini) usage, classification \+ matching calls | $30–$150 (usage-based) |
| Ingestion Worker | Scheduled worker / cron job compute (or small VM if Playwright/headless browser needed) | $10–$30 |
| Email/Notifications | Transactional email service (e.g., SendGrid, Resend) | $0–$20 |
| Domain & SSL | Domain registration \+ SSL (often bundled with hosting) | \~$1–$2 |
| **Estimated Total** |  | **\~$60–$310/month**, scaling with usage |

**One-time / non-recurring:**

* Development time (team hours, no monetary cost if student/volunteer team, but worth tracking for effort estimation)  
* Initial e-GP API investigation and any tooling needed for scraping if no public API is found

*(Cost will scale significantly with entity scope decision, broad scope with 50 district offices means more ingestion volume, more classification calls, and more storage than the strict 16-department scope.)*


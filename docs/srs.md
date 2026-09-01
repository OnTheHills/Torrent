# Software Requirements Specification

**Product:** TORRENT — Software TOR Monitor  
**Document version:** 2.0  
**Status:** Complete draft for course / stakeholder review  
**Prepared by:** Team Torrent, Department of Computer Engineering, Kasetsart University  
**Date:** 24 August 2026  
**Supersedes:** SRS v1.0 (9 August 2026) — *BMA Software Procurement Platform*

---

## Revision history

| Version | Date | Reason for changes |
| --- | --- | --- |
| 1.0 | 9 Aug 2026 | Initial complete draft compiled from the project plan and stakeholder input. Product framed as a BMA-only platform. Ingestion assumed e-GP portal polling / possible HTML scrape. |
| 2.0 | 24 Aug 2026 | Full rewrite. Merges the project proposal (features, value, stack, team) with SRS v1.0 (user classes, stories, use cases, FRs/NFRs). Updates coverage to **BMA + four agencies**. Restricts collection to **official APIs only**. Adds public / vendor / admin views, integrity flags, watchlist, source health, fit scoring, and bilingual UI. |

**How to read this version**

- The **proposal** is the source of product capabilities (ingestion, matching, notification, public budget dashboard, showcase, price fairness, capability fit).
- **SRS v1.0** is the source of structure, user classes, and the original US-1–US-24 set.
- **Scope that changed after advisor feedback** is written here as the binding scope: five *organizations*, two *APIs*, no website scraping. Proposal tables that still say “scrape DGA / depa / Labour” are obsolete.

---

## Table of contents

0. [Project proposal recap](#0-project-proposal-recap)  
1. [Introduction](#1-introduction)  
2. [Overall description](#2-overall-description)  
3. [Stakeholders](#3-stakeholders)  
4. [External interfaces and data sources](#4-external-interfaces-and-data-sources)  
5. [User stories](#5-user-stories)  
6. [System features](#6-system-features)  
7. [Use case model](#7-use-case-model)  
8. [Functional requirements](#8-functional-requirements)  
9. [Non-functional requirements](#9-non-functional-requirements)  
10. [Data requirements](#10-data-requirements)  
11. [User interface and information architecture](#11-user-interface-and-information-architecture)  
12. [Open issues and assumptions](#12-open-issues-and-assumptions)  
13. [Appendices](#13-appendices)

---

## 0. Project proposal recap

This section is the client-facing summary that would open a second meeting. Formal requirements start at Section 1.

### 0.1 The problem

Thai government software procurement is already public. Finding it is the work.

Notices live in OCDS dumps, e-GP RSS, agency pages, and the national spending API — mixed with roads, events, and office supplies. There is no software-only desk, no proactive match for a small studio, and no public median that makes an odd budget visible.

Two concrete failures:

- **Vendors** (especially smaller studios and freelancers) miss draft TORs, cannot tell if a budget is competitive, and spend time checking portals by hand.
- **The public and good-faith agencies** cannot show a software-filtered record. Fragmented publishing looks like opacity even when the files are public.

The original proposal described this first as a BMA-only problem (16 departments, 50 district offices, one e-GP portal). That remains true for Bangkok. Advisor feedback expanded the *subjects* to BMA plus four national digital agencies, and restricted *access* to official APIs.

### 0.2 The proposed solution

TORRENT is a **reversed job board for government software TORs** and a **public monitor** of the same record.

1. **Ingest** official machine feeds on a schedule.  
2. **Keep software-relevant notices only** (keyword + AI, with human review).  
3. **Normalize** them into one TOR record (source URL always kept).  
4. **Match** registered vendor profiles and **notify** on draft or published.  
5. **Show** budget vs category median, integrity flags, and past approaches.

Anyone can read the monitor. Matching, watchlist, and alerts sit behind vendor sign-in. Operators keep feeds and classification honest.

### 0.3 Value proposition

- Early visibility into draft TORs, not only final published notices.
- One software-filtered view instead of five websites.
- Public budget context so outliers can be questioned.
- Transparent source lineage (which API, which official page).
- Fairer exposure for smaller vendors against incumbents.
- Operators can see when a feed is down before vendors see junk.

### 0.4 What this document covers

This SRS turns the proposal into a testable specification: stakeholders, user classes, detailed user stories with acceptance criteria, system features, use cases, functional and non-functional requirements, data model, UI map, open issues, and a requirements traceability matrix.

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification describes **TORRENT**, a web platform that:

- collects software-related Terms of Reference (TORs) and procurement records from **five government organizations** using **official APIs only**;
- presents a **public monitor** of those records with integrity and budget context;
- **matches and notifies** registered software vendors;
- gives **operators** ingestion health and a classification review queue.

It is the contract between the development team and stakeholders: what the system must do, what it must not do, and how success is judged.

### 1.2 Document conventions

- **Shall** = mandatory for the release this SRS describes (v1 / course prototype may stub some items; stubs are marked **[Prototype]**).
- **Should** = expected quality; not a launch blocker if a documented workaround exists.
- **May** = optional / later phase.
- User stories use **US-n**. Use cases use **UC-n**. Functional requirements use **FR-n**. Non-functional requirements use **NFR-n**.
- Thai terms in parentheses are the terms that appear on official notices (e.g. ร่าง TOR).

### 1.3 Scope

**Product name:** TORRENT (working title in the proposal: *BMA Software Procurement Platform* / *Software Procurement Platform*).

**Initial coverage — five organizations**

| # | Organization | Short | Role in the product | Binding source |
| --- | --- | --- | --- | --- |
| 1 | Bangkok Metropolitan Administration | BMA / กทม. | City software TORs; richest open stages | Official **OCDS JSON** yearly release packages on Open Contracting Bangkok |
| 2 | Ministry of Digital Economy and Society | MDES / ดีอี | Ministry-level digital / software work | **data.go.th** Government Spending API (`govspending/cgdcontract`), filtered by department + software keywords. Official e-GP RSS (`deptId=1700`, announce type B0) is an allowed *secondary* machine feed, not a website scrape. |
| 3 | Digital Government Development Agency | DGA / สพร. | Digital-government platforms | Same **data.go.th** API, DGA `dept_code` + software keywords |
| 4 | Digital Economy Promotion Agency | depa / สศด. | Digital-economy systems | Same **data.go.th** API, depa `dept_code` + software keywords |
| 5 | Electronic Transactions Development Agency | ETDA / สพธอ. | e-transactions, digital ID, trust services | Same **data.go.th** API, ETDA `dept_code` + software keywords |

**Replaced vs proposal v1:** Ministry of Labour (MOL) is **out**. Its website was a scrape target and its software share is low. ETDA is **in**.

**Obsolete proposal methods (do not implement)**

- Scrape `dga.or.th`, `depa.or.th`, or `mol.go.th` HTML listings.
- Scrape `egp2.bangkok.go.th` (JS SPA; listing HTML has no TOR payload).
- Playwright / headless browser against login-walled or JS-only e-GP pages.
- “Ministry webpage as fallback” HTML scrape when RSS times out.

Agency websites may appear only as **outbound official links** for a human to verify a record.

**What the system will do**

- Schedule-ingest OCDS and data.go.th (and optional e-GP RSS).
- Deduplicate, keep source URL, version lifecycle: draft → published → awarded.
- Classify software relevance; queue low-confidence items for admin.
- Expose a no-login public monitor, listings, budget dashboard, and approaches gallery.
- Let vendors register, maintain a capability profile, receive matches, watch listings, and set alert rules.
- Score capability fit and (in the paid/extension plan) price-fairness percentile.
- Let admins watch source health and correct classification.

**What the system will not do (v1)**

- Submit bids, collect bid prices, or run award ceremonies. Apply stays on the official e-GP / OCDS page.
- Give legal or procurement-compliance advice. A flag is a **question**, not a verdict.
- Guarantee 100% classification accuracy. Human review stays in the pipeline.
- Cover BMTA or other bodies with a separate procurement system unless added later.
- Scrape the open web to “complete” a missing API row.
- Treat data.go.th awarded contracts as live draft TORs without labelling the stage.

**Key benefits**

- Vendors get early, filtered, explained matches.
- The public gets one software record and budget context.
- Agencies procuring in good faith get a readable public trail.
- Operators fail loudly when a feed is down.

### 1.4 Intended audience and reading suggestions

| Audience | Why they read this | Start at |
| --- | --- | --- |
| Development team | Design, implement, test | §2, §4, §8–11 |
| QA | Acceptance criteria and use cases | §5, §7, §8 |
| Platform owner | Scope, value, open issues | §0, §3, §12 |
| Advisor / examiner | Coverage, APIs vs scrape, five agencies | §1.3, §4, §5.1 |
| BMA / agency staff | How their data is shown | §3, §5.8, UC-12 |
| Vendors | What they get after sign-in | §5.2–5.5, §11.3 |

### 1.5 References

- Team Torrent, *TORRENT: Software Procurement Platform — Project Proposal* (un-updated scope tables in §3 of that deck).
- Team Torrent, *Software Requirements Specification for BMA Software Procurement Platform*, v1.0, 9 August 2026.
- Bangkok Open Contracting, OCDS JSON yearly packages (`opencontract.bangkok.go.th`).
- DGA / CGD, Thailand Government Spending API — `https://opend.data.go.th/govspending/cgdcontract` (API key from `opend.data.go.th/register_api`).
- CGD, official e-GP RSS syndication (`process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml`).
- IEEE 830 / ISO/IEC/IEEE 29148 recommended SRS practices (structure only).

### 1.6 Overview of the rest of this document

Section 2 places TORRENT in context. Section 3 names stakeholders. Section 4 is the binding source contract. Section 5 is the detailed user-story set. Sections 6–9 specify features, use cases, and requirements. Sections 10–11 specify data and UI. Section 12 records what still needs sign-off.

---

## 2. Overall description

### 2.1 Product perspective

TORRENT is a **standalone web application** plus a **scheduled ingestion worker**. It does not replace e-GP. It reads official APIs and adds classification, matching, and public context.

```
┌─────────────────────────────────────────────────────────────┐
│                     TORRENT system                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────────┐  │
│  │ Next.js  │   │ Express API │   │ Ingestion worker     │  │
│  │ App      │──▶│ (Node.js)   │──▶│ cron — not live in   │  │
│  │ Router   │   │             │   │ Next.js request path │  │
│  └──────────┘   └──────┬──────┘   └──────────┬───────────┘  │
│                        │                     │              │
│                        ▼                     ▼              │
│                 MongoDB Atlas          Vertex AI (Gemini)   │
│                 (+ Search / Vector     classify + match     │
│                    Search later)                            │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
   Official APIs (in)              Email (out)
   • BMA OCDS JSON                 Official pages (out)
   • data.go.th cgdcontract        • e-GP / OCDS links only
   • e-GP RSS (optional MDES)
```

**Interfaces**

| Interface | Direction | Purpose |
| --- | --- | --- |
| Public web | In | Monitor, listings, budgets, approaches — no account |
| Vendor web | In | Inbox, matches, catalog + fit, watchlist, profile, alert rules |
| Admin web | In | Source health, classification queue, (later) vendor moderation |
| OCDS HTTP | Out | Yearly JSON release packages |
| data.go.th HTTP | Out | JSON contracts; API key in server env |
| e-GP RSS HTTP | Out | Optional MDES draft-TOR feed |
| Email | Out | Match / deadline / integrity alerts |
| Official listing URL | Out | Human apply / verify — never scraped for payload |

**Proposal note on demo chrome:** the Public / Vendor / Admin toggle exists so a reviewer can walk all three doors. Production should hide that toggle and use real auth + roles.

### 2.2 Product functions (summary)

| # | Function | Proposal name | Who sees it |
| --- | --- | --- | --- |
| F1 | TOR ingestion & tracking | TOR Ingestion & Tracking | Admin; results on public/vendor |
| F2 | Software classification & review | (implied) | Admin; filter on public |
| F3 | Vendor matching | Matching Analysis | Vendor |
| F4 | Notification engine | Notification Engine | Vendor |
| F5 | Public budget dashboard | Public Dashboard | Public (and vendor) |
| F6 | Price fairness | TOR Fit & Fairness (1.2M plan) | Vendor + public context |
| F7 | Capability fit | TOR Fit & Fairness | Vendor |
| F8 | Approaches / showcase | Differentiated Proposal | Public + vendor |
| F9 | Watchlist | (evolved from saved TORs) | Vendor |
| F10 | Source health | (ops, advisor-facing) | Admin |
| F11 | Account & profile | Vendor Account | Vendor + admin |
| F12 | Bilingual + theming | (implementation) | All |

### 2.3 User classes and characteristics

| User class | Who | Expertise | Primary goals | Login |
| --- | --- | --- | --- | --- |
| **Public visitor** | Journalists, civic groups, students, department staff, anyone | Low | Read software TORs, flags, budget context | No |
| **Vendor** | Software studios, freelancers, agencies | Low–medium | Discover early, see fit, get alerts, watch listings | Yes |
| **Admin / operator** | Torrent ops | Medium–high | Feed health, classification queue, account hygiene | Yes (ops) |
| **Platform owner** | Product / course lead | Medium, business | Metrics, coverage config, roadmap | Yes (ops or owner) |
| **Agency representative** | Staff at BMA / MDES / DGA / depa / ETDA | Low–medium | Check how their records look; flag errors | Optional in v1 (public flag) |

**Technical actors (not people)**

- Ingestion worker  
- Gemini classification / matching  
- Email provider  
- OCDS host, data.go.th, e-GP RSS  

### 2.4 Operating environment

| Layer | Choice (proposal + current repo) |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, React |
| Backend | Node.js / Express, TypeScript |
| Database | MongoDB Atlas; Atlas Search / Vector Search under consideration for semantic match |
| AI | Vertex AI, Gemini — extract, classify, match |
| Hosting | Frontend on Vercel (current); API + worker separately |
| Locales | English and Thai |
| Browsers | Current Chrome and Firefox; desktop from 1280×720; usable on mobile |

Ingestion **shall not** run inside a user-facing Next.js request except for a short **health probe** (HEAD/GET official APIs, timeout-bounded).

### 2.5 Design and implementation constraints

- **API-only collection.** No HTML scrape, no Playwright against government sites.
- **Traceability.** Every TOR stores `sourceKind`, source URL, and last-checked time.
- **Apply off-platform.** Deep-link to the official listing.
- **Classification is fallible.** Low confidence → admin queue; vendors do not see unreviewed junk.
- **data.go.th is mostly awarded contracts.** UI must show lifecycle honestly.
- **BMA OCDS** is the source for open planning / tender stages where the JSON includes them.
- **Secrets** (API keys, DB URI, Vertex credentials) live in environment config, never in the client bundle.
- **Course prototype** may seed listings from mock data while the worker is unfinished; the SRS still states the production behaviour.

### 2.6 Assumptions and dependencies

**Assumptions**

- OCDS yearly JSON remains public without login.
- data.go.th continues to issue free API keys and serve `cgdcontract`.
- The five organizations publish software work on e-GP / OCDS often enough to demo.
- “Software-related” is detectable from titles and project types with keywords + AI + review.
- Vendors will maintain a short capability profile in exchange for alerts.
- Historical awards are complete enough for category medians (with a “thin sample” warning).

**Dependencies**

- Reachability of `opencontract.bangkok.go.th` and `opend.data.go.th`.
- Vertex AI availability (fallback: keyword-only classify + admin queue).
- Email delivery provider.
- MongoDB Atlas.
- A cron-capable worker host.

### 2.7 User documentation

v1 shall provide: in-app English/Thai copy that explains monitor vs bid desk; a short “how to use” on the public home; and this SRS for the course. A separate user manual is out of scope.

---

## 3. Stakeholders

| Stakeholder | Role | Concerns |
| --- | --- | --- |
| Platform owner / team lead | Vision, scope, demo | Adoption, advisor feedback, honest API story |
| Advisor / examiner | Academic client | Five agencies not five sites; APIs not scrape; testable SRS |
| BMA | Primary rich source | Fair presentation of city software procurement |
| MDES, DGA, depa, ETDA | Covered agencies | Accurate names, no scraped sites, official links |
| Vendors | Primary paid-value user | Relevant alerts, explainable match, trustworthy medians |
| Public / press | Transparency user | No login wall on the record; flags are not accusations |
| Admins | Operators | Review volume, probe noise, audit trail |
| DGA (as API operator) | data.go.th / ภาษีไปไหน | Lawful use of the spending API, key hygiene |

---

## 4. External interfaces and data sources

This section is the **binding replacement** for proposal §3 “In-Scope Data Sources.”

### 4.1 Source policy

1. Prefer official JSON APIs.  
2. Allow official RSS only as a machine feed (XML), never parsed HTML from an agency CMS.  
3. Never scrape login-walled or JavaScript-only e-GP.  
4. If a `dept_code` returns no software rows, show “no software records in this feed” — do not scrape the agency site.  
5. Keep the original government URL on every record.

### 4.2 Source A — BMA Open Contracting (OCDS JSON)

| Field | Value |
| --- | --- |
| Owner | Bangkok Metropolitan Administration |
| Kind | `bma-ocds` |
| Format | OCDS release package JSON |
| Example URL | `https://opencontract.bangkok.go.th/assets/data/output/yearly/ocds_releases_2569.json` |
| Human page | `https://opencontract.bangkok.go.th/ocds.html` |
| Stages available | Planning / tender / award / contract where the year package includes them (2569+ more complete) |
| Auth | None |
| Use | Live and historical BMA software TORs; values for medians |

**Worker shall:** HTTP GET (or documented download), parse releases, map to the TOR schema, filter software, store `ocdsId` / release id for dedup.

### 4.3 Source B — Thailand Government Spending API (data.go.th)

| Field | Value |
| --- | --- |
| Owner | DGA (portal) + CGD (e-GP payload) |
| Kind | `govspending` (logical; may be stored alongside `egp-rss` for MDES drafts) |
| Endpoint | `GET https://opend.data.go.th/govspending/cgdcontract` |
| Auth | Query `api-key` from `https://opend.data.go.th/register_api` |
| Parameters | `year` (B.E.), `dept_code`, `keyword`, `offset`, `limit` (and documented extras) |
| Typical fields | `project_name`, `project_money`, `dept_name`, `project_type_name`, contract winner, `contract_date` |
| Stage | Predominantly **awarded / contracted** |
| Use | MDES, DGA, depa, ETDA software-related records; historical medians |

**Software keyword set (minimum):** `พัฒนาระบบ`, `ซอฟต์แวร์`, `เว็บไซต์`, `แอปพลิเคชัน`, `ระบบสารสนเทศ`, `โปรแกรม`, `Web`, `Application`, `API`, `ข้อมูล`, `ดิจิทัล` — tunable by admin. A hit is a *candidate*; Gemini + review decide publish.

**Worker shall:** for each of the four agencies, poll current and previous fiscal year, page through results, classify, dedupe on project id.

### 4.4 Source C — e-GP RSS (optional, MDES drafts)

| Field | Value |
| --- | --- |
| Owner | The Comptroller General’s Department |
| Kind | `egp-rss` |
| URL pattern | `https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml?deptId={id}&anounceType={type}` |
| MDES `deptId` | `1700` |
| Announce types | `B0` draft TOR; `D0` invitation |
| Auth | None |
| Use | Catch MDES **draft** notices that data.go.th awards do not yet contain |

If RSS is unused in a sprint, MDES still remains in coverage via data.go.th; the UI shall not invent draft stages for award-only rows.

### 4.5 Explicitly out of ingestion

| URL / system | Why out |
| --- | --- |
| `egp2.bangkok.go.th` | Next.js SPA; no TOR in first HTML |
| `dga.or.th/procurements/` | HTML listing — scrape |
| `depa.or.th/procurement` | HTML listing — scrape |
| `mol.go.th` draft TOR category | Agency dropped; was scrape |
| `mdes.go.th/procurement` as HTML fallback | Scrape |
| Login e-GP / JS-only search | Forbidden |

### 4.6 Hardware interfaces

None. Browser and standard HTTPS servers only.

### 4.7 Software interfaces (internal)

| API (logical) | Consumers | Notes |
| --- | --- | --- |
| `GET /api/sources/health` | Admin UI | Probes official APIs; reports green / yellow / red |
| TOR query API | Public + vendor listings | Filter agency, category, lifecycle, integrity, budget, q |
| Match API | Vendor inbox | Profile × TOR |
| Notification prefs API | Vendor settings | **[Prototype]** may be localStorage |
| Auth API | Vendor + admin | **[Prototype]** may be pass-through login |

### 4.8 Communications interfaces

HTTPS only. JSON for APIs. RSS XML only inside the worker. Email: SMTP or provider API. User-Agent for probes shall identify the research project (e.g. `TORRENT-CSP/0.1`).

---

## 5. User stories

Each story includes actor, story, rationale, priority, acceptance criteria, and traceability.  
**Priority:** Must = v1 behaviour (prototype may mock data); Should = complete before public demo if time; Could = extension / 1.2M plan.

Stories **US-1–US-24** keep the v1.0 numbers, rewritten for five agencies and APIs. **US-25+** cover proposal and product gaps (watchlist, bilingual, source health, fairness, fit, landing, integrity).

### 5.1 Public monitor and discovery

#### US-1 — Centralized software listings

**As a** public visitor or vendor  
**I want** one list of software-related TORs from BMA, MDES, DGA, depa, and ETDA  
**So that** I do not check five websites or an unfiltered e-GP pile.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/tors`, `/app/tors` |

**Acceptance criteria**

1. The catalog contains only records classified software-relevant and released from the review queue (or marked auto-approved above threshold).  
2. Each row shows title, agency short name, department, category, lifecycle, budget, and integrity.  
3. Filters exist for agency, category, budget band (`< ฿5M`, `฿5–15M`, `> ฿15M`), integrity, and text search on title / department / skills.  
4. Empty filters show a reset control, not a blank page.  
5. Public catalog does **not** show match score. Vendor catalog **may** rank by fit.  
6. Selecting a row opens the detail route for that audience (`/tors/{id}` or `/app/tors/{id}`).

**Traces:** FR-1, FR-3, FR-7, FR-40, UC-1

---

#### US-2 — Draft-stage visibility

**As a** vendor (and public visitor where the source has a draft)  
**I want** to see ร่าง TOR before the invitation is final  
**So that** I can prepare early.

| | |
| --- | --- |
| Priority | Must where the source has drafts (BMA OCDS; MDES RSS B0). Should elsewhere. |
| Screens | Listings, detail, monitor “new / opening soon” |

**Acceptance criteria**

1. Lifecycle `draft` is a first-class badge (“Draft TOR”).  
2. Draft and published are distinct, linkable versions of one project when IDs match.  
3. Records that are awards-only (typical data.go.th) show `awarded` or `published` as appropriate — **never** labelled draft just to look complete.  
4. Monitor KPIs count “draft TORs live” separately from published.

**Traces:** FR-2, FR-6, UC-1

---

#### US-3 — Software-only filter

**As a** vendor or public visitor  
**I want** only software procurement  
**So that** I do not wade through furniture, medical supplies, or construction.

| | |
| --- | --- |
| Priority | Must |
| Screens | All listing surfaces |

**Acceptance criteria**

1. Ingestion applies the software keyword set, then AI classification.  
2. Items below confidence threshold do not appear on public or vendor lists.  
3. Admin can reject an item; it disappears from public lists within one refresh cycle.  
4. Categories for published software TORs are one of: Web Application, Mobile Application, System Integration, Data Platform, Cybersecurity, AI / Analytics (extensible).

**Traces:** FR-3, FR-4, FR-5, UC-6

---

#### US-4 — Lifecycle status

**As a** visitor  
**I want** to see draft → published → awarded  
**So that** I know whether I can still bid or I am looking at history.

| | |
| --- | --- |
| Priority | Must |
| Screens | Cards, table, detail |

**Acceptance criteria**

1. Every TOR has exactly one current lifecycle.  
2. Badges use the same vocabulary in EN and TH.  
3. Awarded items remain visible for benchmarks and showcase, and are visually distinct.  
4. Detail shows announced date and closing date when known; “unknown” if the API omitted them.

**Traces:** FR-2, FR-6, UC-1

---

#### US-25 — Public home explains the product

**As a** first-time visitor  
**I want** a landing page that says who this is for and that it is a monitor, not a bid desk  
**So that** I do not expect to submit a bid on TORRENT.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/` |

**Acceptance criteria**

1. Home states: public record, five organizations, official APIs.  
2. Primary CTA opens the monitor; secondary opens listings.  
3. Copy covers why (scattered sources), what (software monitor), who (public / vendor / admin), how (read first, sign in only to sell software).  
4. No vendor-only metrics (match scores) on the public home.

**Traces:** FR-41, UC-13

---

#### US-26 — Live monitor board

**As a** public visitor  
**I want** a live board with counts, flags, latest listings, and the five organizations  
**So that** I can see the state of software procurement in one glance.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/monitor` |

**Acceptance criteria**

1. KPI strip includes at least: departments covered, TORs tracked, software-relevant count, flagged-for-review count, new this week (or equivalent).  
2. An integrity review panel lists low-confidence or anomalous items **that are already public** (or a public-safe subset). Admin-only raw queue stays on `/admin`.  
3. Latest listings panel shows newest software rows with agency and date.  
4. Agency strip names BMA, MDES, DGA, depa, ETDA and links to filtered listings.  
5. Actions include browse listings and budget context.

**Traces:** FR-40, FR-42, UC-13

---

#### US-27 — Listing detail with source lineage

**As a** visitor  
**I want** the official source, stage, skills, summary, requirements, and budget vs median  
**So that** I can verify the record and decide whether to open e-GP.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/tors/{id}`, `/app/tors/{id}` |

**Acceptance criteria**

1. Detail shows agency badge, source kind (OCDS / spending API / RSS), lifecycle, integrity, ref id, bilingual title when locale is TH.  
2. Budget shows THB and, when a category median exists, vs-median label (above / near / below).  
3. Primary action: open official listing in a new tab (`rel=noreferrer`).  
4. Public detail includes a vendor gate: matching and watchlist require sign-in; the public page stays a record.  
5. Vendor detail additionally shows match badge, save/watch, profile fit, and why-matched chips when applicable.

**Traces:** FR-7, FR-12, FR-16, FR-43, UC-1, UC-8

---

#### US-28 — Integrity flag is a question

**As a** public visitor  
**I want** to see when a listing is flagged  
**So that** I can look closer — without treating the flag as guilt.

| | |
| --- | --- |
| Priority | Must |
| Screens | Monitor, listings, detail |

**Acceptance criteria**

1. Integrity is `ok` (Clear) or `suspicious` (Flagged).  
2. Public copy does not say “corrupt” or “illegal.”  
3. Flag reasons may include: thin spec, budget outlier vs median, low classification confidence, incomplete source fields.  
4. Filter can show flagged-only.

**Traces:** FR-42, UC-6

---

#### US-33 — Bilingual interface

**As a** Thai or English reader  
**I want** to switch locale  
**So that** I can read titles and chrome in my language.

| | |
| --- | --- |
| Priority | Must |
| Screens | Global chrome |

**Acceptance criteria**

1. Toggle EN / TH persists for the session (and should persist across visits).  
2. Chrome, filters, and badges translate.  
3. TOR `titleTh` / `summaryTh` display when locale is TH and the field is present; otherwise fall back to EN.

**Traces:** NFR-14, NFR-15

---

### 5.2 Ingestion and classification (admin-facing stories that enable US-1–US-3)

#### US-5 — Scheduled API ingestion

**As an** admin  
**I want** the worker to pull OCDS and data.go.th on a schedule  
**So that** listings stay current without typing them in.

| | |
| --- | --- |
| Priority | Must (worker). **[Prototype]** may use seeded `MOCK_TORS`. |
| Screens | `/admin` health |

**Acceptance criteria**

1. Worker runs on a configurable cron (default ≤ 1/hour per source).  
2. BMA pull uses OCDS JSON only.  
3. MDES, DGA, depa, ETDA pulls use data.go.th with API key from the server environment.  
4. Optional MDES RSS B0 does not parse HTML.  
5. New and updated records increment a last-seen timestamp.  
6. Failures retry with backoff and appear on the health panel.  
7. No job writes a TOR without `sourceUrl` and `sourceKind`.

**Traces:** FR-1, FR-27, FR-34, UC-10

---

#### US-6 — Low-confidence review queue

**As an** admin  
**I want** ambiguous e-GP / OCDS labels queued before vendors see them  
**So that** printers and “คอมพิวเตอร์สำนักงาน” do not enter the catalog.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/admin` classification review |

**Acceptance criteria**

1. Each classified item has a confidence 0–1.  
2. Below threshold (default 0.75, configurable) → queue, not public.  
3. Queue row shows title, suggestion (e.g. “Likely non-software — confirm exclusion” or “Software-related · Web / Data Platform”), and confidence.  
4. Admin actions: approve as software + category, reject, or mark needs-more-info.  
5. Approve publishes; reject never publishes.

**Traces:** FR-4, FR-5, FR-24, FR-25, UC-6

---

#### US-20 — Source health

**As an** admin  
**I want** a live probe of the official APIs  
**So that** I know usable vs flaky vs down.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/admin` ingestion sources |

**Acceptance criteria**

1. Probe covers OCDS JSON and data.go.th (and RSS if enabled).  
2. Verdicts: usable (green), flaky/timeout (yellow), down/skip (red).  
3. HTML agency pages are **not** probed as sources.  
4. Panel shows latency, HTTP status, and a one-line detail.  
5. Summary counts green / yellow / red.  
6. Copy states strategy: official APIs only.

**Traces:** FR-27, FR-35, UC-11

---

#### US-18 — Correct classification

**As an** admin  
**I want** to override the AI category  
**So that** a mis-tagged TOR is fixed before or after a vendor saw it.

| | |
| --- | --- |
| Priority | Must |
| Screens | Admin queue, later TOR admin detail |

**Acceptance criteria**

1. Correction is stored with actor, timestamp, old value, new value.  
2. If the TOR was already public, the listing updates.  
3. If matching already ran, the system re-runs match; already-sent emails are not silently rewritten — an audit log records the rematch.

**Traces:** FR-25, FR-28, UC-6

---

### 5.3 Vendor matching and notification

#### US-7 — Capability profile

**As a** vendor  
**I want** to describe technologies, project types, team size, and (optionally) government experience  
**So that** matching has something real to compare.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/app/profile`, register |

**Acceptance criteria**

1. Profile fields include: company name, team size band, capabilities / skills, notification frequency default.  
2. Categories of interest can be stored on the profile or in alert rules (US-9).  
3. Save persists (server in production; **[Prototype]** may be local / dummy save).  
4. Empty required fields block “enable matching.”  
5. Profile is not public except fields the vendor later marks public on a showcase entry.

**Traces:** FR-8, FR-21, FR-23, UC-7

---

#### US-8 — Match notification on new TOR

**As a** vendor  
**I want** an alert when a draft or published TOR matches my profile  
**So that** I can respond early.

| | |
| --- | --- |
| Priority | Must |
| Screens | Email, `/app`, `/app/matches`, in-app alerts |

**Acceptance criteria**

1. After ingest + classify + approve, matcher runs for all vendors with matching enabled.  
2. A match creates an inbox item and, if prefs allow, an email.  
3. Notification includes title, agency, budget (if known), score, and deep link.  
4. Draft vs published is stated in the message.  
5. No match → no email.  
6. Delivery target: within 15 minutes of the TOR becoming vendor-visible (NFR-3).

**Traces:** FR-9, FR-10, FR-13, UC-2

---

#### US-9 — Notification preferences

**As a** vendor  
**I want** to control channel, frequency, categories, and budget band  
**So that** I am not spammed.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/app/alerts` |

**Acceptance criteria**

1. Toggles: email on new matches; deadline reminders for watched / matched TORs; integrity flags on watched agencies.  
2. Budget min / max in THB.  
3. Multi-select software categories.  
4. Save confirmation (“Settings saved”).  
5. Matcher and mailer honour these prefs.  
6. Frequency may be immediate / daily digest (v1 at least immediate + stored preference).

**Traces:** FR-11, UC-2

---

#### US-10 — Why matched

**As a** vendor  
**I want** the capabilities that triggered the match  
**So that** I can judge relevance in seconds.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/app`, `/app/matches`, vendor TOR detail |

**Acceptance criteria**

1. Each match has a numeric score (0–100) and one or more reason chips (e.g. “Web Application”, “Thai language UX”).  
2. “Why matched” / “Why you were matched” lists those reasons.  
3. Reasons are derived from profile ∩ TOR skills / category / language — not invented marketing text.  
4. Vendor can open TOR or “Apply on e-GP” / open official listing.

**Traces:** FR-12, UC-2, UC-8

---

#### US-34 — Vendor inbox

**As a** signed-in vendor  
**I want** a home that lists TORs matched to my studio  
**So that** I do not start on the public civic board.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/app` |

**Acceptance criteria**

1. Inbox is vendor-only.  
2. Each card: score, matched-at date, title, agency, department, compact budget, reason chips.  
3. CTA to the full matches list.

**Traces:** FR-9, FR-12, UC-2

---

### 5.4 Budget, fairness, and fit

#### US-11 — Historical budgets for similar work

**As a** vendor  
**I want** past software TOR budgets in the same category  
**So that** I can see if a new number is odd.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/dashboard`, detail vs-median |

**Acceptance criteria**

1. Category benchmarks expose min, median, max, sample count, year.  
2. A live TOR is compared to its category median.  
3. Copy states this is **context**, not a bid calculator.  
4. Thin samples show a limited-data notice.

**Traces:** FR-14, FR-16, UC-3

---

#### US-12 — Public spending dashboard

**As a** member of the public  
**I want** an aggregated view of software procurement costs across the five organizations  
**So that** I can see trends without an account.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/dashboard` |

**Acceptance criteria**

1. No login required.  
2. Stats: agencies covered, categories, draft live, published (or equivalent).  
3. Chart: median budget by category.  
4. Chart: live listings vs category median.  
5. Table: project, department, category, year, budget, average, vs-median.  
6. Filters: category, department/agency, year — as data allows.

**Traces:** FR-14, FR-15, FR-17, UC-3

---

#### US-13 — Compare by category, department, year

**As a** platform owner or analyst  
**I want** to slice costs  
**So that** I can brief stakeholders.

| | |
| --- | --- |
| Priority | Should |
| Screens | `/dashboard` |

**Acceptance criteria**

1. Changing agency filter updates charts and table.  
2. Shareable URL query params should persist filters.  
3. Export CSV **Could** (later).

**Traces:** FR-15, UC-3

---

#### US-35 — Price fairness percentile (extension)

**As a** vendor  
**I want** to see where this TOR’s budget sits in the distribution of comparable-scope projects  
**So that** I can see “82nd percentile / generous” vs “12th percentile / tight.”

| | |
| --- | --- |
| Priority | Could (proposal 1.2M “TOR Fit & Fairness”) |
| Screens | Detail, dashboard |

**Acceptance criteria**

1. System normalizes by category (and should by rough scope when extractable).  
2. Displays percentile and plain-language gloss.  
3. Hidden when sample size < configured N (default 5).  
4. Not presented as a legal finding.

**Traces:** FR-36, UC-3

---

#### US-36 — Vendor capability fit score

**As a** vendor  
**I want** a fit score and a covered-vs-gap breakdown against this TOR  
**So that** I know “strong on web, gap on government experience.”

| | |
| --- | --- |
| Priority | Must (basic overlap). Should (Gemini narrative). |
| Screens | Vendor TOR detail — Profile fit panel |

**Acceptance criteria**

1. Overlap % = covered listed skills / TOR skills.  
2. Strong overlap if % ≥ 60 (configurable).  
3. Lists covered skills and gaps.  
4. Copy: automatic overlap, **not** a self-scored GO/NO-GO bid checklist.  
5. Public visitors do not see this panel.

**Traces:** FR-37, UC-8

---

### 5.5 Showcase / differentiated approaches

#### US-14 — See how others approached similar TORs

**As a** vendor  
**I want** past approaches by category  
**So that** I can position my proposal.

| | |
| --- | --- |
| Priority | Must (seeded). Should (vendor-submitted). |
| Screens | `/showcase` |

**Acceptance criteria**

1. Cards show category, year, title, vendor name, approach, outcome.  
2. Filter or grouping by category.  
3. Publicly readable — this is credibility, not a ranking of winners.  
4. No scrape of vendor marketing sites; entries are curated or vendor-submitted.

**Traces:** FR-18, FR-19, UC-4

---

#### US-15 — Publish my own approach

**As a** vendor  
**I want** to showcase a past approach  
**So that** agencies and peers can see how I work.

| | |
| --- | --- |
| Priority | Should |
| Screens | Profile / showcase submit (may be admin-curated in prototype) |

**Acceptance criteria**

1. Vendor submits title, category, approach, outcome, year.  
2. Linked to their public name.  
3. Admin may approve before public list (FR-26 related).  
4. Vendor can withdraw an entry.

**Traces:** FR-18, FR-20, UC-4

---

### 5.6 Vendor account

#### US-16 — Register and enter the workspace

**As a** vendor  
**I want** to register with work email and capabilities  
**So that** I can be matched and notified.

| | |
| --- | --- |
| Priority | Must. **[Prototype]** login may skip real IdP. |
| Screens | `/register`, `/login` → `/app` |

**Acceptance criteria**

1. Register collects company, email, password, initial capabilities.  
2. Login continues to vendor app.  
3. Production shall verify email before enabling mail (FR-22).  
4. Public monitor remains usable without an account.

**Traces:** FR-21, FR-22, UC-7

---

#### US-17 — Edit profile over time

**As a** vendor  
**I want** to update capabilities  
**So that** matching stays accurate.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/app/profile` |

**Acceptance criteria**

1. Edits take effect on the next matcher run (or immediately for on-demand fit).  
2. Past notifications are not deleted when the profile changes.

**Traces:** FR-23, UC-7

---

#### US-29 — Watchlist

**As a** vendor  
**I want** to save TORs I care about  
**So that** I can follow them without staring at the monitor.

| | |
| --- | --- |
| Priority | Must |
| Screens | Detail Watch, `/app/saved` |

**Acceptance criteria**

1. Watch / unwatch on vendor detail.  
2. Watchlist page lists watched TORs; empty state explains how to add.  
3. **[Prototype]** may use browser storage. Production shall persist per account.  
4. Public visitors do not get a watchlist (vendor gate).

**Traces:** FR-38, UC-9

---

### 5.7 Admin and governance

#### US-19 — Moderate vendor accounts

**As an** admin  
**I want** to approve, verify, or suspend vendors  
**So that** spam accounts do not get the match firehose.

| | |
| --- | --- |
| Priority | Should (Must before any public registration) |
| Screens | Admin accounts (may be stubbed) |

**Acceptance criteria**

1. States: pending, verified, suspended.  
2. Suspended accounts do not receive email.  
3. Changes are audited (FR-28).

**Traces:** FR-26, FR-28, UC-14

---

#### US-21 — Usage metrics

**As a** platform owner  
**I want** counts of vendors, notifications, TORs tracked  
**So that** I can show impact.

| | |
| --- | --- |
| Priority | Should |
| Screens | Admin overview |

**Acceptance criteria**

1. Overview shows TORs tracked, agencies, low-confidence queue length.  
2. Should add: active vendors, emails sent (7 days).  
3. Numbers come from the database, not hard-coded demo text, once ingestion is live.

**Traces:** FR-29, UC-11

---

#### US-22 — Configure coverage

**As a** platform owner  
**I want** to turn agencies / keywords on or off  
**So that** we can add a sixth organization later without a rewrite.

| | |
| --- | --- |
| Priority | Should |
| Screens | Admin config (or env + config file in v1) |

**Acceptance criteria**

1. Coverage list is data, not only hardcoded UI.  
2. Disabling an agency hides it from new ingest; historical rows remain unless archived.  
3. Adding an agency requires `dept_code` or OCDS mapping — not a scrape URL.

**Traces:** FR-30, FR-34

---

#### US-32 — Classification queue for ambiguous labels

**As an** admin  
**I want** e-GP titles like “จ้างพัฒนาระบบติดตามงบประมาณ” vs “คอมพิวเตอร์และซอฟต์แวร์สำนักงาน” routed differently  
**So that** US-6 / US-18 stay operationally clear.

| | |
| --- | --- |
| Priority | Must |
| Screens | `/admin` |

**Acceptance criteria**

1. Suggestion text is specific, not only “unknown.”  
2. Queue is sorted by confidence ascending (risk first) by default.

**Traces:** FR-24, UC-6

---

### 5.8 Agency representative

#### US-23 — See my organization’s public record

**As an** agency representative  
**I want** to filter the monitor and listings to my organization  
**So that** I can see what the public sees.

| | |
| --- | --- |
| Priority | Must (via public filters; dedicated login Could) |
| Screens | `/tors?agency=`, `/dashboard` |

**Acceptance criteria**

1. Agency filter covers all five.  
2. No extra “secret” fields on the public view.  
3. Dedicated BMA-staff role is **Could**.

**Traces:** FR-31, UC-12

---

#### US-24 — Flag inaccurate data

**As an** agency representative (or public visitor in v1)  
**I want** to flag a wrong title, budget, or outdated stage  
**So that** the public record can be fixed.

| | |
| --- | --- |
| Priority | Should |
| Screens | Detail “Escalate flag” / flag form |

**Acceptance criteria**

1. Flag requires a short description.  
2. System stores TOR id, message, timestamp, optional contact.  
3. Item appears on admin review.  
4. Resolution updates the record or replies “cannot verify.”  
5. Flags are not public accusations.

**Traces:** FR-32, FR-33, UC-12

---

### 5.9 Cross-cutting product stories

#### US-30 — Theme

**As a** visitor  
**I want** light / dark theme  
**So that** I can read the monitor comfortably.

| | |
| --- | --- |
| Priority | Should |
| Screens | Global chrome |

**Acceptance criteria:** toggle persists; charts and badges remain readable in both themes.

---

#### US-31 — Demo view toggle

**As a** reviewer / professor  
**I want** to preview Public, Vendor, and Admin  
**So that** I can walk the three doors without three accounts.

| | |
| --- | --- |
| Priority | Must for course demo; remove or hide in production |
| Screens | Header toggle |

**Acceptance criteria**

1. Public → `/`, Vendor → `/app`, Admin → `/admin`.  
2. Production plan: replace with real roles (proposal note).

**Traces:** FR-39

---

## 6. System features

### [1] TOR Ingestion & Tracking

Pulls official APIs on a schedule, tracks lifecycle, stores versions, keeps source URLs, prepares records for matching.

**Includes:** OCDS worker, data.go.th worker, optional RSS, dedup, software pre-filter, last-checked stamps.  
**Not:** HTML scrape, Playwright e-GP.  
**Stories:** US-1, US-2, US-3, US-4, US-5, US-6  
**FRs:** FR-1–FR-7, FR-34

### [2] Classification & Integrity

Keyword + Gemini software classification, confidence, admin queue, integrity flags (thin spec, outlier budget).

**Stories:** US-3, US-6, US-18, US-28, US-32  
**FRs:** FR-3–FR-5, FR-24–FR-25, FR-42

### [3] Vendor Matching & Notification

Profile intake, match score + reasons, inbox, email, prefs (channel, frequency, category, budget).

**Stories:** US-7–US-10, US-34  
**FRs:** FR-8–FR-13

### [4] Public Budget Dashboard & Price Context

Medians, live vs median, historical table, optional percentile fairness.

**Stories:** US-11–US-13, US-35  
**FRs:** FR-14–FR-17, FR-36

### [5] Capability Fit

Skill overlap, gaps, optional Gemini sentence.

**Stories:** US-36  
**FRs:** FR-37

### [6] Approaches / Showcase

Curated or vendor-submitted past approaches by category.

**Stories:** US-14, US-15  
**FRs:** FR-18–FR-20

### [7] Vendor Account, Profile, Watchlist

Register, login, profile edit, watchlist, vendor gate on public detail.

**Stories:** US-16, US-17, US-29  
**FRs:** FR-21–FR-23, FR-38

### [8] Admin Operations

Health probes, classification queue, account moderation, metrics, coverage config.

**Stories:** US-5, US-6, US-18–US-22, US-32  
**FRs:** FR-24–FR-30, FR-35

### [9] Agency accuracy access

Filter-to-self + flag routing.

**Stories:** US-23, US-24  
**FRs:** FR-31–FR-33

### [10] Public narrative & chrome

Home, monitor, EN/TH, theme, demo audience toggle.

**Stories:** US-25, US-26, US-30, US-31, US-33  
**FRs:** FR-39–FR-41

---

## 7. Use case model

### 7.1 Actors and map

**People:** Public Visitor, Vendor, Admin, Platform Owner, Agency Representative  

**Systems:** OCDS, data.go.th, e-GP RSS, Email, Official listing (browser)

| Use case | Primary actor | Also |
| --- | --- | --- |
| UC-1 Browse / search / open TOR | Public, Vendor | |
| UC-2 Receive match notification | Vendor | Email |
| UC-3 View budget dashboard | Public, Vendor, Owner, Agency | |
| UC-4 Browse / submit showcase | Public, Vendor | |
| UC-5 Manage profile & prefs | Vendor | |
| UC-6 Review classification | Admin | |
| UC-7 Register / log in | Vendor | |
| UC-8 View vendor TOR fit | Vendor | |
| UC-9 Watchlist | Vendor | |
| UC-10 Scheduled ingest | Worker | OCDS, data.go.th, RSS |
| UC-11 Monitor source health | Admin | APIs |
| UC-12 Flag inaccuracy | Agency / Public | Admin |
| UC-13 Use public home & monitor | Public | |
| UC-14 Moderate vendor account | Admin | |

### 7.2 Use cases (detailed)

#### UC-1 Browse / search / open TOR

| Element | Description |
| --- | --- |
| Primary actor | Public Visitor or Vendor |
| Goal | Find and read a software TOR |
| Preconditions | At least one published software TOR exists |
| Postconditions | Actor has seen list and/or detail; no bid is submitted in TORRENT |
| Main success | 1. Actor opens listings. 2. System returns software-only TORs. 3. Actor filters (agency, budget, integrity, q). 4. System updates the list (URL query should update). 5. Actor opens a row. 6. System shows detail + official link. 7. Actor may open the official page. |
| Extensions | 2a. None → empty + reset. 6a. Unknown id → not-found. 7a. Official URL missing → hide button, show “source unavailable.” Public 6b. Show vendor gate, not fit score. |
| Stories | US-1, US-2, US-3, US-4, US-27, US-28 |

#### UC-2 Receive match notification

| Element | Description |
| --- | --- |
| Primary actor | Vendor |
| Goal | Learn of a matching TOR in time |
| Preconditions | Vendor verified (or prototype account); prefs allow this class of alert; TOR just became vendor-visible |
| Postconditions | Inbox item exists; email sent if enabled |
| Main success | 1. Worker stores approved TOR. 2. Matcher scores profiles. 3. Score ≥ threshold and prefs pass. 4. System writes match + notification. 5. Email sent. 6. Vendor opens inbox / mail link. 7. Vendor sees reasons and official apply link. |
| Extensions | 3a. No vendors → stop. 5a. Email fail → retry, log, admin visibility. 3b. Prefs exclude category/budget → skip that vendor. |
| Stories | US-7, US-8, US-9, US-10, US-34 |

#### UC-3 View budget dashboard

| Element | Description |
| --- | --- |
| Primary actor | Anyone |
| Goal | See category medians and outliers |
| Preconditions | Benchmarks or enough awarded/published TORs |
| Postconditions | Actor understands this is context, not a quote tool |
| Main success | 1. Open `/dashboard`. 2. Load stats, median chart, compare chart, table. 3. Optional filters. 4. Hover/read min–max–count. |
| Extensions | 2a. Thin category → limited-data notice. 3a. No rows → empty state. |
| Stories | US-11, US-12, US-13, US-35 |

#### UC-4 Showcase

| Element | Description |
| --- | --- |
| Primary actor | Public (read), Vendor (read/submit) |
| Main success (read) | Open `/showcase`, scan cards by category. |
| Main success (submit) | Vendor submits entry → pending → admin approve → public. |
| Extensions | Reject with reason; withdraw. |
| Stories | US-14, US-15 |

#### UC-5 Manage profile and alert rules

| Element | Description |
| --- | --- |
| Primary actor | Vendor |
| Main success | Edit profile fields; set email toggles, budget band, categories; save; flash success. |
| Extensions | Validation errors on max < min budget. |
| Stories | US-7, US-9, US-17 |

#### UC-6 Review classification

| Element | Description |
| --- | --- |
| Primary actor | Admin |
| Preconditions | Queue non-empty or admin opens a TOR |
| Postconditions | TOR approved (listed) or rejected (hidden); audit row written |
| Main success | 1. Open admin. 2. See queue + confidence. 3. Read title / source snippet. 4. Approve with category or reject. 5. System updates listing visibility and may rematch. |
| Extensions | 3a. Ambiguous → needs-info. 5a. Rematch logged. |
| Stories | US-6, US-18, US-32 |

#### UC-7 Register / log in

| Element | Description |
| --- | --- |
| Primary actor | Vendor |
| Main success | Register or login → session → `/app`. |
| Extensions | Duplicate email; **[Prototype]** no password check. Production: verify email. |
| Stories | US-16 |

#### UC-8 Vendor TOR fit

| Element | Description |
| --- | --- |
| Primary actor | Vendor |
| Main success | Open `/app/tors/{id}`; see score, reasons, fit %, covered/gaps; watch; open official listing. |
| Stories | US-10, US-27, US-36 |

#### UC-9 Watchlist

| Element | Description |
| --- | --- |
| Primary actor | Vendor |
| Main success | Watch from detail → appears on `/app/saved`; unwatch removes. |
| Stories | US-29 |

#### UC-10 Scheduled ingest

| Element | Description |
| --- | --- |
| Primary actor | Ingestion worker |
| Preconditions | Credentials present for data.go.th; OCDS URL configured |
| Postconditions | New/updated TORs stored; health sample recorded |
| Main success | 1. Cron fires. 2. Fetch OCDS. 3. Fetch four `dept_code`s on data.go.th with keywords. 4. Optional RSS. 5. Normalize + dedupe. 6. Classify. 7. Enqueue low confidence. 8. Auto-publish high confidence. 9. Trigger matcher. |
| Extensions | 2a/3a HTTP fail → retry, yellow/red health. 5a Duplicate project id → update, do not clone. |
| Stories | US-5 |

#### UC-11 Source health

| Element | Description |
| --- | --- |
| Primary actor | Admin |
| Main success | Open `/admin`; probe official endpoints; see verdicts and timestamps. |
| Extensions | Probe timeout → yellow + message. |
| Stories | US-20, US-21 |

#### UC-12 Flag inaccuracy

| Element | Description |
| --- | --- |
| Primary actor | Agency representative or public |
| Main success | Submit description → admin queue → resolve (edit or dismiss). |
| Extensions | Empty description blocked. |
| Stories | US-23, US-24 |

#### UC-13 Public home and monitor

| Element | Description |
| --- | --- |
| Primary actor | Public Visitor |
| Main success | Land on `/`, read narrative, open monitor, scan KPIs / flags / latest / five agencies. |
| Stories | US-25, US-26 |

#### UC-14 Moderate vendor account

| Element | Description |
| --- | --- |
| Primary actor | Admin |
| Main success | Find vendor → verify or suspend → mail suppressed if suspended. |
| Stories | US-19 |

---

## 8. Functional requirements

### 8.1 Ingestion and tracking

| ID | Requirement |
| --- | --- |
| FR-1 | The system shall retrieve TOR / procurement records on a defined schedule from the configured official APIs (OCDS and data.go.th; optional e-GP RSS). |
| FR-2 | The system shall track draft, published, and awarded as separate, linkable lifecycle states and shall not invent draft state for award-only API rows. |
| FR-3 | The system shall classify each ingested record as software-related or not using the keyword set plus AI-assisted classification. |
| FR-4 | The system shall assign a confidence score in [0, 1] to each software-relevance decision. |
| FR-5 | The system shall route scores below the configured threshold to the admin review queue and shall not list those items for the public or vendors. |
| FR-6 | The system shall store versioned TOR documents as the lifecycle changes. |
| FR-7 | The system shall record organization (one of the five), department/unit, `sourceKind`, and official `sourceUrl` on every TOR. |
| FR-34 | The system shall not fetch or parse agency CMS HTML as an ingestion source. |
| FR-44 | The system shall deduplicate on OCDS release/process id or data.go.th project id (plus agency) so the same project is not listed twice. |
| FR-45 | The system shall detect newly seen records and field-level updates (title, budget, stage) and bump `lastSeenAt`. |

### 8.2 Matching and notification

| ID | Requirement |
| --- | --- |
| FR-8 | Vendors shall create and maintain a capability profile (technologies, project types, team size, free-text capabilities). |
| FR-9 | The system shall match newly visible TORs against vendors with matching enabled. |
| FR-10 | The system shall notify on draft or published matches when that stage exists. |
| FR-11 | Vendors shall configure email toggles (matches, deadlines, integrity), budget min/max, and categories. |
| FR-12 | The system shall display the capabilities / reasons that produced a match and a 0–100 score. |
| FR-13 | The system shall support email as a delivery channel. |
| FR-46 | Match and mail shall honour US-9 preferences (no email if match-mail is off). |

### 8.3 Budget dashboard and fairness

| ID | Requirement |
| --- | --- |
| FR-14 | A public dashboard shall show budget / pricing context for software TORs. |
| FR-15 | Users shall filter by category, organization/department, and time period when data exists. |
| FR-16 | The system shall compute min, max, and median budget per category (and show sample size). |
| FR-17 | The dashboard shall not require authentication. |
| FR-36 | **[Could]** The system shall compute a percentile fairness score for a TOR vs comparable-scope history and hide it when N is too small. |

### 8.4 Showcase

| ID | Requirement |
| --- | --- |
| FR-18 | The system shall allow vendor-submitted (or admin-seeded) showcase entries. |
| FR-19 | Showcase entries shall be groupable / filterable by TOR category. |
| FR-20 | Each entry shall name the vendor (public display name). |

### 8.5 Accounts and watchlist

| ID | Requirement |
| --- | --- |
| FR-21 | A company / freelancer shall register a vendor account. |
| FR-22 | Production shall verify vendor accounts before enabling email matching. |
| FR-23 | Vendors shall edit profile and capabilities after registration. |
| FR-38 | Vendors shall add and remove TORs from a per-account watchlist. |
| FR-43 | Public TOR detail shall offer a vendor-gate CTA and shall omit fit / watch controls. |

### 8.6 Admin and quality

| ID | Requirement |
| --- | --- |
| FR-24 | Admins shall see a queue of flagged or low-confidence classifications. |
| FR-25 | Admins shall confirm or correct software relevance and category. |
| FR-26 | Admins shall approve, verify, or suspend vendor accounts. |
| FR-27 | Admins shall see ingestion / API health (failures, timeouts, HTTP status). |
| FR-28 | The system shall audit classification corrections and account status changes. |
| FR-35 | Health probes shall target official APIs only and shall classify verdicts green / yellow / red. |

### 8.7 Governance

| ID | Requirement |
| --- | --- |
| FR-29 | The platform owner shall see usage metrics: TORs tracked, queue size, and (should) active vendors and notifications sent. |
| FR-30 | The owner shall configure tracked organizations via codes and API mappings, not scrape URLs. |

### 8.8 Agency representative

| ID | Requirement |
| --- | --- |
| FR-31 | Representatives shall view TOR and benchmark data for their organization via public filters (dedicated login optional). |
| FR-32 | They (or the public) shall submit a flag with a description of inaccurate or outdated data. |
| FR-33 | Flags shall enter the admin queue. |

### 8.9 Product chrome and monitor

| ID | Requirement |
| --- | --- |
| FR-37 | Vendor TOR detail shall show capability-fit coverage, gaps, and overlap percentage. |
| FR-39 | The course build shall provide a Public / Vendor / Admin preview toggle; production shall use real roles. |
| FR-40 | Listings and monitor shall cover exactly the five organizations in §1.3 unless config says otherwise. |
| FR-41 | The public home shall state that TORRENT is a monitor of official sources, not a bid desk. |
| FR-42 | The system shall support an integrity status (clear / flagged) with non-accusatory labels. |

---

## 9. Non-functional requirements

### 9.1 Performance

| ID | Requirement |
| --- | --- |
| NFR-1 | Ingestion interval shall be configurable and default to no more than once per hour per source. |
| NFR-2 | TOR listing shall render in ≤ 3 s under normal campus/home network once data is local. |
| NFR-3 | Match notifications shall be queued within 15 minutes of a TOR becoming vendor-visible. |
| NFR-4 | Budget dashboard shall render a typical filtered view in ≤ 3 s. |
| NFR-25 | A single health probe shall time out (recommended 6–8 s) and never block the public homepage. |

### 9.2 Security

| ID | Requirement |
| --- | --- |
| NFR-5 | All client–server traffic shall use HTTPS in deployed environments. |
| NFR-6 | RBAC: public / vendor / admin (and owner) see only their actions. Demo toggle is not a production auth substitute. |
| NFR-7 | API keys, MongoDB URI, and Vertex credentials shall be environment-specific and never shipped to the browser. |
| NFR-8 | State-changing HTTP shall use CSRF protection (or same-site + session patterns documented for Next.js). |
| NFR-9 | **Withdrawn / replaced:** no session/CSRF against e-GP HTML. Workers call documented GET APIs only. |
| NFR-26 | data.go.th keys shall be rotatable; logs shall not print the raw key. |

### 9.3 Reliability

| ID | Requirement |
| --- | --- |
| NFR-10 | Failed API calls shall retry with backoff. |
| NFR-11 | Admins shall be alerted when failures / yellow-red probes exceed a threshold. |
| NFR-12 | Partial ingest shall not create duplicate or orphan TORs (idempotent upsert). |
| NFR-13 | Ingest, classify, and notify failures shall be logged with source, status, and timestamp. |

### 9.4 Usability

| ID | Requirement |
| --- | --- |
| NFR-14 | A first-time vendor shall complete register → profile → understand inbox without a training session. |
| NFR-15 | Public and vendor copy shall avoid internal jargon (or gloss it). Flags are questions. Dashboard is not a bid calculator. |
| NFR-16 | Lifecycle and integrity shall use consistent visual badges. |
| NFR-27 | UI shall support English and Thai. |

### 9.5 Compatibility

| ID | Requirement |
| --- | --- |
| NFR-17 | Current Chrome and Firefox. |
| NFR-18 | Usable from 1280×720 up; core flows usable on common mobile widths. |

### 9.6 Scalability and maintainability

| ID | Requirement |
| --- | --- |
| NFR-19 | Web tier shall scale independently of the worker. |
| NFR-20 | Worker, database, AI, and web app shall remain separate deployables. |
| NFR-21 | MongoDB documents shall be version-friendly (additive fields). |
| NFR-22 | Internal APIs used by the UI shall be documented (OpenAPI or equivalent). |

### 9.7 Data governance

| ID | Requirement |
| --- | --- |
| NFR-23 | Vendor-only profile detail shall stay private except showcase fields marked public. |
| NFR-24 | Audit of classification fixes and accuracy flags shall be retained ≥ 12 months. |
| NFR-28 | Official source URLs shall remain visible so TORRENT is not the system of record. |

---

## 10. Data requirements

### 10.1 TOR (normalized)

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Internal |
| refId | string | Display / government ref when known |
| externalIds | object | `ocdsReleaseId`, `govspendingProjectId`, RSS guid |
| title, titleTh | string | |
| agencyId | enum | `bma` \| `mdes` \| `dga` \| `depa` \| `etda` |
| department, departmentTh | string | Sub-unit |
| category | enum | Six software categories |
| lifecycle | enum | draft / published / awarded |
| integrity | enum | ok / suspicious |
| integrityReasons | string[] | |
| budgetThb | number \| null | |
| publishedAt, deadline | date \| null | |
| summary, summaryTh | string | |
| skills, requirements | string[] | Extracted |
| sourceKind | enum | `bma-ocds` \| `govspending` \| `egp-rss` |
| sourceUrl | url | Official |
| procurementMethod | enum \| null | e-Bidding / e-Selection / Specific |
| classificationConfidence | number | |
| classificationStatus | enum | pending / approved / rejected |
| matchScore, matchReasons | optional | Computed per vendor at read time or stored on VendorMatch |

### 10.2 Other collections

- **VendorProfile** — identity, capabilities, team size, matchingEnabled  
- **VendorMatch** — vendorId, torId, score, reasons, matchedAt  
- **NotificationPrefs** — email flags, budget band, categories, frequency  
- **WatchlistItem** — vendorId, torId, createdAt  
- **ShowcaseEntry** — category, year, approach, outcome, vendorName, status  
- **BudgetBenchmark** — category, year, min/median/max, count, agency scope  
- **ReviewQueueItem** — torId, confidence, suggestion, status  
- **DataFlag** — torId, message, submitter, status  
- **AuditEvent** — actor, action, before/after  
- **SourceProbe** — source id, verdict, ms, status, detail, probedAt  

### 10.3 Software categories (v1)

Web Application · Mobile Application · System Integration · Data Platform · Cybersecurity · AI / Analytics

---

## 11. User interface and information architecture

### 11.1 Global chrome

- Brand lockup TORRENT  
- Locale EN/TH  
- Theme toggle  
- **[Demo]** Public / Vendor / Admin  
- Audience-specific nav  

### 11.2 Public (`(public)`)

| Route | Purpose |
| --- | --- |
| `/` | Narrative landing |
| `/monitor` | KPIs, flags, latest, five agencies |
| `/tors` | Catalog + filters |
| `/tors/[id]` | Public detail + vendor gate |
| `/dashboard` | Budget context |
| `/showcase` | Approaches |
| `/login`, `/register` | Auth (layouts) |

Nav groups: Home, Monitor, Listings, Budgets, Approaches.

### 11.3 Vendor (`(vendor)` `/app`)

| Route | Purpose |
| --- | --- |
| `/app` | Inbox of matches |
| `/app/matches` | Why matched + e-GP CTA |
| `/app/tors` | Catalog with fit |
| `/app/tors/[id]` | Fit, watch, reasons |
| `/app/saved` | Watchlist |
| `/app/profile` | Capability profile |
| `/app/alerts` | Alert rules |

### 11.4 Admin (`(admin)`)

| Route | Purpose |
| --- | --- |
| `/admin` | Stats, source health, classification queue |

Later: vendor moderation, coverage config, audit log.

### 11.5 UI rules (from proposal + current product)

- Public is civic transparency, not a bid inbox.  
- Vendor sees the **same public record** plus fit layers.  
- Admin is operations, not a prettier public dashboard.  
- Demo toggle is labelled as preview.

---

## 12. Open issues and assumptions

### 12.1 Open issues

| # | Issue | Impact | Recommendation |
| --- | --- | --- | --- |
| 1 | Exact `dept_code` values for DGA, depa, ETDA on data.go.th | High | One authenticated probe per agency before coding filters; store codes in config. |
| 2 | data.go.th is award-heavy — draft coverage for non-BMA | High | BMA OCDS + optional MDES RSS for drafts; label award rows honestly. |
| 3 | Keyword list precision/recall | Medium | Tune in beta; keep admin queue. |
| 4 | Vendor engagement after notify | High (resolved for v1) | Apply stays on official e-GP / OCDS. |
| 5 | Production auth vs demo toggle | Medium | Hide toggle when real login ships. |
| 6 | Showcase: seeded vs vendor-upload | Low | Seed for demo; upload in next increment. |
| 7 | Percentile fairness (1.2M) | Low | Ship medians first; percentile when N is enough. |
| 8 | BMA district offices (50) vs five-organization scope | Medium | Five organizations for v1; BMA OCDS already spans many BMA units internally — do not scrape districts. |
| 9 | Proposal still lists MOL scrape | n/a | This SRS wins; update the slide deck. |

### 12.2 Justified assumptions

1. **APIs stay public.** OCDS + data.go.th remain reachable. If false: health goes red; no scrape fallback.  
2. **Classification is good enough with humans.** If false: raise threshold, more admin time.  
3. **Off-platform apply.** If false: large compliance project — out of v1.  
4. **Five organizations are enough to demo software density.** If ETDA/`dept_code` is empty, swap using the same API (Revenue 0307 or CGD 0304) without changing architecture.  
5. **Vendors will fill a short profile.** If false: inbox stays empty; public monitor still works.  
6. **Medians need imperfect history.** Show sample size; never fake a tight distribution.

---

## 13. Appendices

### 13.1 Glossary

| Term | Definition |
| --- | --- |
| TOR | Terms of Reference — scope, requirements, and usually a budget for a government buy. |
| ร่าง TOR | Draft TOR published for comment before the final invitation. |
| e-GP | Electronic Government Procurement (national CGD system / BMA e-GP 2). |
| OCDS | Open Contracting Data Standard — BMA JSON packages. |
| data.go.th / ภาษีไปไหน | DGA open-data portal and Government Spending API over e-GP contracts. |
| Reversed job board | Opportunities are pushed to matching vendors. |
| Vendor | Studio, freelancer, or agency with a profile. |
| Classification confidence | How sure the model is that a row is software. |
| Integrity flag | A prompt to look closer, not a legal finding. |
| Showcase entry | How a team approached similar work. |
| Ingestion worker | Scheduled process that calls official APIs and writes TORs. |
| Watchlist | Vendor’s saved listings. |
| Fit score | Overlap of profile with TOR skills / category. |
| Source of record | The government API or official page — never TORRENT. |

### 13.2 Team and roles (from proposal)

| Name | Role |
| --- | --- |
| Napat Kulnarong | Project manager, frontend, UX/UI |
| Sethtatad Kijkanjanarat | Backend, CI/CD, testing |
| Jirakorn Chaitanaporn | Backend, QA, AI integration |

### 13.3 Timeline (from proposal)

Fifteen calendar weeks planned, thirteen used in practice. Feature slices follow F1–F12 in §2.2: worker and public monitor first, then matching/notifications, then dashboard/showcase/fit.

### 13.4 Cost plans (proposal, informational — not requirements)

The proposal listed 950k / 1M / 1.2M baht packages. The 1.2M plan adds Differentiated Showcase plus TOR Fit & Fairness (percentile + fit). This SRS treats **medians + basic fit** as Must and **percentile fairness + vendor-uploaded showcase** as Could, so a course build can complete without the 1.2M increment.

### 13.5 Tech stack (binding for implementation)

Next.js App Router · Node.js TypeScript/Express · MongoDB Atlas · Vertex AI (Gemini) · scheduled worker · **no** Playwright against government HTML.

### 13.6 Requirements traceability matrix

| User stories | Functional requirements | Use cases |
| --- | --- | --- |
| US-1, US-3, US-4, US-27 | FR-1, FR-3, FR-7, FR-40, FR-43 | UC-1 |
| US-2 | FR-2, FR-6 | UC-1, UC-10 |
| US-5 | FR-1, FR-34, FR-44, FR-45 | UC-10 |
| US-6, US-18, US-32 | FR-4, FR-5, FR-24, FR-25, FR-28 | UC-6 |
| US-7, US-16, US-17 | FR-8, FR-21, FR-22, FR-23 | UC-5, UC-7 |
| US-8, US-9, US-10, US-34 | FR-9–FR-13, FR-46 | UC-2 |
| US-11, US-12, US-13, US-35 | FR-14–FR-17, FR-36 | UC-3 |
| US-14, US-15 | FR-18–FR-20 | UC-4 |
| US-19 | FR-26, FR-28 | UC-14 |
| US-20, US-21 | FR-27, FR-29, FR-35 | UC-11 |
| US-22 | FR-30, FR-34 | UC-11 |
| US-23, US-24 | FR-31–FR-33 | UC-12 |
| US-25, US-26 | FR-41, FR-40, FR-42 | UC-13 |
| US-28 | FR-42 | UC-1, UC-6 |
| US-29 | FR-38 | UC-9 |
| US-31 | FR-39 | — |
| US-33 | NFR-27 | — |
| US-36 | FR-37 | UC-8 |

### 13.7 Risk register

| Risk | P | I | Mitigation |
| --- | --- | --- | --- |
| data.go.th key limits or downtime | M | H | Cache last good pull; health red; never scrape |
| OCDS schema / year-file change | M | H | Version parser; probe content-type and size |
| Award-only rows look like live TORs | H | H | Honest lifecycle labels (FR-2) |
| Software classifier noise | M | M | Queue + keywords + metrics in beta |
| Empty `dept_code` for ETDA/DGA/depa | M | H | Probe before lock; swap agency on same API |
| Demo toggle mistaken for security | M | M | Remove in production (FR-39) |
| Low vendor adoption | M | M | Public monitor has value without vendors |
| Dashboard misread as official BMA stats | L | H | Disclaimers; flags; source URLs |
| Gemini outage | M | M | Keyword-only + admin queue |
| Rate limit on spending API | M | M | Hourly cap, backoff (NFR-1, NFR-10) |

### 13.8 Mapping: proposal §3 (obsolete) → this SRS

| Proposal row | This SRS |
| --- | --- |
| BMA — “Official OCDS JSON” + wrong homepage link | Keep OCDS; use Open Contracting yearly JSON + ocds.html |
| MDES — RSS + **webpage fallback** | RSS optional; **no HTML fallback**; data.go.th primary |
| DGA — **scrape + PDF** | **data.go.th API only**; PDF only if a URL is already in the API payload (store link, do not crawl the site) |
| depa — **scrape listing** | **data.go.th API only** |
| Ministry of Labour — **scrape** | **Removed**; replaced by **ETDA** via data.go.th |

### 13.9 Assumptions summary

- Official APIs remain the only ingress.  
- Five organizations: BMA, MDES, DGA, depa, ETDA.  
- Software-only via keywords + AI + humans.  
- Apply on the official site.  
- Public reads without an account; vendors sign in for fit and alerts; admins run the desk.  
- Course prototype may mock listings until the worker is live; behaviour in this document is still the target.

---

*End of SRS v2.0. For questions of scope, Section 1.3 and Section 4 override the proposal’s scrape table and SRS v1.0’s BMA-only e-GP portal wording.*

# Company Playbook — Operational Governance

> How this company operates day to day. Second in the document hierarchy, below `docs/00-PROJECT-CHARTER.md` (which defines *what* and *why*) and above per-product docs (which define *how*, for one product). Single, non-duplicated document — same placement rationale as the Charter: canonical copy here, `intelli-tire-platform` references it rather than keeping its own. Mandatory reading before any architectural or product decision, per your instruction.
>
> Same discipline as the Charter: every section is either evidenced by something already true in one or both repos (cited), or marked **[OPEN]** where no real policy exists yet — nothing here is an invented rule presented as already in force.

---

## 1. Company Vision

See `docs/00-PROJECT-CHARTER.md` §1. Not restated — this Playbook is about *how*, the Charter owns *why*.

## 2. Product Philosophy

Two evidenced, standing principles across both products: **traceability over convenience** (HomologaPneu never presents a fact without a source; Intelli Tire never presents a recommendation without a reason — Charter §10) and **documentation before code, frozen once approved, changed only via ADR** (the working method this entire session, both products, no exception observed). A third, less formal but consistently observed: **verify real state before asserting it** — this session's own correction (treating `git ls-files` as "what exists on disk" without checking `git status` for deletions, corrected in `docs/MIGRATION_BOARD.md`) is the cautionary example baked into this principle.

## 3. Engineering Principles

Elevated from Charter §17 into an operational rule: **no migration without a tested rollback, no schema change without reading the real current schema first, no architecture decision without an ADR once documentation is "frozen."** Evidenced by every RLS migration this session (each shipped with a `rollback.sql`, each verified live against two roles before being called done) and by the Enterprise Engineering Blueprint's ADR log (ADR-009 through ADR-018) for Intelli Tire.

## 4. Product Decision Framework

The Quality Gate already in force (`docs/06-QUALITY-GATES.md`, both repos): before any feature, "does this belong to HomologaPneu / Intelli Tire / Shared Library? If uncertain, STOP and ask for architectural approval." Operationally, this session's actual working pattern has been: **routine implementation work proceeds without asking; genuine business-rule forks (data ownership scope, product boundary calls, redesign direction) stop and ask** — evidenced by the `AskUserQuestion` calls used for the RLS anon/authenticated scoping decision and the SaaS-boundary "how should anon/authenticated be treated" decision, versus the dozens of routine doc-writing/migration tasks that proceeded without interruption.

## 5. Feature Prioritization Process

**[OPEN] for HomologaPneu** — no backlog, scoring model, or prioritization artifact exists. **Partially evidenced for Intelli Tire**: `intelli-tire-platform/docs/07-backlog.md` uses Épico → Funcionalidade → User Story → Acceptance Criteria, but no explicit scoring/ranking method (no RICE, MoSCoW, or equivalent) is defined even there. Recommend adopting one company-wide once feature work resumes — not urgent during the freeze.

## 6. Definition of MVP

**[OPEN], proposed for confirmation**: for **Intelli Tire**, `intelli-tire-platform/docs/06-roadmap.md`'s v1.0 scope is the closest existing artifact to an MVP definition — not yet formally labeled as such. For **HomologaPneu**, no MVP was ever defined; the product is already live in production with real data (3,019 manufacturer homologations, 8,320 vehicle models) without having passed through a formal "this is our MVP" checkpoint. Proposed retroactive MVP definition, pending your confirmation: search + homologation lookup + admin curation workflow — everything else (the untracked redesign's marketplace/pricing/webhooks pages included) is explicitly post-MVP scope-creep that was never validated as necessary.

## 7. Definition of Production Ready

**Strongly evidenced for Intelli Tire**: `intelli-tire-platform/docs/20-Production-Readiness-Gate.md` defines this rigorously — 15 validated categories, explicit blockers-must-be-zero rule. Proposed as the **company-wide template** going forward (generalized, not Intelli Tire-specific in its structure). **Not evidenced for HomologaPneu** — it reached production (real users, real data, real Supabase project) without ever passing an equivalent gate. This is a real, retroactive gap: recommend running a Production Readiness Gate against HomologaPneu's *current* state once OD-1 (redesign direction) is resolved, since right now "production ready" and "actually in production" have quietly diverged for this product.

## 8. Technical Debt Policy

Evidenced by two real precedents: ADR-016's explicit rule that `createdBy`/`updatedBy` are "optional denormalized references... never depended upon for compliance or forensic analysis" (Intelli Tire) — debt taken on consciously, with its limits documented, not hidden. And the intelli-tire-platform governance instruction (this session, CTO-mode phase) to "keep everything in the initial migration instead of creating technical debt" — a stated preference for paying cost upfront over deferring it. Policy, synthesized from both: **debt is allowed only when consciously chosen and documented (why, and what its limits are) — never silent, never "temporary" without an owner and a trigger for when it gets paid down.**

## 9. Architecture Governance

Already the most rigorously evidenced section in this whole document: Arquiteto → Banco → Segurança → Performance → QA → Código gate (HomologaPneu governance doc), ADR-gated changes once docs are frozen (both products), the Architecture Freeze currently in effect (this conversation). No new evidence needed — this Playbook formalizes what's already been the actual practice for weeks of this session's work.

## 10. Security Governance

See Charter §15 for principles; operationally: RLS designed with the 2-role test (one denied, one allowed) before being called done — the standard every migration this session was held to, cited in `docs/rls-fase1-identidade-homologacoes.md` and `intelli-tire-platform/docs/16-RLS-Security-Review.md`. `service_role`/superuser-equivalent roles never used for ordinary business logic (Intelli Tire, `intelli-tire-platform/docs/18-Least-Privilege-Report.md`) — HomologaPneu's `postgres`-role Prisma connection is the one accepted deviation, explicitly documented as a trade-off rather than an oversight.

## 11. Documentation Governance

**The document hierarchy, made explicit for the first time here**: `00-PROJECT-CHARTER.md` (why) → `00-COMPANY-PLAYBOOK.md` (how, this document) → per-product `00-AI-CONSTITUTION.md` / `06-QUALITY-GATES.md` / `07-ADR.md` → per-product architecture/technical docs. Lower levels may not contradict higher ones; conflicts get resolved by amending the lower document, never by silently ignoring the higher one. **Known current violation of this principle**: HomologaPneu's 18 root-level docs (`OPTIMIZATION_SUMMARY.md`, `IMPLEMENTATION_COMPLETE.md`, etc.) predate this hierarchy entirely, live outside `docs/`, and were never checked against any governance document because none existed yet when they were written — not a violation *at the time*, but they don't fit the hierarchy now. Already flagged for consolidation in `docs/MIGRATION_BOARD.md`, unchanged recommendation.

## 12. Release Strategy

**[OPEN]** — no deploy pipeline, release cadence, or environment-promotion process documented for either product. HomologaPneu has a QA CI workflow (`.github/workflows/qa-tests.yml`) but nothing beyond it (no staging/production promotion gate found). Intelli Tire's stack docs name Vercel as the hosting target but define no release process. Needs a real decision before either product's first real deploy.

## 13. Versioning Strategy

**[OPEN]** — no `CHANGELOG`, no semver tagging evidenced in either repo's git history, no version field on either product's `package.json` beyond the default `"0.1.0"` (unconfirmed — not verified this turn, flagging as needing a check rather than asserting). Recommend adopting semantic versioning company-wide once release strategy (§12) is settled — sequencing matters, no point versioning a product with no release process yet.

## 14. Code Review Policy

**[OPEN], with a real constraint worth naming plainly**: both repos currently have a single human contributor (Wilson Júnior) plus AI-assisted development — there is no second human reviewer in either repo's history. The practical substitute already available in this environment is AI-assisted review (`/code-review`, and the multi-agent `/code-review ultra` for deeper passes) — recommend treating a review pass through one of those as the minimum bar before any structural change lands, given no human second-reviewer exists today. This is a real gap to name, not paper over with an aspirational "PRs require 2 approvals" rule that doesn't reflect actual team size.

## 15. Testing Policy

**Strongly evidenced for HomologaPneu**: 80%+ coverage target, Jest unit tests, Cypress E2E (happy-path, mobile, accessibility, security specs), Lighthouse performance, OWASP Top 10 security testing — a real, already-built framework (`TESTING-GUIDE.md`, `jest.config.js`, `cypress.config.ts`, real test files under `services/__tests__/` and `cypress/e2e/`). **Not yet exercised for Intelli Tire** — no code exists yet to test. Proposed company-wide policy: adopt HomologaPneu's already-built framework and coverage bar as the template Intelli Tire follows once its own implementation begins, rather than inventing a second standard.

## 16. Incident Management

**[OPEN]** — no runbook, no severity-level definitions, no postmortem template exists in either repo. The `engineering:incident-response` skill available in this working environment can execute an incident workflow when needed, but the company-level *policy* (when something counts as an incident, who gets notified, blameless-postmortem norms) hasn't been written. Recommend drafting this before either product has real users depending on uptime — not urgent today (HomologaPneu has 2 seeded users, no public traffic; Intelli Tire has none).

## 17. Risk Management

Evidenced pattern, not yet named as a formal "process" until now: risks get logged with severity and an owner-in-waiting, not just narrated — see Charter §20, `docs/MIGRATION_BOARD.md`'s Risks table (R1–R6), and `intelli-tire-platform/docs/20-Production-Readiness-Gate.md`'s Risk Matrix. Policy, made explicit: **any risk identified during architecture or product work gets a table row, not just a sentence in prose** — the format already in use across this session's reports, now formalized as the standard rather than a one-off habit.

## 18. Change Management

**This document and the Architecture Freeze it exists under are themselves the evidence.** No structural change (file move, delete, merge, migration) happens without an explicit approval step; every major architecture decision this session went through documented alternatives before a decision was recorded (ADR pattern). The freeze itself — pausing all migration work the moment a bigger unresolved question (OD-1, then the Charter, now this Playbook) surfaced — is the change-management policy operating correctly, not a delay imposed on top of it.

## 19. Long-term Product Strategy

See Charter §19 (roadmap) and §23 (3-year vision) — not restated. **[OPEN]**: no defined cadence for *revisiting* strategy (quarterly? on major milestones?) exists in either repo. Recommend picking one once the current freeze lifts.

## 20. AI Usage Policy

The most directly evidenced section in this document — this entire session is the case study. Observed, standing rules: an AI working in either repo (a) writes documentation before code and treats it as frozen once approved, changeable only via ADR; (b) never deletes, moves, merges, or commits without explicit human approval — evidenced by the current freeze itself, honored strictly across three consecutive user messages now; (c) verifies real state (schema, git status, actual file existence) rather than trusting assumptions or prior summaries — evidenced by this session's own self-correction on the `(app)` route-collision claim; (d) flags business-rule forks for a human decision instead of guessing (the RLS scoping question, the SaaS-boundary question) while proceeding autonomously on routine implementation work; (e) marks genuine unknowns as **[OPEN]** rather than fabricating a plausible-sounding answer — the discipline this Charter and this Playbook were both written under. This is proposed as the formal policy precisely because it's already the observed behavior, not a new constraint being introduced.

## 21. Customer Success Principles

**[OPEN]** — no support process, SLA, or CS tooling exists in either repo (HomologaPneu's `/suporte` page, part of the still-undecided redesign, is a static mockup, not a real support channel). Proposed starting principle, grounded in Charter §10's traceability/explainability doctrine rather than invented fresh: **every user-facing answer (a homologation result, a BI recommendation) must be able to show its own reasoning on request** — this is already a design principle for both products' core features; extending it to support interactions (a support answer should be able to point at the same evidence a user could look up themselves) is a natural, low-cost extension once a real support process exists.

---

## Summary of open items this Playbook surfaced

Feature prioritization process, MVP definition (both retroactive for HomologaPneu and prospective for Intelli Tire), release strategy, versioning strategy, code review policy (real team-size constraint, not just an unmade decision), incident management, strategy-revisit cadence, and customer success process — none block the freeze from lifting on their own, but should get real answers before either product's first real customer-facing release.

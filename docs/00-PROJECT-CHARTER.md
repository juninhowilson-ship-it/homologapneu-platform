# Project Charter — Company-Level

> Highest-level business document governing both product lines: **HomologaPneu** and **Intelli Tire**. This is a single, non-duplicated document — the canonical copy lives here (`C:\Projetos\homologapneu\docs\00-PROJECT-CHARTER.md`) because no separate company-level repository exists yet; `intelli-tire-platform` should reference this file rather than keep its own copy. Everything below either states a decision already made and evidenced elsewhere in the two codebases, or is explicitly marked **[OPEN]** where no such evidence exists — nothing here is invented business fact presented as settled.

---

## 1. Vision

To be the operating layer of trust and intelligence for the Brazilian tire industry — the system that tells a shop or distributor *which tire is correct* (HomologaPneu) and *which decision is profitable* (Intelli Tire), each with evidence, not guesswork.

## 2. Mission

Build focused, single-purpose software products for a vertical (tires) that most enterprise software treats as an afterthought — each product does one job precisely rather than many jobs vaguely.

## 3. Product Purpose

- **HomologaPneu**: answer "which tires are homologated/compatible for this specific vehicle, per official manufacturer/regulatory sources" — with full traceability back to the source document, not a guess.
- **Intelli Tire**: answer "what should this tire distributor buy, price, and stock next" — decision support grounded in the distributor's own ERP data (purchasing, sales, inventory), not generic dashboards.

## 4. Business Goals

- **[OPEN]** Neither product has a documented commercial goal (revenue target, customer count, launch date) anywhere in either repo. HomologaPneu is a live, populated production system (Supabase project `mggjboosevzxbtvhmrpm`, real data: 3,019 manufacturer homologations, 8,320 vehicle models, 132 manufacturers) but no billing, subscription, or customer-facing account-tier code exists — it currently reads as an internal/professional tool rather than a commercialized product. Intelli Tire has an approved business strategy (`intelli-tire-platform/docs/00-Product-Strategy.md`) with pricing tiers defined, but zero running code and zero customers (pre-launch, architecture-only phase).
- What *is* established: both products are being engineered to production-grade rigor (RLS security design, ADR-gated architecture decisions, formal QA frameworks) regardless of whether a commercial launch date exists yet — the goal, as evidenced by the engineering discipline applied, is "build it right the first time," not "ship fast and iterate."

## 5. Target Market

- **HomologaPneu**: professionals who need to verify OEM tire-vehicle compatibility against official sources — tire shops, auto centers, fleet managers, and (per the existing `docs/plataforma-catalogo-fabricante.md`) potentially manufacturers themselves consuming a curated catalog. Brazil-specific (ABNT references, `.com.br` domains throughout the codebase, Portuguese-first UI).
- **Intelli Tire**: tire distributors, wholesalers, and multi-branch tire retail chains in Brazil — established in depth in `intelli-tire-platform/docs/01-Market-Validation.md`, not repeated here.

## 6. Ideal Customer Profile

- **HomologaPneu**: **[OPEN — inferred, not documented]** likely a small-to-mid auto center or independent tire shop owner/technician who currently has to manually cross-reference manufacturer PDFs and doesn't trust generic online tire-fitment sites. Never formally validated with real customer interviews the way Intelli Tire's ICP was (see `intelli-tire-platform/docs/01-Market-Validation.md` for the rigor bar this should eventually match).
- **Intelli Tire**: defined in `intelli-tire-platform/docs/00-Product-Strategy.md` §ICP — not repeated here.

## 7. Problems we solve

- **HomologaPneu**: eliminates manual cross-referencing of scattered manufacturer PDFs/official sources to determine correct tire fitment; provides one traceable answer instead of ten conflicting ones.
- **Intelli Tire**: eliminates spreadsheet-based purchasing/pricing decisions for tire distributors; surfaces what a raw ERP export can't (margin erosion, stockout risk, pricing anomalies) without requiring a data analyst on staff.

## 8. Problems we deliberately do NOT solve

Elevated from `docs/00-AI-CONSTITUTION.md` (both products) to Charter level, since this is a business boundary, not just an engineering rule:

- **HomologaPneu never becomes**: an ERP, a purchasing/inventory system, a sales analytics tool, a financial dashboard, or a commercial AI assistant. It answers "is this tire correct for this vehicle," full stop — not "should I buy it" or "how much should I charge for it."
- **Intelli Tire never becomes**: a vehicle homologation database, an OEM compliance tool, or a tire technical-specification catalog. It answers "what should I do with the tires I already have/can get," full stop — not "which tires exist and are they compatible with vehicle X."
- Neither product does the other's job by accident. This is the single most important boundary this whole migration effort exists to protect (see `docs/MIGRATION_BOARD.md`).

## 9. Product Boundaries

See §8 above and `docs/00-AI-CONSTITUTION.md` (both repos) for the enforced version of this boundary, including the explicit "never implement X" lists per product. Not restated in full here to avoid two documents drifting out of sync — this Charter is the *why*, the Constitution is the *enforced rule*.

## 10. Product Principles

- **HomologaPneu**: every fact must be traceable to an official source document (never fabricated/inferred data presented as fact) — evidenced by the entire `homologation_evidences`/`homologation_documents`/`official_sources` schema design and the curation (`curadoria`) workflow that requires human review before a candidate becomes an approved homologation.
- **Intelli Tire**: decisions must be explainable, not black-box — evidenced by the Decision Center design in `intelli-tire-platform/docs/03-Functional-Specification.md` requiring every AI recommendation to show its reasoning.
- **Both**: "real data, not fictional" — an explicit standing project principle referenced in the HomologaPneu governance doc's QA section, and matching the intelli-tire-platform QA doctrine of testing against real data.

## 11. Competitive Advantages

- **HomologaPneu**: source-traceable data (most competitors, per informal review of the space, present tire-fitment data without citing the originating document); a real, populated dataset already in production rather than a cold-start catalog.
- **Intelli Tire**: see `intelli-tire-platform/docs/01-Market-Validation.md` for the validated competitive matrix — not repeated here, already rigorously researched.

## 12. Revenue Model

- **HomologaPneu**: **[OPEN]** — no billing/subscription/payment code exists anywhere in the repo (confirmed via this session's audit: no Stripe/payment-provider imports, no plan/tier fields on `users`). Currently reads as either a pre-commercial internal tool or a product whose monetization strategy hasn't been engineered yet. This needs a real decision before any pricing-related UI (e.g., the `app/pricing/page.tsx` mockup flagged in `docs/MIGRATION_BOARD.md`) is treated as anything more than a placeholder.
- **Intelli Tire**: subscription SaaS with tiered pricing, already defined and validated against real market pricing in `intelli-tire-platform/docs/00-Product-Strategy.md` and `01-Market-Validation.md` — not repeated here.

## 13. Licensing Strategy

**[OPEN]** — no license file exists in either repository, no explicit statement of proprietary vs. open-source intent anywhere in either codebase's documentation. Default assumption until stated otherwise: both are proprietary/closed-source, all rights reserved, single-owner (Wilson Júnior) IP. Recommend adding an explicit `LICENSE` file to both repos once this is confirmed — currently a real gap, not a design decision.

## 14. Multi-tenant Strategy

- **HomologaPneu**: **deliberately single-tenant.** No `tenant_id` column exists anywhere in its 89-table schema; confirmed this session. This is a real architectural decision, not an oversight — the product serves one organization's homologation catalog, not many isolated customer datasets.
- **Intelli Tire**: **deliberately multi-tenant**, `tenant_id` on every table, enforced via RLS reading the tenant from the user's JWT (`auth.jwt() ->> 'tenant_id'` — see ADR-019 in the Intelli Tire repo, which replaced the earlier `SET LOCAL app.tenant_id` approach). The design center of `docs/03-multi-tenant.md` and the RLS policy files. The two products' data-isolation models are intentionally different because their business models are different (one org's catalog vs. many tenants' commercial data) — this is not an inconsistency to resolve, it's a correct reflection of what each product actually is.

### Resolução: como aplicar o mandato de escala do WSOS (decidido 2026-08-06)

O WSOS determina projetar para 100M vendas, 100M compras, 10M clientes, 10M produtos e 10.000 empresas. Aplicado literalmente aos dois produtos, isso forçaria um retrofit multi-tenant no HomologaPneu — contradizendo esta mesma seção. **Resolução aprovada: aplicar o mandato proporcionalmente, não uniformemente.**

- **Intelli Tire** — o mandato se aplica **integralmente e literalmente**. É um SaaS multi-tenant cuja tese de negócio é escalar em número de empresas; os alvos do WSOS são o alvo real. Nada muda: a arquitetura já foi desenhada para isso.
- **HomologaPneu** — o mandato se aplica **como disciplina de performance, não como mandato de multi-tenancy**. Isto significa: índices que cobrem as queries reais, particionamento onde o volume justifica (já feito em `audit_logs_*`), paginação obrigatória, nada de `SELECT *` em tabela grande, nenhuma query que degrade linearmente com o crescimento do catálogo. **Não** significa adicionar `tenant_id` a 89 tabelas de um produto que serve o catálogo de uma organização só.

**Racional:** adicionar multi-tenancy a um produto estável e em produção, sem nenhuma necessidade de negócio que justifique servir múltiplas organizações isoladas, é exatamente o "aumentar complexidade sem justificativa" que o próprio WSOS proíbe na seção Architecture. Se o modelo de negócio do HomologaPneu mudar para servir múltiplas organizações com dados isolados, isso vira um ADR próprio e a migração é planejada nesse momento — um risco consciente e diferido, coerente com a Política de Débito Técnico do `00-COMPANY-PLAYBOOK.md` §8, não uma omissão.

## 15. Security Principles (company-wide baseline)

- Deny by default, grant explicitly — the pattern applied in this session's HomologaPneu RLS work (`docs/rls-fase1-identidade-homologacoes.md`) and throughout Intelli Tire's RLS design (`intelli-tire-platform/docs/16-RLS-Security-Review.md`).
- No credential or secret ever committed to a repo — both `.env` files are gitignored; verified this session.
- Every access-control decision is explicit and testable with at least two roles (one that should be denied, one that should be allowed) — the standard this session's RLS migrations were held to, and the standard the HomologaPneu governance doc's "Segurança" gate requires for every PR.
- `service_role`/superuser-equivalent database roles are never used for ordinary business logic in Intelli Tire (documented in `intelli-tire-platform/docs/18-Least-Privilege-Report.md`); HomologaPneu's use of the `postgres` superuser role for its Prisma connection is a known, accepted trade-off (documented this session) specifically because RLS is being layered on as defense-in-depth, not as the primary access-control mechanism for the app's own traffic.

## 16. Scalability Principles

- **Intelli Tire**: documented in depth in `intelli-tire-platform/docs/09-escalabilidade.md` (path from 1 to 1,000 tenants) — not repeated here.
- **HomologaPneu**: **[OPEN]** — no equivalent scalability document exists. Given it's single-tenant with a bounded, curated dataset (not a growing multi-customer dataset), the scaling profile is fundamentally different (read-heavy catalog queries at whatever traffic the product acquires, not per-tenant data growth) — worth its own short document eventually, but not urgent given current real-world scale (tens of thousands of rows, not millions).

## 17. Engineering Principles

- Documentation before code, frozen once approved, changed only via ADR — the discipline both products have been held to throughout this session (`docs/07-ADR.md` in both repos).
- No migration without a rollback path, tested — the standard applied to every RLS migration this session.
- Read the real schema/state before writing any change — never assume; this session's `git ls-files` vs. actual-disk-state correction (see `docs/MIGRATION_BOARD.md`) is the cautionary example for why this principle exists.
- Quality Gate before any feature: does this belong to HomologaPneu, Intelli Tire, or Shared Library? (`docs/06-QUALITY-GATES.md`, both repos.)

## 18. Quality Principles

- 80%+ automated test coverage target for services (HomologaPneu's Jest/Cypress framework, already built — `TESTING-GUIDE.md`).
- WCAG 2.1 AA accessibility, OWASP Top 10 security testing, Lighthouse performance targets — all already defined in HomologaPneu's QA docs; not yet defined for Intelli Tire (which has no running code yet to test).
- "Real data, not fictional" in QA — a standing project principle, already cited in the governance doc.

## 19. Product Roadmap (high level)

- **HomologaPneu, immediate**: resolve the in-progress redesign (Open Decision OD-1 in `docs/MIGRATION_BOARD.md`) before anything else — the product currently has an ambiguous, uncommitted UI state. Then continue the RLS rollout to the remaining ~85 tables (4 of 89 done this session). Then fix the known build-blocking TypeScript error.
- **Intelli Tire, immediate**: first real migration (`prisma migrate dev`), moving from architecture-only to a running system. Gated on your explicit go-ahead per the standing "no migrations without approval" instruction from earlier in this project.
- Beyond that: not this document's job to plan in detail — see each product's own roadmap doc (`docs/06-roadmap.md` in intelli-tire-platform; no equivalent exists yet for HomologaPneu, another real gap worth closing).

## 20. Risks

- **Single-founder bus factor** — both products depend entirely on one person's continuity and context; neither has a team beyond Wilson Júnior as far as either repo's history shows.
- **Attention split across two products** simultaneously in early/pre-revenue stages — a real risk to execution speed on either one.
- **HomologaPneu's undefined business model** (§12) — engineering investment is happening without a confirmed monetization path.
- **The in-progress, uncommitted redesign** (OD-1) — real risk of losing work or shipping an inconsistent product if left unresolved much longer.
- **Intelli Tire has zero running code and zero real users** — the entire, extensive architecture is unvalidated against real usage; the risk isn't the design quality (which has been rigorously reviewed), it's that no design survives contact with real users unchanged.

## 21. Success Metrics

**[OPEN]** — neither product has instrumented analytics or defined KPIs in code today (no analytics SDK, no event tracking found in either repo). Proposed starting metrics, pending your confirmation:
- **HomologaPneu**: search-to-result completion rate, % of homologations with full source traceability (already computable from existing schema — `validationStatus`, `confidence` fields exist), user retention (once real auth usage exists beyond the 2 seeded accounts).
- **Intelli Tire**: once live — tenant activation rate, Decision Center recommendation acceptance rate (already designed for in `intelli-tire-platform/docs/02-Product-Requirements-Document.md`), time-to-first-value.

## 22. Non-functional Requirements (company-wide baseline)

- Availability: no formal SLA defined for either product **[OPEN]**.
- Data integrity: enforced via database constraints (CHECK constraints, unique indexes) in both schemas — a real, evidenced principle, not aspirational.
- Security: RLS-first, least-privilege — see §15.
- Observability: HomologaPneu has structured logging (`lib/logging/structured-logger.ts`) and audit log tables (`audit_logs_*`, partitioned by year); Intelli Tire's observability design exists on paper (`intelli-tire-platform/docs/14-Enterprise-Engineering-Blueprint.md`) but is unvalidated (no running code).

## 23. Future Vision (3 years)

**[OPEN — aspirational, not a commitment]** A candidate framing, offered for you to confirm or replace: two independently profitable, focused products serving adjacent parts of the same Brazilian tire-industry value chain — HomologaPneu as the trusted compliance/fitment reference layer, Intelli Tire as the commercial decision layer — connected only by a public API if a real customer need for that ever emerges (per ADR-001's explicit deferral of any cross-product integration until there's a real reason).

---

## Summary of open items this Charter surfaced (not previously documented anywhere)

1. No confirmed business goals/targets for either product (§4)
2. HomologaPneu has no validated ICP, unlike Intelli Tire (§6)
3. HomologaPneu has no revenue model (§12)
4. No licensing decision for either product — no `LICENSE` file exists (§13)
5. No HomologaPneu scalability document (§16)
6. No success metrics/analytics instrumentation for either product (§21)
7. No formal SLA (§22)

None of these block the Architecture Freeze from lifting on their own — they're flagged so they don't stay silently undocumented now that a Charter exists to hold them.

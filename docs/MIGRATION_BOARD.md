# Migration Control Board — HomologaPneu ↔ Intelli Tire

> Single source of truth for the architecture-separation migration. Updated as the migration progresses. Detailed supporting analysis (dependency graph, build impact, per-file manual review, doc merge matrix) lives in `Migration-Analysis-Phases-1-6.md` (delivered alongside this board — not yet copied into the repo, see note at bottom).

## Current status: FROZEN — analysis only, no changes applied

Architecture Freeze in effect since 2026-08-06. No file has been moved, deleted, merged, or committed since this board was created. All items below are proposals pending your approval.

## ⚠ Critical context (read before anything else)

This repository currently has an **unrelated, incomplete, uncommitted redesign in progress**, discovered during this audit — not caused by the HomologaPneu/Intelli Tire separation work:

- The entire old authenticated `(app)/*` route section (23 pages + layout), `middleware.ts`, and ~35 supporting components are **deleted from disk** (uncommitted `git status` deletions).
- The untracked cluster this migration is analyzing (41 files) is wired into the app root (`app/providers.tsx` already renders the untracked `Navigation`/`Footer` on every page) — it is not inert scaffold sitting next to a working app; for several routes it is **currently the only implementation**.
- `components/layout/AppShell.tsx`/`Header.tsx`/`Sidebar.tsx` are now orphaned (zero importers).
- `proxy.ts` (the real, active auth gate) still references the **old** route list (`/fabricantes`, `/veiculos`, `/pneus`, `/roadmap`, etc.) and was not updated for the new structure.
- `next build` succeeds at compilation (no route collisions — corrects the previous report) but **fails TypeScript checking** on `app/api/homologacoes-otimizado/route.ts:42` (`homologationTires` not a valid field) — pre-existing, unrelated to this migration.

**This needs your direction before the migration plan below can be considered final**: is the redesign (delete old `(app)` shell → new top-level dark-themed routes) something you want completed, reverted, or paused? See "Open decisions" below — this is decision OD-1, the most important one on this board.

## Files to review (13 — "Needs Manual Review" from Phase 1, reframed after the correction above)

| File | Prior read | Reframed status |
|---|---|---|
| `app/pesquisa/page.tsx` | "collides with real page, delete" | **Retracted** — no collision exists; this is currently the only `/pesquisa` implementation |
| `app/relatorios/page.tsx` | same | **Retracted** — same correction |
| `app/roadmap/page.tsx` | same | **Retracted** — same correction |
| `components/Footer.tsx` | "unused duplicate" | **Retracted** — actively rendered on every page via `app/providers.tsx` |
| `components/Navigation.tsx` | "unused duplicate" | **Retracted** — actively rendered on every page via `app/providers.tsx` |
| `app/admin/page.tsx` | generic, review | Still open — see Phase 3 Q&A in supporting report |
| `app/analytics-avancado/page.tsx` | generic, review | Still open |
| `app/dashboard-customizado/page.tsx` | generic, review | Still open |
| `app/inteligencia-artificial/page.tsx` | generic, review | Still open |
| `app/integracao/page.tsx` | generic, review | Still open |
| `app/marketplace/page.tsx` | generic, review | Still open |
| `app/performance/page.tsx` | generic, review | Still open |
| `app/pricing/page.tsx` | generic, review | Still open |
| `app/seguranca/page.tsx` | generic, review | Still open |
| `app/webhooks/page.tsx` | generic, review | Still open |
| `DEPLOYMENT.md` | review | Still open — describes the redesign as shipped; needs OD-1 resolved first |

Full per-file "what problem does it solve / production or prototype / reusable / shared library / stay / archive" answers are in the supporting report, Phase 3.

## Files to migrate (to a future Shared Library location)

| File | Status |
|---|---|
| `components/Cards.tsx` (`HeroCard`, `DataCard`, `ListCard`, `BadgeTag`) | Confirmed zero business logic, zero current importers other than itself — candidate, not migrated yet (no Shared Library location exists) |
| `components/Filters.tsx` (`AdvancedFilters`, `QuickFilter`) | Same |
| `components/Notification.tsx` (`Toast`, `Modal`) | Same |
| `components/Charts.tsx` (`SimpleChart`, `DataTable`) | Same |

**Not migrated**: per the prior report's §5, waiting for Intelli Tire's first real consumer before extracting.

## Files to delete

**None approved.** Nothing on this board should be read as an approved deletion — even where I recommend one below, it requires your explicit sign-off (see Pending approvals).

## Shared libraries

No shared library package/location exists yet in either repo. The 4 files above are the only current candidates. Extraction is deliberately deferred (ADR-001 in both repos' `docs/07-ADR.md`).

## Risks

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | Incomplete uncommitted redesign (see critical context above) — real risk of data loss if anyone runs `git clean`/`git checkout .`/`git restore` without understanding this state | **High** | Open, needs OD-1 |
| R2 | `next build` currently fails TypeScript checking (`homologacoes-otimizado/route.ts:42`) | High (blocks any deploy) | Open, outside this migration's scope but blocking |
| R3 | `proxy.ts` auth gate not updated for the new route structure — some new routes may be unintentionally public, or old admin-only prefixes may no longer match anything real | Medium | Open, needs investigation once OD-1 is resolved |
| R4 | `components/layout/AppShell.tsx`/`Header.tsx`/`Sidebar.tsx` orphaned (dead code) | Low | Open |
| R5 | ~~Intelli Tire has zero commits / no proper repo~~ | Low | **RESOLVIDO 2026-08-06** — repo consolidado em `C:\Projetos\intelli-tire-platform` com remote `Wilson-Software/intelli-tire-platform`; 23 arquivos aguardando o primeiro commit de conteúdo (OD-4) |
| R7 | `disemp-saas` mantido como backup — duplicação temporária dos 22 docs + schema + policies. Fonte de verdade é a cópia em `intelli-tire-platform` | Low | Aberto até você confirmar a remoção |
| R8 | Divergência de estrutura de pastas: `docs/04-estrutura-pastas.md` e `docs/14` (Intelli Tire) descrevem `app/` na raiz, mas o scaffold real usa `src/app/` (create-next-app com `--src-dir`) | Low | Aberto — decidir qual vence antes de escrever features |
| R6 | 3 documentation duplicate clusters in HomologaPneu's 18 root docs (~7,000 lines) not yet merged | Low | Open, merge matrix in supporting report |

## Open decisions

| ID | Decision needed | Blocks |
|---|---|---|
| **OD-1** | Is the in-progress redesign (delete old `(app)` shell, replace with new top-level routes) something to complete, revert, or pause? | Everything else — the fate of all 13 "needs review" files depends on this |
| OD-2 | Fate of each of the 13 "Needs Manual Review" files (post-OD-1) | Phase 5/6 |
| OD-3 | Doc merge matrix approval (3 clusters, supporting report Phase 4) | Doc merge execution |
| OD-4 | Primeiro commit de conteúdo do Intelli Tire — 23 arquivos (docs consolidados, ADR-019, `next.config.ts` limpo) aguardando aprovação | R5 |
| OD-5 | Who fixes the `homologacoes-otimizado/route.ts` TypeScript error, and when (in this migration or separately)? | Deployability, unrelated to product separation |
| OD-6 | Remover a pasta `C:\Projetos\disemp-saas` (backup) agora que a consolidação está validada? | R7 |
| OD-7 | Estrutura de pastas do Intelli Tire: manter `src/app/` do scaffold ou seguir os docs 04/14 (`app/` na raiz)? | R8, e qualquer feature nova |

## Completed tasks

- [x] Full audit of both repos' file inventories (642 HomologaPneu tracked, 40 Intelli Tire, 50 untracked)
- [x] Confirmed zero code-level cross-contamination between products
- [x] `docs/00-AI-CONSTITUTION.md`, `docs/06-QUALITY-GATES.md`, `docs/07-ADR.md` created in both repos
- [x] **Separação física dos dois produtos concluída (2026-08-06)** — `intelli-tire-platform` movido de dentro do HomologaPneu para `C:\Projetos\intelli-tire-platform`, irmão. Validado: remote e commit inicial intactos, HomologaPneu sem nenhuma referência restante, build real passando (27.8s, 5 páginas)
- [x] Arquitetura aprovada consolidada no repo do Intelli Tire — 22 docs + `schema.prisma` + 10 policies RLS copiados de `disemp-saas` para `intelli-tire-platform/docs/` (schema e policies em `docs/reference/database/`)
- [x] **ADR-019** — acesso a dados via `supabase-js` em vez de Prisma; aposenta ADR-009 e ADR-010
- [x] Contradição do WSOS resolvida (mandato de escala aplicado proporcionalmente, não uniformemente) — Charter §14
- [x] `turbopack.root` removido do Intelli Tire — workaround do aninhamento, obsoleto após a mudança; confirmado por build real
- [x] Referências de caminho corrigidas em 8 documentos dos dois repos (`disemp-saas` → `intelli-tire-platform`) + correções semânticas onde o texto ficou factualmente errado
- [x] All 41 untracked HomologaPneu files read in full and classified
- [x] Dependency check (grep-based) for the 4 Shared Library candidates and `Footer`/`Navigation` — see supporting report Phase 1
- [x] Real `next build` run — compilation succeeds, TypeScript check fails (unrelated pre-existing bug), no route collisions
- [x] This board created

## Pending approvals

- [ ] OD-1 a OD-7 acima
- [ ] Doc merge execution (writing the actual merged content — not started)
- [ ] Qualquer movimentação/remoção **dentro do HomologaPneu** (o redesign segue congelado até OD-1)
- [ ] Primeiro commit de conteúdo do Intelli Tire (23 arquivos)
- [ ] Remoção do backup `disemp-saas`

## Validation checklist (for whenever Phase 5/6 execution is approved)

- [ ] `next build` passes (both compilation and typecheck) before any migration file changes
- [ ] `next build` passes after each batch of changes (not one big-bang change)
- [ ] `proxy.ts` route prefixes reviewed against whatever the final route structure is
- [ ] No orphaned imports (`AppShell`/`Header`/`Sidebar` either reconnected or formally retired)
- [ ] Cypress E2E suite run (`cypress/e2e/*.cy.ts`) if the redesign direction (OD-1) keeps the new routes
- [ ] `git status` clean or fully understood before any destructive command runs
- [ ] Each documentation merge diffed against both source docs before the originals are touched

---
*Supporting detailed analysis (Phase 1 dependency graph, Phase 2 build impact, Phase 3 thirteen-file review, Phase 4 doc merge matrix, Phase 5 architecture validation, Phase 6 recommended order) delivered as a separate file this turn — not yet copied into the repo pending your review.*

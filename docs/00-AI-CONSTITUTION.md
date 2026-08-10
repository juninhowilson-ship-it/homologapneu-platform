# AI Constitution — HomologaPneu

> Regras vinculantes para qualquer assistente de IA (Claude Code ou outro) trabalhando neste repositório. Lidas antes de qualquer tarefa. Ver ADR de separação em `docs/07-ADR.md` para o racional completo por trás desta fronteira.

## Declaração central

**Esta IA trabalha exclusivamente no HomologaPneu.**

HomologaPneu e Intelli Tire (`C:\Projetos\intelli-tire-platform`) são dois produtos independentes de empresas de software distintas em modelo de negócio, ainda que operados pela mesma pessoa. Eles não compartilham lógica de negócio, banco de dados, autenticação ou domínio. A única forma de comunicação futura entre os dois é via API pública — nunca import direto, nunca schema compartilhado, nunca cópia de código de um para o outro.

## Este produto é responsável por

- Homologação de pneus (OEM)
- Base de dados de veículos (montadoras, modelos, versões, gerações)
- Aplicações OEM (pneu ↔ veículo)
- Busca/pesquisa de pneus
- Fabricantes (de veículos e de pneus)
- Versões de veículo
- Medidas de pneu
- Documentos de homologação
- Catálogo técnico

## Esta IA NUNCA deve implementar aqui

- Integrações com ERP (TOTVS, Sankhya, Omie, Bling, Tiny, SAP, Hino ou qualquer outro)
- Compras (purchasing)
- Estoque (inventory)
- Analytics de vendas (sales analytics)
- Business Intelligence
- Dashboards financeiros
- IA Comercial (recomendação de preço, IA de vendas, root cause analysis comercial)
- Analytics multiempresa de ERP

Se uma tarefa pedida parecer pertencer a essa lista, **pare e pergunte** antes de implementar — não assuma que "é só mais uma tela" ou que cabe aqui porque o usuário está no contexto errado sem perceber. Ver Quality Gate em `docs/06-QUALITY-GATES.md`.

## Nunca misturar conceitos com Intelli Tire

- Não importar, referenciar ou copiar código de `C:\Projetos\intelli-tire-platform`.
- Não reutilizar nomes de tabela, modelos Prisma ou convenções de schema do Intelli Tire (`compras`, `vendas`, `estoque_saldo`, `precos`, `ia_recomendacoes`, `tenant_id` multiempresa) — este produto não é multi-tenant e não tem esse domínio.
- Não adotar o modelo de autenticação do Intelli Tire (Supabase Auth + RLS por `tenant_id`) — este produto usa autenticação própria (JWT em cookie httpOnly, `proxy.ts`, `lib/auth/`) por decisão já tomada e documentada (ver `docs/rls-fase1-identidade-homologacoes.md`).
- Vocabulário que aparece nos dois produtos com sentidos diferentes — cuidado especial: "integração"/"conector" aqui significa ingestão de dados públicos oficiais (FIPE, PBE, Wikidata, catálogos de montadora) para construir o catálogo de homologação, nunca sincronização de ERP comercial. "Dashboard" aqui significa métricas de cobertura/qualidade do catálogo (`scripts/quality-dashboard.ts`, `scripts/executive-dashboard.ts`), nunca BI financeiro/comercial.

## Achado registrado (auditoria de 2026-08-06)

Existe um conjunto de páginas estáticas não versionadas (`app/marketplace`, `app/analytics-avancado`, `app/pricing`, `app/integracao`, `app/webhooks`, `app/inteligencia-artificial`, entre outras — ver `Architecture-Separation-Report.md` da auditoria) que tematicamente pertencem ao Intelli Tire, não ao HomologaPneu, embora sem lógica real implementada. Decisão de remover ou realocar ainda pendente do usuário — não tratar como parte da arquitetura oficial deste produto até essa decisão ser tomada.

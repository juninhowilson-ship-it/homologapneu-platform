# RLS — Fase 1: users, homologations, manufacturer_homologations, homologation_documents

> Doc de Arquiteto (etapa 1 do fluxo Arquiteto → Banco → Segurança → Performance → QA → Código), escrito antes de qualquer migration desta fase. Ver `HomologaPneu_Fluxo_Aprovacao_e_Governanca.md` para o fluxo completo e o diagnóstico original (~70 tabelas com RLS habilitado e zero políticas).

## O que muda e por quê

As 4 tabelas abaixo têm RLS **habilitado** desde a criação do schema, mas **nenhuma política** — hoje isso já nega acesso a `anon`/`authenticated` por padrão do Postgres (RLS habilitado + zero política = deny all para qualquer role que não seja dona da tabela). O problema não é vazamento ativo, é a ausência de desenho: nada impede que uma política futura mal escrita (`USING (true)`, por exemplo) abra acesso sem querer, porque não há nenhum contrato explícito documentado hoje.

## Achado de arquitetura que redesenha o plano original

Antes de escrever qualquer `USING (auth.uid() = ...)`, confirmei duas coisas no banco real (não assumidas):

1. **`auth.users` está vazia (0 linhas).** Este projeto não usa Supabase Auth. Login é inteiramente próprio: JWT (`jose`) em cookie httpOnly, decodificado em `lib/auth/jwt.ts`, gate central em `proxy.ts` (ver `AGENTS.md` — este Next.js renomeou `middleware.ts` → `proxy.ts`).
2. **`public.users.id` é `integer` (sequence)**, sem nenhuma coluna equivalente a `auth.uid()` (`uuid`). Não há vínculo estrutural entre um usuário logado no app e um "usuário autenticado" do Supabase.

Consequência direta: o papel `authenticated` do Supabase **não representa "usuário logado no app"** neste projeto — ele só existiria se alguém chamasse a API PostgREST do Supabase diretamente com uma chave/JWT do Supabase, algo que a aplicação em si nunca faz. A aplicação acessa 100% dos dados via Prisma, conectando como a role `postgres` (superuser do projeto, `BYPASSRLS` por natureza — ver `lib/prisma.ts`), e usa `SUPABASE_SERVICE_ROLE_KEY` apenas para Storage (upload de arquivos), também com bypass de RLS. Não existe `NEXT_PUBLIC_SUPABASE_*` nem `createBrowserClient` em nenhum lugar do repositório — nenhum client-side chama o Supabase diretamente.

**Decisão (confirmada com o usuário via pergunta explícita em 2026-08-06, opção "Negar tudo a anon/authenticated"):** já que a autorização real do produto vive inteiramente em `proxy.ts` + na própria aplicação, e nada legítimo hoje passa por `anon`/`authenticated`, o RLS destas 4 tabelas passa a ser uma **rede de segurança pura**: nega explicitamente todo acesso (SELECT/INSERT/UPDATE/DELETE) a `anon` e `authenticated`, em vez de deixar aberto "por omissão" (ausência de política). `postgres` e `service_role` continuam com bypass total — não é afetado por este desenho, e a aplicação não sofre nenhuma mudança de comportamento.

Se no futuro o produto passar a expor dados via PostgREST direto (API pública) ou adotar Supabase Auth, este desenho precisa ser revisitado nesse momento — não é o caso hoje.

## Desenho por tabela

Padrão idêntico nas 4 tabelas (nenhuma tem coluna de dono/tenant, então não há distinção de regra por tabela):

| Papel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `postgres` (app via Prisma) | bypass (superuser) | bypass | bypass | bypass |
| `service_role` (Storage) | bypass | bypass | bypass | bypass |
| `anon` | negado | negado | negado | negado |
| `authenticated` | negado | negado | negado | negado |

Implementação: uma política `FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)` por tabela (explícita, autodocumentada, aparece em `pg_policies` — não é "ausência de política"), mais `REVOKE ALL ON TABLE ... FROM anon, authenticated` como defesa em profundidade (hoje ambas as roles têm `GRANT ALL` residual do padrão do Supabase — `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` — confirmado via `information_schema.role_table_grants`; a política de RLS já bloqueia, mas remover o GRANT elimina a dependência de uma única camada).

**Nota sobre `users.passwordHash`:** mesmo com o design acima, vale registrar que esta coluna guarda hash de senha em texto (bcrypt/argon2, verificar `lib/auth/jwt.ts`/rota de login) — reforça por que negar `anon`/`authenticated` por completo é a escolha certa aqui, e não uma política de leitura parcial por coluna (RLS do Postgres é por linha, não por coluna; esconder só a coluna exigiria uma view separada, fora de escopo desta fase).

## Rollback

Cada migration desta fase vem com o SQL inverso: `DROP POLICY` + `GRANT ALL ... TO anon, authenticated` (restaurando exatamente os privilégios capturados acima antes da mudança). Testado antes de aplicar em produção (ver seção QA de cada migration).

## Ordem de aplicação e critério de avanço

1. `users` → 2. `homologations` → 3. `manufacturer_homologations` → 4. `homologation_documents`.
Após cada tabela: `Supabase:get_advisors(security)` deve deixar de listar `rls_enabled_no_policy` para aquela tabela, e o teste de 2 papéis (`anon` negado, `postgres`/dono permitido) deve passar antes de seguir para a próxima.

Fora de escopo desta fase (rodada separada, por instrução explícita): `search_path` de `busca_normalizar`/`busca_inteligente`/`refresh_materialized_views`, relocação de `pg_trgm`/`unaccent`, exposição de `mv_homologation_stats`.

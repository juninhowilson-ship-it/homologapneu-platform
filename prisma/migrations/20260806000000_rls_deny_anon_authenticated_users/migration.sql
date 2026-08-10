-- RLS Fase 1 (1/4) — public.users
-- Ver docs/rls-fase1-identidade-homologacoes.md para o racional completo.
--
-- Este projeto NÃO usa Supabase Auth (auth.users está vazia) e o app acessa
-- o banco via Prisma conectando como a role `postgres` (superuser,
-- BYPASSRLS) — ver lib/prisma.ts. anon/authenticated não têm nenhum uso
-- legítimo nesta tabela hoje. RLS já negava por ausência de política; esta
-- migration torna a negação explícita (visível em pg_policies, não
-- dependente de omissão) e remove os GRANTs residuais do padrão do Supabase.
--
-- Idempotente: seguro rodar mais de uma vez.

drop policy if exists deny_anon_authenticated_all on public.users;

create policy deny_anon_authenticated_all
  on public.users
  as permissive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.users from anon, authenticated;

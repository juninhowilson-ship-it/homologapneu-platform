-- Rollback de 20260806000000_rls_deny_anon_authenticated_users
-- Não é aplicado automaticamente pelo Prisma — script manual, testado antes
-- do deploy (ver seção QA em docs/rls-fase1-identidade-homologacoes.md).
-- Restaura exatamente os privilégios capturados via information_schema
-- antes desta migration: GRANT ALL (DELETE, INSERT, REFERENCES, SELECT,
-- TRIGGER, TRUNCATE, UPDATE), padrão do Supabase para tabelas novas.

drop policy if exists deny_anon_authenticated_all on public.users;

grant all on table public.users to anon, authenticated;

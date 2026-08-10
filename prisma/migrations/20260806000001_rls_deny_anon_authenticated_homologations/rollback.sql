-- Rollback de 20260806000001_rls_deny_anon_authenticated_homologations
-- Restaura GRANT ALL (DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE, UPDATE) capturado via information_schema antes da migration.

drop policy if exists deny_anon_authenticated_all on public.homologations;

grant all on table public.homologations to anon, authenticated;

-- Rollback de 20260806000002_rls_deny_anon_authenticated_manufacturer_homologations
-- Restaura GRANT ALL (DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE, UPDATE) capturado via information_schema antes da migration.

drop policy if exists deny_anon_authenticated_all on public.manufacturer_homologations;

grant all on table public.manufacturer_homologations to anon, authenticated;

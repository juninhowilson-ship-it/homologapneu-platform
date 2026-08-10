-- Rollback de 20260806000003_rls_deny_anon_authenticated_homologation_documents
-- Restaura GRANT ALL (DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE, UPDATE) capturado via information_schema antes da migration.

drop policy if exists deny_anon_authenticated_all on public.homologation_documents;

grant all on table public.homologation_documents to anon, authenticated;

-- RLS Fase 1 (4/4) — public.homologation_documents
-- Mesmo racional de 20260806000000_rls_deny_anon_authenticated_users — ver
-- docs/rls-fase1-identidade-homologacoes.md. Idempotente.

drop policy if exists deny_anon_authenticated_all on public.homologation_documents;

create policy deny_anon_authenticated_all
  on public.homologation_documents
  as permissive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.homologation_documents from anon, authenticated;

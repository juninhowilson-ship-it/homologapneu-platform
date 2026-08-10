-- RLS Fase 1 (2/4) — public.homologations
-- Mesmo racional de 20260806000000_rls_deny_anon_authenticated_users — ver
-- docs/rls-fase1-identidade-homologacoes.md. Idempotente.

drop policy if exists deny_anon_authenticated_all on public.homologations;

create policy deny_anon_authenticated_all
  on public.homologations
  as permissive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.homologations from anon, authenticated;

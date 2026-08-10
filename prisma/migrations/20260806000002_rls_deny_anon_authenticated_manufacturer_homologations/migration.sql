-- RLS Fase 1 (3/4) — public.manufacturer_homologations
-- Mesmo racional de 20260806000000_rls_deny_anon_authenticated_users — ver
-- docs/rls-fase1-identidade-homologacoes.md. Idempotente.

drop policy if exists deny_anon_authenticated_all on public.manufacturer_homologations;

create policy deny_anon_authenticated_all
  on public.manufacturer_homologations
  as permissive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.manufacturer_homologations from anon, authenticated;

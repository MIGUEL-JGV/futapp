-- =============================================================
-- 0007 - El admin global ve y gestiona TODAS las inscripciones
--
-- Las policies de 0001 restringían la lectura/actualización de
-- `team_registrations` a los miembros (`tournament_members`) del
-- torneo. Pero el admin global (rol 'admin' en user_profiles) no
-- siempre tiene una fila de membresía, por lo que NO veía las
-- solicitudes ni podía aprobarlas.
--
-- Este fix agrega el bypass de admin global a lectura y a
-- actualización (aprobar/rechazar), igual que ya lo hace el helper
-- `tournament_member_can_read` para los miembros.
-- =============================================================

drop policy if exists "owner reads registrations" on public.team_registrations;
create policy "owner reads registrations"
  on public.team_registrations for select
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.tournament_members tm
        where tm.tournament_id = team_registrations.tournament_id
          and tm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid() and up.role = 'admin'
      )
    )
  );

drop policy if exists "owner updates registrations" on public.team_registrations;
create policy "owner updates registrations"
  on public.team_registrations for update
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.tournament_members tm
        where tm.tournament_id = team_registrations.tournament_id
          and tm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid() and up.role = 'admin'
      )
    )
  )
  with check (true);
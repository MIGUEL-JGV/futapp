-- =============================================================
-- 0005 - Inscripción pública con datos ampliados + perfiles
--
--  * Amplía `team_registrations` para capturar datos del
--    representante en el formulario público (FR: el invitado
--    envía nombre de equipo + contacto).
--  * Permite leer perfiles de miembros del mismo torneo
--    (para mostrar el nombre del propietario/moderador en vez
--    del UUID) y actualizar el propio perfil (display_name).
-- =============================================================

alter table public.team_registrations
  add column if not exists representative text,
  add column if not exists phone          text,
  add column if not exists email          text,
  add column if not exists message        text;

-- ---------------------------------------------------------------
-- Lectura de perfiles de usuarios que comparten torneo.
-- Security-definer para evitar la recursión con `tournament_members`
-- (su propia SELECT ya usa helpers security-definer).
-- ---------------------------------------------------------------
create or replace function public.user_can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() = target_user_id
    or exists (
      select 1
      from public.tournament_members tm
      where tm.user_id = target_user_id
        and exists (
          select 1
          from public.tournament_members tm2
          where tm2.user_id = auth.uid()
            and tm2.tournament_id = tm.tournament_id
        )
    )
    or exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role = 'admin'
    )
  );
$$;

drop policy if exists "read member profiles" on public.user_profiles;
create policy "read member profiles"
  on public.user_profiles
  for select
  using (public.user_can_read_profile(user_profiles.id));

-- ---------------------------------------------------------------
-- El propio usuario puede actualizar su perfil (display_name).
-- ---------------------------------------------------------------
drop policy if exists "update own profile" on public.user_profiles;
create policy "update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
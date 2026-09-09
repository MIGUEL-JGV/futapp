-- =============================================================
-- 0006 - Gestión de equipos por representante
--
--  * Agrega `registered_by_email` a `teams` para vincular un
--    equipo aprobado con el email del representante.
--  * Agrega `manager_token` a `team_registrations` para generar
--    un enlace único que el organizador pueda compartir con el
--    representante aprobado.
--  * Crea una función helper y policy para que el representante
--    aprobado SOLO pueda escribir en los jugadores de su propio
--    equipo (no tocar partidos, fixture, etc.).
-- =============================================================

alter table public.teams
  add column if not exists registered_by_email text;

alter table public.team_registrations
  add column if not exists manager_token text;

-- Token único para cada inscripción aprobada.
create unique index if not exists idx_registrations_manager_token
  on public.team_registrations (manager_token)
  where manager_token is not null;

-- ---------------------------------------------------------------
-- Helper: ¿el usuario autenticado es el representante de este
-- equipo? (email coincide con registered_by_email del equipo).
-- Security-definer para evitar recursión.
-- ---------------------------------------------------------------
create or replace function public.is_team_manager(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() is not null
    and exists (
      select 1
      from public.teams t
      where t.id = target_team_id
        and t.registered_by_email is not null
        and t.registered_by_email = (
          select up.email from public.user_profiles up
          where up.id = auth.uid()
        )
    )
  );
$$;

-- ---------------------------------------------------------------
-- Policy: el representante aprobado puede INSERT/UPDATE/DELETE
-- SOLO en la tabla `players` de su propio equipo.
-- La policy "owner write players" existente ya cubre admin/mod.
-- Esta nueva policy se SUMA (OR) para el representante.
-- ---------------------------------------------------------------
drop policy if exists "manager write own team players" on public.players;
create policy "manager write own team players"
  on public.players
  for all
  using (public.is_team_manager(players.team_id))
  with check (public.is_team_manager(players.team_id));

-- El representante también puede LEER su propio equipo y sus jugadores.
-- Ya existen policies SELECT públicas, pero esta explícita por claridad.
drop policy if exists "manager read own team" on public.teams;
create policy "manager read own team"
  on public.teams
  for select
  using (public.is_team_manager(teams.id));

-- ---------------------------------------------------------------
-- Al aprobar, copia el email de la solicitud al equipo creado.
-- Usamos un trigger para no modificar el store.
-- ---------------------------------------------------------------
create or replace function public.set_team_registered_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'APPROVED' and new.email is not null then
    update public.teams
       set registered_by_email = new.email
     where name = new.team_name
       and tournament_id = new.tournament_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_team_registration_approved on public.team_registrations;
create trigger trg_team_registration_approved
  after update on public.team_registrations
  for each row
  execute function public.set_team_registered_email();

-- ---------------------------------------------------------------
-- RPC pública (security-definer): dado el token de manager, devuelve
-- el equipo aprobado asociado (nombre + id + torneo). El roster/público
-- ya es de solo lectura, así que no expone nada sensible.
-- ---------------------------------------------------------------
drop function if exists public.get_team_by_manager_token(uuid);
create function public.get_team_by_manager_token(p_token uuid)
returns table (
  team_id     uuid,
  team_name   text,
  tournament_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.name, t.tournament_id
  from public.team_registrations r
  join public.teams t
    on t.name = r.team_name and t.tournament_id = r.tournament_id
  where r.manager_token = p_token
    and r.status = 'APPROVED'
  limit 1;
$$;
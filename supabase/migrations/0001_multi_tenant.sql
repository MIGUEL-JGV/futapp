-- =============================================================
-- FUTAPP - Migración 0001: Multi-tenant y multiusuario
--
-- Convierte el modelo de "admin global" a un modelo por-torneo:
--  - Cada torneo tiene un propietario (organizer_id).
--  - Los organizadores pueden invitar moderadores (tournament_members)
--    que ayudan a editar ese torneo (equivalente a CopaFácil).
--  - La lectura pública se mantiene (espectadores / sin login).
--  - Se añade la inscripción de equipos por enlace (team_registrations).
--
-- Esta migración aún NO se aplica a ningún proyecto (no hay proyecto
-- Supabase configurado). Se aplicará cuando se cree el proyecto real.
-- =============================================================

-- -------------------------------------------------------------
-- Tabla: tournament_members (multi-tenant)
-- Miembros con permisos de edición de un torneo.
--   role: 'owner' (propietario) | 'moderator' (coeditor)
-- -------------------------------------------------------------
create table if not exists public.tournament_members (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'moderator'
    check (role in ('owner', 'moderator')),
  created_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists idx_tournament_members_tournament
  on public.tournament_members (tournament_id);
create index if not exists idx_tournament_members_user
  on public.tournament_members (user_id);

-- -------------------------------------------------------------
-- Tabla: team_registrations (inscripción por enlace)
-- Solicitudes de equipos que se inscriben vía URL pública.
--   status: 'PENDING' | 'APPROVED' | 'REJECTED'
-- Al aprobar, el organizador crea el team correspondiente.
-- -------------------------------------------------------------
create table if not exists public.team_registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_name     text not null,
  contact       text,
  status        text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_team_registrations_tournament
  on public.team_registrations (tournament_id, status);

-- -------------------------------------------------------------
-- Columnas nuevas en tournaments
--   public_url: enlace público para seguir / inscribirse en un torneo.
-- -------------------------------------------------------------
alter table public.tournaments
  add column if not exists public_url text;

-- -------------------------------------------------------------
-- RLS: tournament_members y team_registrations
-- -------------------------------------------------------------
alter table public.tournament_members enable row level security;
alter table public.team_registrations enable row level security;

-- -------------------------------------------------------------
-- Helpers security definer (evitan "infinite recursion" en RLS:
-- una policy no puede hacer subconsulta sobre su misma tabla).
-- -------------------------------------------------------------
create or replace function public.tournament_member_can_read(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.tournament_members tm
        where tm.tournament_id = target_tournament_id
          and tm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid() and up.role = 'admin'
      )
    )
  );
$$;

create or replace function public.tournament_member_is_owner(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() is not null
    and exists (
      select 1 from public.tournament_members tm
      where tm.tournament_id = target_tournament_id
        and tm.user_id = auth.uid()
        and tm.role = 'owner'
    )
  );
$$;

-- Securidad: lectura para propietarios/moderadores del torneo.
drop policy if exists "read own tournament memberships" on public.tournament_members;
create policy "read own tournament memberships"
  on public.tournament_members for select
  using (public.tournament_member_can_read(tournament_members.tournament_id));

-- Escritura restringida para el propietario.
drop policy if exists "owner manages members" on public.tournament_members;
create policy "owner manages members"
  on public.tournament_members for all
  using (public.tournament_member_is_owner(tournament_members.tournament_id))
  with check (true);

-- Inscripciones: cualquiera (público) puede CREAR una solicitud PENDING.
drop policy if exists "public can register team" on public.team_registrations;
create policy "public can register team"
  on public.team_registrations for insert
  with check (status = 'PENDING');

-- Lectura de inscripciones restringida a propietarios/moderadores.
drop policy if exists "owner reads registrations" on public.team_registrations;
create policy "owner reads registrations"
  on public.team_registrations for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.tournament_members tm
      where tm.tournament_id = team_registrations.tournament_id
        and tm.user_id = auth.uid()
    )
  );

-- Actualización de estado: solo propietario/moderador.
drop policy if exists "owner updates registrations" on public.team_registrations;
create policy "owner updates registrations"
  on public.team_registrations for update
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.tournament_members tm
      where tm.tournament_id = team_registrations.tournament_id
        and tm.user_id = auth.uid()
    )
  )
  with check (true);

-- -------------------------------------------------------------
-- Función helper: puede el usuario escribir un torneo?
-- Propietario o moderador del torneo (o admin global de respaldo).
-- -------------------------------------------------------------
create or replace function public.tournament_member_can_write(target_tournament_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.tournament_members tm
        where tm.tournament_id = target_tournament_id
          and tm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid() and up.role = 'admin'
      )
    )
  );
$$;

-- -------------------------------------------------------------
-- Ajuste RLS de escritura en tournaments/teams/players/matches/
-- events: ahora se filtra por ORGANIZADOR (owner) o moderador del
-- torneo, y no por "cualquier admin".
-- -------------------------------------------------------------
drop policy if exists "admin write tournaments" on public.tournaments;
drop policy if exists "admin write teams" on public.teams;
drop policy if exists "admin write players" on public.players;
drop policy if exists "admin write matches" on public.matches;
drop policy if exists "admin write match_events" on public.match_events;
drop policy if exists "admin write audit_log" on public.audit_log;

-- Helper actualizado: verdadero si el usuario es owner/moderador del torneo.
drop policy if exists "owner write tournaments" on public.tournaments;
create policy "owner write tournaments"
  on public.tournaments for all
  using (
    tournament_member_can_write(tournaments.id)
  )
  with check (true);

drop policy if exists "owner write teams" on public.teams;
create policy "owner write teams"
  on public.teams for all
  using (
    tournament_member_can_write(teams.tournament_id)
  )
  with check (true);

drop policy if exists "owner write players" on public.players;
create policy "owner write players"
  on public.players for all
  using (
    tournament_member_can_write(
      (select tournament_id from public.teams where id = players.team_id)
    )
  )
  with check (true);

drop policy if exists "owner write matches" on public.matches;
create policy "owner write matches"
  on public.matches for all
  using (
    tournament_member_can_write(matches.tournament_id)
  )
  with check (true);

drop policy if exists "owner write match_events" on public.match_events;
create policy "owner write match_events"
  on public.match_events for all
  using (
    tournament_member_can_write(
      (select tournament_id from public.matches where id = match_events.match_id)
    )
  )
  with check (true);

drop policy if exists "owner write audit_log" on public.audit_log;
create policy "owner write audit_log"
  on public.audit_log for all
  using (
    tournament_member_can_write(audit_log.tournament_id)
  )
  with check (true);

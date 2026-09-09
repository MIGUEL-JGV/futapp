-- =============================================================
-- FUTAPP - Esquema de base de datos (Supabase / PostgreSQL)
-- Gestión de Torneos de Fútbol
--
-- Modelo relacional que respalda las interfaces de TypeScript en
-- `src/types/index.ts`.
--
-- Convenciones:
--  * id  -> uuid con default gen_random_uuid()
--  * timestamps con timezone (timestamptz)
--  * RLS habilitado en todas las tablas (RF-01: espectador = solo lectura)
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Roles de la aplicación: 'admin' (organizador) y 'spectator'.
-- Se mapean desde app_metadata de Supabase Auth.
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise notice 'El rol authenticated ya existe en Supabase';
  end if;
end $$;

-- -------------------------------------------------------------
-- Tabla: user_profiles
-- Perfil público de cada usuario (vinculado a auth.users).
-- -------------------------------------------------------------
create table if not exists public.user_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  display_name text,
  role       text not null default 'spectator'
    check (role in ('admin', 'spectator')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Tabla: tournaments (RF-02)
-- name, season, format, status, match_days (días de juego elegidos por el admin)
-- -------------------------------------------------------------
create table if not exists public.tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  season     text not null,
  format     text not null default 'LEAGUE'
    check (format in ('LEAGUE', 'GROUPS', 'KNOCKOUT')),
  status     text not null default 'REGISTRATION'
    check (status in ('REGISTRATION', 'IN_PROGRESS', 'FINISHED')),
  -- Días de la semana en que se juega (0=domingo ... 6=sábado).
  match_days integer[] not null default array[1,2,3,4,5],
  organizer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Tabla: teams (RF-03)
-- -------------------------------------------------------------
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name          text not null,
  logo_url      text,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Tabla: players (RF-03) - dorsal y posición
-- -------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  number     integer not null check (number between 1 and 99),
  position   text not null
    check (position in ('GK', 'DF', 'MF', 'FW')),
  photo_url  text,
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

-- -------------------------------------------------------------
-- Tabla: matches (RF-04 / RNF-04)
-- El marcador NO se persiste: se deriva de match_events (RF-05).
-- null en home/away = descanso (nº impar de equipos).
-- Cuando status = 'FINISHED' la app bloquea la edición (RNF-04).
-- -------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round         integer not null check (round >= 1),
  home_team_id  uuid references public.teams (id) on delete set null,
  away_team_id  uuid references public.teams (id) on delete set null,
  scheduled_at  timestamptz,
  status        text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'IN_PROGRESS', 'FINISHED')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (home_team_id is distinct from away_team_id),
  unique (tournament_id, round, home_team_id, away_team_id)
);

create index if not exists idx_matches_tournament_round
  on public.matches (tournament_id, round);

-- -------------------------------------------------------------
-- Tabla: match_events (RF-05)
-- Goles, amarillas y rojas. El marcador final se obtiene sumando
-- los eventos GOAL por equipo (RF-05).
-- -------------------------------------------------------------
create table if not exists public.match_events (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  team_id    uuid not null references public.teams (id) on delete cascade,
  player_id  uuid references public.players (id) on delete set null,
  type       text not null check (type in ('GOAL', 'YELLOW_CARD', 'RED_CARD')),
  minute     integer not null check (minute >= 0),
  note       text,
  -- Asistente del gol (solo para GOAL; alimenta la tabla de asistencias).
  assist_player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_match_events_match on public.match_events (match_id);
create index if not exists idx_match_events_player on public.match_events (player_id) where player_id is not null;
create index if not exists idx_match_events_assist on public.match_events (assist_player_id) where assist_player_id is not null;

-- --------------------------------------------
-- Vista: player_goals (RF-07) - goleadores
-- --------------------------------------------
create or replace view public.player_goals as
select
  p.id            as player_id,
  p.name          as player_name,
  t.id            as team_id,
  t.name          as team_name,
  count(*)        as goals
from public.match_events me
join public.players p on p.id = me.player_id
join public.teams t  on t.id = p.team_id
where me.type = 'GOAL'
group by p.id, p.name, t.id, t.name;

-- --------------------------------------------
-- Vista: player_assists (RF-07) - asistentes
-- --------------------------------------------
create or replace view public.player_assists as
select
  p.id            as player_id,
  p.name          as player_name,
  t.id            as team_id,
  t.name          as team_name,
  count(*)        as assists
from public.match_events me
join public.players p on p.id = me.assist_player_id
join public.teams t  on t.id = p.team_id
where me.type = 'GOAL'
group by p.id, p.name, t.id, t.name;

-- -------------------------------------------------------------
-- Vista: standings_helper (RF-07) - reporte de tarjetas/suspendidos
-- -------------------------------------------------------------
create or replace view public.player_cards as
select
  p.id            as player_id,
  p.name          as player_name,
  t.id            as team_id,
  t.name          as team_name,
  count(*) filter (where me.type = 'YELLOW_CARD') as yellow_cards,
  count(*) filter (where me.type = 'RED_CARD')    as red_cards
from public.match_events me
join public.players p on p.id = me.player_id
join public.teams t  on t.id = p.team_id
group by p.id, p.name, t.id, t.name;

-- =============================================================
-- Bitácora: audit_log (RF-08)
-- Registra con fecha/hora cada cambio. Las ediciones en partidos ya
-- FINALIZADOS incluyen una justificación obligatoria del autor.
-- =============================================================
create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  actor          text not null,
  action         text not null,
  detail         text not null,
  tournament_id  uuid references public.tournaments (id) on delete cascade,
  match_id       uuid references public.matches (id) on delete set null,
  justification  text
);

create index if not exists idx_audit_log_tournament on public.audit_log (tournament_id, created_at desc);
create index if not exists idx_audit_log_match on public.audit_log (match_id);

-- =============================================================
-- Row Level Security
-- Espectador invitado: solo lectura (RF-01).
-- Administrador: lectura + escritura.
-- =============================================================
alter table public.user_profiles enable row level security;
alter table public.tournaments    enable row level security;
alter table public.teams          enable row level security;
alter table public.players        enable row level security;
alter table public.matches        enable row level security;
alter table public.match_events   enable row level security;
alter table public.audit_log      enable row level security;

-- Lectura pública (todos los visitantes pueden ver los datos).
drop policy if exists "public read tournaments"  on public.tournaments;
create policy "public read tournaments"  on public.tournaments  for select using (true);
drop policy if exists "public read teams"        on public.teams;
create policy "public read teams"        on public.teams        for select using (true);
drop policy if exists "public read players"      on public.players;
create policy "public read players"      on public.players      for select using (true);
drop policy if exists "public read matches"      on public.matches;
create policy "public read matches"      on public.matches      for select using (true);
drop policy if exists "public read match_events" on public.match_events;
create policy "public read match_events" on public.match_events for select using (true);
drop policy if exists "public read audit_log"    on public.audit_log;
create policy "public read audit_log"    on public.audit_log    for select using (true);

-- Escritura restrictiva: solo el organizador (rol 'admin') puede mutar.
drop policy if exists "admin write tournaments" on public.tournaments;
create policy "admin write tournaments"
  on public.tournaments for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);

drop policy if exists "admin write teams" on public.teams;
create policy "admin write teams"
  on public.teams for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);

drop policy if exists "admin write players" on public.players;
create policy "admin write players"
  on public.players for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);

drop policy if exists "admin write matches" on public.matches;
create policy "admin write matches"
  on public.matches for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);

drop policy if exists "admin write audit_log" on public.audit_log;
create policy "admin write audit_log"
  on public.audit_log for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);

drop policy if exists "admin write match_events" on public.match_events;
create policy "admin write match_events"
  on public.match_events for all
  using (
    auth.uid() is not null
    and exists (select 1 from public.user_profiles up
                where up.id = auth.uid() and up.role = 'admin')
  )
  with check (true);
-- =============================================================
-- FUTAPP - set de migraciones aplicadas en orden
-- =============================================================

-- >>> supabase/migrations/0001_multi_tenant.sql <<<

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

-- >>> supabase/migrations/0002_player_photos.sql <<<

-- =============================================================
-- FUTAPP - Migración 0002: fotos de jugadores
-- Agrega la columna photo_url a players (las fotos de equipos
-- ya viven en teams.logo_url).
-- =============================================================

alter table public.players
  add column if not exists photo_url text;
-- >>> supabase/migrations/0003_user_profile_trigger.sql <<<

-- =============================================================
-- FUTAPP - Migración 0003: perfil automático por signup + RLS
--
-- 1) Trigger que crea el user_profiles automáticamente al registrarse
--    (necesario: el INSERT desde el cliente no pasa RLS).
-- 2) Policy de SELECT en user_profiles (faltaba: sin ella, auth.ts no
--    puede leer el rol del usuario autenticado).
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, 'spectator')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Un usuario lee únicamente SU propio perfil.
-- NOTA: no se usa subconsulta sobre user_profiles (causaba "infinite
-- recursion detected in policy", ya que una policy no puede leerse a sí misma).
drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);
-- >>> supabase/migrations/0004_storage.sql <<<

-- =============================================================
-- FUTAPP - Migración 0004: Storage para fotos (escudos y jugadores)
--
-- Crea el bucket público `avatars` y las policies RLS de storage.objects
-- para que los usuarios autenticados (organizadores) suban fotos y
-- cualquiera las pueda ver.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated insert" on storage.objects;
create policy "avatars authenticated insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars authenticated update" on storage.objects;
create policy "avatars authenticated update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated')
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars authenticated delete" on storage.objects;
create policy "avatars authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');
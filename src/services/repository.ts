/**
 * Capa de repositorio (Fase 1 — activa con Supabase).
 *
 * Centraliza el acceso a datos y aísla la fuente (Supabase vs local).
 * Cuando `backendActive` es `false` (no hay proyecto configurado) la app
 * funciona 100% en modo local tal como hoy: el store es la fuente de verdad
 * y estas funciones no hacen nada.
 *
 * Cuando el backend está activo, el store escribe aquí (write-through
 * optimista): la UI se actualiza primero y cada mutación se replica a
 * Supabase mapeando camelCase (dominio) -> snake_case (columnas).
 */

import { isSupabaseConfigured, supabase } from './supabase';
import type {
  AuditLogEntry,
  Match,
  MatchEvent,
  Player,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMember,
  User,
} from '../types';

/** Indica si el backend está activo (Supabase configurado). */
export const backendActive: boolean = isSupabaseConfigured;

/* ------------------------------------------------------------------ */
/* Mapeadores fila Supabase (snake_case) -> dominio (camelCase)        */
/* ------------------------------------------------------------------ */

interface Row {
  id: string;
  [key: string]: unknown;
}

function mapTournament(row: Row): Tournament {
  return {
    id: row.id,
    name: String(row.name ?? ''),
    season: String(row.season ?? ''),
    format: row.format as Tournament['format'],
    status: row.status as Tournament['status'],
    matchDays: Array.isArray(row.match_days)
      ? (row.match_days as number[])
      : [1, 2, 3, 4, 5],
    publicUrl: row.public_url ? String(row.public_url) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapTeam(row: Row): Team {
  return {
    id: row.id,
    tournamentId: String(row.tournament_id),
    name: String(row.name ?? ''),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapPlayer(row: Row): Player {
  return {
    id: row.id,
    teamId: String(row.team_id),
    name: String(row.name ?? ''),
    number: Number(row.number ?? 0),
    position: row.position as Player['position'],
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapMatch(row: Row): Match {
  return {
    id: row.id,
    tournamentId: String(row.tournament_id),
    round: Number(row.round ?? 0),
    homeTeamId: row.home_team_id ? String(row.home_team_id) : null,
    awayTeamId: row.away_team_id ? String(row.away_team_id) : null,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    status: row.status as Match['status'],
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

function mapMatchEvent(row: Row): MatchEvent {
  return {
    id: row.id,
    matchId: String(row.match_id),
    teamId: String(row.team_id),
    playerId: row.player_id ? String(row.player_id) : null,
    type: row.type as MatchEvent['type'],
    minute: Number(row.minute ?? 0),
    note: row.note ? String(row.note) : null,
    assistPlayerId: row.assist_player_id ? String(row.assist_player_id) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapMember(row: Row): TournamentMember {
  return {
    id: row.id,
    tournamentId: String(row.tournament_id),
    userId: String(row.user_id),
    role: row.role as TournamentMember['role'],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapRegistration(row: Row): TeamRegistration {
  return {
    id: row.id,
    tournamentId: String(row.tournament_id),
    teamName: String(row.team_name ?? ''),
    contact: row.contact ? String(row.contact) : null,
    status: row.status as TeamRegistration['status'],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapLog(row: Row): AuditLogEntry {
  return {
    id: row.id,
    at: String(row.created_at ?? new Date().toISOString()),
    actor: String(row.actor ?? ''),
    action: row.action as AuditLogEntry['action'],
    detail: String(row.detail ?? ''),
    tournamentId: row.tournament_id ? String(row.tournament_id) : null,
    matchId: row.match_id ? String(row.match_id) : null,
    justification: row.justification ? String(row.justification) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Utilidades de mapeo dominio -> fila                                 */
/* ------------------------------------------------------------------ */

/** Columnas cuyo nombre no coincide con la clave de dominio. */
const COLUMN_ALIASES: Record<string, string> = {
  createdAt: 'created_at',
  matchDays: 'match_days',
  tournamentId: 'tournament_id',
  teamId: 'team_id',
  playerId: 'player_id',
  matchId: 'match_id',
  logoUrl: 'logo_url',
  photoUrl: 'photo_url',
  homeTeamId: 'home_team_id',
  awayTeamId: 'away_team_id',
  scheduledAt: 'scheduled_at',
  completedAt: 'completed_at',
  assistPlayerId: 'assist_player_id',
  userId: 'user_id',
  teamName: 'team_name',
  publicUrl: 'public_url',
};

/** Convierte una entidad de dominio a fila (drop `undefined`, alias de columna). */
function toRow(input: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    row[COLUMN_ALIASES[key] ?? key] = value;
  }
  return row;
}

/* ------------------------------------------------------------------ */
/* API de datos (Supabase)                                             */
/* ------------------------------------------------------------------ */

/** Loader tipado del dataset completo de un usuario. */
export interface BackendDataset {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  members: TournamentMember[];
  registrations: TeamRegistration[];
  logs: AuditLogEntry[];
}

const EMPTY_DATASET: BackendDataset = {
  tournaments: [],
  teams: [],
  players: [],
  matches: [],
  events: [],
  members: [],
  registrations: [],
  logs: [],
};

async function guard(): Promise<boolean> {
  return Boolean(backendActive && supabase);
}

/**
 * Lee el dataset completo visible por `userId` (torneos donde es miembro
 * o moderador, y todo su contenido: equipos, jugadores, partidos, eventos,
 * miembros, inscripciones y bitácora). Devuelve `null` en modo local.
 */
export async function fetchUserDataset(userId: string): Promise<BackendDataset | null> {
  if (!(await guard())) return null;
  const client = supabase!;

  const { data: memberships } = await client
    .from('tournament_members')
    .select('tournament_id')
    .eq('user_id', userId);
  const tournamentIds = [
    ...new Set((memberships ?? []).map((m) => String(m.tournament_id))),
  ].filter(Boolean);
  if (tournamentIds.length === 0) return { ...EMPTY_DATASET };

  const inTournaments = (column: string) =>
    client.from(column).select('*').in('tournament_id', tournamentIds);

  const [tournamentsRes, teamsRes, matchesRes, membersRes, registrationsRes, logsRes] =
    await Promise.all([
      client.from('tournaments').select('*').in('id', tournamentIds),
      inTournaments('teams'),
      inTournaments('matches'),
      inTournaments('tournament_members'),
      inTournaments('team_registrations'),
      client.from('audit_log').select('*').in('tournament_id', tournamentIds),
    ]);

  const tournaments = (tournamentsRes.data ?? []).map((r) => mapTournament(r as Row));
  const teams = (teamsRes.data ?? []).map((r) => mapTeam(r as Row));
  const matches = (matchesRes.data ?? []).map((r) => mapMatch(r as Row));

  const teamIds = teams.map((t) => t.id);
  const matchIds = matches.map((m) => m.id);

  const [playersRes, eventsRes] =
    teamIds.length && matchIds.length
      ? await Promise.all([
          client.from('players').select('*').in('team_id', teamIds),
          client.from('match_events').select('*').in('match_id', matchIds),
        ])
      : [{ data: [] }, { data: [] }];

  return {
    tournaments,
    teams,
    players: (playersRes.data ?? []).map((r) => mapPlayer(r as Row)),
    matches,
    events: (eventsRes.data ?? []).map((r) => mapMatchEvent(r as Row)),
    members: (membersRes.data ?? []).map((r) => mapMember(r as Row)),
    registrations: (registrationsRes.data ?? []).map((r) => mapRegistration(r as Row)),
    logs: (logsRes.data ?? []).map((r) => mapLog(r as Row)),
  };
}

/* ------------------------------ Torneos ---------------------------- */

export async function createTournamentRow(
  tournament: Tournament,
  organizerId?: string,
): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(tournament as unknown as Record<string, unknown>);
  if (organizerId) row.organizer_id = organizerId;
  const { error } = await supabase!.from('tournaments').insert(row);
  if (error) throw new Error(error.message);
}

export async function updateTournamentRow(
  id: string,
  patch: Partial<Tournament>,
): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(patch as unknown as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase!.from('tournaments').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTournamentRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('tournaments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------ Equipos ---------------------------- */

export async function createTeamRow(team: Team): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('teams').insert(toRow(team as unknown as Record<string, unknown>));
  if (error) throw new Error(error.message);
}

export async function updateTeamRow(id: string, patch: Partial<Team>): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(patch as unknown as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase!.from('teams').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTeamRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('teams').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------ Jugadores -------------------------- */

export async function createPlayerRow(player: Player): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('players').insert(
    toRow(player as unknown as Record<string, unknown>),
  );
  if (error) throw new Error(error.message);
}

export async function updatePlayerRow(id: string, patch: Partial<Player>): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(patch as unknown as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase!.from('players').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePlayerRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('players').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------ Partidos --------------------------- */

export async function insertMatches(matches: Match[]): Promise<void> {
  if (!(await guard()) || matches.length === 0) return;
  const rows = matches.map((m) => toRow(m as unknown as Record<string, unknown>));
  const { error } = await supabase!.from('matches').insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateMatchRow(id: string, patch: Partial<Match>): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(patch as unknown as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase!.from('matches').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteMatchRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('matches').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteMatchesByTournament(tournamentId: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('matches').delete().eq('tournament_id', tournamentId);
  if (error) throw new Error(error.message);
}

/* ------------------------------ Eventos ---------------------------- */

export async function insertMatchEventRow(event: MatchEvent): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('match_events').insert(
    toRow(event as unknown as Record<string, unknown>),
  );
  if (error) throw new Error(error.message);
}

export async function insertMatchEvents(events: MatchEvent[]): Promise<void> {
  if (!(await guard()) || events.length === 0) return;
  const rows = events.map((e) => toRow(e as unknown as Record<string, unknown>));
  const { error } = await supabase!.from('match_events').insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteMatchEventRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('match_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------- Multi-tenant ---------------------------- */

export async function createMemberRow(member: TournamentMember): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('tournament_members').insert(
    toRow(member as unknown as Record<string, unknown>),
  );
  if (error) throw new Error(error.message);
}

export async function deleteMemberRow(id: string): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('tournament_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* --------------------------- Inscripciones ------------------------- */

export async function createRegistrationRow(registration: TeamRegistration): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('team_registrations').insert(
    toRow(registration as unknown as Record<string, unknown>),
  );
  if (error) throw new Error(error.message);
}

export async function updateRegistrationRow(
  id: string,
  patch: Partial<TeamRegistration>,
): Promise<void> {
  if (!(await guard())) return;
  const row = toRow(patch as unknown as Record<string, unknown>);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase!.from('team_registrations').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------ Bitácora --------------------------- */

export async function insertAuditLogRow(entry: AuditLogEntry): Promise<void> {
  if (!(await guard())) return;
  const { error } = await supabase!.from('audit_log').insert(
    toRow(entry as unknown as Record<string, unknown>),
  );
  if (error) throw new Error('audit_log: ' + error.message);
}

/* ------------------------- Vista pública ------------------------ */

/**
 * Lee el dataset completo de UN torneo (para la landing pública `/t/:id`).
 * Devuelve `null` si el torneo no existe. Usa las policies públicas de
 * lectura (funciona sin sesión).
 */
export async function fetchTournamentDatasetById(
  tournamentId: string,
): Promise<BackendDataset | null> {
  if (!(await guard())) return null;
  const client = supabase!;

  const tRes = await client
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!tRes.data) return null;

  const [teamsRes, matchesRes] = await Promise.all([
    client.from('teams').select('*').eq('tournament_id', tournamentId),
    client.from('matches').select('*').eq('tournament_id', tournamentId),
  ]);

  const teams = (teamsRes.data ?? []).map((r) => mapTeam(r as Row));
  const matches = (matchesRes.data ?? []).map((r) => mapMatch(r as Row));
  const teamIds = teams.map((t) => t.id);
  const matchIds = matches.map((m) => m.id);

  const [playersRes, eventsRes, membersRes, registrationsRes, logsRes] =
    teamIds.length || matchIds.length
      ? await Promise.all([
          teamIds.length
            ? client.from('players').select('*').in('team_id', teamIds)
            : Promise.resolve({ data: [] }),
          matchIds.length
            ? client.from('match_events').select('*').in('match_id', matchIds)
            : Promise.resolve({ data: [] }),
          client
            .from('tournament_members')
            .select('*')
            .eq('tournament_id', tournamentId),
          client
            .from('team_registrations')
            .select('*')
            .eq('tournament_id', tournamentId),
          client
            .from('audit_log')
            .select('*')
            .eq('tournament_id', tournamentId),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  return {
    tournaments: [mapTournament(tRes.data as Row)],
    teams,
    players: (playersRes.data ?? []).map((r) => mapPlayer(r as Row)),
    matches,
    events: (eventsRes.data ?? []).map((r) => mapMatchEvent(r as Row)),
    members: (membersRes.data ?? []).map((r) => mapMember(r as Row)),
    registrations: (registrationsRes.data ?? []).map((r) =>
      mapRegistration(r as Row),
    ),
    logs: (logsRes.data ?? []).map((r) => mapLog(r as Row)),
  };
}

/* ------------------------------------------------------------------ */
/* Perfil / utilidades                                                 */
/* ------------------------------------------------------------------ */

/** Lee el perfil del usuario autenticado (o `null` en modo local). */
export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!(await guard())) return null;
  const { data, error } = await supabase!
    .from('user_profiles')
    .select('id, email, display_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email ?? null,
    displayName: data.display_name ?? null,
    role: data.role,
  };
}

/** Mapeadores exportados (auth.ts y utilidades). */
export const mappers = {
  tournament: mapTournament,
  team: mapTeam,
  player: mapPlayer,
  match: mapMatch,
  matchEvent: mapMatchEvent,
  member: mapMember,
  registration: mapRegistration,
  log: mapLog,
};
/**
 * Tipos de dominio de la aplicación: Gestión de Torneos de Fútbol.
 *
 * Todos los modelos que se persisten en Supabase (PostgreSQL) se declaran
 * aquí como interfaces de TypeScript. Son la fuente única de verdad del
 * esquema relacional (ver `supabase/schema.sql`).
 */

/** Roles de usuario soportados (RF-01). */
export type UserRole = 'admin' | 'spectator';

/** Rol de un miembro dentro de un torneo (multi-tenant). */
export type MemberRole = 'owner' | 'moderator';

/**
 * Miembro con permisos de edición de un torneo (multi-tenant).
 * `owner` es el creador; `moderator` es un coeditor invitado.
 */
export interface TournamentMember {
  id: string;
  tournamentId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
}

/** Estado de una solicitud de inscripción de equipo. */
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Solicitud de inscripción de equipo vía enlace público.
 * Al aprobar, el organizador crea el `Team` correspondiente.
 */
export interface TeamRegistration {
  id: string;
  tournamentId: string;
  teamName: string;
  /** Nombre del representante que envía la solicitud. */
  representative?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  /** Alias legacy del contacto, mantenido por compatibilidad. */
  contact?: string | null;
  status: RegistrationStatus;
  createdAt: string;
}

/** Posiciones de un jugador en el campo (RF-03). */
export enum PlayerPosition {
  Portero = 'GK',
  Defensa = 'DF',
  Mediocampista = 'MF',
  Delantero = 'FW',
}

/** Formato de competición del torneo (RF-02). */
export enum TournamentFormat {
  Liga = 'LEAGUE',
  Grupos = 'GROUPS',
  Eliminacion = 'KNOCKOUT',
}

/**
 * Estado de vida de un torneo (RF-02).
 * Solo se permite gestionar resultados mientras el estado no sea `Finished`.
 */
export enum TournamentStatus {
  /** Periodo de inscripción: aún se pueden agregar equipos. */
  Registration = 'REGISTRATION',
  /** El fixture ya fue generado y se están jugando las jornadas. */
  InProgress = 'IN_PROGRESS',
  /** Torneo cerrado, datos de solo lectura. */
  Finished = 'FINISHED',
}

/** Estado de un partido programado (RNF-04). */
export enum MatchStatus {
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  /** Partido finalizado: sus campos quedan bloqueados (RNF-04). */
  Finished = 'FINISHED',
}

/** Tipos de eventos capturables dentro de un partido (RF-05). */
export enum MatchEventType {
  Goal = 'GOAL',
  YellowCard = 'YELLOW_CARD',
  RedCard = 'RED_CARD',
}

/** Usuario autenticado en la aplicación (RF-01). */
export interface User {
  id: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
}

/**
 * Torneo (RF-02).
 * Ej.: "Liga Municipal 2026", temporada "2025/26", formato LIGA, estado REGISTRATION.
 */
export interface Tournament {
  id: string;
  name: string;
  /** Temporada, ej.: "2025/26". */
  season: string;
  format: TournamentFormat;
  status: TournamentStatus;
  /**
   * Días de la semana en que se juega (0=domingo ... 6=sábado).
   * El calendario reparte los partidos en estos días (mínimo uno por día)
   * y cada equipo juega una vez por semana (RF-04).
   */
  matchDays: number[];
  /** Enlace público para seguir / inscribirse en el torneo. */
  publicUrl?: string | null;
  createdAt: string;
}

/**
 * Equipo inscrito en un torneo (RF-03).
 */
export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  /** URL del escudo (opcional). */
  logoUrl?: string | null;
  createdAt: string;
}

/**
 * Jugador perteneciente a un equipo (RF-03).
 * `number` identifica el dorsal, `position` la posición en el campo.
 */
export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: PlayerPosition;
  /** URL de la foto del jugador (ruta local persistida o data URI). */
  photoUrl?: string | null;
  createdAt: string;
}

/**
 * Partido generado por el calendario Round-Robin (RF-04).
 *
 * `homeTeamId`/`awayTeamId` pueden ser `null` cuando el equipo enfrenta un
 * descanso (jornada libre) al existir un número impar de equipos.
 * El marcador NO se almacena: se calcula sumando los eventos (RF-05).
 */
export interface Match {
  id: string;
  tournamentId: string;
  /** Número de jornada (1..n). */
  round: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** Fecha/hora programada del encuentro (opcional). */
  scheduledAt?: string | null;
  status: MatchStatus;
  completedAt?: string | null;
}

/**
 * Evento ocurrido dentro de un partido (RF-05).
 *
 * Reglas:
 * - `Goal`    -> incrementa el marcador del equipo `teamId`. El `playerId`
 *                es el goleador y alimenta la tabla de goleadores (RF-07);
 *                `assistPlayerId` es quien dio la asistencia (opcional) y
 *                alimenta la tabla de asistencias.
 * - `YellowCard` / `RedCard` -> alimenta el reporte de tarjetas/suspendidos (RF-07).
 */
export interface MatchEvent {
  id: string;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  type: MatchEventType;
  /** Minuto (1..90+). */
  minute: number;
  /** Nota opcional, ej.: motivo de la amonestación. */
  note?: string | null;
  /** Asistente del gol (solo para `Goal`). */
  assistPlayerId?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Bitácora de cambios                                                 */
/* ------------------------------------------------------------------ */

/** Acciones registradas en la bitácora (auditoría de cambios). */
export type AuditLogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'DEMO_DATA_LOADED'
  | 'TOURNAMENT_CREATED'
  | 'TOURNAMENT_UPDATED'
  | 'TOURNAMENT_DELETED'
  | 'TEAM_ADDED'
  | 'TEAM_UPDATED'
  | 'TEAM_REMOVED'
  | 'TEAM_REGISTRATION_SUBMITTED'
  | 'TEAM_REGISTRATION_APPROVED'
  | 'TEAM_REGISTRATION_REJECTED'
  | 'PLAYER_ADDED'
  | 'PLAYER_UPDATED'
  | 'PLAYER_REMOVED'
  | 'FIXTURE_GENERATED'
  | 'FIXTURE_RESET'
  | 'MATCH_STARTED'
  | 'MATCH_FINISHED'
  | 'GOAL_RECORDED'
  | 'GOAL_REMOVED'
  | 'CARD_RECORDED'
  | 'CARD_REMOVED'
  | 'MEMBER_INVITED'
  | 'MEMBER_REMOVED';

/**
 * Entrada de la bitácora (auditoría): registra fecha/hora, autor y qué cambió.
 * Si el cambio ocurrió en un partido ya FINALIZADO, `justification` es
 * obligatoria.
 */
export interface AuditLogEntry {
  id: string;
  /** Fecha y hora del cambio (ISO 8601). */
  at: string;
  /** Autor (email/displayName del usuario en sesión). */
  actor: string;
  action: AuditLogAction;
  /** Descripción legible, ej.: "Gol registrado de Juan Pérez". */
  detail: string;
  tournamentId?: string | null;
  matchId?: string | null;
  /** Justificación obligatoria para ediciones posteriores al cierre. */
  justification?: string | null;
}

/* ------------------------------------------------------------------ */
/* Tipos derivados (Fixture, Tabla de posiciones)                     */
/* ------------------------------------------------------------------ */

/**
 * Partido dentro de una jornada del fixture (RF-04).
 * Un lado `null` representa el descanso de esa jornada (equipo sin rival).
 */
export interface FixtureMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/** Jornada del calendario (RF-04). */
export interface FixtureRound {
  round: number;
  matches: FixtureMatch[];
}

/** Calendario completo generado por el algoritmo Round-Robin (RF-04). */
export interface Fixture {
  tournamentId: string;
  /** `true` si el calendario incluye ida y vuelta. */
  doubleRound: boolean;
  rounds: FixtureRound[];
}

/**
 * Fila de la tabla de posiciones (RF-06).
 * El orden final viene dado por PTS > DG > GF.
 */
export interface StandingRow {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
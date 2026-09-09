/**
 * Store global Zustand (Gestor de Estado).
 *
 * Centraliza el estado de la aplicación:
 *  - Sesión y control de roles (RF-01).
 *  - CRUD de torneos, equipos y jugadores (RF-02, RF-03).
 *  - Generación del fixture Round-Robin (RF-04).
 *  - Registro de resultados mediante eventos (RF-05).
 *
 * En producción, cada acción invocará el cliente de Supabase
 * (`src/services/supabase.ts`) y luego `set()` el resultado local; aquí se
 * mantienen las operaciones síncronas para que la app sea funcional también
 * sin backend (modo demo).
 */

import { create } from 'zustand';

import * as repo from '../services/repository';
import { SITE_URL } from '../services/site';
import { newUuid } from '../services/uuid';

import type {
  AuditLogAction,
  AuditLogEntry,
  Fixture,
  Match,
  MatchEvent,
  Player,
  Team,
  TeamRegistration,
  Tournament,
  TournamentMember,
  User,
} from '../types';
import {
  MatchEventType,
  MatchStatus,
  PlayerPosition,
  TournamentFormat,
  TournamentStatus,
} from '../types';
import {
  LIGA_MX_SCORES_6,
  LIGA_MX_STYLE_TEAMS,
  assignRoundKickoffs,
  generateRoundRobinFixture,
  ligaMxSquadNames,
  slotKey,
  sortWeekdays,
  withTournamentId,
} from '../utils/algorithms';

/**
 * Devuelve un ID único. En modo backend (Supabase) devuelve un UUID v4
 * (las tablas usan `uuid primary key`); en modo local, IDs legibles.
 */
function newId(prefix: string): string {
  if (repo.backendActive) return newUuid();
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Registra en consola un error de sincronización con el backend (UI nunca se bloquea). */
function syncError(context: string, err: unknown): void {
  console.warn(`[sync] Error al ${context}:`, err instanceof Error ? err.message : err);
}

/**
 * RNF-04: permite editar eventos de un partido en cualquier estado, PERO si
 * el partido ya está FINALIZADO exige una justificación obligatoria. Lanza
 * error si el partido no existe o si el cambio post-cierre carece de
 * justificación.
 */
function requireJustificationIfFinished(
  state: FutAppState,
  matchId: string,
  operation: string,
  justification: string | null | undefined,
): Match {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error(`El partido ${matchId} no existe.`);
  }
  if (match.status === MatchStatus.Finished && !justification?.trim()) {
    throw new Error(
      `Partido finalizado: ${operation} requiere una justificación obligatoria (RNF-04).`,
    );
  }
  return match;
}

/** Datos mínimos para registrar un resultado (RF-05). */
export interface RecordGoalInput {
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute: number;
  note?: string | null;
  /** Quien dio la asistencia (opcional). */
  assistPlayerId?: string | null;
  /** Justificación obligatoria si el partido ya está finalizado. */
  justification?: string | null;
}

/** Datos mínimos para registrar una amonestación (RF-05). */
export interface RecordCardInput {
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute: number;
  type: Exclude<MatchEventType, 'GOAL'>;
  note?: string | null;
  /** Justificación obligatoria si el partido ya está finalizado. */
  justification?: string | null;
}

export interface FutAppState {
  /* ----------------------------- Sesión (RF-01) ----------------------------- */
  user: User | null;
  signInAsAdmin: (email: string) => void;
  enterAsGuest: () => void;
  signOut: () => void;

  /* ---------------------------- Catálogos (RF-02/03) ------------------------ */
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];

  /** Torneo activo en la interfaz (persistido localmente en sesión). */
  selectedTournamentId: string | null;
  selectTournament: (id: string | null) => void;

  /** Vista pública (deep-link web): fuerza modo solo lectura. */
  isPublicReadonly: boolean;

  /** Mensaje de diagnóstico de auth (falta de policy, errores RLS, etc.). */
  authStatus: string | null;
  setAuthStatus: (message: string | null) => void;
  setPublicReadonly: (value: boolean) => void;

  /* ------------------------- Multi-tenant (Fase 2) ---------------- */
  /** Miembros con permisos de edición por torneo. */
  members: TournamentMember[];

  /** Solicitudes de inscripción de equipos por enlace. */
  registrations: TeamRegistration[];

  /** Usuarios conocidos (catálogo local para invitar moderadores). */
  knownUsers: User[];

  /* ------------------------------ Fixture (RF-04) --------------------------- */
  matches: Match[];
  fixture: Fixture | null;

  /* ------------------------------- Eventos (RF-05) -------------------------- */
  events: MatchEvent[];

  /* ------------------------------- Bitácora --------------------------------- */
  log: AuditLogEntry[];

  /* ------------------------------- Acciones --------------------------------- */
  createTournament: (data: Omit<Tournament, 'id' | 'createdAt'>) => string;
  updateTournament: (id: string, patch: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;

  addTeam: (tournamentId: string, name: string, logoUrl?: string | null) => string;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  removeTeam: (id: string) => void;

  addPlayer: (teamId: string, data: Omit<Player, 'id' | 'teamId' | 'createdAt'>) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  removePlayer: (id: string) => void;

  generateFixture: (tournamentId: string, doubleRound?: boolean) => void;
  resetFixture: (tournamentId: string) => void;

  startMatch: (matchId: string) => void;
  finishMatch: (matchId: string) => void;
  recordGoal: (input: RecordGoalInput) => void;
  recordCard: (input: RecordCardInput) => void;
  removeEvent: (eventId: string, justification?: string | null) => void;

  /** Registra una entrada de auditoría (bitácora) con fecha/hora y autor. */
  appendLog: (entry: {
    action: AuditLogAction;
    detail: string;
    tournamentId?: string | null;
    matchId?: string | null;
    justification?: string | null;
  }) => void;

  /* ------------------- Multi-tenant / inscripciones ---------------- */
  /** Al crear el primer torneo, el usuario pasa a owner de él. */
  ensureOwnership: (tournamentId: string, userId: string) => string;
  invitesMember: (tournamentId: string, userId: string, role: 'owner' | 'moderator') => string;
  removeMember: (memberId: string) => void;

  /** Registra un usuario en el catálogo local (para invitar moderadores). */
  registerKnownUser: (email: string, displayName?: string) => string;

  /**
   * Reemplaza el catálogo de membresías (usado al sincronizar desde Supabase:
   * restauración de sesión / login real del moderador).
   */
  setMembers: (members: TournamentMember[]) => void;

  /**
   * Carga desde Supabase el dataset completo del usuario autenticado
   * (torneos donde es miembro/modera + todo su contenido). No-op en modo local.
   */
  loadBackendData: (userId: string) => Promise<void>;

  /**
   * Aplica al store el dataset de un torneo para la vista pública (deep-link
   * `/t/:id`), o limpia las colecciones si el torneo no existe.
   */
  applyPublicDataset: (data: repo.BackendDataset | null) => void;

  /** Restaura una snapshot previa al salir de la vista pública. */
  restorePublicSnapshot: (snapshot: Partial<FutAppState>) => void;

  /** Crea una solicitud de inscripción (inscripción por enlace). */
  submitRegistration: (tournamentId: string, teamName: string, contact?: string | null) => string;
  setRegistrationStatus: (registrationId: string, status: 'APPROVED' | 'REJECTED') => void;

  /** Poblado de datos demostrativos para la primera ejecución. */
  loadDemoData: () => void;

  /** Crea un torneo FILTICIO de 18 equipos inspirado en la Liga MX. */
  loadLigaMxDemo: () => void;
}

const initialState = {
  user: null,
  tournaments: [],
  teams: [],
  players: [],
  selectedTournamentId: null,
  matches: [],
  fixture: null,
  events: [],
  log: [],
  members: [],
  registrations: [],
  knownUsers: [],
  isPublicReadonly: false,
  authStatus: null,
};

export const useFutAppStore = create<FutAppState>((set, get) => {
  return {
    ...initialState,

    /* ------------------------------- Sesión --------------------------------- */
    signInAsAdmin: (email) => {
      set({
        user: {
          id: newId('usr'),
          email,
          role: 'admin',
          displayName: email.split('@')[0] ?? email,
        },
      });
      get().appendLog({
        action: 'LOGIN',
        detail: `Inicio de sesión del administrador ${email}`,
      });
    },

    enterAsGuest: () => {
      set({
        user: {
          id: newId('usr'),
          email: null,
          role: 'spectator',
          displayName: 'Invitado',
        },
      });
      get().appendLog({
        action: 'LOGIN',
        detail: 'Acceso como invitado (modo lectura)',
      });
    },

    signOut: () => {
      get().appendLog({
        action: 'LOGOUT',
        detail: 'Cierre de sesión',
      });
      set({
        user: initialState.user,
        selectedTournamentId: null,
        authStatus: null,
      });
    },

    selectTournament: (id) => set({ selectedTournamentId: id }),

    setPublicReadonly: (value) => {
      if (value) {
        // En vista pública se selecciona el torneo del deep-link y se
        // fuerza solo lectura, sin tocar el usuario de la sesión.
        set({ isPublicReadonly: true });
      } else {
        set({ isPublicReadonly: false });
      }
    },

    setAuthStatus: (message) => set({ authStatus: message }),

    appendLog: ({ action, detail, tournamentId, matchId, justification }) => {
      const entry: AuditLogEntry = {
        id: newId('log'),
        at: new Date().toISOString(),
        actor:
          get().user?.displayName ??
          get().user?.email ??
          'Sistema',
        action,
        detail,
        tournamentId: tournamentId ?? null,
        matchId: matchId ?? null,
        justification: justification ?? null,
      };
      set((state) => ({
        log: [entry, ...state.log].slice(0, 500),
      }));
      // En modo backend la bitácora también se replica a `audit_log`
      // (inserción best-effort: un fallo nunca debe romper la operación).
      if (repo.backendActive && get().user) {
        void repo.insertAuditLogRow(entry).catch((err) =>
          syncError('registrar en bitácora', err),
        );
      }
    },

    /* ------------------------------ Torneos --------------------------------- */
    createTournament: (data) => {
      const id = newId('trn');
      const tournament: Tournament = {
        ...data,
        id,
        publicUrl: `${SITE_URL}/t/${id}`,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ tournaments: [...state.tournaments, tournament] }));
      // Multi-tenant: el usuario autenticado pasa a ser OWNER del torneo.
      const currentUser = get().user;
      if (currentUser) {
        get().ensureOwnership(id, currentUser.id);
      }
      if (repo.backendActive && currentUser) {
        void repo
          .createTournamentRow(tournament, currentUser.id)
          .catch((err) => syncError('crear torneo', err));
      }
      get().appendLog({
        action: 'TOURNAMENT_CREATED',
        tournamentId: id,
        detail: `Torneo "${tournament.name}" creado (temporada ${tournament.season})`,
      });
      return id;
    },

    updateTournament: (id, patch) => {
      const previous = get().tournaments.find((t) => t.id === id);
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      }));
      if (previous) {
        get().appendLog({
          action: 'TOURNAMENT_UPDATED',
          tournamentId: id,
          detail: `Torneo "${previous.name}" actualizado`,
        });
      }
      void repo
        .updateTournamentRow(id, patch)
        .catch((err) => syncError('actualizar torneo', err));
    },

    deleteTournament: (id) => {
      const previous = get().tournaments.find((t) => t.id === id);
      set((state) => {
        const teamIds = new Set(
          state.teams.filter((t) => t.tournamentId === id).map((t) => t.id),
        );
        return {
          tournaments: state.tournaments.filter((t) => t.id !== id),
          teams: state.teams.filter((t) => t.tournamentId !== id),
          players: state.players.filter((p) => !teamIds.has(p.teamId)),
          matches: state.matches.filter((m) => m.tournamentId !== id),
          selectedTournamentId:
            state.selectedTournamentId === id ? null : state.selectedTournamentId,
          events: state.events.filter(
            (e) => !state.matches.find((m) => m.id === e.matchId),
          ),
        };
      });
      if (previous) {
        get().appendLog({
          action: 'TOURNAMENT_DELETED',
          tournamentId: id,
          detail: `Torneo "${previous.name}" eliminado`,
        });
      }
      void repo
        .deleteTournamentRow(id)
        .catch((err) => syncError('eliminar torneo', err));
    },

    /* ----------------- Multi-tenant / inscripciones ------------------ */
    // Cuando no hay backend configurado, las membresías se guardan en
    // memoria + AsyncStorage (persistencia local) para poder probar el
    // flujo sin proyecto Supabase.
    ensureOwnership: (tournamentId, userId) => {
      const exists = get().members.some(
        (m) => m.tournamentId === tournamentId && m.userId === userId,
      );
      if (exists) return get().members.find(
        (m) => m.tournamentId === tournamentId && m.userId === userId,
      )!.id;

      const id = newId('mbm');
      const member: TournamentMember = {
        id,
        tournamentId,
        userId,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ members: [...state.members, member] }));
      void repo
        .createMemberRow(member)
        .catch((err) => syncError('registrar membresía owner', err));
      return id;
    },

    invitesMember: (tournamentId, userId, role) => {
      const exists = get().members.some(
        (m) => m.tournamentId === tournamentId && m.userId === userId,
      );
      if (exists) {
        throw new Error('El usuario ya es miembro de este torneo.');
      }
      const id = newId('mbm');
      const member: TournamentMember = {
        id,
        tournamentId,
        userId,
        role,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ members: [...state.members, member] }));
      void repo
        .createMemberRow(member)
        .catch((err) => syncError('invitar moderador', err));
      get().appendLog({
        action: 'MEMBER_INVITED',
        tournamentId,
        detail: `Se agregó un ${role === 'owner' ? 'propietario' : 'moderador'} al torneo (${userId})`,
      });
      return id;
    },

    setMembers: (members) => set({ members }),

    loadBackendData: async (userId) => {
      if (!repo.backendActive) return;
      try {
        const data = await repo.fetchUserDataset(userId);
        if (!data) return;
        set((state) => ({
          tournaments: data.tournaments,
          teams: data.teams,
          players: data.players,
          matches: data.matches,
          events: data.events,
          members: data.members,
          registrations: data.registrations,
          log: data.logs,
          user: state.user,
          selectedTournamentId: state.selectedTournamentId,
        }));
      } catch (err) {
        syncError('cargar datos desde Supabase', err);
      }
    },

    applyPublicDataset: (data) =>
      set((state) => ({
        tournaments: data?.tournaments ?? [],
        teams: data?.teams ?? [],
        players: data?.players ?? [],
        matches: data?.matches ?? [],
        events: data?.events ?? [],
        members: data?.members ?? [],
        registrations: data?.registrations ?? [],
        log: data?.logs ?? [],
        selectedTournamentId: data?.tournaments[0]?.id ?? state.selectedTournamentId,
        user: state.user,
      })),

    restorePublicSnapshot: (snapshot) =>
      set((state) => ({
        ...snapshot,
        user: state.user,
        isPublicReadonly: false,
      })),

    registerKnownUser: (email, displayName) => {
      const normalized = email.trim().toLowerCase();
      const existing = get().knownUsers.find((u) => u.email === normalized);
      if (existing) return existing.id;
      const id = newId('usr');
      const user: User = {
        id,
        email: normalized,
        role: 'spectator',
        displayName: displayName ?? normalized.split('@')[0] ?? normalized,
      };
      set((state) => ({ knownUsers: [...state.knownUsers, user] }));
      return id;
    },

    removeMember: (memberId) => {
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
      }));
      void repo
        .deleteMemberRow(memberId)
        .catch((err) => syncError('quitar moderador', err));
    },

    submitRegistration: (tournamentId, teamName, contact = null) => {
      const id = newId('reg');
      const registration: TeamRegistration = {
        id,
        tournamentId,
        teamName,
        contact,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ registrations: [...state.registrations, registration] }));
      void repo
        .createRegistrationRow(registration)
        .catch((err) => syncError('enviar solicitud de inscripción', err));
      get().appendLog({
        action: 'TEAM_REGISTRATION_SUBMITTED',
        tournamentId,
        detail: `Solicitud de inscripción: "${teamName}"${
          contact ? ` (${contact})` : ''
        }`,
      });
      return id;
    },

    setRegistrationStatus: (registrationId, status) => {
      const registration = get().registrations.find((r) => r.id === registrationId);
      set((state) => ({
        registrations: state.registrations.map((r) =>
          r.id === registrationId ? { ...r, status } : r,
        ),
      }));
      void repo
        .updateRegistrationRow(registrationId, { status })
        .catch((err) => syncError('actualizar estado de inscripción', err));
      if (!registration) return;

      if (status === 'APPROVED') {
        // La inscripción aprobada crea el equipo en el torneo.
        get().addTeam(registration.tournamentId, registration.teamName);
        get().appendLog({
          action: 'TEAM_REGISTRATION_APPROVED',
          tournamentId: registration.tournamentId,
          detail: `Inscripción de "${registration.teamName}" aprobada`,
        });
      } else {
        get().appendLog({
          action: 'TEAM_REGISTRATION_REJECTED',
          tournamentId: registration.tournamentId,
          detail: `Inscripción de "${registration.teamName}" rechazada`,
        });
      }
    },

    /* ------------------------------- Equipos -------------------------------- */
    addTeam: (tournamentId, name, logoUrl = null) => {
      const id = newId('team');
      const team: Team = {
        id,
        tournamentId,
        name,
        logoUrl,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ teams: [...state.teams, team] }));
      void repo
        .createTeamRow(team)
        .catch((err) => syncError('agregar equipo', err));
      get().appendLog({
        action: 'TEAM_ADDED',
        tournamentId,
        detail: `Equipo "${name}" agregado al torneo`,
      });
      return id;
    },

    updateTeam: (id, patch) => {
      const previous = get().teams.find((t) => t.id === id);
      set((state) => ({ teams: state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      void repo
        .updateTeamRow(id, patch)
        .catch((err) => syncError('actualizar equipo', err));
      if (previous) {
        get().appendLog({
          action: 'TEAM_UPDATED',
          tournamentId: previous.tournamentId,
          detail: `Equipo "${previous.name}" actualizado`,
        });
      }
    },

    removeTeam: (id) => {
      const previous = get().teams.find((t) => t.id === id);
      set((state) => ({
        teams: state.teams.filter((t) => t.id !== id),
        players: state.players.filter((p) => p.teamId !== id),
      }));
      void repo
        .deleteTeamRow(id)
        .catch((err) => syncError('eliminar equipo', err));
      if (previous) {
        get().appendLog({
          action: 'TEAM_REMOVED',
          tournamentId: previous.tournamentId,
          detail: `Equipo "${previous.name}" eliminado del torneo`,
        });
      }
    },

    /* ------------------------------- Jugadores ------------------------------ */
    addPlayer: (teamId, data) => {
      const id = newId('ply');
      const player: Player = {
        ...data,
        id,
        teamId,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ players: [...state.players, player] }));
      void repo
        .createPlayerRow(player)
        .catch((err) => syncError('agregar jugador', err));
      const team = get().teams.find((t) => t.id === teamId);
      get().appendLog({
        action: 'PLAYER_ADDED',
        tournamentId: team?.tournamentId ?? null,
        detail: `Jugador "${player.name}" agregado a "${team?.name ?? 'equipo'}"`,
      });
      return id;
    },

    removePlayer: (id) => {
      const previous = get().players.find((p) => p.id === id);
      set((state) => ({ players: state.players.filter((p) => p.id !== id) }));
      void repo
        .deletePlayerRow(id)
        .catch((err) => syncError('eliminar jugador', err));
      if (previous) {
        const team = get().teams.find((t) => t.id === previous.teamId);
        get().appendLog({
          action: 'PLAYER_REMOVED',
          tournamentId: team?.tournamentId ?? null,
          detail: `Jugador "${previous.name}" eliminado de "${team?.name ?? 'su equipo'}"`,
        });
      }
    },

    updatePlayer: (id, patch) => {
      const previous = get().players.find((p) => p.id === id);
      set((state) => ({
        players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      void repo
        .updatePlayerRow(id, patch)
        .catch((err) => syncError('actualizar jugador', err));
      if (previous) {
        const team = get().teams.find((t) => t.id === previous.teamId);
        get().appendLog({
          action: 'PLAYER_UPDATED',
          tournamentId: team?.tournamentId ?? null,
          detail: `Jugador "${previous.name}" actualizado`,
        });
      }
    },

    /* ------------------------------- Fixture -------------------------------- */
    generateFixture: (tournamentId, doubleRound = false) => {
      const { teams } = get();
      const teamIds = teams
        .filter((t) => t.tournamentId === tournamentId)
        .map((t) => t.id);

      if (teamIds.length < 2) {
        throw new Error('Se necesitan al menos 2 equipos para generar el calendario.');
      }

      const generated = withTournamentId(
        generateRoundRobinFixture(teamIds, { doubleRound }),
        tournamentId,
      );

      const matches: Match[] = generated.rounds.flatMap((round) =>
        round.matches.map((m) => ({
          id: newId('mtc'),
          tournamentId,
          round: round.round,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          scheduledAt: null,
          status: MatchStatus.Scheduled,
          completedAt: null,
        })),
      );

      // RF-04: programa cada partido en una fecha/hora real (sin repetir
      // horarios) repartidos en los DÍAS que eligió el usuario al crear el
      // torneo (mínimo un partido por día). Base lunes 31 de agosto de 2026.
      // Una jornada por semana: cada equipo juega una sola vez por semana
      // (los descansos no se programan).
      const tournament =
        get().tournaments.find((t) => t.id === tournamentId) ?? null;
      const matchDays =
        tournament && tournament.matchDays.length > 0
          ? tournament.matchDays
          : [1, 2, 3, 4, 5];
      const occupied = new Set<string>();
      for (const existing of get().matches) {
        const scheduled = existing.scheduledAt;
        if (scheduled) {
          occupied.add(slotKey(new Date(scheduled)));
        }
      }

      const byRound = new Map<number, string[]>();
      for (const match of matches) {
        if (match.homeTeamId === null || match.awayTeamId === null) continue;
        const list = byRound.get(match.round) ?? [];
        list.push(match.id);
        byRound.set(match.round, list);
      }
      const rounds = [...byRound.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([round, matchIds]) => ({ round, matchIds }));

      const kickoffs = assignRoundKickoffs(rounds, {
        startDateIso: '2026-08-31',
        allowedWeekdays: sortWeekdays(matchDays),
        startHour: 17,
        lastKickoffHour: 22,
        occupied,
      });
      for (const match of matches) {
        match.scheduledAt = kickoffs.get(match.id) ?? null;
      }

      set((state) => ({
        fixture: generated,
        matches: [...state.matches, ...matches],
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, status: TournamentStatus.InProgress } : t,
        ),
      }));
      void repo
        .insertMatches(matches)
        .catch((err) => syncError('publicar calendario', err));
      void repo
        .updateTournamentRow(tournamentId, { status: TournamentStatus.InProgress })
        .catch((err) => syncError('actualizar estado del torneo', err));
      const tournamentName = get().tournaments.find((t) => t.id === tournamentId)?.name;
      get().appendLog({
        action: 'FIXTURE_GENERATED',
        tournamentId,
        detail: `Calendario generado para "${tournamentName ?? 'el torneo'}" (${matches.length} partidos, ${rounds.length} jornadas)`,
      });
    },

    resetFixture: (tournamentId) => {
      const tournamentName = get().tournaments.find((t) => t.id === tournamentId)?.name;
      set((state) => ({
        matches: state.matches.filter((m) => m.tournamentId !== tournamentId),
        events: state.events.filter((e) =>
          state.matches.some((m) => m.id === e.matchId && m.tournamentId === tournamentId),
        ),
        fixture: state.fixture?.tournamentId === tournamentId ? null : state.fixture,
      }));
      void repo
        .deleteMatchesByTournament(tournamentId)
        .catch((err) => syncError('reiniciar calendario', err));
      get().appendLog({
        action: 'FIXTURE_RESET',
        tournamentId,
        detail: `Calendario de "${tournamentName ?? 'el torneo'}" reiniciado`,
      });
    },

    /* ------------------------- Resultados / partidos ------------------------ */
    startMatch: (matchId) => {
      if (
        get().matches.find((m) => m.id === matchId)?.status === MatchStatus.Finished
      ) {
        throw new Error('Partido finalizado: no se puede reiniciar.');
      }
      const match = get().matches.find((m) => m.id === matchId);
      set((state) => ({
        matches: state.matches.map((m) =>
          m.id === matchId ? { ...m, status: MatchStatus.InProgress } : m,
        ),
      }));
      void repo
        .updateMatchRow(matchId, { status: MatchStatus.InProgress })
        .catch((err) => syncError('iniciar partido', err));
      if (match) {
        get().appendLog({
          action: 'MATCH_STARTED',
          tournamentId: match.tournamentId,
          matchId,
          detail: `Partido iniciado (Jornada ${match.round})`,
        });
      }
    },

    finishMatch: (matchId) => {
      const match = get().matches.find((m) => m.id === matchId);
      set((state) => ({
        matches: state.matches.map((m) =>
          m.id === matchId
            ? { ...m, status: MatchStatus.Finished, completedAt: new Date().toISOString() }
            : m,
        ),
      }));
      void repo
        .updateMatchRow(matchId, {
          status: MatchStatus.Finished,
          completedAt: new Date().toISOString(),
        })
        .catch((err) => syncError('finalizar partido', err));
      if (match) {
        get().appendLog({
          action: 'MATCH_FINISHED',
          tournamentId: match.tournamentId,
          matchId,
          detail: `Partido finalizado (Jornada ${match.round})`,
        });
      }
    },

    recordGoal: ({ matchId, teamId, playerId, minute, note, assistPlayerId, justification }) => {
      // RNF-04: si el partido está FINALIZADO, exige justificación obligatoria.
      requireJustificationIfFinished(get(), matchId, 'registrar un gol', justification);

      const event: MatchEvent = {
        id: newId('evt'),
        matchId,
        teamId,
        playerId,
        type: MatchEventType.Goal,
        minute,
        note,
        assistPlayerId: assistPlayerId ?? null,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ events: [...state.events, event] }));
      void repo
        .insertMatchEventRow(event)
        .catch((err) => syncError('registrar gol', err));
      const match = get().matches.find((m) => m.id === matchId);
      const player = get().players.find((p) => p.id === event.playerId);
      const team = get().teams.find((t) => t.id === teamId);
      get().appendLog({
        action: 'GOAL_RECORDED',
        tournamentId: match?.tournamentId ?? null,
        matchId,
        justification,
        detail: `Gol registrado de ${player?.name ?? 'jugador'} (${team?.name ?? 'equipo'}) al ${minute}'${
          event.assistPlayerId
            ? `, asistencia de ${get().players.find((p) => p.id === event.assistPlayerId)?.name ?? 'jugador'}`
            : ''
        }`,
      });
    },

    recordCard: ({ matchId, teamId, playerId, minute, type, note, justification }) => {
      // RNF-04: si el partido está FINALIZADO, exige justificación obligatoria.
      requireJustificationIfFinished(get(), matchId, 'registrar amonestaciones', justification);

      const event: MatchEvent = {
        id: newId('evt'),
        matchId,
        teamId,
        playerId,
        type,
        minute,
        note,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ events: [...state.events, event] }));
      void repo
        .insertMatchEventRow(event)
        .catch((err) => syncError('registrar tarjeta', err));
      const match = get().matches.find((m) => m.id === matchId);
      const player = get().players.find((p) => p.id === event.playerId);
      const team = get().teams.find((t) => t.id === teamId);
      get().appendLog({
        action: 'CARD_RECORDED',
        tournamentId: match?.tournamentId ?? null,
        matchId,
        justification,
        detail: `${type === MatchEventType.YellowCard ? 'Tarjeta amarilla' : 'Tarjeta roja'} para ${player?.name ?? 'jugador'} (${team?.name ?? 'equipo'}) al ${minute}'`,
      });
    },

    removeEvent: (eventId, justification) => {
      const event = get().events.find((e) => e.id === eventId);
      if (!event) return;
      // RNF-04: si el partido está FINALIZADO, exige justificación obligatoria.
      requireJustificationIfFinished(get(), event.matchId, 'quitar un evento', justification);

      set((state) => ({ events: state.events.filter((e) => e.id !== eventId) }));
      void repo
        .deleteMatchEventRow(eventId)
        .catch((err) => syncError('quitar evento', err));
      const match = get().matches.find((m) => m.id === event.matchId);
      const player = get().players.find((p) => p.id === event.playerId);
      get().appendLog({
        action: event.type === MatchEventType.Goal ? 'GOAL_REMOVED' : 'CARD_REMOVED',
        tournamentId: match?.tournamentId ?? null,
        matchId: event.matchId,
        justification,
        detail: event.type === MatchEventType.Goal
          ? `Gol retirado de ${player?.name ?? 'jugador'} (min ${event.minute}')`
          : `${event.type === MatchEventType.YellowCard ? 'Tarjeta amarilla' : 'Tarjeta roja'} retirada a ${player?.name ?? 'jugador'} (min ${event.minute}')`,
      });
    },

    /* ------------------------------ Datos demo ------------------------------ */
    loadDemoData: () => {
      // En modo backend no se siembran datos demo en el dispositivo: el
      // contenido real viene de Supabase (datos propios del usuario).
      if (repo.backendActive) return;
      const state = get();
      if (state.tournaments.length > 0) return;

      const tournamentId = state.createTournament({
        name: 'Copa Barrial 2026',
        season: '2026',
        format: TournamentFormat.Liga,
        status: TournamentStatus.InProgress,
        matchDays: [6], // solo sábados
      });

      const teamNames = [
        'Real Pueblo',
        'Atlético Centro',
        'Los Pumas del Sur',
        'Dep. Norte FC',
        'Campeones FC',
        'Estrella Roja',
      ];

      const playerNames: string[][] = [
        ['Juan Pérez', 'Luis Gómez', 'Carlos Ruiz', 'Pedro Soto'],
        ['Martín Díaz', 'Sergio Vega', 'Tomás Ríos', 'Andrés Lima'],
        ['Raúl Costa', 'Diego Blanco', 'Mauricio Janes', 'Fabián Mora'],
        ['Gustavo León', 'Óscar Paz', 'Héctor Cruz', 'Iván Solís'],
        ['Ramiro Gil', 'Emilio Serrano', 'Aldo Castro', 'Bruno Patiño'],
        ['Renzo Ávila', 'Pablo Quiroga', 'Julio Mesa', 'León Marino'],
      ];

      // RF-03: plantilla de jugadores por equipo.
      for (let i = 0; i < teamNames.length; i++) {
        const teamId = state.addTeam(tournamentId, teamNames[i]);
        for (let j = 0; j < playerNames[i].length; j++) {
          state.addPlayer(teamId, {
            name: playerNames[i][j],
            number: 1 + j,
            position:
              j === 0
                ? PlayerPosition.Portero
                : j === 1
                  ? PlayerPosition.Defensa
                  : j === 2
                    ? PlayerPosition.Mediocampista
                    : PlayerPosition.Delantero,
          });
        }
      }

      state.generateFixture(tournamentId, true);

      // RF-02: el fixture/posiciones/estadísticas SOLO se muestran cuando el
      // usuario selecciona explícitamente un torneo (se omite autoselección).

      // RF-05: simula resultados de las primeras jornadas; los goles se
      // asignan a jugadores reales para alimentar la estadística (RF-07).
      const matches = get().matches;
      const players = get().players;
      const byTeam = new Map<string, string[]>();
      for (const p of players) {
        const list = byTeam.get(p.teamId) ?? [];
        list.push(p.id);
        byTeam.set(p.teamId, list);
      }

      let finished = 0;
      const finishedIds: string[] = [];
      for (const match of matches) {
        if (match.round > 3) break;
        const events: MatchEvent[] = [];
        if (match.homeTeamId && match.awayTeamId) {
          const minutePool = [9, 23, 37, 45, 41, 58, 69, 76, 82, 88];
          const scored = (teamId: string, count: number) => {
            const roster = byTeam.get(teamId) ?? [];
            for (let g = 0; g < count; g++) {
              events.push({
                id: newId('demo'),
                matchId: match.id,
                teamId,
                playerId: roster[g % roster.length] ?? null,
                type: MatchEventType.Goal,
                minute: minutePool[(finished * 2 + g) % minutePool.length],
                // Algunos goles con asistencia para alimentar RF-07.
                assistPlayerId:
                  g % 2 === 1 ? (roster[(g + 1) % roster.length] ?? null) : null,
                createdAt: new Date().toISOString(),
              });
            }
          };
          scored(match.homeTeamId, finished % 3);
          scored(match.awayTeamId, (finished * 2) % 3);

          // Una amarilla y ocasionalmente una roja para el reporte de RF-07.
          const homeRoster = byTeam.get(match.homeTeamId) ?? [];
          events.push({
            id: newId('demo'),
            matchId: match.id,
            teamId: match.homeTeamId,
            playerId: homeRoster[finished % homeRoster.length] ?? null,
            type: MatchEventType.YellowCard,
            minute: 40 + finished,
            createdAt: new Date().toISOString(),
          });
          if (finished % 4 === 3) {
            const awayRoster = byTeam.get(match.awayTeamId) ?? [];
            events.push({
              id: newId('demo'),
              matchId: match.id,
              teamId: match.awayTeamId,
              playerId: awayRoster[1] ?? null,
              type: MatchEventType.RedCard,
              minute: 80,
              createdAt: new Date().toISOString(),
            });
          }

          for (const e of events) {
            set((s) => ({ events: [...s.events, e] }));
          }
          finishedIds.push(match.id);
          finished += 1;
        }
      }

      if (finishedIds.length > 0) {
        const completedAt = new Date().toISOString();
        const ids = new Set(finishedIds);
        set((s) => ({
          matches: s.matches.map((m) =>
            ids.has(m.id)
              ? { ...m, status: MatchStatus.Finished, completedAt }
              : m,
          ),
        }));
      }
      get().appendLog({
        action: 'DEMO_DATA_LOADED',
        tournamentId,
        detail: 'Datos demo de Copa Barrial 2026 cargados (resultados de las primeras jornadas)',
      });
    },

    loadLigaMxDemo: () => {
      // En modo backend solo el organizador (admin) puede sembrar el demo:
      // los espectadores entran a la vista pública en lectura y no deben
      // generar copias del torneo en la nube.
      if (repo.backendActive && get().user?.role !== 'admin') return;
      const state = get();
      const TOURNAMENT_NAME = 'Súper Liga México 2026';
      const alreadyLoaded = state.tournaments.some(
        (t) => t.name === TOURNAMENT_NAME,
      );
      if (alreadyLoaded) return;

      const tournamentId = state.createTournament({
        name: TOURNAMENT_NAME,
        season: 'Apertura 2026',
        format: TournamentFormat.Liga,
        status: TournamentStatus.InProgress,
        matchDays: [1, 2, 3, 4, 5], // lunes a viernes
      });

      // RF-03: 18 clubes con plantilla de 11 (dorsales 1-11; 1 portero,
      // 4 defensas, 4 mediocampistas, 2 delanteros).
      const positions: PlayerPosition[] = [
        PlayerPosition.Portero,
        PlayerPosition.Defensa,
        PlayerPosition.Defensa,
        PlayerPosition.Defensa,
        PlayerPosition.Defensa,
        PlayerPosition.Mediocampista,
        PlayerPosition.Mediocampista,
        PlayerPosition.Mediocampista,
        PlayerPosition.Mediocampista,
        PlayerPosition.Delantero,
        PlayerPosition.Delantero,
      ];

      for (let i = 0; i < LIGA_MX_STYLE_TEAMS.length; i++) {
        const teamId = state.addTeam(tournamentId, LIGA_MX_STYLE_TEAMS[i].name);
        const squad = ligaMxSquadNames(i);
        for (let j = 0; j < squad.length; j++) {
          state.addPlayer(teamId, {
            name: squad[j],
            number: j + 1,
            position: positions[j],
          });
        }
      }

      state.generateFixture(tournamentId, false);

      // RF-02: fixture/posiciones/estadísticas SOLO se muestran cuando el
      // usuario selecciona explícitamente un torneo (se omite autoselección).

      // Usa los 54 marcadores PRECALCULADOS (jornadas 1-6) en lugar de correr
      // el solver en el dispositivo: el login no debe bloquearse (~1,5 s).
      const teams = get().teams;
      const teamIdByIndex = teams
        .filter((t) => t.tournamentId === tournamentId)
        .map((t) => t.id);
      const slotById = new Map(teamIdByIndex.map((id, i) => [id, i]));
      const scoreOf = (match: {
        round: number;
        homeTeamId: string | null;
        awayTeamId: string | null;
      }): [number, number] | undefined => {
        if (match.homeTeamId === null || match.awayTeamId === null) {
          return undefined;
        }
        return LIGA_MX_SCORES_6[
          `${match.round}:${slotById.get(match.homeTeamId)}:${slotById.get(match.awayTeamId)}`
        ];
      };

      // RF-05: vuelca los marcadores a eventos reales (goles con jugador y
      // minuto, y algunas amonestaciones) para alimentar RF-07.
      const players = get().players;
      const byTeam = new Map<string, string[]>();
      for (const p of players) {
        const list = byTeam.get(p.teamId) ?? [];
        list.push(p.id);
        byTeam.set(p.teamId, list);
      }

      const minutePool = [9, 23, 37, 45, 41, 58, 69, 76, 82, 88];
      let finished = 0;
        const allEvents: MatchEvent[] = [];
        const finishedIds: string[] = [];
        for (const match of get().matches) {
          if (match.tournamentId !== tournamentId) continue;
          if (match.round > 6) break;
          if (!match.homeTeamId || !match.awayTeamId) continue;

        const planned = scoreOf(match);
        if (!planned) continue;

        const scored = (teamId: string, count: number) => {
          const roster = byTeam.get(teamId) ?? [];
          for (let g = 0; g < count; g++) {
            allEvents.push({
              id: newId('demo'),
              matchId: match.id,
              teamId,
              playerId: roster[g % roster.length] ?? null,
              type: MatchEventType.Goal,
              minute: minutePool[(finished * 2 + g) % minutePool.length],
              // Algunos goles con asistencia para alimentar RF-07.
              assistPlayerId:
                g % 2 === 1 ? (roster[(g + 1) % roster.length] ?? null) : null,
              createdAt: new Date().toISOString(),
            });
          }
        };

        scored(match.homeTeamId, planned[0]);
        scored(match.awayTeamId, planned[1]);

        if (finished % 3 !== 2) {
          const homeRoster = byTeam.get(match.homeTeamId) ?? [];
          allEvents.push({
            id: newId('demo'),
            matchId: match.id,
            teamId: match.homeTeamId,
            playerId: homeRoster[finished % homeRoster.length] ?? null,
            type: MatchEventType.YellowCard,
            minute: 40 + (finished % 30),
            createdAt: new Date().toISOString(),
          });
        }
        if (finished % 6 === 5) {
          const awayRoster = byTeam.get(match.awayTeamId) ?? [];
          allEvents.push({
            id: newId('demo'),
            matchId: match.id,
            teamId: match.awayTeamId,
            playerId: awayRoster[2] ?? null,
            type: MatchEventType.RedCard,
            minute: 81,
            createdAt: new Date().toISOString(),
          });
        }

        state.startMatch(match.id);
        state.finishMatch(match.id);
        finishedIds.push(match.id);
        finished += 1;
      }

      // Una sola escritura con todos los eventos en lugar de una por evento
      // (el login desbloquea decenas de actualizaciones del store).
      if (allEvents.length > 0) {
        set((s) => ({ events: [...s.events, ...allEvents] }));
        void repo
          .insertMatchEvents(allEvents)
          .catch((err) => syncError('publicar resultados demo', err));
      }
      if (finishedIds.length > 0) {
        const completedAt = new Date().toISOString();
        const ids = new Set(finishedIds);
        set((s) => ({
          matches: s.matches.map((m) =>
            ids.has(m.id)
              ? { ...m, status: MatchStatus.Finished, completedAt }
              : m,
          ),
        }));
      }
      get().appendLog({
        action: 'DEMO_DATA_LOADED',
        tournamentId,
        detail: 'Datos demo de Súper Liga México 2026 cargados (jornadas 1-6)',
      });
    },
  };
});
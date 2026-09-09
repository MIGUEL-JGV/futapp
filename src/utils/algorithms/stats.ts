/**
 * Estadísticas individuales (RF-07).
 *
 * - `computeTopScorers`: tabla de goleadores ordenada de mayor a menor.
 * - `computeTopAssists`: tabla de asistentes ordenada de mayor a menor.
 * - `computeCardReport`: reporte de tarjetas y jugadores suspendidos.
 *
 * Funciones puras alimentadas por los eventos de los partidos.
 */

import type { MatchEvent, Player, Team } from '../../types';
import { MatchEventType } from '../../types';

/** Goleador en la tabla de goleadores (RF-07). */
export interface ScorerRow {
  playerId: string | null;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
}

/** Asistente en la tabla de asistencias (RF-07). */
export interface AssistRow {
  playerId: string | null;
  playerName: string;
  teamId: string;
  teamName: string;
  assists: number;
}

/** Fila del reporte de tarjetas/suspendidos (RF-07). */
export interface CardRow {
  playerId: string | null;
  playerName: string;
  teamId: string;
  teamName: string;
  yellowCards: number;
  redCards: number;
  /** Acumulado = rojas + amarillas (peso: roja vale más). */
  penalty: number;
  /** `true` si acumula suspensión automática (roja o `yellowSuspension` amarillas). */
  suspended: boolean;
}

export interface ComputePlayerStatsOptions {
  /** Umbral de amarillas para considerar a un jugador suspendido (por defecto 5). */
  yellowSuspension?: number;
}

/** Mapa auxiliar equipo -> nombre. */
function teamNamesById(teams: Team[]): Map<string, string> {
  return new Map(teams.map((t) => [t.id, t.name]));
}

/** Mapa auxiliar jugador -> nombre. */
function playerNamesById(players: Player[]): Map<string, string> {
  return new Map(players.map((p) => [p.id, p.name]));
}

/** Acumula los eventos por jugador. */
function aggregateByPlayer(
  events: MatchEvent[],
  matchTypes: MatchEventType | MatchEventType[],
): Map<string, { teamId: string; count: number }> {
  const allowed = new Set<MatchEventType>(
    Array.isArray(matchTypes) ? matchTypes : [matchTypes],
  );
  const acc = new Map<string, { teamId: string; count: number }>();

  for (const event of events) {
    if (!event.playerId || !allowed.has(event.type)) continue;
    const current = acc.get(event.playerId) ?? { teamId: event.teamId, count: 0 };
    acc.set(event.playerId, {
      teamId: event.teamId,
      count: current.count + 1,
    });
  }

  return acc;
}

/**
 * Tabla de goleadores (RF-07).
 *
 * @param events Eventos de todos los partidos; se filtran los `GOAL` con
 *               `playerId` asignado (un gol sin jugador no puntúa).
 * @returns Filas ordenadas de mayor a menor cantidad de goles.
 */
export function computeTopScorers(
  players: Player[],
  teams: Team[],
  events: MatchEvent[],
): ScorerRow[] {
  const teamNames = teamNamesById(teams);
  const playerNames = playerNamesById(players);
  const goals = aggregateByPlayer(events, MatchEventType.Goal);

  const rows: ScorerRow[] = [];
  for (const [playerId, agg] of goals) {
    rows.push({
      playerId,
      playerName: playerNames.get(playerId) ?? 'Jugador',
      teamId: agg.teamId,
      teamName: teamNames.get(agg.teamId) ?? '—',
      goals: agg.count,
    });
  }

  rows.sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName));
  return rows;
}

/**
 * Tabla de asistentes (RF-07).
 *
 * @param events Eventos de todos los partidos; se filtran los `GOAL` con
 *               `assistPlayerId` asignado (un gol sin asistencia no puntúa).
 * @returns Filas ordenadas de mayor a menor cantidad de asistencias.
 */
export function computeTopAssists(
  players: Player[],
  teams: Team[],
  events: MatchEvent[],
): AssistRow[] {
  const teamNames = teamNamesById(teams);
  const playerNames = playerNamesById(players);

  const assistByPlayer = new Map<string, { teamId: string; count: number }>();
  for (const event of events) {
    if (event.type !== MatchEventType.Goal || !event.assistPlayerId) continue;
    const current = assistByPlayer.get(event.assistPlayerId) ?? {
      teamId: event.teamId,
      count: 0,
    };
    assistByPlayer.set(event.assistPlayerId, {
      teamId: event.teamId,
      count: current.count + 1,
    });
  }

  const rows: AssistRow[] = [];
  for (const [playerId, agg] of assistByPlayer) {
    rows.push({
      playerId,
      playerName: playerNames.get(playerId) ?? 'Jugador',
      teamId: agg.teamId,
      teamName: teamNames.get(agg.teamId) ?? '—',
      assists: agg.count,
    });
  }

  rows.sort(
    (a, b) => b.assists - a.assists || a.playerName.localeCompare(b.playerName),
  );
  return rows;
}

/**
 * Reporte de tarjetas y suspendidos (RF-07).
 *
 * `penalty` = rojas * 2 + amarillas. Un jugador está `suspended` si tiene
 * una tarjeta roja o alcanza el umbral de amarillas (`yellowSuspension`).
 *
 * @returns Filas ordenadas por gravedad: suspendidos primero (rojas, luego
 *          acumulado), después el resto por acumulado desc.
 */
export function computeCardReport(
  players: Player[],
  teams: Team[],
  events: MatchEvent[],
  options: ComputePlayerStatsOptions = {},
): CardRow[] {
  const { yellowSuspension = 5 } = options;
  const teamNames = teamNamesById(teams);
  const playerNames = playerNamesById(players);

  const yellows = aggregateByPlayer(events, MatchEventType.YellowCard);
  const reds = aggregateByPlayer(events, MatchEventType.RedCard);

  const allPlayerIds = new Set([...yellows.keys(), ...reds.keys()]);
  const rows: CardRow[] = [];

  for (const playerId of allPlayerIds) {
    const yellow = yellows.get(playerId)?.count ?? 0;
    const red = reds.get(playerId)?.count ?? 0;
    const teamId = yellows.get(playerId)?.teamId ?? reds.get(playerId)?.teamId ?? '';
    rows.push({
      playerId,
      playerName: playerNames.get(playerId) ?? 'Jugador',
      teamId,
      teamName: teamNames.get(teamId) ?? '—',
      yellowCards: yellow,
      redCards: red,
      penalty: red * 2 + yellow,
      suspended: red > 0 || yellow >= yellowSuspension,
    });
  }

  rows.sort(
    (a, b) =>
      Number(b.suspended) - Number(a.suspended) ||
      b.redCards - a.redCards ||
      b.penalty - a.penalty ||
      a.playerName.localeCompare(b.playerName),
  );

  return rows;
}

/* ------------------------------------------------------------------ */
/* Estadísticas para las gráficas (panel de estadísticas)              */
/* ------------------------------------------------------------------ */

/** Rango de minutos para el timeline de goles. */
export interface TimelineBucket {
  label: string;
  count: number;
}

/** Resumen agregado de disciplina del torneo. */
export interface DisciplineSummary {
  yellows: number;
  reds: number;
}

/**
 * Distribución de goles por tramo de minutos.
 * Las barras de la gráfica "¿Cuándo se marca?".
 */
export function computeGoalTimeline(events: MatchEvent[]): TimelineBucket[] {
  const buckets: { label: string; min: number; max: number }[] = [
    { label: "1-15'", min: 1, max: 15 },
    { label: "16-30'", min: 16, max: 30 },
    { label: "31-45+'", min: 31, max: 45 },
    { label: "46-60'", min: 46, max: 60 },
    { label: "61-75'", min: 61, max: 75 },
    { label: "76-90+'", min: 76, max: 200 },
  ];

  return buckets.map((b) => ({
    label: b.label,
    count: events.filter(
      (e) =>
        e.type === MatchEventType.Goal &&
        e.minute >= b.min &&
        e.minute <= b.max,
    ).length,
  }));
}

/** Totales de tarjetas del torneo. */
export function computeDisciplineSummary(
  events: MatchEvent[],
): DisciplineSummary {
  return {
    yellows: events.filter((e) => e.type === MatchEventType.YellowCard).length,
    reds: events.filter((e) => e.type === MatchEventType.RedCard).length,
  };
}

/** Fila de tarjetas por equipo para la gráfica de disciplina. */
export interface TeamCardRow {
  teamId: string;
  teamName: string;
  yellows: number;
  reds: number;
  /** Acumulado = amarillas + rojas * 2. */
  penalty: number;
}

/** Tarjetas agregadas por equipo (alimenta la gráfica de disciplina). */
export function computeCardsByTeam(
  teams: Team[],
  events: MatchEvent[],
): TeamCardRow[] {
  const teamNames = teamNamesById(teams);
  const acc = new Map<string, { yellows: number; reds: number }>();

  for (const event of events) {
    const current = acc.get(event.teamId) ?? { yellows: 0, reds: 0 };
    if (event.type === MatchEventType.YellowCard) current.yellows += 1;
    if (event.type === MatchEventType.RedCard) current.reds += 1;
    acc.set(event.teamId, current);
  }

  const rows: TeamCardRow[] = [];
  for (const [teamId, counts] of acc) {
    rows.push({
      teamId,
      teamName: teamNames.get(teamId) ?? '—',
      yellows: counts.yellows,
      reds: counts.reds,
      penalty: counts.reds * 2 + counts.yellows,
    });
  }

  rows.sort(
    (a, b) => b.penalty - a.penalty || b.reds - a.reds || a.teamName.localeCompare(b.teamName),
  );
  return rows;
}
/**
 * Motor de cálculo de resultados y tabla de posiciones (RF-05 y RF-06).
 *
 * - `computeMatchResult` deriva el marcador SUMANDO los eventos `GOAL`
 *   registrados (RF-05: el marcador no se guarda, se calcula).
 * - `computeStandings` construye la tabla general a partir de los partidos
 *   finalizados (RF-06), con la puntuación 3/1/0 y los desempates
 *   PTS > DG > GF.
 *
 * Funciones puras y sin dependencias externas.
 */

import type { MatchEvent, MatchStatus, StandingRow, TournamentFormat } from '../../types';

/** Puntajes de acuerdo al reglamento (RF-06). */
const POINTS_WIN = 3;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

/** Resultado resuelto de un partido finalizado. */
export interface MatchScore {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
}

/** Equipo mínimo que necesita la tabla de posiciones. */
export interface StandingTeamInput {
  id: string;
  name: string;
}

/**
 * Marcador final a partir de eventos, sabiendo cuál es local y visitante.
 *
 * @param events        Eventos del partido.
 * @param homeTeamId    ID del equipo local (o null si hubo descanso).
 * @param awayTeamId    ID del equipo visitante (o null si hubo descanso).
 */
export function resolveMatchScore(
  events: MatchEvent[],
  homeTeamId: string | null,
  awayTeamId: string | null,
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  for (const event of events) {
    if (event.type !== 'GOAL' || !event.teamId) continue;
    if (event.teamId === homeTeamId) homeScore += 1;
    else if (event.teamId === awayTeamId) awayScore += 1;
    // Un gol de un equipo no participante se ignora (datos inconsistentes).
  }

  return { homeScore, awayScore };
}

/**
 * Devuelve el marcador del partido según su estado.
 *
 * - `Finished`: resultado calculado desde los eventos (RF-05).
 * - Cualquier otro estado: `[0, 0]` (el partido aún no cuenta para la tabla).
 */
export function scoreForMatch(
  status: MatchStatus,
  events: MatchEvent[],
  homeTeamId: string | null,
  awayTeamId: string | null,
): MatchScore {
  const resolved =
    status === 'FINISHED'
      ? resolveMatchScore(events, homeTeamId, awayTeamId)
      : { homeScore: 0, awayScore: 0 };

  return {
    homeTeamId,
    awayTeamId,
    homeScore: resolved.homeScore,
    awayScore: resolved.awayScore,
    status,
  };
}

/**
 * Punto de entrada de partidos ya resueltos (para la tabla de posiciones).
 */
export interface PlayedMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
}

/** Récord interno acumulado mientras se recorre el fixture. */
interface TeamAggregate {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function emptyAggregate(): TeamAggregate {
  return { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

/**
 * Calcula la tabla de posiciones (RF-06).
 *
 * Reglas:
 *   Victoria = 3 ptos, Empate = 1 pto, Derrota = 0 ptos.
 *   Desempate en orden: Puntos > Diferencia de Goles > Goles a Favor.
 *
 * @param teams    Equipos participantes (nombre e ID).
 * @param matches  Partidos JUGADOS (resultados ya resueltos). Los partidos
 *                 con lados `null` (descansos) se ignoran.
 *
 * @returns Filas ordenadas de la tabla, con `position` asignada.
 */
export function computeStandings(
  teams: StandingTeamInput[],
  matches: PlayedMatch[],
): StandingRow[] {
  const byId = new Map<string, TeamAggregate>();

  for (const team of teams) {
    byId.set(team.id, emptyAggregate());
  }

  for (const match of matches) {
    const { homeTeamId, awayTeamId } = match;
    if (!homeTeamId || !awayTeamId) continue; // partido con descanso: sin efecto

    const home = byId.get(homeTeamId);
    const away = byId.get(awayTeamId);
    if (!home || !away) continue; // equipo desconocido: no debe distorsionar

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += POINTS_WIN;
      away.points += POINTS_LOSS;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += POINTS_WIN;
      home.points += POINTS_LOSS;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += POINTS_DRAW;
      away.points += POINTS_DRAW;
    }

    home.played += 1;
    away.played += 1;
  }

  const rows: StandingRow[] = teams.map((team) => {
    const agg = byId.get(team.id) ?? emptyAggregate();
    return {
      teamId: team.id,
      teamName: team.name,
      position: 0,
      played: agg.played,
      won: agg.won,
      drawn: agg.drawn,
      lost: agg.lost,
      goalsFor: agg.goalsFor,
      goalsAgainst: agg.goalsAgainst,
      goalDifference: agg.goalsFor - agg.goalsAgainst,
      points: agg.points,
    };
  });

  // Orden de desempate: PTS > DG > GF (todos descendentes) (RF-06).
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
  );

  rows.forEach((row, index) => {
    row.position = index + 1;
  });

  return rows;
}

/**
 * Valida si el formato de torneo admite la tabla de posiciones general (RF-06).
 * Para formatos de eliminación directa la tabla no aplica.
 */
export function usesStandingsTable(format: TournamentFormat): boolean {
  return format === 'LEAGUE' || format === 'GROUPS';
}
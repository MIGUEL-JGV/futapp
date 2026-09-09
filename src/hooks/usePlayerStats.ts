/**
 * Hook `usePlayerStats` (RF-07).
 *
 * Expone la tabla de goleadores, asistentes y el reporte de
 * tarjetas/suspendidos calculados con `useMemo` a partir de eventos y
 * catálogos.
 *
 * RNF-02: el cálculo es O(n) y se memoriza; el render permanece por debajo
 * de los 2 segundos tras guardar un resultado.
 */

import { useMemo } from 'react';

import type { MatchEvent, Player, Team } from '../types';
import {
  computeCardReport,
  computeCardsByTeam,
  computeDisciplineSummary,
  computeGoalTimeline,
  computeTopAssists,
  computeTopScorers,
  type AssistRow,
  type CardRow,
  type DisciplineSummary,
  type ScorerRow,
  type TeamCardRow,
  type TimelineBucket,
} from '../utils/algorithms';

export interface UsePlayerStatsResult {
  scorers: ScorerRow[];
  assists: AssistRow[];
  cards: CardRow[];
  /** Goles por tramo de minutos (gráfica de barras). */
  timeline: TimelineBucket[];
  /** Totales de amarillas y rojas. */
  discipline: DisciplineSummary;
  /** Tarjetas por equipo (gráfica de disciplina). */
  cardsByTeam: TeamCardRow[];
}

/**
 * Calcula estadísticas individuales.
 *
 * @param players Plantilla de los equipos del torneo.
 * @param teams    Equipos del torneo.
 * @param events   Eventos del torneo (o todos los del fixture activo).
 */
export function usePlayerStats(
  players: Player[],
  teams: Team[],
  events: MatchEvent[],
): UsePlayerStatsResult {
  return useMemo<UsePlayerStatsResult>(() => {
    return {
      scorers: computeTopScorers(players, teams, events),
      assists: computeTopAssists(players, teams, events),
      cards: computeCardReport(players, teams, events),
      timeline: computeGoalTimeline(events),
      discipline: computeDisciplineSummary(events),
      cardsByTeam: computeCardsByTeam(teams, events),
    };
  }, [players, teams, events]);
}
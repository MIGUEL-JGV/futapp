/**
 * Hook `useStandings` (RNF-02).
 *
 * Recibe los equipos y los partidos con sus eventos y devuelve la tabla de
 * posiciones calculada con `useMemo`, para que el render ocurra en menos de
 * 2 segundos tras guardar un resultado (RNF-02: el cómputo es O(n·m) y se
 * dispara únicamente cuando cambian los insumos).
 */

import { useMemo } from 'react';

import type { Match, MatchEvent, StandingRow, Team } from '../types';
import {
  computeStandings,
  scoreForMatch,
  type StandingTeamInput,
} from '../utils/algorithms';

export interface UseStandingsOptions {
  /** IDs de equipos que se resaltan en la tabla (ej.: el equipo del usuario). */
  highlightTeamIds?: string[];
}

export interface UseStandingsResult {
  rows: StandingRow[];
  highlightTeamIds: Set<string>;
}

/**
 * Calcula la tabla de posiciones a partir de partidos y eventos.
 *
 * @param teams   Equipos participantes.
 * @param matches Partidos del torneo (se filtran los `FINISHED`).
 * @param events  Todos los eventos; se agrupan por `matchId`.
 * @param options Opciones de resaltado.
 */
export function useStandings(
  teams: Team[],
  matches: Match[],
  events: MatchEvent[],
  options: UseStandingsOptions = {},
): UseStandingsResult {
  return useMemo<UseStandingsResult>(() => {
    const teamsInput: StandingTeamInput[] = teams.map((team) => ({
      id: team.id,
      name: team.name,
    }));

    const eventsByMatch = new Map<string, MatchEvent[]>();
    for (const event of events) {
      const list = eventsByMatch.get(event.matchId) ?? [];
      list.push(event);
      eventsByMatch.set(event.matchId, list);
    }

    const played = matches
      .filter((match) => match.status === 'FINISHED')
      .map((match) => {
        const resolved = scoreForMatch(
          match.status,
          eventsByMatch.get(match.id) ?? [],
          match.homeTeamId,
          match.awayTeamId,
        );
        return {
          homeTeamId: resolved.homeTeamId,
          awayTeamId: resolved.awayTeamId,
          homeScore: resolved.homeScore,
          awayScore: resolved.awayScore,
        };
      });

    const rows = computeStandings(teamsInput, played);

    return {
      rows,
      highlightTeamIds: new Set(options.highlightTeamIds ?? []),
    };
  }, [teams, matches, events, options.highlightTeamIds]);
}
/**
 * Hook `useActiveTournament`.
 *
 * Expone el torneo seleccionado y todos sus datos relacionados
 * (equipos, jugadores, partidos y eventos) en un solo acceso.
 */

import type { Match, MatchEvent, Player, Team, Tournament } from '../types';
import { useFutAppStore } from '../store/useFutAppStore';

export interface ActiveTournamentData {
  tournament: Tournament | null;
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  /** `true` si aún no hay torneo seleccionado. */
  empty: boolean;
}

export function useActiveTournament(): ActiveTournamentData {
  const tournamentId = useFutAppStore((state) => state.selectedTournamentId);
  const tournaments = useFutAppStore((state) => state.tournaments);
  const allTeams = useFutAppStore((state) => state.teams);
  const allPlayers = useFutAppStore((state) => state.players);
  const allMatches = useFutAppStore((state) => state.matches);
  const allEvents = useFutAppStore((state) => state.events);

  const tournament =
    tournaments.find((t) => t.id === tournamentId) ?? null;

  const teamIds = new Set(
    allTeams.filter((t) => t.tournamentId === tournamentId).map((t) => t.id),
  );
  const matchIds = new Set(
    allMatches.filter((m) => m.tournamentId === tournamentId).map((m) => m.id),
  );

  return {
    tournament,
    teams: allTeams.filter((t) => t.tournamentId === tournamentId),
    players: allPlayers.filter((p) => teamIds.has(p.teamId)),
    matches: allMatches.filter((m) => m.tournamentId === tournamentId),
    events: allEvents.filter((e) => matchIds.has(e.matchId)),
    empty: tournamentId === null || tournament === null,
  };
}

/** Devuelve el equipo por ID (para listas rápidas). */
export function teamById(teams: Team[], teamId: string | null): Team | null {
  if (!teamId) return null;
  return teams.find((t) => t.id === teamId) ?? null;
}

/** Devuelve el nombre de un equipo (para listas rápidas). */
export function teamNameById(teams: Team[], teamId: string | null): string {
  if (!teamId) return 'DESCANSO';
  return teamById(teams, teamId)?.name ?? '?';
}
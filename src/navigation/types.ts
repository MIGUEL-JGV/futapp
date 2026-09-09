/**
 * Tipos de rutas de navegación.
 *
 * Stack raíz: pantallas de flujo (formularios, detalle).
 * Tab Main: vistas principales del torneo activo.
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  TournamentForm: { tournamentId?: string } | undefined;
  TournamentDetail: { tournamentId: string };
  TeamForm: { tournamentId: string; teamId?: string } | undefined;
  TeamDetail: { teamId: string };
  PlayerForm: { teamId: string; playerId?: string } | undefined;
  MatchDetail: { matchId: string };
  /** Landmark público (deep-link web), solo lectura. */
  PublicTournament: { tournamentId: string };
  /** Panel del representante (deep-link `/team/:token`). */
  TeamManager: { token: string };
};

/** Tabs de la vista principal: solo el listado de torneos. */
export type MainTabParamList = {
  Tournaments: undefined;
};

/**
 * Secciones internas de un torneo: Fixture, Partidos, Posiciones, Estadísticas
 * y Bitácora solo se muestran cuando el usuario abre un torneo.
 */
export type TournamentTabParamList = {
  Overview: { tournamentId: string };
  Fixture: undefined;
  Matches: undefined;
  Standings: undefined;
  Stats: undefined;
  Log: undefined;
};
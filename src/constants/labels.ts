/**
 * Etiquetas en español y tonos de chip para los enums del dominio.
 */

import type { ChipTone } from '../components/ui/Chip';
import type {
  MatchStatus,
  PlayerPosition,
  TournamentFormat,
  TournamentStatus,
} from '../types';

interface Labeled<T> {
  label: string;
  tone: ChipTone;
}

export const tournamentStatusLabels: Record<TournamentStatus, Labeled<TournamentStatus>> = {
  REGISTRATION: { label: 'Inscripción', tone: 'warning' },
  IN_PROGRESS: { label: 'En curso', tone: 'accent' },
  FINISHED: { label: 'Finalizado', tone: 'positive' },
};

export const matchStatusLabels: Record<MatchStatus, Labeled<MatchStatus>> = {
  SCHEDULED: { label: 'Programado', tone: 'neutral' },
  IN_PROGRESS: { label: 'En juego', tone: 'warning' },
  FINISHED: { label: 'Finalizado', tone: 'positive' },
};

export const formatLabels: Record<TournamentFormat, string> = {
  LEAGUE: 'Liga',
  GROUPS: 'Grupos',
  KNOCKOUT: 'Eliminación',
};

export const positionLabels: Record<PlayerPosition, string> = {
  GK: 'Portero',
  DF: 'Defensa',
  MF: 'Mediocampista',
  FW: 'Delantero',
};

/**
 * Días de la semana para elegir horarios de juego (RF-04).
 * Valor = getDay() de JS (0=domingo ... 6=sábado). Ordenados de lunes a
 * domingo para que se lean de forma natural.
 */
export const weekdayOptions: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];
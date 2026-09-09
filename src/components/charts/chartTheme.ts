/**
 * Paleta y helpers compartidos por las gráficas del panel de estadísticas.
 */
import { colors } from '../../theme/colors';

export const chartPalette = [
  '#16A34A',
  '#0EA5E9',
  '#F59E0B',
  '#8B5CF6',
  '#DC2626',
  '#059669',
  '#1D4ED8',
  '#DB2777',
];

/** Color estable para un índice de dato (cicla la paleta). */
export function colorForIndex(index: number): string {
  return chartPalette[index % chartPalette.length];
}

/** Color para tarjeta amarilla y roja. */
export const cardYellow = '#F59E0B';
export const cardRed = '#DC2626';

/** Derivado de la paleta general para coherencia visual. */
export { colors };
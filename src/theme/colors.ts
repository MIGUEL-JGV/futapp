/**
 * Tema visual de la aplicación.
 *
 * Diseño "llamativo" con identidad futbolera (verde cancha, dorado, azul
 * profundo) SIN sacrificar legibilidad en exteriores (RNF-03): texto casi
 * negro sobre blanco en todos los cuerpos de tabla.
 */

export const colors = {
  /** Fondo general: gris azulado muy claro (da ritmo a las tarjetas blancas). */
  background: '#EEF4F1',
  /** Fondo de tarjetas y tablas. */
  card: '#FFFFFF',

  /* ------------------------- Paleta principal ----------------------------- */
  /** Verde cancha (acción primaria). */
  brand: '#16A34A',
  brandDark: '#116932',
  /** Azul profundo (encabezados oscuros). */
  ink: '#0B1F3A',
  /** Dorado (destacados / podio). */
  gold: '#F59E0B',
  goldDark: '#D97706',

  /* ----------------------------- Texto ----------------------------------- */
  textPrimary: '#0F172A',
  textSecondary: '#55637A',

  /* ----------------------------- Tablas ---------------------------------- */
  headerBackground: '#0B1F3A',
  headerText: '#FFFFFF',
  rowAlt: '#F4F8F5',
  border: '#CBD7D0',
  highlightBackground: '#DCEDE4',

  /* ------------------------------ Estados -------------------------------- */
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  accent: '#1D4ED8',
  accentSoft: '#DBEAFE',
  neutral: '#475569',
  neutralSoft: '#E2E8F0',

  /** Alias legacy para textos de descanso en fixtures. */
  accentAlt: '#15803D',

  /* ----------------------------- Botones --------------------------------- */
  primaryBackground: '#16A34A',
  primaryText: '#FFFFFF',
  primaryBorder: '#116932',

  /* --------------------------- Gradientes -------------------------------- */
  gradientPrimary: ['#22C55E', '#15803D'] as const,
  gradientDark: ['#122A4E', '#1D4ED8'] as const,
  gradientGold: ['#FBBF24', '#D97706'] as const,
  gradientDanger: ['#EF4444', '#B91C1C'] as const,

  /* ------------------------------ Podio ---------------------------------- */
  medalGold: '#F59E0B',
  medalSilver: '#94A3B8',
  medalBronze: '#B45309',
} as const;

/** Escala tipográfica funcional. */
export const fontSizes = {
  xs: 11,
  sm: 12.5,
  tableHeader: 11,
  tableCell: 12.5,
  tableValue: 14,
  title: 24,
  subtitle: 13,
  big: 30,
  lg: 17,
} as const;

/** Sombras suaves para tarjetas (elevación sutil). */
export const shadows = {
  card: {
    boxShadow: '0 3px 8px rgba(11, 31, 58, 0.12)',
    elevation: 3,
  },
  button: {
    boxShadow: '0 3px 6px rgba(17, 105, 50, 0.35)',
    elevation: 5,
  },
} as const;

/** Bordes redondeados compartidos. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;
/**
 * Tema de React Navigation alineado con la paleta de la app.
 */
import { DefaultTheme, type Theme } from '@react-navigation/native';

import { colors } from '../theme/colors';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.brand,
  },
};

/** Opciones comunes de pantallas con stack (cabeceras limpias sobre fondo). */
export const stackScreenOptions = {
  headerBackTitle: '',
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontWeight: '900', color: colors.ink },
  headerShadowVisible: false,
} as const;
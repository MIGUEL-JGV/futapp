/**
 * Chip con fondo suave, borde y letra en negrita (etiquetas de estado).
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius } from '../../theme/colors';

export type ChipTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'gold'
  | 'dark';

interface ChipProps {
  label: string;
  tone?: ChipTone;
}

const toneStyles: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutralSoft, fg: colors.neutral },
  positive: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  gold: { bg: '#FEF3C7', fg: colors.goldDark },
  dark: { bg: colors.ink, fg: '#FFFFFF' },
};

export function Chip({ label, tone = 'neutral' }: ChipProps) {
  const palette = toneStyles[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    fontWeight: '800',
    fontSize: fontSizes.tableHeader,
    letterSpacing: 0.3,
  },
});
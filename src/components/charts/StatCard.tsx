/**
 * Tarjeta de métrica con número que "cuenta" hacia arriba (rAF).
 * Acompaña a las gráficas: partidos, goles, promedio, tarjetas.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, shadows } from '../../theme/colors';
import { useAnimatedNumber, useEntrance } from '../../utils/animation';

interface StatCardProps {
  label: string;
  value: number;
  /** Formato del valor (ej.: decimales, sufijos). */
  formatValue?: (value: number) => string;
  accent?: string;
  icon?: string;
  delay?: number;
}

export function StatCard({
  label,
  value,
  formatValue,
  accent = colors.brand,
  icon,
  delay = 0,
}: StatCardProps) {
  const entrance = useEntrance(360, delay);
  const shown = useAnimatedNumber(value, 800, delay + 120);
  const display = formatValue ? formatValue(shown) : String(Math.round(shown));

  return (
    <View style={[styles.card, entrance.style]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.value, { color: accent }]}>{display}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 148,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...shadows.card,
    overflow: 'hidden',
    position: 'relative',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  icon: {
    fontSize: fontSizes.lg,
    marginRight: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
  },
});
/**
 * Barra de progreso horizontal animada (conteo rAF creciente).
 * Útil para listas con valores relativos (goles por equipo, penalizaciones).
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius } from '../../theme/colors';
import { useAnimatedNumber } from '../../utils/animation';
import { useEntrance } from '../../utils/animation';

interface ProgressBarProps {
  label: string;
  /** Valor a mostrar (0..max); la barra y el número crecen animados. */
  value: number;
  max: number;
  color: string;
  /** Unidad mostrada junto al número (ej.: 'goles'). */
  unit?: string;
  valueFormatter?: (value: number) => string;
  delay?: number;
}

export function ProgressBar({
  label,
  value,
  max,
  color,
  unit = '',
  valueFormatter,
  delay = 0,
}: ProgressBarProps) {
  const entrance = useEntrance(320, delay);
  const percent = useAnimatedNumber(max > 0 ? Math.min(1, value / max) * 100 : 0, 800, delay + 120);
  const shown = useAnimatedNumber(value, 800, delay + 120);
  const display = valueFormatter ? valueFormatter(shown) : `${Math.round(shown)} ${unit}`.trim();

  return (
    <View style={[styles.row, entrance.style]}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color }]}>{display}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { backgroundColor: color, width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    flex: 1,
    marginRight: 8,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.ink,
  },
  value: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  track: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.rowAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
  },
});
/**
 * Gráfica de dona (pastel) con SVG. Los segmentos "giran" animados y el
 * centro muestra el total. Ideales para participar/difundir proporciones.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

import { colors, fontSizes } from '../../theme/colors';
import { useAnimatedNumber } from '../../utils/animation';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValueFormatted?: string;
  valueFormatter?: (value: number) => string;
}

const GAP_DEG = 2.5;

function polar(cx: number, cy: number, radius: number, radians: number) {
  return {
    x: cx + radius * Math.sin(radians),
    y: cy - radius * Math.cos(radians),
  };
}

function segmentPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  a0: number,
  a1: number,
): string {
  const startOuter = polar(cx, cy, outer, a0);
  const endOuter = polar(cx, cy, outer, a1);
  const endInner = polar(cx, cy, inner, a1);
  const startInner = polar(cx, cy, inner, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

function Segment({
  start,
  span,
  color,
  cx,
  cy,
  outer,
  inner,
  delay,
}: {
  start: number;
  span: number;
  color: string;
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  delay: number;
}) {
  const progress = useAnimatedNumber(1, 900, delay);
  const a0 = start + (GAP_DEG * Math.PI) / 180;
  const a1 = start + span * progress - (GAP_DEG * Math.PI) / 180;

  if (progress <= 0 || a1 <= a0) return null;

  return (
    <Path
      d={segmentPath(cx, cy, outer, inner, a0, a1)}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={1}
    />
  );
}

export function DonutChart({
  data,
  size = 168,
  thickness = 30,
  centerLabel,
  centerValueFormatted,
  valueFormatter,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer - thickness;
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  const fmt = valueFormatter ?? ((v: number) => String(Math.round(v)));

  let start = 0;
  const segments = data.map((d) => {
    const span = (d.value / total) * Math.PI * 2;
    const seg = { ...d, start, span };
    start += span;
    return seg;
  });

  const centerValue = centerValueFormatted ?? fmt(total);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {segments.map((seg, i) => (
            <Segment
              key={seg.label}
              start={seg.start}
              span={seg.span}
              color={seg.color}
              cx={cx}
              cy={cy}
              outer={outer}
              inner={inner}
              delay={i * 140}
            />
          ))}
        </G>
        <SvgText
          x={cx}
          y={cy - 2}
          fontSize={20}
          fontWeight="800"
          fill={colors.ink}
          textAnchor="middle">
          {centerValue}
        </SvgText>
        {centerLabel ? (
          <SvgText
            x={cx}
            y={cy + 16}
            fontSize={11}
            fontWeight="600"
            fill={colors.textSecondary}
            textAnchor="middle">
            {centerLabel}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

/** Leyenda de la dona con puntos de color y porcentaje. */
export function DonutLegend({
  data,
  valueFormatter,
}: {
  data: DonutSegment[];
  valueFormatter?: (value: number) => string;
}) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  const fmt = valueFormatter ?? ((v: number) => String(Math.round(v)));

  return (
    <View style={styles.legend}>
      {data.map((d) => {
        const pct = (d.value / total) * 100;
        return (
          <View key={d.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.legendValue}>
              {fmt(d.value)} · {pct.toFixed(0)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  legend: {
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.ink,
    marginRight: 8,
  },
  legendValue: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
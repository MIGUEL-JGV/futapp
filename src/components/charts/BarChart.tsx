/**
 * Gráfica de barras verticales con SVG y gradientes.
 * Las barras "crecen" animadas desde el eje y muestran su valor encima.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { colors, fontSizes } from '../../theme/colors';
import { useAnimatedNumber } from '../../utils/animation';

export interface BarDatum {
  /** Etiqueta corta bajo la barra. */
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  unit?: string;
  /** Ancho de vista normalizada (se escala al contenedor). */
  viewWidth?: number;
  valueFormatter?: (value: number) => string;
}

const SLOT = 50;
const BASELINE = 116;
const TOP = 16;

function Bar({
  datum,
  index,
  max,
  baselineY,
  valueFormatter,
  unit,
}: {
  datum: BarDatum;
  index: number;
  max: number;
  baselineY: number;
  valueFormatter: (value: number) => string;
  unit: string;
}) {
  const ratio = useAnimatedNumber(max > 0 ? datum.value / max : 0, 900, 150);
  const barHeight = ratio * (baselineY - TOP);
  const top = baselineY - barHeight;
  const x = index * SLOT + (SLOT - 28) / 2;

  return (
    <>
      <Rect
        x={x}
        y={top}
        width={28}
        height={Math.max(barHeight, 2)}
        rx={7}
        fill={`url(#grad-${index})`}
      />
      <SvgText
        x={x + 14}
        y={top - 8}
        fontSize={11}
        fontWeight="800"
        fill={datum.color}
        textAnchor="middle">
        {valueFormatter(datum.value || 0)}
      </SvgText>
      <SvgText
        x={index * SLOT + SLOT / 2}
        y={baselineY + 16}
        fontSize={10}
        fontWeight="700"
        fill={colors.textSecondary}
        textAnchor="middle">
        {datum.label}
      </SvgText>
    </>
  );
}

export function BarChart({
  data,
  height = 156,
  unit = '',
  viewWidth = SLOT * 6,
  valueFormatter,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt =
    valueFormatter ??
    ((v: number) => (unit ? `${v} ${unit}` : String(v)));

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${viewWidth} ${height}`}>
        <Defs>
          {data.map((d, i) => (
            <LinearGradient
              key={d.label}
              id={`grad-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1">
              <Stop offset="0%" stopColor={d.color} stopOpacity={0.95} />
              <Stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
            </LinearGradient>
          ))}
        </Defs>
        {data.map((d, i) => (
          <Bar
            key={d.label}
            datum={d}
            index={i}
            max={max}
            baselineY={BASELINE}
            valueFormatter={fmt}
            unit={unit}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
/**
 * Cabecera del torneo activo: tarjeta en gradiente oscuro con nombre,
 * chip de estado y efectos en vivo (brillo + pulso si está en curso).
 * Animaciones por rAF + estado (sin RN Animated).
 */

import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSizes, radius, shadows } from '../../theme/colors';
import { useRafValue } from '../../utils/animation';
import { Chip, type ChipTone } from './Chip';
import { PulseDot } from './PulseDot';

interface TournamentHeaderProps {
  name: string;
  subtitle: string;
  statusLabel: string;
  statusTone: ChipTone;
  /** Muestra indicador "EN VIVO" (torneo en curso). */
  live?: boolean;
}

export function TournamentHeader({
  name,
  subtitle,
  statusLabel,
  statusTone,
  live = false,
}: TournamentHeaderProps) {
  const shine = useRafValue({ from: -1, to: 2, duration: 3600, repeat: true });
  const glow = useRafValue({ from: 0, to: 1, duration: 1600, repeat: true });

  const translateX = -220 + (shine + 1) * (640 / 3);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={colors.gradientDark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <View
          style={[
            styles.shine,
            {
              pointerEvents: 'none',
              transform: [{ translateX }, { rotate: '18deg' }],
            },
          ]}
        />
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {live ? (
            <View style={styles.liveBadge}>
              <PulseDot color={colors.gold} size={8} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          ) : (
            <Chip label={statusLabel} tone={statusTone} />
          )}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </LinearGradient>

      {live && (
        <View
          style={[
            styles.glowLine,
            { opacity: 0.25 + 0.45 * glow },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  card: {
    borderRadius: radius.lg,
    padding: 18,
    overflow: 'hidden',
    ...shadows.card,
  },
  shine: {
    position: 'absolute',
    top: -40,
    left: 0,
    width: 90,
    height: '160%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: fontSizes.title,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginRight: 10,
  },
  subtitle: {
    marginTop: 8,
    color: '#C7D2E6',
    fontSize: fontSizes.subtitle,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: fontSizes.tableHeader,
    letterSpacing: 1,
  },
  glowLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: -1,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
});
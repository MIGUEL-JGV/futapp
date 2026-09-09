/**
 * ListItem como tarjeta blanca redondeada con sombra, acento izquierdo
 * y feedback táctil por spring.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSizes, radius, shadows } from '../../theme/colors';
import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

interface ListItemProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Color del acento izquierdo (barra vertical). */
  accentColor?: string;
  /** Foto de equipo/jugador mostrada antes del contenido. */
  avatarUri?: string | null;
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  accentColor,
  avatarUri,
}: ListItemProps) {
  const pressedStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [
    styles.row,
    shadows.card,
    pressed && onPress && styles.pressed,
  ];

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.scaleWrap}
      pressedStyle={pressedStyle}>
      {accentColor ? (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      ) : null}
      {avatarUri ? (
        <View style={styles.avatar}>
          <Avatar uri={avatarUri} label={title} size={40} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scaleWrap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  accent: {
    alignSelf: 'stretch',
    width: 5,
    borderRadius: radius.pill,
    marginRight: 12,
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: fontSizes.tableCell,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
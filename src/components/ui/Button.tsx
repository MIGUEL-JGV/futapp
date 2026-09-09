/**
 * Button con gradiente, sombra y feedback táctil por spring.
 */

import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSizes, radius, shadows } from '../../theme/colors';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'accent' | 'dark' | 'gold' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  small?: boolean;
}

const gradients: Record<ButtonVariant, readonly [string, string] | null> = {
  primary: colors.gradientPrimary,
  accent: colors.gradientDark,
  dark: colors.gradientDark,
  gold: colors.gradientGold,
  danger: colors.gradientDanger,
  ghost: null,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  small = false,
}: ButtonProps) {
  const gradient = gradients[variant];
  const isGhost = variant === 'ghost';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        small ? styles.small : undefined,
        variant !== 'ghost' && !disabled ? shadows.button : undefined,
        disabled ? styles.disabled : undefined,
      ]}
      pressedStyle={({ pressed }) =>
        pressed && !disabled ? styles.pressed : undefined
      }>
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, small && styles.smallFill]}>
          <Text
            style={[
              styles.text,
              small && styles.smallText,
              disabled && styles.textDisabled,
              variant === 'gold' && styles.textInk,
            ]}>
            {title}
          </Text>
        </LinearGradient>
      ) : (
        <Text
          style={[
            styles.text,
            isGhost && styles.textGhost,
            variant === 'danger' && styles.textDanger,
            small && styles.smallText,
            disabled && styles.textDisabled,
          ]}>
          {title}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  small: {
    minHeight: 32,
    borderRadius: radius.sm,
  },
  fill: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  smallFill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontWeight: '900',
    fontSize: fontSizes.tableValue,
    color: colors.primaryText,
    letterSpacing: 0.3,
  },
  textGhost: {
    color: colors.textPrimary,
  },
  textDanger: {
    color: colors.danger,
  },
  textInk: {
    color: colors.ink,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
  smallText: {
    fontSize: fontSizes.tableCell,
  },
});
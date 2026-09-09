/**
 * PressableScale: botón con feedback táctil animado (se encoge al presionar
 * y rebota al soltar). Animación por rAF + estado (sin RN Animated).
 */

import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { usePressScale } from '../../utils/animation';

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  /** Estilo aplicado al Pressable interno (no animado). */
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle> | ((args: { pressed: boolean }) => StyleProp<ViewStyle>);
  scaleWhenDisabled?: boolean;
}

type WithCallbacks = PressableProps & {
  onPressIn?: () => void;
  onPressOut?: () => void;
};

export function PressableScale({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  pressedStyle,
  scaleWhenDisabled = true,
}: PressableScaleProps) {
  const press = usePressScale();

  const callbacks: WithCallbacks = {};

  if (!disabled || scaleWhenDisabled) {
    callbacks.onPressIn = () => {
      press.pressIn();
      onPressIn?.();
    };
    callbacks.onPressOut = () => {
      press.pressOut();
      onPressOut?.();
    };
  } else {
    callbacks.onPressIn = onPressIn;
    callbacks.onPressOut = onPressOut;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      {...callbacks}
      style={(state) => [
        style,
        press.style,
        typeof pressedStyle === 'function' ? pressedStyle(state) : pressedStyle,
      ]}>
      {children}
    </Pressable>
  );
}
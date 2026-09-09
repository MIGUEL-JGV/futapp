/**
 * PulseDot: punto que late (opacidad + escala) para indicar algo "en vivo".
 * Animación por rAF + estado (sin RN Animated).
 */

import { StyleSheet, View } from 'react-native';

import { useRafValue } from '../../utils/animation';

interface PulseDotProps {
  color: string;
  size?: number;
  delay?: number;
}

export function PulseDot({ color, size = 9, delay = 0 }: PulseDotProps) {
  const pulse = useRafValue({
    from: 0,
    to: 1,
    duration: 650,
    delay,
    easing: (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
    repeat: true,
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.35 + 0.65 * pulse,
        transform: [{ scale: 0.8 + 0.45 * pulse }],
      }}
    />
  );
}
/**
 * Animaciones impulsadas por requestAnimationFrame + estado React.
 *
 * NO usamos la API `Animated` de React Native: en RN 0.86 (nueva
 * arquitectura + Hermes) `Animated.timing/spring` revientan al crear la
 * propiedad `_tracking` sobre instancias congeladas ("Cannot add new
 * property '_tracking'"). Aquí cada "value" es un número en el estado y se
 * anima frame a frame, 100% compatible.
 */

import { useEffect, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';

/* ------------------------------ Curvas -------------------------------- */

export const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
export const easeInQuad = (p: number) => p * p;
export const easeInOut = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;

const easeOutBack = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
};

/* ------------------------- Motor rAF básico --------------------------- */

interface RafOptions {
  from: number;
  to: number;
  duration: number;
  delay?: number;
  easing?: (p: number) => number;
  /** Repetir en bucle hacia `from`. */
  repeat?: boolean;
  /** Pausa entre ciclo y ciclo cuando `repeat` está activo. */
  repeatDelay?: number;
}

/**
 * Devuelve un número que va de `from` a `to` animado con rAF.
 */
export function useRafValue({
  from,
  to,
  duration,
  delay = 0,
  easing = easeOutCubic,
  repeat = false,
  repeatDelay = 0,
}: RafOptions): number {
  const [value, setValue] = useState(from);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let phaseStart: number | null = null;
    let forward = true;

    const step = (t: number) => {
      if (phaseStart === null) phaseStart = t;
      const elapsed = t - phaseStart;
      const progress = Math.min(1, elapsed / duration);
      const eased = repeat && !forward ? 1 - easing(progress) : easing(progress);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else if (repeat) {
        forward = !forward;
        phaseStart = null;
        timer = window.setTimeout(() => {
          raf = requestAnimationFrame(step);
        }, repeatDelay);
      }
    };

    timer = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // El valor `value` no debe reiniciar el ciclo; `tick` fuerza reinicio si hace falta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, duration, delay, easing, repeat, repeatDelay, tick]);

  return value;
}

/** Fuerza la re-ejecución de un useRafValue (para loops manuales). */
export function useRafPulse({ up = 650, down = 650, delay = 0 }: { up?: number; down?: number; delay?: number }): number {
  return useRafValue({
    from: 0,
    to: 1,
    duration: up,
    delay,
    easing: easeInOut,
    repeat: true,
    repeatDelay: down,
  });
}

/* --------------------------- Componentes ------------------------------ */

/** Entrada: desvanecido + deslizamiento hacia arriba. */
export function useEntrance(delay = 0, distance = 18) {
  const progress = useRafValue({ from: 0, to: 1, duration: 420, delay });
  return {
    progress,
    style: {
      opacity: progress,
      transform: [{ translateY: distance * (1 - progress) }],
    } as ViewStyle,
  };
}

/** Rebotado con overshoot al montar (marcadores). */
export function usePop() {
  const scale = useRafValue({ from: 0.7, to: 1, duration: 420, easing: easeOutBack });
  return {
    scale,
    style: { transform: [{ scale }] } as ViewStyle,
  };
}

/** Escala rápida al presionar (feedback táctil). */
export function usePressScale() {
  const scaleRef = useRef(1);
  const rafRef = useRef(0);
  const [, setVersion] = useState(0);

  const animateTo = (target: number, duration: number, easing: (p: number) => number) => {
    cancelAnimationFrame(rafRef.current);
    const from = scaleRef.current;
    const start = performance.now();

    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      const next = from + (target - from) * easing(progress);
      scaleRef.current = next;
      setVersion((v) => v + 1);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const pressIn = () => animateTo(0.96, 90, easeInQuad);
  const pressOut = () => animateTo(1, 220, easeOutBack);

  return {
    scale: scaleRef.current,
    style: { transform: [{ scale: scaleRef.current }] } as ViewStyle,
    pressIn,
    pressOut,
  };
}

/**
 * Cuenta de 0 hasta `target` con rAF (útil para números y barras que
 * "crecen"). Re-anima cuando `target` cambia.
 */
export function useAnimatedNumber(
  target: number,
  duration = 700,
  delay = 0,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    const startAt = performance.now();

    const step = (t: number) => {
      const progress = Math.min(1, (t - startAt) / duration);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    timer = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
/**
 * Polyfill de `Alert.alert` para la web (React Native Web NO implementa
 * Alert: los diálogos simplemente no aparecen, silenciando confirmaciones
 * y errores).
 *
 * En la web:
 *  - sin botones      -> `window.alert(title + message)`
 *  - con botones      -> `window.confirm(...)`; al confirmar se ejecuta el
 *                        primer botón que NO sea de estilo 'cancel' (Aprobar,
 *                        Rechazar, Eliminar...), igual que haría un Alert nativo.
 *
 * En iOS/Android se conserva el comportamiento nativo de React Native.
 */

import { Alert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (typeof window.alert !== 'function' && typeof window.confirm !== 'function') {
    return;
  }

  (Alert as unknown as { alert: typeof Alert.alert }).alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    const body = message ? `${title}\n\n${message}` : title;

    if (!buttons || buttons.length === 0) {
      window.alert(body);
      return;
    }

    const action = buttons.find((b) => b && b.style !== 'cancel') ?? buttons[0];
    if (window.confirm(body)) {
      action?.onPress?.();
    }
  };
}
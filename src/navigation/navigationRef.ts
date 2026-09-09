import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Referencia global al contenedor de navegación.
 * Permite navegar y consultar estado desde fuera de una pantalla
 * (p. ej. para salir de la vista pública al iniciar sesión).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
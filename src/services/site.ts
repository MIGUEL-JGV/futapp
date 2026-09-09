/**
 * URL base del sitio publicada. En producción la define EXPO_PUBLIC_SITE_URL
 * (se inyecta en el build del hosting); en desarrollo cae a localhost.
 */
export const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:8081';
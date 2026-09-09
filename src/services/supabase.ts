/**
 * Cliente de Supabase (RNF-01 / backend).
 *
 * Lee la configuración desde variables de entorno de Expo
 * (`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
 *
 * Si no están presentes, `supabase` será `null` y la app funcionará en
 * "modo demo" usando el store local de Zustand.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** `true` cuando el backend está configurado correctamente. */
export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);

/**
 * Cliente tipado de Supabase (schema en `supabase/schema.sql`).
 * Es `null` en modo demo.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;

/**
 * Utilidad para lanzar cuando una operación requiere backend y no está
 * configurado.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Define EXPO_PUBLIC_SUPABASE_URL y ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno.',
    );
  }
  return supabase;
}
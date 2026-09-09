/**
 * Servicio de autenticación (Fase 3 — lista-pero-apagada).
 *
 * Cuando hay proyecto Supabase configurado (`isSupabaseConfigured`), usa
 * `supabase.auth` real (email + password) y sincroniza el perfil en
 * `user_profiles`. Cuando no lo hay, cae al flujo demo actual (cualquier
 * email/contraseña funciona y el rol es `admin`).
 *
 * La app sigue arrancando igual en modo local; esta capa queda lista para
 * "encenderla" creando el proyecto y poniendo las env vars.
 */

import { AuthError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabase';
import { mappers } from './repository';
import { migrateLocalTournaments } from './migration';
import { useFutAppStore } from '../store/useFutAppStore';
import type { User } from '../types';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Registro de nuevo usuario.
 * - Con Supabase: crea la cuenta y su `user_profiles` (rol spectator).
 * - Sin Supabase: registra el usuario en el catálogo local (modo demo).
 */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    // Modo demo: registrar en el catálogo local y entrar como admin.
    useFutAppStore.getState().registerKnownUser(normalized);
    useFutAppStore.getState().signInAsAdmin(normalized);
    return { ok: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
  });
  if (error || !data.user) {
    return { ok: false, error: formatAuthError(error) };
  }

  // El perfil público se crea solo vía trigger `handle_new_user`
  // (migración 0003): el INSERT directo fallaría por RLS.
  await syncAuthUser(data.user.id, normalized);
  return { ok: true };
}

/** Inicio de sesión. Con Supabase valida credenciales reales. */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    useFutAppStore.getState().registerKnownUser(normalized);
    useFutAppStore.getState().signInAsAdmin(normalized);
    return { ok: true };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error || !data.user) {
    return { ok: false, error: formatAuthError(error) };
  }

  await syncAuthUser(data.user.id, normalized);
  return { ok: true };
}

/** Cierre de sesión (válido solo con Supabase; no-op en modo demo local). */
export async function signOut(): Promise<void> {
  const store = useFutAppStore.getState();
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  store.signOut();
}

/**
 * Restaura la sesión de Supabase al arrancar la app (Fase 4.4).
 * Si hay una sesión activa, recarga el usuario y sus membresías sin
 * volver a la pantalla de login. No-op en modo demo local.
 */
export async function restoreSupabaseSession(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return;
  await syncAuthUser(session.user.id, session.user.email ?? '');
}

/**
 * Sincroniza el usuario autenticado de Supabase con el store local,
 * leyendo su rol desde `user_profiles` y sus membresías de torneo.
 */
async function syncAuthUser(userId: string, email: string): Promise<void> {
  const setAuthStatus = useFutAppStore.getState().setAuthStatus;
  const { data: profile, error } = await supabase!
    .from('user_profiles')
    .select('id, email, display_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    // RLS oculta la fila si falta la policy "read own profile" (migración 0003):
    // el login "funciona" pero el rol cae a spectator y la app queda en lectura.
    const reason = error?.message ?? 'fila oculta por RLS';
    console.warn(`[auth] No se pudo leer user_profiles de ${userId}: ${reason}`);
    setAuthStatus(
      `No se pudo leer tu rol en Supabase (${reason}). Re-ejecuta ` +
        'supabase/setup_all.sql en el SQL Editor y vuelve a iniciar sesión.',
    );
  } else {
    setAuthStatus(null);
  }

  const safeRole = (profile?.role as User['role']) ?? 'spectator';
  const user: User = {
    id: userId,
    email: profile?.email ?? email,
    displayName: profile?.display_name ?? null,
    role: profile ? safeRole : 'spectator',
  };
  useFutAppStore.setState({ user });
  useFutAppStore.getState().appendLog({
    action: 'LOGIN',
    detail: `Inicio de sesión de ${user.displayName ?? user.email ?? 'usuario'} (rol ${user.role})`,
  });

  await refreshMemberships(userId);

  // Fase 1: migra los torneos locales del dispositivo a la nube (one-shot)
  // y luego recarga el dataset completo desde Supabase.
  await migrateLocalTournaments(userId);
  await useFutAppStore.getState().loadBackendData(userId);
}

/**
 * Refresca el catálogo local de membresías con las de Supabase
 * (owner/moderator reales del usuario autenticado).
 */
async function refreshMemberships(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data, error } = await supabase
      .from('tournament_members')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.warn(`[auth] No se pudieron leer membresías de ${userId}: ${error.message}`);
      return;
    }
    const members = (data ?? [])
      .map((row) => mappers.member(row as never))
      .filter((m) => m && m.id);
    useFutAppStore.getState().setMembers(members);
  } catch (err) {
    // La sincronización es best-effort: nunca debe bloquear el login.
    console.warn('[auth] refreshMemberships falló', err);
  }
}

/** Traduce los errores de Supabase a mensajes legibles. */
function formatAuthError(error: AuthError | { message?: string } | null): string {
  if (!error) return 'No se pudo completar la operación.';
  const m = error.message ?? '';
  if (m.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (m.includes('already registered') || m.includes('User already')) {
    return 'Ya existe una cuenta con ese email.';
  }
  if (m.includes('Password should be')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return m;
}
/**
 * Utilidades de sesión y consulta del torneo activo.
 *
 * Roles por torneo (multi-tenant):
 *  - `owner`     : propietario (creador) — control total del torneo.
 *  - `moderator` : coeditor invitado por el owner — escribe pero no administra.
 *  - espectador  : solo lectura (invitado o usuario registrado sin rol).
 *
 * En modo local (sin Supabase) la membresía se resuelve consultando el
 * catálogo `members` del store.
 */

import { useFutAppStore } from '../store/useFutAppStore';

/** `true` si la sesión actual tiene el rol global admin (RF-01). */
export function useIsAdmin(): boolean {
  return useFutAppStore((state) => state.user?.role === 'admin');
}

/** Miembro (owner/moderator) de LD del torneo activo. */
export function useActiveMember() {
  return useFutAppStore((state) => {
    if (state.isPublicReadonly) return null;
    const tournamentId = state.selectedTournamentId;
    if (!tournamentId || !state.user) return null;
    return (
      state.members.find(
        (m) => m.tournamentId === tournamentId && m.userId === state.user!.id,
      ) ?? null
    );
  });
}

/**
 * `true` si el usuario puede EDITAR el torneo activo
 * (owner o moderator de ese torneo, o admin global).
 * Siempre `false` en la vista pública (deep-link web).
 */
export function useCanEditActiveTournament(): boolean {
  const readonly = useFutAppStore((state) => state.isPublicReadonly);
  if (readonly) return false;
  const member = useActiveMember();
  const isAdmin = useIsAdmin();
  return isAdmin || member !== null;
}

/** `true` si el usuario es el PROPIETARIO del torneo activo. */
export function useIsOwnerActiveTournament(): boolean {
  const readonly = useFutAppStore((state) => state.isPublicReadonly);
  if (readonly) return false;
  return useActiveMember()?.role === 'owner';
}

/** `true` si el usuario está autenticado (no espectador anónimo). */
export function useIsSignedIn(): boolean {
  return useFutAppStore((state) => state.user !== null);
}

/**
 * `true` si el usuario autenticado es el representante (team_manager)
 * del torneo activo y está gestionando su propio equipo aprobado.
 */
export function useIsTeamManager(): boolean {
  const tournamentId = useFutAppStore((state) => state.selectedTournamentId);
  const userId = useFutAppStore((state) => state.user?.id);
  const members = useFutAppStore((state) => state.members);
  const isPublicReadonly = useFutAppStore((state) => state.isPublicReadonly);
  const teamManagerTeamId = useFutAppStore((state) => state.teamManagerTeamId);
  if (isPublicReadonly || !tournamentId || !userId) return false;
  // El manager NO debe ser owner/moderador; y su equipo gestionado existe.
  const member = members.find(
    (m) => m.tournamentId === tournamentId && m.userId === userId,
  );
  if (member) return false;
  return teamManagerTeamId !== null;
}

/** `true` si el usuario es el representante de ESTE equipo concreto. */
export function useCanEditThisTeam(teamId: string): boolean {
  const canEditTournament = useCanEditActiveTournament();
  if (canEditTournament) return true;
  return useFutAppStore((state) => state.teamManagerTeamId === teamId);
}
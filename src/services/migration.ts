/**
 * Migración one-shot de torneos locales (AsyncStorage) a Supabase.
 *
 * Al hacer login por primera vez con el backend ya activo, el dispositivo
 * puede tener torneos creados en la etapa local (demo incluida). Esta
 * utilidad los vuelca a Supabase remapeando los IDs legibles (`trn_...`) a
 * UUID válidos, y otorga al usuario el rol OWNER de cada torneo.
 *
 * Protecciones:
 *  - No hace nada si el usuario ya tiene torneos en la nube (no duplica).
 *  - Solo migra membresías OWNER (los moderadores locales no existen como
 *    cuentas Supabase reales todavía; se crean después vía invitación).
 *  - Best-effort: si algo falla a medias, el siguiente login detecta torneos
 *    en la nube y no reintenta (el estado cloud queda como fuente de verdad).
 */

import * as repo from './repository';
import { newUuid } from './uuid';
import { useFutAppStore } from '../store/useFutAppStore';

let migratedForSession = false;

export async function migrateLocalTournaments(userId: string): Promise<void> {
  if (!repo.backendActive || migratedForSession) return;

  const store = useFutAppStore.getState();
  if (store.tournaments.length === 0) return;

  // Si el usuario ya tiene torneos en la nube, no duplicamos nada.
  const cloud = await repo.fetchUserDataset(userId);
  if (cloud === null) return;
  if (cloud.tournaments.length > 0) {
    migratedForSession = true;
    return;
  }

  try {
    const remap = new Map<string, string>();

    const tournaments = store.tournaments.map((t) => {
      const id = newUuid();
      remap.set(t.id, id);
      return { ...t, id };
    });

    const teams = store.teams.map((t) => {
      const id = newUuid();
      remap.set(t.id, id);
      return {
        ...t,
        id,
        tournamentId: remap.get(t.tournamentId) ?? t.tournamentId,
      };
    });

    const players = store.players.map((p) => {
      const id = newUuid();
      remap.set(p.id, id);
      return {
        ...p,
        id,
        teamId: remap.get(p.teamId) ?? p.teamId,
      };
    });

    const matches = store.matches.map((m) => {
      const id = newUuid();
      remap.set(m.id, id);
      return {
        ...m,
        id,
        tournamentId: remap.get(m.tournamentId) ?? m.tournamentId,
        homeTeamId: m.homeTeamId ? (remap.get(m.homeTeamId) ?? m.homeTeamId) : null,
        awayTeamId: m.awayTeamId ? (remap.get(m.awayTeamId) ?? m.awayTeamId) : null,
      };
    });

    const events = store.events.map((e) => ({
      ...e,
      id: newUuid(),
      matchId: remap.get(e.matchId) ?? e.matchId,
      teamId: remap.get(e.teamId) ?? e.teamId,
      playerId: e.playerId ? (remap.get(e.playerId) ?? e.playerId) : null,
      assistPlayerId: e.assistPlayerId
        ? (remap.get(e.assistPlayerId) ?? e.assistPlayerId)
        : null,
    }));

    const registrations = store.registrations
      .filter((r) => remap.has(r.tournamentId))
      .map((r) => ({
        ...r,
        id: newUuid(),
        tournamentId: remap.get(r.tournamentId) ?? r.tournamentId,
      }));

    const logs = store.log.map((l) => ({
      ...l,
      id: newUuid(),
      tournamentId: l.tournamentId ? (remap.get(l.tournamentId) ?? l.tournamentId) : null,
      matchId: l.matchId ? (remap.get(l.matchId) ?? l.matchId) : null,
    }));

    // 1) Torneos + membresía OWNER real (el siguiente load refrescará el resto).
    for (const t of tournaments) {
      await repo.createTournamentRow(t, userId);
      await repo.createMemberRow({
        id: newUuid(),
        tournamentId: t.id,
        userId,
        role: 'owner',
        createdAt: t.createdAt,
      });
    }
    // 2) Catálogos y scheduling.
    for (const team of teams) await repo.createTeamRow(team);
    for (const player of players) await repo.createPlayerRow(player);
    if (matches.length > 0) await repo.insertMatches(matches);
    if (events.length > 0) await repo.insertMatchEvents(events);
    for (const r of registrations) await repo.createRegistrationRow(r);
    for (const l of logs) await repo.insertAuditLogRow(l);

    migratedForSession = true;
    console.info(
      `[migracion] ${tournaments.length} torneo(s) migrado(s) a Supabase para ${userId}`,
    );
  } catch (err) {
    console.warn(
      '[migracion] No se pudo migrar por completo:',
      err instanceof Error ? err.message : err,
    );
  }
}
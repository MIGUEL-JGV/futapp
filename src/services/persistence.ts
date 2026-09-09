/**
 * Persistencia local (RNF-01 / offline).
 *
 * Guarda en AsyncStorage únicamente los DATOS (catalogos, fixture y eventos),
 * NO la sesión: al reiniciar la app se vuelve a pedir login pero todo lo
 * creado por el usuario queda conservado.
 *
 * El store se mantiene "puro" (no importa AsyncStorage) para que pueda
 * ejecutarse en tests de Node; este módulo es el único punto de contacto con
 * el almacenamiento del dispositivo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFutAppStore, type FutAppState } from '../store/useFutAppStore';

const STORAGE_KEY = 'futapp-store-v1';

/** Campos de datos que se persisten (excluye `user` y las acciones). */
type PersistedSnapshot = Pick<
  FutAppState,
  | 'tournaments'
  | 'teams'
  | 'players'
  | 'selectedTournamentId'
  | 'matches'
  | 'fixture'
  | 'events'
  | 'log'
  | 'members'
  | 'registrations'
  | 'knownUsers'
>;

/** Valida que la snapshot tenga la forma esperada (evita corromper el estado). */
export function isSnapshot(value: unknown): value is PersistedSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Record<string, unknown>;
  if (!Array.isArray(snapshot.tournaments)) return false;
  if (!Array.isArray(snapshot.teams)) return false;
  if (!Array.isArray(snapshot.players)) return false;
  if (!Array.isArray(snapshot.matches)) return false;
  if (!Array.isArray(snapshot.events)) return false;
  // La bitácora es opcional (snapshots previas): arranca vacía si no existe.
  if (snapshot.log !== undefined && !Array.isArray(snapshot.log)) return false;
  // Multi-tenant opcional (snapshots previas): arranca vacío si no existe.
  if (snapshot.members !== undefined && !Array.isArray(snapshot.members))
    return false;
  if (snapshot.registrations !== undefined && !Array.isArray(snapshot.registrations))
    return false;
  if (snapshot.knownUsers !== undefined && !Array.isArray(snapshot.knownUsers))
    return false;
  if (!(snapshot.fixture === null || typeof snapshot.fixture === 'object'))
    return false;
  if (
    snapshot.selectedTournamentId !== null &&
    typeof snapshot.selectedTournamentId !== 'string'
  )
    return false;
  return true;
}

/** Construye la snapshot con solo los campos de datos. */
export function pickSnapshot(state: FutAppState): PersistedSnapshot {
  return {
    tournaments: state.tournaments,
    teams: state.teams,
    players: state.players,
    selectedTournamentId: state.selectedTournamentId,
    matches: state.matches,
    fixture: state.fixture,
    events: state.events,
    log: state.log,
    members: state.members,
    registrations: state.registrations,
    knownUsers: state.knownUsers,
  };
}

/**
 * Carga los datos guardados y los fusiona sobre el estado (merge: conserva las
 * acciones). Devuelve true si había una snapshot válida guardada.
 */
export async function hydrateStore(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) return false;

    useFutAppStore.setState((current) => ({ ...current, ...parsed }));
    return true;
  } catch {
    // Si la lectura falla (formato invalido), se ignora y arranca limpio.
    return false;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Escribe la snapshot (con debounce) tras cada cambio del almacén. */
function queueSave(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = pickSnapshot(useFutAppStore.getState());
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {
      // La escritura es best-effort: nunca debe romper la UI.
    });
  }, 300);
}

/**
 * Suscribe el almacén a la persistencia. Devuelve la función para
 * desuscribirse (no usada normalmente, la app vive mientras dura el proceso).
 */
export function setupPersistence(): () => void {
  return useFutAppStore.subscribe(queueSave);
}
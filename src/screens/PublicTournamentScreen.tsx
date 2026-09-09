/**
 * PublicTournamentScreen (Fase 5 — vista pública).
 *
 * Landing web de solo lectura para seguir un torneo sin sesión.
 * Reutiliza `TournamentTabs` (fixture, partidos, posiciones, estadísticas,
 * bitácora) con el flag `isPublicReadonly` activo, de modo que ningún hook
 * de permisos permita editar.
 *
 * Se alcanza por deep-link `/t/:tournamentId` (o desde el botón
 * "Ver vista pública" del organizador).
 *
 * En modo backend el visitante no tiene datos; la pantalla carga el torneo
 * desde Supabase (policies públicas de lectura) y lo vuelca temporalmente al
 * store. Al salir se restaura la snapshot previa para no pisar la sesión.
 */

import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { useFutAppStore } from '../store/useFutAppStore';
import * as repo from '../services/repository';
import type { RootStackParamList } from '../navigation/types';
import { TournamentTabs } from '../navigation/TournamentTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicTournament'>;

type DataKeys =
  | 'tournaments'
  | 'teams'
  | 'players'
  | 'matches'
  | 'events'
  | 'members'
  | 'registrations'
  | 'log'
  | 'selectedTournamentId';

export function PublicTournamentScreen({ route }: Props) {
  const tournamentId = route.params.tournamentId;
  const setPublicReadonly = useFutAppStore((state) => state.setPublicReadonly);
  const selectTournament = useFutAppStore((state) => state.selectTournament);
  const applyPublicDataset = useFutAppStore((state) => state.applyPublicDataset);
  const restorePublicSnapshot = useFutAppStore(
    (state) => state.restorePublicSnapshot,
  );
  const tournament = useFutAppStore((state) =>
    state.tournaments.find((t) => t.id === tournamentId),
  );

  useEffect(() => {
    let cancelled = false;
    // La vista pública depende de selectedTournamentId (useActiveTournament).
    selectTournament(tournamentId);
    setPublicReadonly(true);

    if (repo.backendActive) {
      // Snapshot del estado antes de cargar el torneo público.
      const state = useFutAppStore.getState();
      const snapshot: Pick<typeof state, DataKeys> = {
        tournaments: state.tournaments,
        teams: state.teams,
        players: state.players,
        matches: state.matches,
        events: state.events,
        members: state.members,
        registrations: state.registrations,
        log: state.log,
        selectedTournamentId: state.selectedTournamentId,
      };

      repo
        .fetchTournamentDatasetById(tournamentId)
        .then((data) => {
          if (cancelled) return;
          applyPublicDataset(data);
        })
        .catch(() => {
          if (cancelled) return;
          applyPublicDataset(null);
        });

      return () => {
        cancelled = true;
        restorePublicSnapshot(snapshot);
        setPublicReadonly(false);
      };
    }

    return () => {
      setPublicReadonly(false);
    };
  }, [tournamentId, selectTournament, setPublicReadonly, applyPublicDataset, restorePublicSnapshot]);

  if (!tournament) {
    return (
      <Screen>
        <EmptyState message="Torneo no encontrado o aún no publicado." />
      </Screen>
    );
  }

  return (
    <TournamentTabs route={{ params: { tournamentId } } as never} />
  );
}
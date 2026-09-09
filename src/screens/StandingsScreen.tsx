/**
 * StandingsScreen (RF-06).
 *
 * Tabla de posiciones del torneo activo calculada con el motor
 * `computeStandings` (PTS > DG > GF) a través del hook `useStandings`.
 */

import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { StandingsTable } from '../components/StandingsTable';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import { useActiveTournament } from '../hooks/useActiveTournament';
import { useStandings } from '../hooks/useStandings';
import { tournamentStatusLabels } from '../constants/labels';
import { colors, fontSizes } from '../theme/colors';
import { TournamentStatus } from '../types';

export function StandingsScreen() {
  const { tournament, teams, matches, events, empty } = useActiveTournament();
  const { width } = useWindowDimensions();
  const compact = width < 640;

  const { rows, highlightTeamIds } = useStandings(
    teams,
    matches,
    events,
    // Resalta el primer equipo como "equipo propio" de demostración.
    { highlightTeamIds: teams.slice(0, 1).map((t) => t.id) },
  );

  const logosByTeamId = Object.fromEntries(
    teams.map((t) => [t.id, t.logoUrl ?? null]),
  );

  if (empty) {
    return (
      <Screen>
        <EmptyState message="Selecciona un torneo desde la pestaña 'Torneos'." />
      </Screen>
    );
  }

  return (
    <Screen>
      <TournamentHeader
        name={tournament!.name}
        subtitle={`Posiciones · Desempate: PTS &gt; DG &gt; GF`}
        statusLabel={tournamentStatusLabels[tournament!.status].label}
        statusTone={tournamentStatusLabels[tournament!.status].tone}
        live={tournament!.status === TournamentStatus.InProgress}
      />

      <View style={styles.table}>
        <StandingsTable
          rows={rows}
          highlightTeamIds={highlightTeamIds}
          compact={compact}
          logosByTeamId={logosByTeamId}
        />
      </View>

      <Text style={styles.footer}>
        Desempate: PTS &gt; DG &gt; GF · 3 pts victoria, 1 empate, 0 derrota
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
    marginBottom: 12,
  },
  table: {
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSizes.tableCell,
  },
});
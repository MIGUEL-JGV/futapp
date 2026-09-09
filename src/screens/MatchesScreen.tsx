/**
 * MatchesScreen (RF-05).
 *
 * Lista los partidos del torneo activo agrupados por jornada, con estado y
 * marcador. Tocar un partido abre la captura de resultados.
 */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PulseDot } from '../components/ui/PulseDot';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { matchStatusLabels, tournamentStatusLabels } from '../constants/labels';
import { useActiveTournament, teamById } from '../hooks/useActiveTournament';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontSizes } from '../theme/colors';
import {
  formatDayLabel,
  formatKickoffTime,
  kickoffDayKey,
  resolveMatchScore,
} from '../utils/algorithms';
import { MatchStatus, TournamentStatus } from '../types';

type Filter = 'ALL' | 'PENDING' | 'FINISHED';

export function MatchesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<Filter>('ALL');
  const { tournament, teams, matches, events, empty } = useActiveTournament();

  if (empty) {
    return (
      <Screen>
        <EmptyState message="Selecciona un torneo desde la pestaña 'Torneos'." />
      </Screen>
    );
  }

  const visible = matches.filter((m) => {
    if (filter === 'FINISHED') return m.status === MatchStatus.Finished;
    if (filter === 'PENDING') return m.status !== MatchStatus.Finished;
    return true;
  });

  // Agrupa por DÍA de juego (no por horario): cada fecha es una sección y
  // dentro de ella los partidos se ordenan por su hora.
  const grouped = new Map<string, typeof visible>();
  for (const match of visible) {
    const key = kickoffDayKey(match.scheduledAt) ?? '__none__';
    const list = grouped.get(key) ?? [];
    list.push(match);
    grouped.set(key, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) =>
      String(a.scheduledAt).localeCompare(String(b.scheduledAt ?? '')),
    );
  }
  const days = [...grouped.entries()].sort((a, b) => {
    if (a[0] === '__none__') return 1;
    if (b[0] === '__none__') return -1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <Screen>
      <TournamentHeader
        name={tournament!.name}
        subtitle={`Captura de resultados (RF-05) · ${visible.length} partido(s)`}
        statusLabel={tournamentStatusLabels[tournament!.status].label}
        statusTone={tournamentStatusLabels[tournament!.status].tone}
        live={tournament!.status === TournamentStatus.InProgress}
      />

      <Segment
        options={[
          { label: 'Todos', value: 'ALL' },
          { label: 'Pendientes', value: 'PENDING' },
          { label: 'Finalizados', value: 'FINISHED' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {days.map(([dayKey, dayMatches]) => (
        <View key={dayKey} style={styles.round}>
          <View style={styles.dayHeader}>
            <Text style={styles.roundTitle}>
              {dayKey === '__none__'
                ? 'Sin fecha asignada'
                : formatDayLabel(dayMatches[0].scheduledAt)}
            </Text>
            <Text style={styles.dayCount}>
              {dayMatches.length} partido(s)
            </Text>
          </View>
          {dayMatches.map((match) => {
            const bye = match.homeTeamId === null || match.awayTeamId === null;
            const homeTeam = teamById(teams, match.homeTeamId);
            const awayTeam = teamById(teams, match.awayTeamId);
            const score =
              match.status === MatchStatus.Finished &&
              !bye
                ? (() => {
                    const s = resolveMatchScore(
                      events.filter((e) => e.matchId === match.id),
                      match.homeTeamId,
                      match.awayTeamId,
                    );
                    return `${s.homeScore} - ${s.awayScore}`;
                  })()
                : null;
            const status = matchStatusLabels[match.status];

            return (
              <View
                key={match.id}
                style={styles.matchRow}>
                <View style={styles.info}>
                  {bye ? (
                    <Text style={styles.matchText} numberOfLines={1}>
                      {homeTeam?.name ?? awayTeam?.name} — descanso
                    </Text>
                  ) : (
                    <View style={styles.teams}>
                      <View style={styles.teamLine}>
                        <Avatar uri={homeTeam?.logoUrl} label={homeTeam?.name} size={22} />
                        <Text style={styles.teamLineText} numberOfLines={1}>
                          {homeTeam?.name ?? 'Local'}
                        </Text>
                      </View>
                      <Text style={styles.vsText}>vs</Text>
                      <View style={styles.teamLine}>
                        <Avatar uri={awayTeam?.logoUrl} label={awayTeam?.name} size={22} />
                        <Text style={styles.teamLineText} numberOfLines={1}>
                          {awayTeam?.name ?? 'Visitante'}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.meta}>
                    {match.status === MatchStatus.InProgress && (
                      <PulseDot color={colors.success} size={8} />
                    )}
                    <Text style={styles.metaRound}>Jornada {match.round}</Text>
                    <Chip label={status.label} tone={status.tone} />
                    {match.status === MatchStatus.Scheduled && (
                      <Text style={styles.metaText}>
                        {formatKickoffTime(match.scheduledAt)}
                      </Text>
                    )}
                  </View>
                </View>
                {score && <Text style={styles.score}>{score}</Text>}
                {!bye && (
                  <Button
                    title="Abrir"
                    small
                    variant="ghost"
                    onPress={() =>
                      navigation.navigate('MatchDetail', { matchId: match.id })
                    }
                  />
                )}
              </View>
            );
          })}
        </View>
      ))}

      {visible.length === 0 && (
        <EmptyState message="No hay partidos en este filtro." />
      )}
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
  round: {
    marginTop: 14,
  },
  roundTitle: {
    fontWeight: '800',
    color: colors.textPrimary,
    fontSize: fontSizes.tableValue,
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayCount: {
    fontSize: fontSizes.tableHeader,
    color: colors.textSecondary,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  teams: {
    gap: 4,
  },
  teamLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLineText: {
    flex: 1,
    fontSize: fontSizes.tableCell,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  vsText: {
    alignSelf: 'flex-start',
    marginLeft: 30,
    fontSize: fontSizes.tableHeader,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  matchText: {
    fontSize: fontSizes.tableCell,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: fontSizes.tableHeader,
    color: colors.textSecondary,
  },
  metaRound: {
    fontSize: fontSizes.tableHeader,
    fontWeight: '700',
    color: colors.accent,
  },
  score: {
    fontSize: fontSizes.tableValue,
    fontWeight: '900',
    color: colors.textPrimary,
    marginRight: 10,
  },
});
/**
 * FixtureScreen (RF-04).
 *
 * Muestra el calendario generado por Round-Robin del torneo activo,
 * agrupado por jornadas, con marcadores de los partidos finalizados.
 * El administrador puede generar el fixture si aún no existe.
 */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { PulseDot } from '../components/ui/PulseDot';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import { matchStatusLabels, tournamentStatusLabels } from '../constants/labels';
import { useActiveTournament, teamById } from '../hooks/useActiveTournament';
import { useCanEditActiveTournament } from '../hooks/useRole';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { formatKickoff, resolveMatchScore } from '../utils/algorithms';
import { MatchStatus, TournamentStatus } from '../types';

export function FixtureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const canEdit = useCanEditActiveTournament();
  const [doubleRound, setDoubleRound] = useState(true);

  const { tournament, teams, matches, events, empty } = useActiveTournament();
  const generateFixture = useFutAppStore((state) => state.generateFixture);

  if (empty) {
    return (
      <Screen>
        <EmptyState message="Selecciona un torneo desde la pestaña 'Torneos' para ver su calendario." />
      </Screen>
    );
  }

  const grouped = new Map<number, typeof matches>();
  for (const match of matches) {
    const list = grouped.get(match.round) ?? [];
    list.push(match);
    grouped.set(match.round, list);
  }
  const rounds = [...grouped.entries()].sort((a, b) => a[0] - b[0]);

  const scoreOf = (match: (typeof matches)[number]) => {
    if (match.status !== MatchStatus.Finished) return null;
    const score = resolveMatchScore(
      events.filter((e) => e.matchId === match.id),
      match.homeTeamId,
      match.awayTeamId,
    );
    return `${score.homeScore} - ${score.awayScore}`;
  };

  const handleGenerate = () => {
    try {
      generateFixture(tournament!.id, doubleRound);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <Screen>
      <TournamentHeader
        name={tournament!.name}
        subtitle={`${rounds.length} jornada(s) · ${matches.length} partido(s)`}
        statusLabel={tournamentStatusLabels[tournament!.status].label}
        statusTone={tournamentStatusLabels[tournament!.status].tone}
        live={tournament!.status === TournamentStatus.InProgress}
      />

      {matches.length === 0 && canEdit && (
        <View style={styles.section}>
          <Text style={styles.label}>Generar calendario automático (RF-04)</Text>
          <Segment
            options={[
              { label: 'Ida y vuelta', value: true },
              { label: 'Ida', value: false },
            ]}
            value={doubleRound}
            onChange={setDoubleRound}
          />
          <View style={styles.section}>
            <Button title="Generar calendario" onPress={handleGenerate} />
          </View>
        </View>
      )}

      {matches.length === 0 && !canEdit && (
        <EmptyState message="Aún no hay calendario generado." />
      )}

      {rounds.map(([roundNumber, roundMatches]) => (
        <View key={roundNumber} style={styles.round}>
          <View style={styles.roundHeader}>
            <Text style={styles.roundTitle}>Jornada {roundNumber}</Text>
            <Chip
              label={`${roundMatches.filter((m) => m.status === MatchStatus.Finished).length}/${roundMatches.length} jugados`}
              tone={roundMatches.every((m) => m.status === MatchStatus.Finished) ? 'positive' : 'neutral'}
            />
          </View>

          {roundMatches.map((match) => {
            const bye = match.homeTeamId === null || match.awayTeamId === null;
            const homeTeam = teamById(teams, match.homeTeamId);
            const awayTeam = teamById(teams, match.awayTeamId);
            const score = scoreOf(match);
            const status = matchStatusLabels[match.status];

            return (
              <View
                key={match.id}
                style={styles.matchRow}>
                <View style={styles.matchInfo}>
                  {bye ? (
                    <>
                      <Text style={styles.matchText} numberOfLines={1}>
                        Descanso de jornada
                      </Text>
                      <Text style={styles.byeText}>
                        {homeTeam?.name ?? awayTeam?.name} descansa
                      </Text>
                    </>
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
                  {!bye && match.scheduledAt && (
                    <Text style={styles.kickoff}>
                      {formatKickoff(match.scheduledAt)}
                    </Text>
                  )}
                </View>
                {score && (
                  <Text style={styles.score} numberOfLines={1}>
                    {score}
                  </Text>
                )}
                {match.status === MatchStatus.InProgress && (
                  <PulseDot color={colors.success} size={8} />
                )}
                <Chip label={status.label} tone={status.tone} />

                <View style={styles.matchActions}>
                  <Button
                    title="Abrir"
                    small
                    variant="ghost"
                    onPress={() =>
                      navigation.navigate('MatchDetail', { matchId: match.id })
                    }
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  label: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  round: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.headerBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roundTitle: {
    color: colors.headerText,
    fontWeight: '900',
    fontSize: fontSizes.tableValue,
    letterSpacing: 0.5,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  matchInfo: {
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
  byeText: {
    fontSize: fontSizes.tableHeader,
    color: colors.accentAlt,
    fontStyle: 'italic',
  },
  kickoff: {
    fontSize: fontSizes.tableHeader,
    color: colors.textSecondary,
    marginTop: 2,
  },
  score: {
    fontWeight: '900',
    fontSize: fontSizes.tableValue,
    color: colors.textPrimary,
    marginRight: 8,
  },
  matchActions: {
    marginLeft: 8,
  },
});
/**
 * StatsScreen (RF-07) — panel de estadísticas con gráficas.
 *
 * Secciones:
 *  - Métricas rápidas (partidos, goles, promedio, amarillas).
 *  - Goles por equipo (barras horizontales animadas).
 *  - Distribución de goles (dona) y liga.
 *  - ¿Cuándo se marca? (barras verticales por tramo de minutos).
 *  - Disciplina: amarillas vs rojas (dona) y tarjetas por equipo.
 *  - Top goleadores y reporte de tarjetas/suspendidos (tablas RF-07).
 *
 * Todos los datos provienen de los eventos registrados por el admin al
 * actualizar cada partido (quién marcó y en qué minuto).
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '../components/charts/BarChart';
import { DonutChart, DonutLegend } from '../components/charts/DonutChart';
import { ProgressBar } from '../components/charts/ProgressBar';
import { StatCard } from '../components/charts/StatCard';
import { cardRed, cardYellow, colorForIndex } from '../components/charts/chartTheme';
import { Chip } from '../components/ui/Chip';
import { DataTable, type DataColumn } from '../components/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import { useActiveTournament } from '../hooks/useActiveTournament';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useStandings } from '../hooks/useStandings';
import { tournamentStatusLabels } from '../constants/labels';
import { colors, fontSizes, radius, shadows } from '../theme/colors';
import { MatchEventType, MatchStatus, TournamentStatus } from '../types';
import type { AssistRow, CardRow, ScorerRow } from '../utils/algorithms';

const scorerColumns: Array<DataColumn<ScorerRow>> = [
  {
    key: 'pos',
    label: '#',
    flex: 0.5,
    alignRight: true,
    render: (_row, index) => index + 1,
  },
  {
    key: 'goals',
    label: 'GOLES',
    flex: 1,
    alignRight: true,
    cellStyle: 'bold',
    render: (row) => row.goals,
  },
  {
    key: 'player',
    label: 'JUGADOR',
    flex: 2.2,
    render: (row) => row.playerName,
  },
  {
    key: 'team',
    label: 'EQUIPO',
    flex: 1.8,
    render: (row) => row.teamName,
  },
];

const assistColumns: Array<DataColumn<AssistRow>> = [
  {
    key: 'pos',
    label: '#',
    flex: 0.5,
    alignRight: true,
    render: (_row, index) => index + 1,
  },
  {
    key: 'assists',
    label: 'ASIST.',
    flex: 1,
    alignRight: true,
    cellStyle: 'bold',
    render: (row) => row.assists,
  },
  {
    key: 'player',
    label: 'JUGADOR',
    flex: 2.2,
    render: (row) => row.playerName,
  },
  {
    key: 'team',
    label: 'EQUIPO',
    flex: 1.8,
    render: (row) => row.teamName,
  },
];

const cardColumns: Array<DataColumn<CardRow>> = [
  {
    key: 'player',
    label: 'JUGADOR',
    flex: 2.2,
    render: (row) => row.playerName,
  },
  {
    key: 'team',
    label: 'EQUIPO',
    flex: 1.8,
    render: (row) => row.teamName,
  },
  {
    key: 'yellow',
    label: 'A',
    flex: 0.8,
    alignRight: true,
    render: (row) => row.yellowCards,
  },
  {
    key: 'red',
    label: 'R',
    flex: 0.8,
    alignRight: true,
    cellStyle: 'bold',
    render: (row) => row.redCards,
  },
  {
    key: 'susp',
    label: 'SUSP.',
    flex: 1.3,
    alignRight: true,
    render: (row) => (row.suspended ? 'SÍ' : 'NO'),
  },
];

function ChartSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** Abreviatura corta para leyendas y barras. */
function shortName(name: string): string {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

export function StatsScreen() {
  const { tournament, teams, players, matches, events, empty } =
    useActiveTournament();
  const { scorers, assists, cards, timeline, discipline, cardsByTeam } =
    usePlayerStats(
      players,
      teams,
      events,
    );
  const { rows: standingRows } = useStandings(teams, matches, events);

  if (empty) {
    return (
      <Screen>
        <EmptyState message="Selecciona un torneo desde la pestaña 'Torneos'." />
      </Screen>
    );
  }

  const finishedMatches = matches.filter(
    (m) => m.status === MatchStatus.Finished,
  ).length;
  const totalGoals = events.filter((e) => e.type === MatchEventType.Goal).length;
  const avgGoals = finishedMatches > 0 ? totalGoals / finishedMatches : 0;

  const goalsByTeam = [...standingRows]
    .sort((a, b) => b.goalsFor - a.goalsFor)
    .slice(0, 6);
  const maxGoals = Math.max(1, ...goalsByTeam.map((r) => r.goalsFor));

  // Dona de distribución de goles: top 4 + "Otros".
  const topTeams = goalsByTeam.slice(0, 4);
  const othersGoals = goalsByTeam
    .slice(4)
    .reduce((sum, r) => sum + r.goalsFor, 0);
  const distribution: Array<{
    label: string;
    value: number;
    color: string;
  }> = topTeams.map((r, i) => ({
    label: shortName(r.teamName),
    value: r.goalsFor,
    color: colorForIndex(i),
  }));
  if (othersGoals > 0) {
    distribution.push({
      label: 'Otros',
      value: othersGoals,
      color: '#94A3B8',
    });
  }

  const timeLabel = (m: number): string =>
    m > 0 ? m.toFixed(1) : '0.0';

  const topScorers = scorers.slice(0, 5);
  const maxGoalsScorers = Math.max(1, ...topScorers.map((s) => s.goals));

  const topAssists = assists.slice(0, 5);
  const maxAssists = Math.max(1, ...topAssists.map((s) => s.assists));

  return (
    <Screen>
      <TournamentHeader
        name={tournament!.name}
        subtitle={`Estadísticas del torneo`}
        statusLabel={tournamentStatusLabels[tournament!.status].label}
        statusTone={tournamentStatusLabels[tournament!.status].tone}
        live={tournament!.status === TournamentStatus.InProgress}
      />

      <View style={styles.grid}>
        <StatCard
          label="Partidos"
          value={finishedMatches}
          accent={colors.brand}
          icon="⚽"
          delay={0}
        />
        <StatCard
          label="Goles"
          value={totalGoals}
          accent="#0EA5E9"
          icon="🎯"
          delay={80}
        />
        <StatCard
          label="Goles/P"
          value={avgGoals}
          accent="#F59E0B"
          icon="📈"
          delay={160}
          formatValue={timeLabel}
        />
        <StatCard
          label="Amarillas"
          value={discipline.yellows}
          accent={cardYellow}
          icon="🟨"
          delay={240}
        />
      </View>

      <ChartSection
        title="⚽ Goles por equipo"
        subtitle={`Los partidos finalizados acumulan vértigo ofensivo; el verde marca los más goleadores.`}>
        {goalsByTeam.map((row, i) => (
          <ProgressBar
            key={row.teamId}
            label={shortName(row.teamName)}
            value={row.goalsFor}
            max={maxGoals}
            color={colorForIndex(i)}
            unit="goles"
            delay={i * 90}
          />
        ))}
        {goalsByTeam.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no hay partidos finalizados.
          </Text>
        ) : null}
      </ChartSection>

      <ChartSection
        title="🍩 Distribución de goles"
        subtitle="¿Quién se lleva la porción mayor? Participación ofensiva de cada equipo.">
        <DonutChart
          data={distribution}
          centerValueFormatted={String(totalGoals)}
          centerLabel="goles totales"
        />
        <DonutLegend data={distribution} />
      </ChartSection>

      <ChartSection
        title="⏱ ¿Cuándo se marca?"
        subtitle="Goles por tramo de minutos. Bajo la lupa: los arranques y los finales apretados.">
        <BarChart
          data={timeline.map((b, i) => ({
            label: b.label,
            value: b.count,
            color: colorForIndex(i),
          }))}
          unit="goles"
          viewWidth={50 * 6}
          valueFormatter={(v) => String(v)}
        />
      </ChartSection>

      <ChartSection
        title="🟨🟥 Disciplina"
        subtitle="Amarillas vs rojas y acumulado por equipo (roja pesa doble).">
        <DonutChart
          data={[
            { label: 'Amarillas', value: discipline.yellows, color: cardYellow },
            { label: 'Rojas', value: discipline.reds, color: cardRed },
          ]}
          size={140}
          thickness={26}
          centerValueFormatted={String(discipline.yellows + discipline.reds)}
          centerLabel="tarjetas"
        />
        <DonutLegend
          data={[
            { label: 'Amarillas', value: discipline.yellows, color: cardYellow },
            { label: 'Rojas', value: discipline.reds, color: cardRed },
          ]}
        />
        {cardsByTeam.map((row, i) => (
          <ProgressBar
            key={row.teamId}
            label={shortName(row.teamName)}
            value={row.penalty}
            max={Math.max(1, ...cardsByTeam.map((c) => c.penalty))}
            color={row.reds > 0 ? cardRed : cardYellow}
            unit="acumulado"
            delay={i * 90}
            valueFormatter={(v) =>
              `${Math.round(v)} (${row.yellows}A · ${row.reds}R)`
            }
          />
        ))}
      </ChartSection>

      {topScorers.length > 0 ? (
        <ChartSection
          title="🏆 Carrera por el pichichi"
          subtitle="Top 5 goleadores. Cada gol de hace exactamente en el minuto que el admin registró.">
          {topScorers.map((s, i) => (
            <ProgressBar
              key={s.playerId ?? s.playerName}
              label={`${s.playerName} · ${s.teamName}`}
              value={s.goals}
              max={maxGoalsScorers}
              color={i === 0 ? '#F59E0B' : colorForIndex(i)}
              unit="goles"
              delay={i * 90}
            />
          ))}
        </ChartSection>
      ) : null}

      <ChartSection title="Top goleadores (completo)">
        <DataTable
          columns={scorerColumns}
          rows={scorers}
          rowKey={(row) => row.playerId ?? row.playerName}
        />
      </ChartSection>

      {topAssists.length > 0 ? (
        <ChartSection
          title="🎯 Carrera por el asistente"
          subtitle="Top 5 asistentes. La asistencia se registra al capturar cada gol.">
          {topAssists.map((s, i) => (
            <ProgressBar
              key={s.playerId ?? s.playerName}
              label={`${s.playerName} · ${s.teamName}`}
              value={s.assists}
              max={maxAssists}
              color={i === 0 ? '#F59E0B' : colorForIndex(i)}
              unit="asistencias"
              delay={i * 90}
            />
          ))}
        </ChartSection>
      ) : null}

      <ChartSection title="Top asistencias (completo)">
        <DataTable
          columns={assistColumns}
          rows={assists}
          rowKey={(row) => row.playerId ?? row.playerName}
        />
      </ChartSection>

      <ChartSection title="Tarjetas / Suspendidos">
        <DataTable
          columns={cardColumns}
          rows={cards}
          rowKey={(row) => row.playerId ?? row.playerName}
        />
        <View style={styles.legend}>
          <Chip label="SUSP = roja o 5 amarillas" tone="neutral" />
        </View>
      </ChartSection>

      <Text style={styles.note}>
        Las gráficas se generan con los eventos de cada partido: el creador
        del torneo registra quién marcó y en qué minuto, y el panel se
        actualiza al instante.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    ...shadows.card,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  note: {
    marginTop: 22,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
});
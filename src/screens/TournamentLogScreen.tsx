/**
 * TournamentLogScreen — Bitácora de cambios del torneo.
 *
 * Registra con FECHA y HORA cada modificación (torneos, equipos, jugadores,
 * fixture, partidos y eventos). Las ediciones hechas en un partido ya
 * FINALIZADO incluyen la justificación obligatoria del usuario (RNF-04).
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import { tournamentStatusLabels } from '../constants/labels';
import { useActiveTournament } from '../hooks/useActiveTournament';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { TournamentStatus, type AuditLogAction, type AuditLogEntry } from '../types';

type LogFilter = 'ALL' | 'MATCHES' | 'CATALOG';

const actionLabels: Record<AuditLogAction, string> = {
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  SIGNUP: 'Registro de usuario',
  DEMO_DATA_LOADED: 'Carga de datos demo',
  TOURNAMENT_CREATED: 'Torneo creado',
  TOURNAMENT_UPDATED: 'Torneo actualizado',
  TOURNAMENT_DELETED: 'Torneo eliminado',
  TEAM_ADDED: 'Equipo agregado',
  TEAM_UPDATED: 'Equipo actualizado',
  TEAM_REMOVED: 'Equipo eliminado',
  TEAM_REGISTRATION_SUBMITTED: 'Inscripción recibida',
  TEAM_REGISTRATION_APPROVED: 'Inscripción aprobada',
  TEAM_REGISTRATION_REJECTED: 'Inscripción rechazada',
  PLAYER_ADDED: 'Jugador agregado',
  PLAYER_UPDATED: 'Jugador actualizado',
  PLAYER_REMOVED: 'Jugador eliminado',
  FIXTURE_GENERATED: 'Calendario generado',
  FIXTURE_RESET: 'Calendario reiniciado',
  MATCH_STARTED: 'Partido iniciado',
  MATCH_FINISHED: 'Partido finalizado',
  GOAL_RECORDED: 'Gol registrado',
  GOAL_REMOVED: 'Gol retirado',
  CARD_RECORDED: 'Tarjeta registrada',
  CARD_REMOVED: 'Tarjeta retirada',
  MEMBER_INVITED: 'Miembro invitado',
  MEMBER_REMOVED: 'Miembro retirado',
};

type Tone = 'positive' | 'warning' | 'danger' | 'neutral';

const dangerActions: AuditLogAction[] = [
  'TOURNAMENT_DELETED',
  'TEAM_REMOVED',
  'PLAYER_REMOVED',
  'GOAL_REMOVED',
  'CARD_REMOVED',
  'TEAM_REGISTRATION_REJECTED',
  'MEMBER_REMOVED',
  'LOGOUT',
];

const warningActions: AuditLogAction[] = [
  'CARD_RECORDED',
  'FIXTURE_RESET',
  'DEMO_DATA_LOADED',
  'LOGIN',
  'TEAM_REGISTRATION_SUBMITTED',
  'MEMBER_INVITED',
];

function actionTone(action: AuditLogAction): Tone {
  if (dangerActions.includes(action)) return 'danger';
  if (warningActions.includes(action)) return 'warning';
  return 'positive';
}

/** Formatea la fecha/hora: '05/09/2026 · 17:00'. */
function formatLogDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TournamentLogScreen() {
  const { tournament, teams, matches, empty } = useActiveTournament();
  const log = useFutAppStore((state) => state.log);
  const [filter, setFilter] = useState<LogFilter>('ALL');

  if (empty || !tournament) {
    return (
      <Screen>
        <EmptyState message="Selecciona un torneo desde la pestaña 'Torneos'." />
      </Screen>
    );
  }

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const matchRound = new Map(matches.map((m) => [m.id, `Jornada ${m.round}`]));

  const tournamentEntries = log.filter((e) => e.tournamentId === tournament.id);
  const visible = tournamentEntries.filter((e) => {
    if (filter === 'MATCHES') return e.matchId != null;
    if (filter === 'CATALOG') return e.matchId == null;
    return true;
  });
  const sorted = [...visible].sort((a, b) => b.at.localeCompare(a.at));

  const subtitle = (entry: AuditLogEntry): string | null => {
    const context =
      entry.matchId != null ? matchRound.get(entry.matchId) : null;
    return context ?? null;
  };

  return (
    <Screen>
      <TournamentHeader
        name={tournament.name}
        subtitle="Bitácora de cambios con fecha y hora"
        statusLabel={tournamentStatusLabels[tournament.status].label}
        statusTone={tournamentStatusLabels[tournament.status].tone}
        live={tournament.status === TournamentStatus.InProgress}
      />

      <View style={styles.filter}>
        <Segment
          options={[
            { label: 'Todos', value: 'ALL' },
            { label: 'Partidos', value: 'MATCHES' },
            { label: 'Catálogo', value: 'CATALOG' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <Text style={styles.sectionTitle}>Registro ({sorted.length})</Text>

      {sorted.length === 0 && (
        <EmptyState message="Aún no hay cambios registrados en este torneo." />
      )}

      {sorted.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Chip
              label={actionLabels[entry.action] ?? entry.action}
              tone={actionTone(entry.action)}
            />
            {subtitle(entry) ? (
              <Text style={styles.round}>{subtitle(entry)}</Text>
            ) : null}
          </View>
          <Text style={styles.detail}>{entry.detail}</Text>
          {entry.justification ? (
            <View style={styles.justification}>
              <Text style={styles.justText}>
                Justificación: {entry.justification}
              </Text>
            </View>
          ) : null}
          <Text style={styles.meta}>
            {formatLogDate(entry.at)} · {entry.actor}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 18,
    marginBottom: 10,
  },
  entry: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: {
    fontSize: fontSizes.tableHeader,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detail: {
    fontSize: fontSizes.tableCell,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  justification: {
    backgroundColor: colors.warningSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  justText: {
    fontSize: fontSizes.tableHeader,
    fontStyle: 'italic',
    color: colors.warning,
  },
  meta: {
    fontSize: fontSizes.tableHeader,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
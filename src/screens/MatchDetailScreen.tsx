/**
 * MatchDetailScreen (RF-05 y RNF-04).
 *
 * Captura de lo ocurrido en el partido:
 *  - Registrar goles (jugador + minuto + asistencia opcional), tarjetas
 *    amarillas y rojas.
 *  - El marcador se calcula sumando los eventos `GOAL`.
 *  - RNF-04: un partido FINALIZADO ya no queda bloqueado: el admin puede
 *    seguir cambiando el marcador y las tarjetas, PERO cada cambio exige una
 *    justificación obligatoria (se registra en la bitácora).
 */

import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { PulseDot } from '../components/ui/PulseDot';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TextField } from '../components/ui/TextField';
import { matchStatusLabels, positionLabels } from '../constants/labels';
import { useCanEditActiveTournament } from '../hooks/useRole';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes, radius } from '../theme/colors';
import { formatKickoff, resolveMatchScore } from '../utils/algorithms';
import { usePop } from '../utils/animation';
import { useShallow } from 'zustand/react/shallow';
import {
  MatchEventType,
  MatchStatus,
  type MatchEvent,
  type Player,
} from '../types';

type EventTypeChoice = MatchEventType.Goal | MatchEventType.YellowCard | MatchEventType.RedCard;

interface EventDraft {
  type: EventTypeChoice;
  team: 'home' | 'away';
  minute: string;
  playerId: string | null;
  note: string;
  assistPlayerId: string | null;
  justification: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

export function MatchDetailScreen({ route }: Props) {
  const matchId = route.params.matchId;
  const pop = usePop();

  const canEdit = useCanEditActiveTournament();
  const match = useFutAppStore(
    useShallow((state) => state.matches.find((m) => m.id === matchId)),
  );
  const teams = useFutAppStore((state) => state.teams);
  const players = useFutAppStore((state) => state.players);
  const events = useFutAppStore(
    useShallow((state) =>
      state.events.filter((e) => e.matchId === matchId),
    ),
  );
  const startMatch = useFutAppStore((state) => state.startMatch);
  const finishMatch = useFutAppStore((state) => state.finishMatch);
  const recordGoal = useFutAppStore((state) => state.recordGoal);
  const recordCard = useFutAppStore((state) => state.recordCard);
  const removeEvent = useFutAppStore((state) => state.removeEvent);

  const [modalOpen, setModalOpen] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<MatchEvent | null>(null);

  if (!match) {
    return (
      <Screen>
        <EmptyState message="Partido no encontrado." />
      </Screen>
    );
  }

  const bye = match.homeTeamId === null || match.awayTeamId === null;
  const finished = match.status === MatchStatus.Finished;
  // RNF-04: el admin/moderador puede editar eventos en cualquier estado; si el partido
  // ya terminó, cada cambio exige justificación obligatoria.
  const editable = canEdit && !bye;

  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const homePlayers = players.filter((p) => p.teamId === match.homeTeamId);
  const awayPlayers = players.filter((p) => p.teamId === match.awayTeamId);

  const score = resolveMatchScore(
    events,
    match.homeTeamId,
    match.awayTeamId,
  );

  const teamLookup = new Map(teams.map((t) => [t.id, t.name]));

  const sortedEvents = [...events].sort(
    (a, b) => a.minute - b.minute || a.createdAt.localeCompare(b.createdAt),
  );

  const status = matchStatusLabels[match.status];

  const handleStart = () => {
    try {
      startMatch(match.id);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Finalizar partido',
      'Al finalizar, los cambios posteriores requerirán justificación obligatoria (RNF-04). ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () => finishMatch(match.id),
        },
      ],
    );
  };

  const handleSaveEvent = (draft: EventDraft) => {
    const parsedMinute = Number.parseInt(draft.minute, 10);
    if (Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 120) {
      Alert.alert('Validación', 'El minuto debe estar entre 0 y 120.');
      return;
    }
    if (finished && !draft.justification.trim()) {
      Alert.alert(
        'Justificación requerida',
        'El partido ya finalizó: es obligatorio escribir por qué haces este cambio (RNF-04).',
      );
      return;
    }

    const jurisdiction = draft.justification.trim() || null;
    const teamId = draft.team === 'home' ? match.homeTeamId! : match.awayTeamId!;

    if (draft.type === MatchEventType.Goal) {
      recordGoal({
        matchId: match.id,
        teamId,
        playerId: draft.playerId,
        minute: parsedMinute,
        note: draft.note || null,
        assistPlayerId: draft.assistPlayerId,
        justification: jurisdiction,
      });
    } else {
      recordCard({
        matchId: match.id,
        teamId,
        playerId: draft.playerId,
        minute: parsedMinute,
        type: draft.type,
        note: draft.note || null,
        justification: jurisdiction,
      });
    }
    setModalOpen(false);
  };

  const handleRemovePress = (event: MatchEvent) => {
    if (!finished) {
      removeEvent(event.id);
      return;
    }
    setRemovalTarget(event);
  };

  const handleRemoveConfirm = (justification: string) => {
    if (!removalTarget) return;
    if (!justification.trim()) {
      Alert.alert(
        'Justificación requerida',
        'El partido ya finalizó: es obligatorio escribir por qué quitas este evento (RNF-04).',
      );
      return;
    }
    removeEvent(removalTarget.id, justification.trim() || null);
    setRemovalTarget(null);
  };

  return (
    <Screen>
      {bye ? (
        <EmptyState message="Este es un descanso de jornada (fixture impar)." />
      ) : (
        <>
          <LinearGradient
            colors={colors.gradientDark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreboard}>
            <View style={styles.teamsRow}>
              <View style={styles.teamCell}>
                <Avatar uri={homeTeam?.logoUrl} label={homeTeam?.name} size={44} />
                <Text style={styles.teamName} numberOfLines={2}>
                  {homeTeam?.name ?? 'Local'}
                </Text>
              </View>
              <View style={[styles.scoreCell, pop.style]}>
                <Text style={styles.scoreText}>
                  {score.homeScore}
                </Text>
                <Text style={styles.scoreDash}>–</Text>
                <Text style={styles.scoreText}>
                  {score.awayScore}
                </Text>
              </View>
              <View style={styles.teamCell}>
                <Avatar uri={awayTeam?.logoUrl} label={awayTeam?.name} size={44} />
                <Text style={[styles.teamName, styles.teamNameAway]} numberOfLines={2}>
                  {awayTeam?.name ?? 'Visitante'}
                </Text>
              </View>
            </View>
            <View style={styles.scoreboardStatus}>
              {match.status === MatchStatus.InProgress ? (
                <View style={styles.liveStatus}>
                  <PulseDot color={colors.gold} size={8} />
                  <Text style={styles.liveStatusText}>EN JUEGO</Text>
                </View>
              ) : (
                <Chip label={status.label} tone={status.tone} />
              )}
            </View>
            <Text style={styles.kickoff}>
              Jornada {match.round} · {formatKickoff(match.scheduledAt)}
            </Text>
          </LinearGradient>

          {finished && (
            <View style={styles.locked}>
              <Chip label="PARTIDO FINALIZADO · LOS CAMBIOS REQUIEREN JUSTIFICACIÓN" tone="warning" />
            </View>
          )}

          {editable && match.status === MatchStatus.Scheduled && (
            <View style={styles.section}>
              <Button title="Iniciar partido" onPress={handleStart} />
            </View>
          )}

          {editable && match.status === MatchStatus.InProgress && (
            <>
              <View style={styles.section}>
                <Button title="+ Registrar evento" onPress={() => setModalOpen(true)} />
              </View>
              <View style={styles.section}>
                <Button
                  title="Finalizar partido"
                  variant="ghost"
                  onPress={handleFinish}
                />
              </View>
            </>
          )}

          {editable && match.status === MatchStatus.Finished && (
            <View style={styles.section}>
              <Button title="+ Modificar marcador / tarjetas" onPress={() => setModalOpen(true)} />
            </View>
          )}

          {!canEdit && (
            <Text style={styles.meta}>Invitado: visualización en modo lectura.</Text>
          )}

          <Text style={styles.sectionTitle}>Eventos ({sortedEvents.length})</Text>
          {sortedEvents.length === 0 && (
            <EmptyState message="Sin eventos registrados." />
          )}

          {sortedEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Chip label={eventLabel(event.type)} tone={eventTone(event.type)} />
              <Text style={styles.minute}>min {event.minute}</Text>
              <View style={styles.eventBody}>
                <Text style={styles.eventText} numberOfLines={2}>
                  {eventPlayerName(event, [...homePlayers, ...awayPlayers])}
                </Text>
                <Text style={styles.eventSub}>
                  {eventTeamName(event, teamLookup)}
                  {event.type === MatchEventType.Goal && event.assistPlayerId
                    ? ` · asist. ${eventAssistName(event, [...homePlayers, ...awayPlayers])}`
                    : ''}
                </Text>
              </View>
              {editable && (
                <Button
                  title="Quitar"
                  variant="danger"
                  small
                  onPress={() => handleRemovePress(event)}
                />
              )}
            </View>
          ))}
        </>
      )}

      {editable && (
        <EventModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          requestJustification={finished}
          homeTeamId={match.homeTeamId ?? ''}
          awayTeamId={match.awayTeamId ?? ''}
          homeTeamName={homeTeam?.name ?? 'Local'}
          awayTeamName={awayTeam?.name ?? 'Visitante'}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onSave={handleSaveEvent}
        />
      )}

      {editable && (
        <JustificationModal
          visible={removalTarget !== null}
          onClose={() => setRemovalTarget(null)}
          title="Quitar evento"
          message="El partido ya finalizó. Escribe por qué quitas este evento (obligatorio):"
          onConfirm={handleRemoveConfirm}
        />
      )}
    </Screen>
  );
}

function eventLabel(type: MatchEventType): string {
  switch (type) {
    case MatchEventType.Goal:
      return 'GOL';
    case MatchEventType.YellowCard:
      return 'AMARILLA';
    case MatchEventType.RedCard:
      return 'ROJA';
  }
}

function eventTone(type: MatchEventType): 'positive' | 'warning' | 'danger' {
  switch (type) {
    case MatchEventType.Goal:
      return 'positive';
    case MatchEventType.YellowCard:
      return 'warning';
    case MatchEventType.RedCard:
      return 'danger';
  }
}

function eventPlayerName(
  event: MatchEvent,
  roster: Player[],
): string {
  if (!event.playerId) return 'Sin jugador asignado';
  return roster.find((p) => p.id === event.playerId)?.name ?? 'Jugador';
}

function eventAssistName(
  event: MatchEvent,
  roster: Player[],
): string {
  if (!event.assistPlayerId) return '';
  return roster.find((p) => p.id === event.assistPlayerId)?.name ?? 'Jugador';
}

function eventTeamName(event: MatchEvent, lookup: Map<string, string>): string {
  return lookup.get(event.teamId) ?? '—';
}

/* ------------------------------------------------------------------ */
/* Modal de captura de evento                                           */
/* ------------------------------------------------------------------ */

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  requestJustification: boolean;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onSave: (draft: EventDraft) => void;
}

function EventModal({
  visible,
  onClose,
  requestJustification,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  onSave,
}: EventModalProps) {
  const [type, setType] = useState<EventTypeChoice>(MatchEventType.Goal);
  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [minute, setMinute] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [justification, setJustification] = useState('');

  const roster = team === 'home' ? homePlayers : awayPlayers;
  const teamId = team === 'home' ? homeTeamId : awayTeamId;

  const changeTeam = (value: 'home' | 'away') => {
    setTeam(value);
    setPlayerId(null);
    setAssistPlayerId(null);
  };

  const handleSave = () => {
    if (!teamId) return;
    onSave({
      type,
      team,
      minute,
      playerId,
      note,
      assistPlayerId,
      justification,
    });
    // Reset del formulario para la siguiente captura.
    setMinute('');
    setPlayerId(null);
    setAssistPlayerId(null);
    setNote('');
    setJustification('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Registrar evento (RF-05)</Text>

          <Text style={styles.label}>Tipo</Text>
          <Segment
            options={[
              { label: 'Gol', value: MatchEventType.Goal },
              { label: 'Amarilla', value: MatchEventType.YellowCard },
              { label: 'Roja', value: MatchEventType.RedCard },
            ]}
            value={type}
            onChange={setType}
          />

          <Text style={styles.label}>Equipo</Text>
          <Segment
            options={[
              { label: homeTeamName, value: 'home' },
              { label: awayTeamName, value: 'away' },
            ]}
            value={team}
            onChange={changeTeam}
          />

          <View style={styles.section}>
            <TextField
              label="Minuto"
              value={minute}
              onChangeText={setMinute}
              keyboardType="number-pad"
              placeholder="45"
            />
          </View>

          <Text style={styles.label}>Jugador</Text>
          <View style={styles.playerChips}>
            <Pressable
              style={[styles.playerChip, playerId === null && styles.playerChipActive]}
              onPress={() => setPlayerId(null)}>
              <Text
                style={[
                  styles.playerChipText,
                  playerId === null && styles.playerChipTextActive,
                ]}>
                Sin jugador
              </Text>
            </Pressable>
            {roster.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.playerChip, playerId === p.id && styles.playerChipActive]}
                onPress={() => setPlayerId(p.id)}>
                <Text
                  style={[
                    styles.playerChipText,
                    playerId === p.id && styles.playerChipTextActive,
                  ]}>
                  #{p.number} {p.name} · {positionLabels[p.position]}
                </Text>
              </Pressable>
            ))}
          </View>

          {type === MatchEventType.Goal && (
            <>
              <Text style={styles.label}>Asistencia (opcional)</Text>
              <View style={styles.playerChips}>
                <Pressable
                  style={[
                    styles.playerChip,
                    assistPlayerId === null && styles.playerChipActive,
                  ]}
                  onPress={() => setAssistPlayerId(null)}>
                  <Text
                    style={[
                      styles.playerChipText,
                      assistPlayerId === null && styles.playerChipTextActive,
                    ]}>
                    Sin asistencia
                  </Text>
                </Pressable>
                {roster.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.playerChip,
                      assistPlayerId === p.id && styles.playerChipActive,
                    ]}
                    onPress={() => setAssistPlayerId(p.id)}>
                    <Text
                      style={[
                        styles.playerChipText,
                        assistPlayerId === p.id && styles.playerChipTextActive,
                      ]}>
                      #{p.number} {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={styles.section}>
            <TextField
              label="Nota (opcional)"
              value={note}
              onChangeText={setNote}
              placeholder="Motivo de la tarjeta…"
            />
          </View>

          {requestJustification && (
            <View style={styles.section}>
              <TextField
                label="Justificación (obligatoria: partido finalizado)"
                value={justification}
                onChangeText={setJustification}
                multiline
                textAlignVertical="top"
                placeholder="¿Por qué haces este cambio?"
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <View style={styles.modalButton}>
              <Button title="Cancelar" variant="ghost" onPress={onClose} />
            </View>
            <View style={styles.modalButton}>
              <Button
                title="Guardar"
                disabled={requestJustification && !justification.trim()}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Modal de justificación (quitar evento en partido finalizado)         */
/* ------------------------------------------------------------------ */

interface JustificationModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: (justification: string) => void;
}

function JustificationModal({ visible, onClose, title, message, onConfirm }: JustificationModalProps) {
  const [justification, setJustification] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalHint}>{message}</Text>

          <TextField
            label="Justificación (obligatoria)"
            value={justification}
            onChangeText={setJustification}
            multiline
            textAlignVertical="top"
            placeholder="¿Por qué quitas este evento?"
          />

          <View style={styles.modalActions}>
            <View style={styles.modalButton}>
              <Button title="Cancelar" variant="ghost" onPress={onClose} />
            </View>
            <View style={styles.modalButton}>
              <Button
                title="Confirmar"
                disabled={!justification.trim()}
                onPress={() => {
                  onConfirm(justification);
                  setJustification('');
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scoreboard: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 14,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    textAlign: 'center',
  },
  teamNameAway: {
    color: '#C7D2E6',
  },
  scoreCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  scoreDash: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.gold,
    marginHorizontal: 6,
  },
  scoreboardStatus: {
    marginTop: 12,
    alignItems: 'center',
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveStatusText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: fontSizes.tableHeader,
    letterSpacing: 1,
  },
  kickoff: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSizes.tableCell,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  locked: {
    marginTop: 12,
    alignItems: 'center',
  },
  section: {
    marginTop: 12,
  },
  meta: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
  },
  sectionTitle: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 18,
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  minute: {
    marginLeft: 10,
    fontSize: fontSizes.tableCell,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventBody: {
    flex: 1,
    marginLeft: 12,
  },
  eventText: {
    fontSize: fontSizes.tableCell,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventSub: {
    fontSize: fontSizes.tableHeader,
    color: colors.textSecondary,
  },
  label: {
    fontSize: fontSizes.tableValue,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: fontSizes.tableCell,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  playerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
  },
  playerChipActive: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primaryBackground,
  },
  playerChipText: {
    color: colors.textPrimary,
    fontSize: fontSizes.tableCell,
    fontWeight: '600',
  },
  playerChipTextActive: {
    color: colors.primaryText,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 18,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
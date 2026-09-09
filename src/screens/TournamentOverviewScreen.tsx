/**
 * TournamentOverviewScreen (RF-02/03/04).
 *
 * Vista general del torneo abierto: gestiona equipos (RF-03), genera el
 * calendario (RF-04) y accede a la planilla de cada equipo. Las secciones
 * de Fixture, Partidos, Posiciones y Estadísticas viven en los tabs
 * hermanos de este mismo torneo (no en la pantalla principal).
 */

import { useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import {
  CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as Clipboard from 'expo-clipboard';

import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ListItem } from '../components/ui/ListItem';
import { PressableScale } from '../components/ui/PressableScale';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TextField } from '../components/ui/TextField';
import { TournamentHeader } from '../components/ui/TournamentHeader';
import { tournamentStatusLabels, formatLabels } from '../constants/labels';
import { useCanEditActiveTournament } from '../hooks/useRole';
import type {
  RootStackParamList,
  TournamentTabParamList,
} from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { MatchStatus, TournamentStatus } from '../types';
import { useIsOwnerActiveTournament } from '../hooks/useRole';

type Props = {
  route: RouteProp<TournamentTabParamList, 'Overview'>;
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TournamentTabParamList, 'Overview'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

export function TournamentOverviewScreen({ route, navigation }: Props) {
  const tournamentId = route.params.tournamentId;
  const canEdit = useCanEditActiveTournament();
  const [doubleRound, setDoubleRound] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const handleCopyLink = async () => {
    if (!tournament?.publicUrl) return;
    await Clipboard.setStringAsync(tournament.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tournament = useFutAppStore(
    useShallow((state) =>
      state.tournaments.find((t) => t.id === tournamentId),
    ),
  );
  const teams = useFutAppStore(
    useShallow((state) =>
      state.teams.filter((t) => t.tournamentId === tournamentId),
    ),
  );
  const players = useFutAppStore((state) => state.players);
  const matches = useFutAppStore(
    useShallow((state) =>
      state.matches.filter((m) => m.tournamentId === tournamentId),
    ),
  );
  const generateFixture = useFutAppStore((state) => state.generateFixture);
  const resetFixture = useFutAppStore((state) => state.resetFixture);
  const removeTeam = useFutAppStore((state) => state.removeTeam);

  const isOwner = useIsOwnerActiveTournament();
  const user = useFutAppStore((state) => state.user);
  const members = useFutAppStore((state) => state.members);
  const knownUsers = useFutAppStore((state) => state.knownUsers);
  const invitesMember = useFutAppStore((state) => state.invitesMember);
  const removeMember = useFutAppStore((state) => state.removeMember);
  const registerKnownUser = useFutAppStore((state) => state.registerKnownUser);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const tournamentMembers = members.filter(
    (m) => m.tournamentId === tournamentId,
  );
  const displayNameFor = (userId: string): string => {
    const known = knownUsers.find((u) => u.id === userId);
    if (known?.displayName) return known.displayName;
    if (known?.email) return known.email;
    return userId;
  };

  const handleInvite = () => {
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) {
      setInviteError('Ingresa el email del moderador.');
      return;
    }
    // Evita invitar al propietario actual a sí mismo como moderador.
    if (user && user.email?.toLowerCase() === normalized) {
      setInviteError('No puedes invitarte a ti mismo.');
      return;
    }
    try {
      const userId = registerKnownUser(normalized);
      invitesMember(tournamentId, userId, 'moderator');
      setInviteEmail('');
      setInviteError(null);
    } catch (err) {
      setInviteError((err as Error).message);
    }
  };

  const handleRemoveMember = (memberId: string, name: string) => {
    Alert.alert('Quitar moderador', `¿Quitar a ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => removeMember(memberId),
      },
    ]);
  };

  const registrations = useFutAppStore((state) => state.registrations);
  const setRegistrationStatus = useFutAppStore(
    (state) => state.setRegistrationStatus,
  );
  const submitRegistration = useFutAppStore((state) => state.submitRegistration);
  const pendingRegistrations = registrations.filter(
    (r) => r.tournamentId === tournamentId && r.status === 'PENDING',
  );
  const [regTeam, setRegTeam] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const handleSubmitRegistration = () => {
    const name = regTeam.trim();
    if (!name) {
      setRegError('Ingresa el nombre del equipo.');
      return;
    }
    submitRegistration(tournamentId, name, regContact.trim() || null);
    setRegTeam('');
    setRegContact('');
    setRegError(null);
    Alert.alert('Solicitud enviada', `"${name}" quedó en espera de aprobación.`);
  };

  const handleApproveRegistration = (id: string, name: string) => {
    Alert.alert('Aprobar inscripción', `¿Agregar a "${name}" al torneo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () => setRegistrationStatus(id, 'APPROVED'),
      },
    ]);
  };

  const handleRejectRegistration = (id: string, name: string) => {
    Alert.alert('Rechazar inscripción', `¿Rechazar a "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: () => setRegistrationStatus(id, 'REJECTED'),
      },
    ]);
  };

  if (!tournament) {
    return (
      <Screen>
        <EmptyState message="Torneo no encontrado." />
      </Screen>
    );
  }

  const status = tournamentStatusLabels[tournament.status];
  const hasFixture = matches.length > 0;
  const locked = tournament.status === TournamentStatus.Finished;

  const handleDeleteTeam = (teamId: string, name: string) => {
    Alert.alert('Eliminar equipo', `¿Quitar a "${name}" y su plantilla?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => removeTeam(teamId),
      },
    ]);
  };

  const handleGenerate = () => {
    if (hasFixture) {
      Alert.alert(
        'Regenerar calendario',
        'Se reemplazará el fixture actual (se pierden resultados). ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Regenerar',
            onPress: () => {
              resetFixture(tournamentId);
              generateFixture(tournamentId, doubleRound);
            },
          },
        ],
      );
    } else {
      try {
        generateFixture(tournamentId, doubleRound);
      } catch (err) {
        Alert.alert('Error', (err as Error).message);
      }
    }
  };

  const finishedMatches = matches.filter(
    (m) => m.status === MatchStatus.Finished,
  ).length;

  return (
    <Screen>
      <TournamentHeader
        name={tournament.name}
        subtitle={`${teams.length} equipos · ${matches.length} partidos · ${finishedMatches} finalizados`}
        statusLabel={status.label}
        statusTone={status.tone}
        live={tournament.status === TournamentStatus.InProgress}
      />
      <View style={styles.chips}>
        <Chip label={formatLabels[tournament.format]} tone="accent" />
        <Chip label={tournament.season} tone="neutral" />
      </View>

      {canEdit && !locked && (
        <>
          <View style={styles.section}>
            <Button
              title="Editar torneo"
              variant="ghost"
              onPress={() =>
                navigation.navigate('TournamentForm', { tournamentId })
              }
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Calendario (RF-04)</Text>
            <Segment
              options={[
                { label: 'Ida y vuelta', value: true },
                { label: 'Ida', value: false },
              ]}
              value={doubleRound}
              onChange={setDoubleRound}
            />
            <View style={styles.section}>
              <Button
                title={
                  hasFixture ? 'Regenerar calendario' : 'Generar calendario'
                }
                onPress={handleGenerate}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Button
              title="+ Agregar equipo"
              variant="ghost"
              onPress={() =>
                navigation.navigate('TeamForm', { tournamentId })
              }
            />
          </View>
        </>
      )}

      {isOwner && tournamentMembers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Moderadores</Text>
          {tournamentMembers.map((member) => (
            <ListItem
              key={member.id}
              title={displayNameFor(member.userId)}
              subtitle={member.role === 'owner' ? 'Propietario' : 'Moderador'}
              right={
                member.role === 'moderator' ? (
                  <Button
                    title="Quitar"
                    variant="danger"
                    small
                    onPress={() =>
                      handleRemoveMember(
                        member.id,
                        displayNameFor(member.userId),
                      )
                    }
                  />
                ) : undefined
              }
            />
          ))}
        </View>
      )}

      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.label}>Invitar moderador</Text>
          <TextField
            label="Email del moderador"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="moderador@liga.app"
          />
          {inviteError ? <Text style={styles.error}>{inviteError}</Text> : null}
          <View style={styles.section}>
            <Button title="+ Invitar" variant="ghost" onPress={handleInvite} />
          </View>
        </View>
      )}

      {canEdit && (
        <View style={styles.section}>
          <Text style={styles.label}>Inscripciones (por enlace)</Text>
          <View style={styles.section}>
            <Button
              title={
                showLink
                  ? 'Ocultar enlace de inscripción'
                  : 'Compartir enlace para inscripción'
              }
              variant="ghost"
              onPress={() => setShowLink((v) => !v)}
            />
          </View>
          {showLink && tournament.publicUrl ? (
            <PressableScale
              onPress={handleCopyLink}
              style={styles.publicLinkRow}
              pressedStyle={{ opacity: 0.7 }}>
              <Text numberOfLines={1} style={styles.publicLinkText}>
                {tournament.publicUrl}
              </Text>
              <Text style={styles.copyHint}>
                {copied ? '✓ Copiado' : 'Copiar'}
              </Text>
            </PressableScale>
          ) : null}
          <TextField
            label="Nombre del equipo"
            value={regTeam}
            onChangeText={setRegTeam}
            placeholder="Ej.: Nuevo Real FC"
          />
          <View style={styles.section}>
            <TextField
              label="Contacto (opcional)"
              value={regContact}
              onChangeText={setRegContact}
              placeholder="ej.: capitan@equipo.com"
            />
          </View>
          {regError ? <Text style={styles.error}>{regError}</Text> : null}
          <View style={styles.section}>
            <Button title="Enviar solicitud" variant="ghost" onPress={handleSubmitRegistration} />
          </View>

          {pendingRegistrations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>
                Solicitudes pendientes ({pendingRegistrations.length})
              </Text>
              {pendingRegistrations.map((reg) => (
                <View key={reg.id} style={styles.regRow}>
                  <View style={styles.regInfo}>
                    <Text style={styles.regName}>{reg.teamName}</Text>
                    {reg.contact ? (
                      <Text style={styles.summary}>{reg.contact}</Text>
                    ) : null}
                  </View>
                  <View style={styles.regActions}>
                    <Button
                      title="Aprobar"
                      variant="ghost"
                      small
                      onPress={() =>
                        handleApproveRegistration(reg.id, reg.teamName)
                      }
                    />
                    <Button
                      title="Rechazar"
                      variant="danger"
                      small
                      onPress={() =>
                        handleRejectRegistration(reg.id, reg.teamName)
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {locked && (
        <Text style={styles.locked}>
          Torneo finalizado: edición bloqueada (RNF-04).
        </Text>
      )}

      <Text style={styles.sectionTitle}>Equipos (RF-03)</Text>
      {teams.length === 0 && (
        <EmptyState message="Sin equipos inscritos todavía." />
      )}
      {teams.map((team) => {
        const roster = players.filter((p) => p.teamId === team.id).length;
        return (
          <ListItem
            key={team.id}
            title={team.name}
            subtitle={`${roster} jugador(es)`}
            avatarUri={team.logoUrl}
            right={
              canEdit && !locked ? (
                <Button
                  title="Quitar"
                  variant="danger"
                  small
                  onPress={() => handleDeleteTeam(team.id, team.name)}
                />
              ) : undefined
            }
            onPress={() =>
              navigation.navigate('TeamDetail', { teamId: team.id })
            }
          />
        );
      })}

      {hasFixture && (
        <View style={styles.section}>
          <Button
            title="Ver fixture del torneo"
            variant="ghost"
            onPress={() => navigation.navigate('Fixture')}
          />
        </View>
      )}

      <View style={styles.section}>
        <Button
          title="Ver vista pública"
          variant="ghost"
          onPress={() =>
            navigation.navigate('PublicTournament', { tournamentId })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  summary: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
  },
  publicLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  publicLinkText: {
    flex: 1,
    fontSize: fontSizes.tableCell,
    color: colors.textPrimary,
  },
  copyHint: {
    fontSize: fontSizes.tableHeader,
    fontWeight: '800',
    color: colors.accent,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: fontSizes.tableValue,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  locked: {
    color: '#B71C1C',
    fontWeight: '700',
    marginTop: 14,
  },
  error: {
    color: '#B71C1C',
    marginTop: 4,
    fontWeight: '700',
  },
  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  regInfo: {
    flex: 1,
    paddingRight: 8,
  },
  regName: {
    fontSize: fontSizes.tableValue,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  regActions: {
    flexDirection: 'row',
    gap: 6,
  },
});
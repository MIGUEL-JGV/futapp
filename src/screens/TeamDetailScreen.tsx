/**
 * TeamDetailScreen (RF-03: plantilla de jugadores de un equipo).
 *
 * Muestra los jugadores con dorsal y posición. El administrador puede
 * agregar, editar (tocar) o eliminar jugadores.
 */

import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ListItem } from '../components/ui/ListItem';
import { Screen } from '../components/ui/Screen';
import { positionLabels } from '../constants/labels';
import { useCanEditActiveTournament } from '../hooks/useRole';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { useShallow } from 'zustand/react/shallow';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export function TeamDetailScreen({ route, navigation }: Props) {
  const teamId = route.params.teamId;

  const canEdit = useCanEditActiveTournament();
  const team = useFutAppStore(
    useShallow((state) => state.teams.find((t) => t.id === teamId)),
  );
  const players = useFutAppStore(
    useShallow((state) =>
      state.players.filter((p) => p.teamId === teamId),
    ),
  );
  const removePlayer = useFutAppStore((state) => state.removePlayer);

  if (!team) {
    return (
      <Screen>
        <EmptyState message="Equipo no encontrado." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar uri={team.logoUrl} label={team.name} size={64} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{team.name}</Text>
          <Text style={styles.summary}>{players.length} jugador(es)</Text>
        </View>
      </View>

      {canEdit && (
        <View style={styles.section}>
          <Button
            title="Editar equipo"
            variant="ghost"
            onPress={() =>
              navigation.navigate('TeamForm', {
                tournamentId: team.tournamentId,
                teamId: team.id,
              })
            }
          />
        </View>
      )}

      {canEdit && (
        <View style={styles.section}>
          <Button
            title="+ Agregar jugador"
            variant="gold"
            onPress={() => navigation.navigate('PlayerForm', { teamId })}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Plantilla</Text>
      {players.length === 0 && (
        <EmptyState message="Este equipo aún no tiene jugadores." />
      )}

      {players.map((player) => (
        <ListItem
          key={player.id}
          title={`#${player.number} · ${player.name}`}
          subtitle={positionLabels[player.position]}
          avatarUri={player.photoUrl}
          right={
            canEdit ? (
              <Button
                title="Quitar"
                variant="danger"
                small
                onPress={() =>
                  Alert.alert(
                    'Eliminar jugador',
                    `¿Quitar a ${player.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => removePlayer(player.id),
                      },
                    ],
                  )
                }
              />
            ) : undefined
          }
          onPress={
            canEdit
              ? () =>
                  navigation.navigate('PlayerForm', {
                    teamId,
                    playerId: player.id,
                  })
              : undefined
          }
        />
      ))}

      <View style={styles.section}>
        <Chip label={canEdit ? 'EDITOR · TOCA PARA EDITAR' : 'INVITADO · LECTURA'} tone={canEdit ? 'accent' : 'neutral'} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  summary: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
    marginBottom: 8,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 18,
    marginBottom: 10,
  },
});
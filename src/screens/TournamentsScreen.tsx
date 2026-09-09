/**
 * TournamentsScreen (RF-02: lectura y acceso al CRUD).
 *
 * Lista los torneos. El administrador puede crear (botón) y eliminar
 * (pulsación larga). Tocar un torneo lo activa (`selectedTournamentId`)
 * y abre su detalle.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, Pressable, View } from 'react-native';

import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ListItem } from '../components/ui/ListItem';
import { Screen } from '../components/ui/Screen';
import { ScreenTitle } from '../components/ui/ScreenTitle';
import { tournamentStatusLabels, formatLabels } from '../constants/labels';
import { useIsAdmin } from '../hooks/useRole';
import type { RootStackParamList } from '../navigation/types';
import { signOut as signOutService } from '../services/auth';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { TournamentStatus } from '../types';

export function TournamentsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isAdmin = useIsAdmin();
  const tournaments = useFutAppStore((state) => state.tournaments);
  const teams = useFutAppStore((state) => state.teams);
  const matches = useFutAppStore((state) => state.matches);
  const selectTournament = useFutAppStore((state) => state.selectTournament);
  const deleteTournament = useFutAppStore((state) => state.deleteTournament);

  // Invalida la sesión de Supabase (no solo el store local): si solo se
  // limpia el store, al recargar restoreSupabaseSession() vuelve a entrar.
  const handleSignOut = () => {
    void signOutService();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Eliminar torneo', `¿Eliminar "${name}" y todos sus datos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteTournament(id),
      },
    ]);
  };

  const accentFor = (status: TournamentStatus) =>
    status === TournamentStatus.InProgress
      ? colors.brand
      : status === TournamentStatus.Registration
        ? colors.gold
        : colors.medalSilver;

  return (
    <Screen>
      <ScreenTitle
        title="Torneos"
        subtitle="Toca para activar y administrar un torneo · pulsa largo para eliminar"
      />

      {isAdmin && (
        <View style={styles.createRow}>
          <Button
            title="+ Nuevo torneo"
            variant="gold"
            onPress={() => navigation.navigate('TournamentForm')}
          />
        </View>
      )}

      <Text style={styles.section}>{tournaments.length} torneo(s)</Text>

      {tournaments.map((tournament) => {
        const teamCount = teams.filter((t) => t.tournamentId === tournament.id).length;
        const matchCount = matches.filter((m) => m.tournamentId === tournament.id).length;
        const status = tournamentStatusLabels[tournament.status];

        return (
          <ListItem
            key={tournament.id}
            title={tournament.name}
            subtitle={`${tournament.season} · ${formatLabels[tournament.format]} · ${teamCount} equipos · ${matchCount} partidos`}
            accentColor={accentFor(tournament.status)}
            right={<Chip label={status.label} tone={status.tone} />}
            onPress={() => {
              selectTournament(tournament.id);
              navigation.navigate('TournamentDetail', { tournamentId: tournament.id });
            }}
            onLongPress={
              isAdmin
                ? () => handleDelete(tournament.id, tournament.name)
                : undefined
            }
          />
        );
      })}

      {tournaments.length === 0 && (
        <EmptyState message="Sin torneos. Crea el primero con '+ Nuevo torneo'." />
      )}

      <View style={styles.hintBox}>
        <Chip label={isAdmin ? 'ADMIN · PULSA LARGO PARA ELIMINAR' : 'INVITADO · LECTURA'} tone={isAdmin ? 'accent' : 'neutral'} />
      </View>

      <Pressable onPress={handleSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createRow: {
    marginBottom: 4,
  },
  section: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 12,
  },
  hintBox: {
    marginTop: 8,
  },
  signOut: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  signOutText: {
    color: '#B71C1C',
    fontWeight: '700',
    fontSize: fontSizes.tableCell,
  },
});
/**
 * TeamManagerScreen.
 *
 * Panel del representante (team_manager) de un equipo aprobado. Se alcanza
 * por deep-link `/team/:token` (enlace que el organizador comparte tras
 * aprobar una inscripción).
 *
 * El representante SOLO gestiona su propio equipo: registra la plantilla y
 * los datos de los jugadores. No toca partidos, fixture ni tablas.
 *
 * Si no hay sesión, pide iniciar sesión con el email que dejó al inscribirse;
 * el email autenticado debe coincidir con el correo del equipo aprobado para
 * poder escribir su plantilla (policy `is_team_manager` en Supabase).
 */

import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ListItem } from '../components/ui/ListItem';
import { Screen } from '../components/ui/Screen';
import { useCanEditThisTeam } from '../hooks/useRole';
import type { RootStackParamList } from '../navigation/types';
import { navigationRef } from '../navigation/navigationRef';
import { resolveTeamByManagerToken } from '../services/repository';
import { useFutAppStore } from '../store/useFutAppStore';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes } from '../theme/colors';
import { useShallow } from 'zustand/react/shallow';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamManager'>;

export function TeamManagerScreen({ route, navigation }: Props) {
  const token = route.params.token;
  const user = useFutAppStore((state) => state.user);
  const setTeamManagerTeamId = useFutAppStore(
    (state) => state.setTeamManagerTeamId,
  );
  const loadTeamManagerData = useFutAppStore(
    (state) => state.loadTeamManagerData,
  );
  const [resolved, setResolved] = useState<{
    teamId: string;
    teamName: string;
    tournamentId: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  const team = useFutAppStore(
    useShallow((state) =>
      resolved ? state.teams.find((t) => t.id === resolved.teamId) : null,
    ),
  );
  const canEdit = useCanEditThisTeam(resolved?.teamId ?? '');
  const players = useFutAppStore(
    useShallow((state) =>
      resolved
        ? state.players.filter((p) => p.teamId === resolved.teamId)
        : [],
    ),
  );

  const applyResolution = useCallback(
    async (r: { teamId: string; teamName: string; tournamentId: string }) => {
      // Carga el dataset del torneo y fija el equipo gestionado.
      if (user?.email) {
        await loadTeamManagerData(user.email);
      } else {
        // Sin sesión aún: resuelve el equipo por token sin datos locales.
        setTeamManagerTeamId(r.teamId);
        useFutAppStore.getState().applyPublicDataset(null);
      }
    },
    [user, loadTeamManagerData, setTeamManagerTeamId],
  );

  useEffect(() => {
    let cancelled = false;
    resolveTeamByManagerToken(token)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          setFailed(true);
          return;
        }
        setResolved(r);
        void applyResolution(r);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, applyResolution]);

  if (failed) {
    return (
      <Screen>
        <EmptyState message="Enlace inválido o inscripción no aprobada." />
      </Screen>
    );
  }

  if (!resolved) {
    return (
      <Screen>
        <EmptyState message="Cargando tu equipo…" />
      </Screen>
    );
  }

  const myTeam = team ?? {
    id: resolved.teamId,
    tournamentId: resolved.tournamentId,
    name: resolved.teamName,
    createdAt: new Date().toISOString(),
  };

  return (
    <Screen>
      <Text style={styles.title}>{resolved.teamName}</Text>
      <Text style={styles.summary}>
        Panel del representante · gestional solo tu plantilla y datos de
        jugadores.
      </Text>

      {!user ? (
        <ManagerLoginGate
          emailHint="Inicia sesión con el email que usaste al inscribirte."
          onLogin={() => navigationRef.navigate('Auth')}
        />
      ) : !canEdit ? (
        <View style={styles.section}>
          <Text style={styles.warn}>
            Tu sesión no coincide con el email del equipo aprobado. Cierra
            sesión e inicia con el email de la inscripción.
          </Text>
          <View style={styles.section}>
            <Button title="Cambiar de cuenta" variant="ghost" onPress={() => navigationRef.navigate('Auth')} />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Plantilla ({players.length})</Text>
          {players.length === 0 && (
            <EmptyState message="Tu equipo aún no tiene jugadores registrados." />
          )}
          {players.map((p) => (
            <ListItem
              key={p.id}
              title={`#${p.number} · ${p.name}`}
              avatarUri={p.photoUrl}
              onPress={() =>
                navigation.navigate('PlayerForm', { teamId: myTeam.id, playerId: p.id })
              }
            />
          ))}
          <View style={styles.section}>
            <Button
              title="+ Agregar jugador"
              variant="gold"
              onPress={() => navigation.navigate('PlayerForm', { teamId: myTeam.id })}
            />
          </View>
          <View style={styles.section}>
            <Button
              title="Abrir ficha del equipo"
              variant="ghost"
              onPress={() => navigation.navigate('TeamDetail', { teamId: myTeam.id })}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function ManagerLoginGate({
  emailHint,
  onLogin,
}: {
  emailHint: string;
  onLogin: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.summary}>{emailHint}</Text>
      <View style={styles.section}>
        <Button title="Iniciar sesión" onPress={onLogin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  summary: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
    lineHeight: 18,
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
  warn: {
    color: '#B71C1C',
    fontWeight: '700',
  },
});

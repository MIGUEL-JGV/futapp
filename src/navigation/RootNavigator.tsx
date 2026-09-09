/**
 * Navegador raíz.
 *
 * - Sin sesión: muestra AuthScreen (RF-01).
 * - Con sesión: muestra MainTabs, con los formularios/detalles en stack.
 */
import { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useFutAppStore } from '../store/useFutAppStore';
import { navigationRef } from './navigationRef';
import { AuthScreen } from '../screens/AuthScreen';
import { FixtureScreen } from '../screens/FixtureScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { PlayerFormScreen } from '../screens/PlayerFormScreen';
import { PublicTournamentScreen } from '../screens/PublicTournamentScreen';
import { TeamManagerScreen } from '../screens/TeamManagerScreen';
import { TeamDetailScreen } from '../screens/TeamDetailScreen';
import { TeamFormScreen } from '../screens/TeamFormScreen';
import { TournamentFormScreen } from '../screens/TournamentFormScreen';
import type { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { TournamentTabs } from './TournamentTabs';
import { navigationTheme, stackScreenOptions } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const user = useFutAppStore((state) => state.user);
  const isPublicReadonly = useFutAppStore((state) => state.isPublicReadonly);
  const setPublicReadonly = useFutAppStore((state) => state.setPublicReadonly);
  const prevUser = useRef(user);

  // Al pasar de NO sesión -> sesión mientras la vista pública estaba en pantalla,
  // el flag global isPublicReadonly quedaba activo en toda la app (bug).
  // Solución: al entrar se sale de la vista pública hacia Main y se limpia el flag.
  useEffect(() => {
    const wasSignedOut = prevUser.current === null;
    prevUser.current = user;
    if (wasSignedOut && user !== null && isPublicReadonly) {
      setPublicReadonly(false);
      if (navigationRef.isReady()) {
        navigationRef.navigate('Main');
      }
    }
  }, [user, isPublicReadonly, setPublicReadonly]);

  return (
    <Stack.Navigator screenOptions={{ ...stackScreenOptions }}>
      {user === null ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TournamentForm"
            component={TournamentFormScreen}
            options={({ route }) => ({
              title: route.params?.tournamentId ? 'Editar torneo' : 'Nuevo torneo',
            })}
          />
          <Stack.Screen
            name="TournamentDetail"
            component={TournamentTabs}
            options={{ title: 'Torneo' }}
          />
          <Stack.Screen
            name="TeamForm"
            component={TeamFormScreen}
            options={({ route }) => ({
              title: route.params?.teamId ? 'Editar equipo' : 'Nuevo equipo',
            })}
          />
          <Stack.Screen
            name="TeamDetail"
            component={TeamDetailScreen}
            options={{ title: 'Equipo' }}
          />
          <Stack.Screen
            name="PlayerForm"
            component={PlayerFormScreen}
            options={({ route }) => ({
              title: route.params?.playerId ? 'Editar jugador' : 'Nuevo jugador',
            })}
          />
          <Stack.Screen
            name="MatchDetail"
            component={MatchDetailScreen}
            options={{ title: 'Partido' }}
          />
        </>
      )}

      {/* La vista pública está disponible SIEMPRE (con o sin sesión) para
          soportar el deep-link web sin autenticación. */}
      <Stack.Screen
        name="PublicTournament"
        component={PublicTournamentScreen}
        options={{ title: 'Torneo' }}
      />

      {/* Panel del representante (deep-link /team/:token). */}
      <Stack.Screen
        name="TeamManager"
        component={TeamManagerScreen}
        options={{ title: 'Mi equipo' }}
      />
    </Stack.Navigator>
  );
}

export { navigationTheme };
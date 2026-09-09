/**
 * App FUTAPP - punto de entrada.
 *
 * Hidrata los datos guardados en el dispositivo (si los hay) antes de montar
 * la navegación, activa la persistencia local y carga los datos demo solo en
 * la primera ejecución.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { LinkingOptions } from '@react-navigation/native';

import { navigationTheme, RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import type { RootStackParamList } from './src/navigation/types';
import { restoreSupabaseSession } from './src/services/auth';
import { hydrateStore, setupPersistence } from './src/services/persistence';
import { backendActive } from './src/services/repository';
import { SITE_URL } from './src/services/site';
import { useFutAppStore } from './src/store/useFutAppStore';
import { colors } from './src/theme/colors';

/** Deep-linking: la ruta pública /t/:id abre la vista sin sesión. */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['futapp://', SITE_URL, 'http://localhost:8081'],
  config: {
    screens: {
      PublicTournament: 't/:tournamentId',
      Auth: 'auth',
      Main: '',
    },
  },
};

export default function App() {
  const loadDemoData = useFutAppStore((state) => state.loadDemoData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await hydrateStore();
      setupPersistence();

      // Sesión persistente (Fase 4.4): si hay sesión de Supabase, la restauras
      // sin volver a pedir login. No-op en modo demo (sin proyecto configurado).
      await restoreSupabaseSession();

      // En modo backend el contenido real viene de Supabase (el login ya lo
      // carga). Los datos demo solo se siembran en modo local (primera ejecución).
      if (!backendActive) {
        // Idempotente: no duplica nada si ya hay datos persistidos.
        loadDemoData();
      }

      if (!cancelled) setReady(true);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadDemoData]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}>
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}
/**
 * Navegación principal.
 *
 * La pantalla principal SOLO muestra la lista de torneos (RF-02). Las vistas
 * de Fixture, Partidos, Posiciones y Estadísticas viven dentro de cada
 * torneo (ver `TournamentTabs`), nunca como tabs globales.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors, fontSizes } from '../theme/colors';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '900' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          elevation: 0,
          boxShadow: 'none',
        },
      }}>
      <Tab.Screen name="Tournaments" component={TournamentsScreen} options={{ title: 'Torneos' }} />
    </Tab.Navigator>
  );
}
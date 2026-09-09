/**
 * TournamentTabs — secciones internas de un torneo.
 *
 * Fixture, Partidos, Posiciones y Estadísticas viven DENTRO del torneo que
 * el usuario seleccionó desde la pantalla principal; no aparecen como tabs
 * globales de la app.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSizes } from '../theme/colors';
import { FixtureScreen } from '../screens/FixtureScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { StandingsScreen } from '../screens/StandingsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { TournamentLogScreen } from '../screens/TournamentLogScreen';
import { TournamentOverviewScreen } from '../screens/TournamentOverviewScreen';
import type { RootStackParamList, TournamentTabParamList } from './types';

const Tab = createBottomTabNavigator<TournamentTabParamList>();

type Props = {
  route: NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>['route'];
  /** Opcional: la vista pública monta el navigator sin navegador padre. */
  navigation?: never;
};

export function TournamentTabs({ route }: Props) {
  const tournamentId = route.params.tournamentId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
      <Tab.Screen
        name="Overview"
        component={TournamentOverviewScreen}
        initialParams={{ tournamentId }}
        options={{ title: 'Torneo' }}
      />
      <Tab.Screen
        name="Fixture"
        component={FixtureScreen}
        options={{ title: 'Fixture' }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'Partidos' }}
      />
      <Tab.Screen
        name="Standings"
        component={StandingsScreen}
        options={{ title: 'Posiciones' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: 'Estadísticas' }}
      />
      <Tab.Screen
        name="Log"
        component={TournamentLogScreen}
        options={{ title: 'Bitácora' }}
      />
    </Tab.Navigator>
  );
}
/**
 * TournamentFormScreen (RF-02: crear y actualizar torneo).
 *
 * Incluye la selección de DÍAS DE JUEGO (RF-04): el usuario elige en qué
 * días de la semana se jugarán los partidos y el calendario reparte las
 * jornadas en esos días (mínimo un partido por día, una jornada por semana).
 */

import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TextField } from '../components/ui/TextField';
import { weekdayOptions } from '../constants/labels';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { TournamentFormat, TournamentStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentForm'>;

const formatOptions: Array<{ label: string; value: TournamentFormat }> = [
  { label: 'Liga', value: TournamentFormat.Liga },
  { label: 'Grupos', value: TournamentFormat.Grupos },
  { label: 'Eliminación', value: TournamentFormat.Eliminacion },
];

const statusOptions: Array<{ label: string; value: TournamentStatus }> = [
  { label: 'Inscripción', value: TournamentStatus.Registration },
  { label: 'En curso', value: TournamentStatus.InProgress },
  { label: 'Finalizado', value: TournamentStatus.Finished },
];

const DEFAULT_MATCH_DAYS = [1, 2, 3, 4, 5];

export function TournamentFormScreen({ route, navigation }: Props) {
  const tournamentId = route.params?.tournamentId;
  const tournaments = useFutAppStore((state) => state.tournaments);
  const createTournament = useFutAppStore((state) => state.createTournament);
  const updateTournament = useFutAppStore((state) => state.updateTournament);
  const selectTournament = useFutAppStore((state) => state.selectTournament);

  const existing = tournaments.find((t) => t.id === tournamentId);

  const [name, setName] = useState(existing?.name ?? '');
  const [season, setSeason] = useState(existing?.season ?? '');
  const [format, setFormat] = useState<TournamentFormat>(
    existing?.format ?? TournamentFormat.Liga,
  );
  const [status, setStatus] = useState<TournamentStatus>(
    existing?.status ?? TournamentStatus.Registration,
  );
  const [matchDays, setMatchDays] = useState<number[]>(
    existing?.matchDays.length ? existing.matchDays : DEFAULT_MATCH_DAYS,
  );

  const toggleDay = (day: number) => {
    setMatchDays((current) =>
      current.includes(day)
        ? current.length > 1
          ? current.filter((d) => d !== day)
          : current
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validación', 'El nombre del torneo es obligatorio.');
      return;
    }
    if (!season.trim()) {
      Alert.alert('Validación', 'Indica la temporada (ej.: 2026).');
      return;
    }
    if (matchDays.length === 0) {
      Alert.alert('Validación', 'Selecciona al menos un día de juego.');
      return;
    }

    if (existing) {
      updateTournament(existing.id, {
        name: name.trim(),
        season: season.trim(),
        format,
        status,
        matchDays,
      });
    } else {
      const id = createTournament({
        name: name.trim(),
        season: season.trim(),
        format,
        status,
        matchDays,
      });
      selectTournament(id);
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <TextField
        label="Nombre del torneo"
        value={name}
        onChangeText={setName}
        placeholder="Ej.: Liga Municipal 2026"
      />

      <View style={styles.gap}>
        <TextField
          label="Temporada"
          value={season}
          onChangeText={setSeason}
          placeholder="Ej.: 2026"
        />
      </View>

      <View style={styles.gap}>
        <Text style={styles.label}>Formato (RF-02)</Text>
        <Segment options={formatOptions} value={format} onChange={setFormat} />
      </View>

      <View style={styles.gap}>
        <Text style={styles.label}>Estado (RF-02)</Text>
        <Segment options={statusOptions} value={status} onChange={setStatus} />
      </View>

      <View style={styles.gap}>
        <Text style={styles.label}>Días de juego (RF-04)</Text>
        <Text style={styles.hint}>
          Los partidos se repartirán en estos días (mínimo uno por día, de
          17:00 a 22:00 h) y cada equipo jugará una vez por semana.
        </Text>
        <View style={styles.days}>
          {weekdayOptions.map((option) => {
            const selected = matchDays.includes(option.value);
            return (
              <PressableScale
                key={option.value}
                onPress={() => toggleDay(option.value)}
                pressedStyle={[
                  styles.dayChip,
                  selected && styles.dayChipSelected,
                ]}>
                <Text
                  style={[
                    styles.dayChipText,
                    selected && styles.dayChipTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.gap}>
        <Button
          title={existing ? 'Guardar cambios' : 'Crear torneo'}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  hint: {
    fontSize: fontSizes.tableCell,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.card,
  },
  dayChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayChipText: {
    color: colors.ink,
    fontSize: fontSizes.tableCell,
    fontWeight: '800',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  gap: {
    marginTop: 16,
  },
});
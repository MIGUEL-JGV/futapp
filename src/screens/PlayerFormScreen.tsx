/**
 * PlayerFormScreen (RF-03: registrar/editar jugador con dorsal y posición).
 */

import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/ui/Button';
import { PhotoPicker } from '../components/ui/PhotoPicker';
import { Screen } from '../components/ui/Screen';
import { Segment } from '../components/ui/Segment';
import { TextField } from '../components/ui/TextField';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';
import { PlayerPosition } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerForm'>;

const positionOptions: Array<{ label: string; value: PlayerPosition }> = [
  { label: 'Portero', value: PlayerPosition.Portero },
  { label: 'Defensa', value: PlayerPosition.Defensa },
  { label: 'Medio', value: PlayerPosition.Mediocampista },
  { label: 'Delantero', value: PlayerPosition.Delantero },
];

export function PlayerFormScreen({ route, navigation }: Props) {
  const { teamId, playerId } = route.params ?? {};
  const players = useFutAppStore((state) => state.players);
  const addPlayer = useFutAppStore((state) => state.addPlayer);
  const updatePlayer = useFutAppStore((state) => state.updatePlayer);

  const existing = players.find((p) => p.id === playerId);

  const [name, setName] = useState(existing?.name ?? '');
  const [number, setNumber] = useState(
    existing ? String(existing.number) : '',
  );
  const [position, setPosition] = useState<PlayerPosition>(
    existing?.position ?? PlayerPosition.Delantero,
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    existing?.photoUrl ?? null,
  );

  const handleSave = () => {
    if (!teamId) {
      Alert.alert('Error', 'Falta el identificador del equipo.');
      return;
    }
    const parsed = Number.parseInt(number, 10);
    if (!name.trim()) {
      Alert.alert('Validación', 'El nombre del jugador es obligatorio.');
      return;
    }
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
      Alert.alert('Validación', 'El dorsal debe estar entre 1 y 99.');
      return;
    }

    if (existing) {
      updatePlayer(existing.id, {
        name: name.trim(),
        number: parsed,
        position,
        photoUrl,
      });
    } else {
      addPlayer(teamId, {
        name: name.trim(),
        number: parsed,
        position,
        photoUrl,
      });
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Ej.: Lionel Ruiz"
      />

      <View style={styles.gap}>
        <PhotoPicker
          label="Foto"
          value={photoUrl}
          onChange={setPhotoUrl}
          prefix="player-photo"
        />
      </View>

      <View style={styles.gap}>
        <TextField
          label="Dorsal"
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
          placeholder="10"
        />
      </View>

      <View style={styles.gap}>
        <Text style={styles.label}>Posición</Text>
        <Segment options={positionOptions} value={position} onChange={setPosition} />
      </View>

      <View style={styles.gap}>
        <Button
          title={existing ? 'Guardar cambios' : 'Registrar jugador'}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSizes.tableValue,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  gap: {
    marginTop: 16,
  },
});
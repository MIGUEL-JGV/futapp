/**
 * TeamFormScreen (RF-03: registrar/editar equipo).
 */

import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/ui/Button';
import { PhotoPicker } from '../components/ui/PhotoPicker';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import type { RootStackParamList } from '../navigation/types';
import { useFutAppStore } from '../store/useFutAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamForm'>;

export function TeamFormScreen({ route, navigation }: Props) {
  const { tournamentId, teamId } = route.params ?? {};
  const teams = useFutAppStore((state) => state.teams);
  const addTeam = useFutAppStore((state) => state.addTeam);
  const updateTeam = useFutAppStore((state) => state.updateTeam);

  const existing = teams.find((t) => t.id === teamId);
  const [name, setName] = useState(existing?.name ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(
    existing?.logoUrl ?? null,
  );

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validación', 'El nombre del equipo es obligatorio.');
      return;
    }
    if (existing) {
      updateTeam(existing.id, { name: name.trim(), logoUrl });
    } else if (tournamentId) {
      addTeam(tournamentId, name.trim(), logoUrl);
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <TextField
        label="Nombre del equipo"
        value={name}
        onChangeText={setName}
        placeholder="Ej.: FC Norte"
      />
      <View style={styles.section}>
        <PhotoPicker
          label="Escudo"
          value={logoUrl}
          onChange={setLogoUrl}
          prefix="team-logo"
        />
      </View>
      <View style={styles.section}>
        <Button
          title={existing ? 'Guardar cambios' : 'Registrar equipo'}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },
});
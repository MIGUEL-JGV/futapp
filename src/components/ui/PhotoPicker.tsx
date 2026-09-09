/**
 * PhotoPicker: selector de foto para escudos (equipos) y jugadores.
 *
 * Muestra una vista previa redonda y permite elegir desde la galería o la
 * cámara (nativo). La imagen se persiste como archivo local (o data URI en
 * web) vía `pickPhoto`/`persistPhoto`/`removePhoto` de `services/photos`.
 */

import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Avatar } from './Avatar';
import { colors, fontSizes } from '../../theme/colors';
import { pickPhoto, persistPhoto, removePhoto, type PhotoSource } from '../../services/photos';

interface PhotoPickerProps {
  /** Valor actual (ruta file:// o data URI). */
  value?: string | null;
  onChange: (uri: string | null) => void;
  /** Etiqueta del campo, ej.: "Escudo del equipo". */
  label: string;
  /** Prefijo del nombre de archivo persistido (ej.: 'logo', 'player'). */
  prefix: string;
}

export function PhotoPicker({ value, onChange, label, prefix }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);

  const handleChoose = async (source: PhotoSource) => {
    if (busy) return;
    if (Platform.OS === 'web' && source === 'camera') return;

    setBusy(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return; // Usuario canceló.
      // Persistir primero y actualizar el valor; solo después se borra la
      // foto anterior (así un fallo no deja al usuario sin imagen).
      const uri = await persistPhoto(asset, prefix);
      onChange(uri);
      await removePhoto(value);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la imagen seleccionada.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    void removePhoto(value);
    onChange(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.preview}>
        <Avatar uri={value} label={label} size={88} />
      </View>
      <View style={styles.actions}>
        <Button
          title="Galería"
          variant="ghost"
          small
          disabled={busy}
          onPress={() => void handleChoose('gallery')}
        />
        {Platform.OS !== 'web' && (
          <Button
            title="Cámara"
            variant="accent"
            small
            disabled={busy}
            onPress={() => void handleChoose('camera')}
          />
        )}
        {value ? (
          <Button
            title="Quitar"
            variant="danger"
            small
            disabled={busy}
            onPress={handleRemove}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  label: {
    fontSize: fontSizes.tableValue,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  preview: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
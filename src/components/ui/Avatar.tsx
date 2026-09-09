/**
 * Avatar redondeado: muestra una imagen (ruta local, data URI o URL) o,
 * si no hay (o falla al cargar), las iniciales del nombre como respaldo.
 */

import { memo, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes } from '../../theme/colors';

interface AvatarProps {
  /** Fuente de la imagen (file://, data URI o https). */
  uri?: string | null;
  /** Nombre usado para las iniciales de respaldo. */
  label?: string;
  /** Diámetro en píxeles. */
  size?: number;
}

export const Avatar = memo(function Avatar({
  uri,
  label,
  size = 36,
}: AvatarProps) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const [failed, setFailed] = useState(false);

  // Al cambiar la fuente, se reintenta la carga.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[circle, styles.image]}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = label ? label.trim().slice(0, 2).toUpperCase() : '?';
  return (
    <View style={[circle, styles.placeholder]}>
      <Text style={[styles.placeholderText, { fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.rowAlt,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralSoft,
  },
  placeholderText: {
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
/**
 * Screen: contenedor con fondo y entrada animada (fade + slide up).
 */

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { useEntrance } from '../../utils/animation';

interface ScreenProps {
  children: ReactNode;
  /** Envolver el contenido en un ScrollView (por defecto true). */
  scroll?: boolean;
  style?: ViewStyle;
  /** Retardo de la entrada (para apilado/transiciones). */
  entranceDelay?: number;
}

export function Screen({ children, scroll = true, style, entranceDelay = 0 }: ScreenProps) {
  const entrance = useEntrance(entranceDelay);

  const container = [styles.safe, style];

  if (!scroll) {
    return (
      <SafeAreaView style={container}>
        <View style={[styles.staticBody, entrance.style]}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={container}>
      <View style={[styles.flex, entrance.style]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  staticBody: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
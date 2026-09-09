/**
 * Screen: contenedor con fondo y entrada animada (fade + slide up).
 *
 * Responsive: limita el ancho del contenido (máx. 900px), lo centra en
 * pantallas anchas y ajusta el padding horizontal según el dispositivo.
 */

import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { useEntrance } from '../../utils/animation';

/** Ancho máximo del contenido para evitar textos y campos "estirados". */
const CONTENT_MAX_WIDTH = 720;

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
  const { width } = useWindowDimensions();
  const horizontal = width >= 768 ? 28 : 16;

  const container = [styles.safe, style];
  const contentStyle = [styles.content, { paddingHorizontal: horizontal }];

  if (!scroll) {
    return (
      <SafeAreaView style={container}>
        <View style={[styles.staticBody, entrance.style]}>
          <View style={contentStyle}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={container}>
      <View style={[styles.flex, entrance.style]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={contentStyle}>{children}</View>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
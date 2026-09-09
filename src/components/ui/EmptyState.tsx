/**
 * Estado vacío con "escudo" circular decorativo.
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius } from '../../theme/colors';

export function EmptyState({ message, title = 'Sin datos' }: { message: string; title?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>0</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeText: {
    color: colors.textSecondary,
    fontWeight: '900',
    fontSize: fontSizes.big,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: fontSizes.tableValue,
    marginBottom: 4,
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSizes.tableCell,
  },
});
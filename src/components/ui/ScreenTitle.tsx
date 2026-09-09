/**
 * Título de pantalla con acento deportivo (barra dorada + título en negrita).
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes } from '../../theme/colors';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
}

export function ScreenTitle({ title, subtitle }: ScreenTitleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accent: {
    width: 6,
    height: 26,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.title,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    marginLeft: 16,
    fontSize: fontSizes.subtitle,
    color: colors.textSecondary,
  },
});
/**
 * Control segmentado estilo "pill" con activo en gradiente.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSizes, radius } from '../../theme/colors';

export interface SegmentOption<T = string> {
  label: string;
  value: T;
}

interface SegmentProps<T = string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function Segment<T = string>({
  options,
  value,
  onChange,
}: SegmentProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={styles.segment}>
            {active ? (
              <LinearGradient
                colors={colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.active}>
                <Text style={[styles.text, styles.textActive]}>{option.label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.text}>{option.label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  active: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  text: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSizes.tableCell,
  },
  textActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
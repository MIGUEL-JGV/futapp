/**
 * TextField con borde redondeado y acento al enfocarse.
 */

import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import { colors, fontSizes, radius } from '../../theme/colors';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
        style={[
          styles.input,
          focused ? styles.inputFocused : undefined,
          style,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSizes.tableHeader,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: fontSizes.tableValue,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  inputFocused: {
    borderColor: colors.brand,
    backgroundColor: '#FFFFFF',
  },
});
// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export default function StyledInput({ label, error, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={Colors.textMuted}
        textAlign="right"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    textAlign: 'right',
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 48,
  },
  focused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.danger },
  error: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 4, textAlign: 'right' },
});

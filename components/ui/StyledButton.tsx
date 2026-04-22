// Powered by OnSpace.AI
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function StyledButton({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, fullWidth }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        (pressed || isDisabled) && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? Colors.primary : Colors.white} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], size === 'sm' && styles.labelSm]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, minHeight: 36 },
  md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, minHeight: 44 },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 52 },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: FontWeight.semiBold, fontSize: FontSize.md, color: Colors.white },
  label_ghost: { color: Colors.primary },
  label_secondary: { color: Colors.text },
  labelSm: { fontSize: FontSize.sm },
  label_primary: {},
  label_danger: {},
});

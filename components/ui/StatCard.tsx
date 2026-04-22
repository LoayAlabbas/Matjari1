// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface Props {
  title: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  bg?: string;
  small?: boolean;
}

export default function StatCard({ title, value, icon, iconColor = Colors.primary, bg = Colors.card, small }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: bg }, small && styles.small]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialIcons name={icon} size={small ? 20 : 24} color={iconColor} />
      </View>
      <Text style={[styles.value, small && styles.valueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.xs,
    minHeight: 100,
  },
  small: { minHeight: 80, padding: Spacing.sm + 4 },
  iconWrap: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'right',
  },
  valueSmall: { fontSize: FontSize.lg },
  title: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'right',
  },
});

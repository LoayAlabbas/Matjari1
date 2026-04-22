// Powered by OnSpace.AI
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';
import { Colors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        // Verify user still exists in store_users and is active
        const { data } = await sb
          .from('store_users')
          .select('is_active')
          .eq('auth_uid', session.user.id)
          .single();
        if (data && data.is_active) {
          router.replace('/(tabs)');
        } else {
          await sb.auth.signOut();
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});

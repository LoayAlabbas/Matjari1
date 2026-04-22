// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledInput from '@/components/ui/StyledInput';
import StyledButton from '@/components/ui/StyledButton';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    const { error: loginError } = await login(username.trim(), password);
    setLoading(false);
    if (loginError) {
      setError(loginError);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/login-hero.png')}
            style={styles.hero}
            contentFit="cover"
            transition={400}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>متجري</Text>
            <Text style={styles.heroSub}>نظام إدارة المتجر المتكامل</Text>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.lockIcon}>
              <MaterialIcons name="lock" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.title}>تسجيل الدخول</Text>
            <Text style={styles.subtitle}>أدخل بيانات الدخول التي منحك إياها المسؤول</Text>
          </View>

          <View style={styles.form}>
            <StyledInput
              label="اسم المستخدم"
              value={username}
              onChangeText={t => { setUsername(t); setError(''); }}
              placeholder="admin"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordWrap}>
              <StyledInput
                label="كلمة المرور"
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword(s => !s)}
                hitSlop={8}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={Colors.danger} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <StyledButton
              label={loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.btn}
              disabled={loading}
            />
          </View>

          <View style={styles.hint}>
            <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.hintText}>
              لا يمكن إنشاء حسابات جديدة من هنا. تواصل مع مسؤول النظام للحصول على بيانات دخولك.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: Spacing.lg },
  heroContainer: {
    width: '100%', height: 200, borderRadius: Radius.xl,
    overflow: 'hidden', marginBottom: Spacing.xl, position: 'relative',
  },
  hero: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
  },
  heroTitle: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: FontWeight.bold },
  heroSub: { color: Colors.primaryLight, fontSize: FontSize.sm },
  card: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  lockIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  form: { gap: 4 },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', left: Spacing.md, bottom: Spacing.md + 6, zIndex: 1 },
  errorBox: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.danger + '11', borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.danger + '44',
  },
  error: { color: Colors.danger, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  btn: { marginTop: Spacing.sm },
  hint: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: Spacing.xs,
    marginTop: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  hintText: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1, textAlign: 'right', lineHeight: 18 },
});

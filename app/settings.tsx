// Powered by OnSpace.AI
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import StyledInput from '@/components/ui/StyledInput';
import { StoreUser, UserRole } from '@/types';
import { fetchStoreUsers, createStoreUser, deleteStoreUser, updateStoreUser } from '@/services/userService';

const CURRENCIES = ['د.ج', 'SAR', 'USD', 'EUR', 'MAD', 'TND', 'EGP', 'LYD'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings, syncing, refresh, products, customers, invoices } = useApp();
  const { currentUser, isAdmin, logout } = useAuth();
  const { showAlert } = useAlert();

  // Settings state
  const [storeName, setStoreName] = useState(settings?.storeName || 'متجري');
  const [currency, setCurrency] = useState(settings?.currency || 'د.ج');
  const [taxEnabled, setTaxEnabled] = useState(settings?.taxEnabled || false);
  const [taxRate, setTaxRate] = useState(settings?.taxRate?.toString() || '0');
  const [shiftsEnabled, setShiftsEnabled] = useState(settings?.shiftsEnabled || false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // User management state
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StoreUser | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');
  const [editActive, setEditActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName);
      setCurrency(settings.currency);
      setTaxEnabled(settings.taxEnabled);
      setTaxRate(settings.taxRate?.toString() || '0');
      setShiftsEnabled(settings.shiftsEnabled);
    }
  }, [settings]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const list = await fetchStoreUsers();
      setUsers(list);
    } catch (e) {
      showAlert('خطأ', 'تعذّر تحميل قائمة المستخدمين');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleSaveSettings() {
    if (!storeName.trim()) { showAlert('تنبيه', 'اسم المتجر مطلوب'); return; }
    setSavingSettings(true);
    try {
      await updateSettings({
        storeName: storeName.trim(), currency, theme: 'dark', language: 'ar',
        taxEnabled, taxRate: parseFloat(taxRate) || 0, shiftsEnabled,
      });
      showAlert('تم', 'تم حفظ الإعدادات بنجاح');
    } catch {
      showAlert('خطأ', 'تعذّر حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddUser() {
    if (!newUsername.trim() || !newPassword.trim()) {
      showAlert('تنبيه', 'اسم المستخدم وكلمة المرور مطلوبان');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('تنبيه', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSavingUser(true);
    const { error } = await createStoreUser(newUsername.trim(), newPassword, newRole);
    setSavingUser(false);
    if (error) {
      showAlert('خطأ', error);
    } else {
      showAlert('تم', 'تم إضافة المستخدم بنجاح');
      setShowAddUser(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('cashier');
      loadUsers();
    }
  }

  function openEditUser(user: StoreUser) {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditActive(user.isActive);
    setEditPassword('');
    setShowEditUser(true);
  }

  async function handleUpdateUser() {
    if (!selectedUser) return;
    if (editPassword && editPassword.length < 6) {
      showAlert('تنبيه', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSavingUser(true);
    const updates: any = { role: editRole, isActive: editActive };
    if (editPassword.trim()) updates.newPassword = editPassword.trim();
    const { error } = await updateStoreUser(selectedUser.id, selectedUser.authUid, updates);
    setSavingUser(false);
    if (error) {
      showAlert('خطأ', error);
    } else {
      showAlert('تم', 'تم تحديث المستخدم');
      setShowEditUser(false);
      loadUsers();
    }
  }

  function handleDeleteUser(user: StoreUser) {
    if (user.authUid === currentUser?.id) {
      showAlert('تنبيه', 'لا يمكنك حذف حسابك الخاص');
      return;
    }
    showAlert('حذف المستخدم', `هل أنت متأكد من حذف "${user.username}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          const { error } = await deleteStoreUser(user.id, user.authUid);
          if (error) {
            showAlert('خطأ', error);
          } else {
            loadUsers();
          }
        }
      },
    ]);
  }

  async function handleLogout() {
    showAlert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/login');
        }
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Current User Info */}
      <View style={styles.section}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <MaterialIcons name="person" size={28} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.username || 'المستخدم'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: currentUser?.role === 'admin' ? Colors.warning + '22' : Colors.info + '22' }]}>
              <Text style={[styles.roleText, { color: currentUser?.role === 'admin' ? Colors.warning : Colors.info }]}>
                {currentUser?.role === 'admin' ? 'مسؤول النظام' : 'كاشير'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>خروج</Text>
          </Pressable>
        </View>
      </View>

      {/* Store Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إعدادات المتجر</Text>
        <View style={styles.card}>
          <StyledInput
            label="اسم المتجر"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="متجري"
          />
          <Text style={styles.fieldLabel}>العملة المستخدمة</Text>
          <Pressable style={styles.currencyPicker} onPress={() => setShowCurrencyModal(true)}>
            <MaterialIcons name="expand-more" size={20} color={Colors.textSecondary} />
            <Text style={styles.currencyValue}>{currency}</Text>
          </Pressable>
          {/* Tax */}
          <View style={styles.switchRow}>
            <Switch
              value={taxEnabled}
              onValueChange={setTaxEnabled}
              thumbColor={taxEnabled ? Colors.primary : Colors.textMuted}
              trackColor={{ false: Colors.border, true: Colors.primary + '55' }}
            />
            <Text style={styles.switchLabel}>تفعيل الضريبة (TVA)</Text>
          </View>
          {taxEnabled ? (
            <StyledInput
              label="نسبة الضريبة %"
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="19"
              keyboardType="numeric"
            />
          ) : null}

          {/* Shifts */}
          <View style={styles.switchRow}>
            <Switch
              value={shiftsEnabled}
              onValueChange={setShiftsEnabled}
              thumbColor={shiftsEnabled ? Colors.primary : Colors.textMuted}
              trackColor={{ false: Colors.border, true: Colors.primary + '55' }}
            />
            <Text style={styles.switchLabel}>تفعيل نظام الورديات</Text>
          </View>

          <StyledButton
            label={savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            onPress={handleSaveSettings}
            fullWidth disabled={savingSettings}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </View>

      {/* User Management - Admin Only */}
      {isAdmin ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pressable style={styles.addUserBtn} onPress={() => setShowAddUser(true)}>
              <MaterialIcons name="person-add" size={16} color={Colors.white} />
              <Text style={styles.addUserBtnText}>إضافة</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>إدارة المستخدمين</Text>
          </View>
          <View style={styles.card}>
            {loadingUsers ? (
              <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} />
            ) : users.length === 0 ? (
              <View style={styles.emptyUsers}>
                <MaterialIcons name="people" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyUsersText}>لا يوجد مستخدمون</Text>
              </View>
            ) : (
              users.map((user, index) => (
                <View key={user.id} style={[styles.userRow, index > 0 && styles.userRowBorder]}>
                  <View style={styles.userRowActions}>
                    <Pressable onPress={() => handleDeleteUser(user)} hitSlop={8}>
                      <MaterialIcons name="delete" size={18} color={Colors.danger} />
                    </Pressable>
                    <Pressable onPress={() => openEditUser(user)} hitSlop={8}>
                      <MaterialIcons name="edit" size={18} color={Colors.info} />
                    </Pressable>
                  </View>
                  <View style={styles.userRowInfo}>
                    <View style={styles.userRowTop}>
                      <View style={[styles.statusDot, { backgroundColor: user.isActive ? Colors.success : Colors.danger }]} />
                      <View style={[styles.miniRoleBadge, { backgroundColor: user.role === 'admin' ? Colors.warning + '22' : Colors.info + '22' }]}>
                        <Text style={[styles.miniRoleText, { color: user.role === 'admin' ? Colors.warning : Colors.info }]}>
                          {user.role === 'admin' ? 'مسؤول' : 'كاشير'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.userRowName}>{user.username}</Text>
                    <Text style={styles.userRowDate}>
                      {user.isActive ? 'نشط' : 'موقوف'} · {new Date(user.createdAt).toLocaleDateString('ar-DZ')}
                    </Text>
                  </View>
                  <View style={styles.userRowAvatar}>
                    <Text style={styles.userRowAvatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}

      {/* Sync */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>المزامنة السحابية</Text>
        <View style={styles.card}>
          <View style={styles.syncRow}>
            <View style={styles.syncInfo}>
              <Text style={styles.syncTitle}>حالة المزامنة</Text>
              <Text style={styles.syncSub}>البيانات محفوظة على السحابة ومتزامنة مع جميع الأجهزة</Text>
            </View>
            <View style={[styles.syncDot, { backgroundColor: syncing ? Colors.warning : Colors.success }]} />
          </View>
          <Pressable style={styles.refreshBtn} onPress={refresh} disabled={syncing}>
            {syncing
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <MaterialIcons name="refresh" size={18} color={Colors.primary} />
            }
            <Text style={styles.refreshText}>{syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إحصائيات قاعدة البيانات</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'المنتجات', value: products.length, icon: 'inventory-2', color: Colors.primary },
            { label: 'الزبائن', value: customers.length, icon: 'people', color: Colors.info },
            { label: 'الفواتير', value: invoices.length, icon: 'receipt', color: Colors.warning },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <MaterialIcons name={s.icon as any} size={24} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>حول التطبيق</Text>
        <View style={styles.card}>
          {[
            { label: 'اسم التطبيق', value: 'متجري Pro' },
            { label: 'الإصدار', value: '2.0.0' },
            { label: 'التوافق', value: 'Android 10+' },
            { label: 'قاعدة البيانات', value: 'OnSpace Cloud' },
          ].map((r, i) => (
            <View key={r.label} style={[styles.aboutRow, i > 0 && styles.aboutRowBorder]}>
              <Text style={styles.aboutValue}>{r.value}</Text>
              <Text style={styles.aboutLabel}>{r.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Currency Modal ── */}
      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowCurrencyModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>اختر العملة</Text>
            </View>
            {CURRENCIES.map(c => (
              <Pressable
                key={c}
                style={[styles.currencyOption, currency === c && styles.currencyOptionActive]}
                onPress={() => { setCurrency(c); setShowCurrencyModal(false); }}
              >
                {currency === c
                  ? <MaterialIcons name="check" size={18} color={Colors.primary} />
                  : <View style={{ width: 18 }} />
                }
                <Text style={[styles.currencyOptionText, currency === c && { color: Colors.primary }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Add User Modal ── */}
      <Modal visible={showAddUser} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowAddUser(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>إضافة مستخدم جديد</Text>
            </View>

            <StyledInput
              label="اسم المستخدم"
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="cashier1"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <StyledInput
              label="كلمة المرور"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="6 أحرف على الأقل"
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>نوع الصلاحية</Text>
            <View style={styles.roleToggle}>
              {(['cashier', 'admin'] as UserRole[]).map(r => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, newRole === r && styles.roleBtnActive]}
                  onPress={() => setNewRole(r)}
                >
                  <MaterialIcons
                    name={r === 'admin' ? 'admin-panel-settings' : 'point-of-sale'}
                    size={16}
                    color={newRole === r ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.roleBtnText, newRole === r && styles.roleBtnTextActive]}>
                    {r === 'admin' ? 'مسؤول' : 'كاشير'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <StyledButton
              label={savingUser ? 'جاري الإضافة...' : 'إضافة المستخدم'}
              onPress={handleAddUser}
              fullWidth
              disabled={savingUser}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal visible={showEditUser} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEditUser(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>تعديل: {selectedUser?.username}</Text>
            </View>

            <StyledInput
              label="كلمة مرور جديدة (اتركه فارغاً للإبقاء)"
              value={editPassword}
              onChangeText={setEditPassword}
              placeholder="اختياري"
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>نوع الصلاحية</Text>
            <View style={styles.roleToggle}>
              {(['cashier', 'admin'] as UserRole[]).map(r => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, editRole === r && styles.roleBtnActive]}
                  onPress={() => setEditRole(r)}
                >
                  <MaterialIcons
                    name={r === 'admin' ? 'admin-panel-settings' : 'point-of-sale'}
                    size={16}
                    color={editRole === r ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.roleBtnText, editRole === r && styles.roleBtnTextActive]}>
                    {r === 'admin' ? 'مسؤول' : 'كاشير'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.activeRow}>
              <Switch
                value={editActive}
                onValueChange={setEditActive}
                thumbColor={editActive ? Colors.primary : Colors.textMuted}
                trackColor={{ false: Colors.border, true: Colors.primary + '55' }}
              />
              <Text style={styles.activeLabel}>{editActive ? 'الحساب نشط' : 'الحساب موقوف'}</Text>
            </View>

            <StyledButton
              label={savingUser ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              onPress={handleUpdateUser}
              fullWidth
              disabled={savingUser}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginBottom: Spacing.sm, fontWeight: '500' },

  userCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  userInfo: { flex: 1, alignItems: 'flex-end' },
  userName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  roleBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginTop: 4 },
  roleText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  logoutBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: Colors.danger + '11', borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.danger + '33',
  },
  logoutText: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  addUserBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  addUserBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },

  emptyUsers: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyUsersText: { color: Colors.textMuted, fontSize: FontSize.md },

  userRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  userRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  userRowAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  userRowAvatarText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  userRowInfo: { flex: 1, alignItems: 'flex-end' },
  userRowTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  miniRoleBadge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  miniRoleText: { fontSize: 10, fontWeight: FontWeight.semiBold },
  userRowName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, textAlign: 'right' },
  userRowDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  userRowActions: { flexDirection: 'row', gap: Spacing.sm },

  currencyPicker: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  currencyValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },

  syncRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  syncInfo: { flex: 1 },
  syncTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, textAlign: 'right' },
  syncSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginTop: 2 },
  syncDot: { width: 12, height: 12, borderRadius: 6 },
  refreshBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '11', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  refreshText: { color: Colors.primary, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },

  statsGrid: { flexDirection: 'row-reverse', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center' },

  aboutRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  aboutRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  aboutLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  aboutValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },

  roleToggle: {
    flexDirection: 'row-reverse', borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  roleBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm + 2, backgroundColor: Colors.background },
  roleBtnActive: { backgroundColor: Colors.primary },
  roleBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  roleBtnTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },

  activeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  activeLabel: { color: Colors.text, fontSize: FontSize.md, flex: 1, textAlign: 'right' },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  switchLabel: { color: Colors.text, fontSize: FontSize.md, flex: 1, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  currencyOption: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  currencyOptionActive: { backgroundColor: Colors.primary + '11', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm },
  currencyOptionText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
});

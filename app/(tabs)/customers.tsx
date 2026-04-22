// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import StyledInput from '@/components/ui/StyledInput';
import { formatCurrency } from '@/utils/format';

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customers, addCustomer, updateCustomer, deleteCustomer, settings } = useApp();
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<null | typeof customers[0]>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = settings?.currency || 'د.ج';

  const filtered = useMemo(() =>
    customers.filter(c => c.name.includes(search) || c.phone.includes(search)),
    [customers, search]
  );

  const totalDebt = useMemo(() =>
    customers.reduce((s, c) => s + (c.balance < 0 ? -c.balance : 0), 0),
    [customers]
  );

  function openAdd() {
    setEditCustomer(null);
    setName(''); setPhone(''); setAddress(''); setNotes('');
    setShowModal(true);
  }

  function openEdit(c: typeof customers[0]) {
    setEditCustomer(c);
    setName(c.name); setPhone(c.phone); setAddress(c.address || ''); setNotes(c.notes || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim()) { showAlert('تنبيه', 'اسم الزبون مطلوب'); return; }
    setSaving(true);
    try {
      if (editCustomer) {
        await updateCustomer(editCustomer.id, { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() });
      } else {
        await addCustomer({ name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim(), balance: 0 });
      }
      setShowModal(false);
    } catch {
      showAlert('خطأ', 'تعذّر حفظ الزبون');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string, name: string) {
    showAlert('حذف الزبون', `هل أنت متأكد من حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCustomer(id) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <MaterialIcons name="person-add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>إضافة</Text>
        </Pressable>
        <Text style={styles.headerTitle}>الزبائن ({customers.length})</Text>
      </View>

      <View style={styles.debtSummary}>
        <MaterialIcons name="account-balance-wallet" size={20} color={Colors.danger} />
        <Text style={styles.debtText}>إجمالي الديون: <Text style={{ color: Colors.danger, fontWeight: FontWeight.bold }}>{formatCurrency(totalDebt, currency)}</Text></Text>
      </View>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث بالاسم أو الهاتف..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="people" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا يوجد زبائن</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardActions}>
              <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={8} style={styles.iconBtn}>
                <MaterialIcons name="delete" size={20} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
                <MaterialIcons name="edit" size={20} color={Colors.info} />
              </Pressable>
            </View>
            <Pressable
              style={styles.cardContent}
              onPress={() => router.push({ pathname: '/customer-detail', params: { id: item.id } } as never)}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTop}>
                  <View style={[styles.balanceBadge, { backgroundColor: item.balance < 0 ? Colors.danger + '22' : Colors.success + '22' }]}>
                    <Text style={[styles.balanceText, { color: item.balance < 0 ? Colors.danger : Colors.success }]}>
                      {item.balance < 0 ? 'مدين ' : 'دائن '}{formatCurrency(Math.abs(item.balance), currency)}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{item.name}</Text>
                </View>
                <Text style={styles.customerPhone}>
                  <MaterialIcons name="phone" size={12} color={Colors.textMuted} /> {item.phone}
                </Text>
                {item.address ? <Text style={styles.customerAddress} numberOfLines={1}>{item.address}</Text> : null}
              </View>
            </Pressable>
          </View>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>{editCustomer ? 'تعديل الزبون' : 'إضافة زبون جديد'}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <StyledInput label="الاسم *" value={name} onChangeText={setName} placeholder="اسم الزبون" />
              <StyledInput label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="0791234567" keyboardType="phone-pad" />
              <StyledInput label="العنوان (اختياري)" value={address} onChangeText={setAddress} placeholder="الحي، الشارع..." />
              <StyledInput label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} placeholder="..." multiline numberOfLines={3} />
              <StyledButton label={saving ? 'جاري الحفظ...' : (editCustomer ? 'حفظ التعديلات' : 'إضافة الزبون')} onPress={handleSave} fullWidth disabled={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  addBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  addBtnText: { color: Colors.white, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  debtSummary: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.danger + '11',
    borderRadius: Radius.md, padding: Spacing.sm + 4, borderWidth: 1, borderColor: Colors.danger + '33',
  },
  debtText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  searchRow: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.sm + 2 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 20, gap: Spacing.sm },
  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardActions: { flexDirection: 'row-reverse', gap: Spacing.xs, padding: Spacing.sm, paddingBottom: 0, justifyContent: 'flex-start' },
  iconBtn: { backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, paddingTop: Spacing.sm },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  customerName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, textAlign: 'right' },
  customerPhone: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right' },
  customerAddress: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
  balanceBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  balanceText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '85%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
});

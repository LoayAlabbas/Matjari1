// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import StyledInput from '@/components/ui/StyledInput';
import { Supplier } from '@/types';
import { formatCurrency } from '@/utils/format';

export default function SuppliersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, settings } = useApp();
  const { showAlert } = useAlert();
  const currency = settings?.currency || 'د.ج';

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() =>
    suppliers.filter(s => s.name.includes(search) || s.phone.includes(search)),
    [suppliers, search]
  );

  const totalDebt = useMemo(() =>
    suppliers.filter(s => s.balance < 0).reduce((t, s) => t + Math.abs(s.balance), 0),
    [suppliers]
  );

  function openAdd() {
    setEditing(null); setName(''); setPhone(''); setAddress(''); setNotes('');
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s); setName(s.name); setPhone(s.phone);
    setAddress(s.address || ''); setNotes(s.notes || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim()) { showAlert('تنبيه', 'اسم المورّد مطلوب'); return; }
    if (!phone.trim()) { showAlert('تنبيه', 'رقم الهاتف مطلوب'); return; }
    setSaving(true);
    try {
      const data = { name: name.trim(), phone: phone.trim(), address: address.trim() || undefined, notes: notes.trim() || undefined, balance: editing?.balance || 0 };
      if (editing) {
        await updateSupplier(editing.id, data);
      } else {
        await addSupplier(data);
      }
      setShowModal(false);
    } catch {
      showAlert('خطأ', 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(s: Supplier) {
    showAlert('حذف', `حذف "${s.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try { await deleteSupplier(s.id); } catch { showAlert('خطأ', 'تعذّر الحذف'); }
      }},
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-forward" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>الموردون</Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <MaterialIcons name="add" size={20} color={Colors.white} />
        </Pressable>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{suppliers.length}</Text>
          <Text style={styles.summaryLabel}>إجمالي الموردين</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>{formatCurrency(totalDebt, currency)}</Text>
          <Text style={styles.summaryLabel}>ديون الموردين</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
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
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.supplierCard}>
            <View style={styles.supplierActions}>
              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <MaterialIcons name="delete" size={18} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                <MaterialIcons name="edit" size={18} color={Colors.info} />
              </Pressable>
            </View>
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>{item.name}</Text>
              <Text style={styles.supplierPhone}>{item.phone}</Text>
              {item.address ? <Text style={styles.supplierAddress}>{item.address}</Text> : null}
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            {item.balance !== 0 ? (
              <View style={[styles.balanceBadge, { backgroundColor: item.balance < 0 ? Colors.danger + '22' : Colors.success + '22' }]}>
                <Text style={[styles.balanceText, { color: item.balance < 0 ? Colors.danger : Colors.success }]}>
                  {item.balance < 0 ? 'مديون' : 'دائن'} {formatCurrency(Math.abs(item.balance), currency)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="local-shipping" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{search ? 'لا نتائج' : 'لا يوجد موردون'}</Text>
            {!search && <StyledButton label="إضافة مورّد" onPress={openAdd} style={{ marginTop: Spacing.md }} />}
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>{editing ? 'تعديل مورّد' : 'مورّد جديد'}</Text>
            </View>
            <StyledInput label="الاسم *" value={name} onChangeText={setName} placeholder="اسم الشركة أو المورد" />
            <StyledInput label="الهاتف *" value={phone} onChangeText={setPhone} placeholder="0555xxxxxx" keyboardType="phone-pad" />
            <StyledInput label="العنوان (اختياري)" value={address} onChangeText={setAddress} placeholder="العنوان..." />
            <StyledInput label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} placeholder="..." />
            <StyledButton
              label={saving ? 'جاري الحفظ...' : (editing ? 'حفظ' : 'إضافة')}
              onPress={handleSave} fullWidth disabled={saving} style={{ marginTop: Spacing.sm }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm },
  summaryRow: { flexDirection: 'row-reverse', gap: Spacing.sm, padding: Spacing.md },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  searchWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  supplierCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  supplierActions: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'flex-start', marginBottom: Spacing.sm },
  supplierInfo: { alignItems: 'flex-end' },
  supplierName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  supplierPhone: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  supplierAddress: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  avatarCircle: { position: 'absolute', top: Spacing.md, right: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  balanceBadge: { marginTop: Spacing.sm, alignSelf: 'flex-end', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  balanceText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.lg },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
});

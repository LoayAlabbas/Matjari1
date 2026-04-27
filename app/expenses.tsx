// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable,
  TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import StyledInput from '@/components/ui/StyledInput';
import { Expense, EXPENSE_CATEGORIES } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, addExpense, updateExpense, deleteExpense, settings } = useApp();
  const { showAlert } = useAlert();
  const currency = settings?.currency || 'د.ج';

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('الكل');

  const filtered = useMemo(() => {
    if (filterCat === 'الكل') return expenses;
    return expenses.filter(e => e.category === filterCat);
  }, [expenses, filterCat]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const totalAll = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  function openAdd() {
    setEditing(null);
    setDescription(''); setAmount(''); setCategory(EXPENSE_CATEGORIES[0]); setNotes('');
    setShowModal(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setDescription(e.description); setAmount(e.amount.toString());
    setCategory(e.category); setNotes(e.notes || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!description.trim()) { showAlert('تنبيه', 'الوصف مطلوب'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { showAlert('تنبيه', 'المبلغ غير صحيح'); return; }
    setSaving(true);
    try {
      const data = {
        description: description.trim(),
        amount: Number(amount),
        category,
        date: editing?.date || new Date().toISOString(),
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await updateExpense(editing.id, data);
        showAlert('تم', 'تم تحديث المصروف');
      } else {
        await addExpense(data);
        showAlert('تم', 'تم إضافة المصروف');
      }
      setShowModal(false);
    } catch {
      showAlert('خطأ', 'تعذّر حفظ المصروف');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(e: Expense) {
    showAlert('حذف', `حذف "${e.description}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try { await deleteExpense(e.id); } catch { showAlert('خطأ', 'تعذّر الحذف'); }
      }},
    ]);
  }

  const categories = ['الكل', ...EXPENSE_CATEGORIES];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-forward" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>المصاريف</Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <MaterialIcons name="add" size={20} color={Colors.white} />
        </Pressable>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalThisMonth, currency)}</Text>
          <Text style={styles.summaryLabel}>هذا الشهر</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.card }]}>
          <Text style={styles.summaryValue}>{formatCurrency(totalAll, currency)}</Text>
          <Text style={styles.summaryLabel}>الإجمالي</Text>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {categories.map(c => (
          <Pressable key={c} style={[styles.catBtn, filterCat === c && styles.catBtnActive]} onPress={() => setFilterCat(c)}>
            <Text style={[styles.catText, filterCat === c && styles.catTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.expenseCard}>
            <View style={styles.expenseActions}>
              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <MaterialIcons name="delete" size={18} color={Colors.danger} />
              </Pressable>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                <MaterialIcons name="edit" size={18} color={Colors.info} />
              </Pressable>
            </View>
            <View style={styles.expenseInfo}>
              <View style={styles.expenseTop}>
                <View style={styles.catTag}>
                  <Text style={styles.catTagText}>{item.category}</Text>
                </View>
                <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.expenseDesc}>{item.description}</Text>
              {item.notes ? <Text style={styles.expenseNotes}>{item.notes}</Text> : null}
            </View>
            <Text style={styles.expenseAmount}>{formatCurrency(item.amount, currency)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مصاريف</Text>
            <StyledButton label="إضافة مصروف" onPress={openAdd} style={{ marginTop: Spacing.md }} />
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
              <Text style={styles.sheetTitle}>{editing ? 'تعديل مصروف' : 'مصروف جديد'}</Text>
            </View>

            <StyledInput label="الوصف *" value={description} onChangeText={setDescription} placeholder="مثال: إيجار المحل" />
            <StyledInput label="المبلغ *" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />

            <Text style={styles.fieldLabel}>الفئة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: Spacing.sm, flexDirection: 'row-reverse' }}>
              {EXPENSE_CATEGORIES.map(c => (
                <Pressable key={c} style={[styles.catBtn, category === c && styles.catBtnActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <StyledInput label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} placeholder="..." />

            <StyledButton
              label={saving ? 'جاري الحفظ...' : (editing ? 'حفظ التعديلات' : 'إضافة')}
              onPress={handleSave}
              fullWidth
              disabled={saving}
              style={{ marginTop: Spacing.sm }}
            />
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
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm },
  summaryRow: { flexDirection: 'row-reverse', gap: Spacing.sm, padding: Spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  summaryValue: { color: Colors.danger, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  catRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row-reverse' },
  catBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  catBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  catText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  catTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  expenseCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  expenseActions: { flexDirection: 'column', gap: Spacing.sm },
  expenseInfo: { flex: 1, alignItems: 'flex-end' },
  expenseTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  expenseDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  catTag: { backgroundColor: Colors.warning + '22', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  catTagText: { color: Colors.warning, fontSize: 10, fontWeight: FontWeight.semiBold },
  expenseDesc: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
  expenseNotes: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right', marginTop: 2 },
  expenseAmount: { color: Colors.danger, fontSize: FontSize.lg, fontWeight: FontWeight.bold, minWidth: 80, textAlign: 'left' },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.lg },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginBottom: Spacing.sm, fontWeight: '500' },
});

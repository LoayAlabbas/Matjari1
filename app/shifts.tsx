// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable,
  Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import StyledInput from '@/components/ui/StyledInput';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { shifts, openShift: currentOpenShift, startShift, endShift, settings } = useApp();
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const currency = settings?.currency || 'د.ج';

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleOpenShift() {
    const cash = parseFloat(openingCash) || 0;
    setSaving(true);
    try {
      await startShift(currentUser?.username || 'كاشير', cash, shiftNotes.trim() || undefined);
      setShowOpenModal(false);
      setOpeningCash(''); setShiftNotes('');
    } catch {
      showAlert('خطأ', 'تعذّر فتح الوردية');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShift() {
    const cash = parseFloat(closingCash);
    if (isNaN(cash) || cash < 0) { showAlert('تنبيه', 'أدخل مبلغاً صحيحاً'); return; }
    setSaving(true);
    try {
      await endShift(cash, shiftNotes.trim() || undefined);
      setShowCloseModal(false);
      setClosingCash(''); setShiftNotes('');
    } catch {
      showAlert('خطأ', 'تعذّر إغلاق الوردية');
    } finally {
      setSaving(false);
    }
  }

  const expectedCash = currentOpenShift
    ? currentOpenShift.openingCash + currentOpenShift.totalCash
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-forward" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>الورديات</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
        {/* Current shift status */}
        <View style={[styles.currentCard, { borderColor: currentOpenShift ? Colors.success + '44' : Colors.border }]}>
          <View style={styles.currentTop}>
            <View style={[styles.statusDot, { backgroundColor: currentOpenShift ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.currentTitle}>{currentOpenShift ? 'وردية مفتوحة' : 'لا توجد وردية مفتوحة'}</Text>
          </View>

          {currentOpenShift ? (
            <>
              <View style={styles.shiftInfoGrid}>
                {[
                  { label: 'الكاشير', value: currentOpenShift.cashierName },
                  { label: 'وقت الفتح', value: formatDate(currentOpenShift.openedAt) },
                  { label: 'رصيد الفتح', value: formatCurrency(currentOpenShift.openingCash, currency) },
                  { label: 'النقد المتوقع', value: formatCurrency(expectedCash, currency) },
                ].map(r => (
                  <View key={r.label} style={styles.shiftInfoItem}>
                    <Text style={styles.shiftInfoVal}>{r.value}</Text>
                    <Text style={styles.shiftInfoLabel}>{r.label}</Text>
                  </View>
                ))}
              </View>
              <StyledButton
                label="إغلاق الوردية"
                onPress={() => { setClosingCash(''); setShiftNotes(''); setShowCloseModal(true); }}
                fullWidth
                style={{ marginTop: Spacing.md, backgroundColor: Colors.danger }}
              />
            </>
          ) : (
            <StyledButton
              label="فتح وردية جديدة"
              onPress={() => { setOpeningCash(''); setShiftNotes(''); setShowOpenModal(true); }}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          )}
        </View>

        {/* Shift history */}
        <Text style={styles.historyTitle}>سجل الورديات</Text>
        {shifts.filter(s => s.status === 'closed').map(shift => (
          <View key={shift.id} style={styles.shiftCard}>
            <View style={styles.shiftCardTop}>
              <Text style={styles.shiftDate}>{formatDate(shift.openedAt)}</Text>
              <Text style={styles.shiftCashier}>{shift.cashierName}</Text>
            </View>
            <View style={styles.shiftStats}>
              {[
                { label: 'المبيعات', value: formatCurrency(shift.totalSales, currency), color: Colors.primary },
                { label: 'نقداً', value: formatCurrency(shift.totalCash, currency), color: Colors.success },
                { label: 'بطاقة', value: formatCurrency(shift.totalCard, currency), color: Colors.info },
                {
                  label: 'فرق النقد',
                  value: formatCurrency(Math.abs(shift.closingCash - (shift.openingCash + shift.totalCash)), currency),
                  color: Math.abs(shift.closingCash - (shift.openingCash + shift.totalCash)) > 0 ? Colors.danger : Colors.success,
                },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {shifts.filter(s => s.status === 'closed').length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="history" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا يوجد سجل ورديات</Text>
          </View>
        )}
      </ScrollView>

      {/* Open Shift Modal */}
      <Modal visible={showOpenModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowOpenModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>فتح وردية جديدة</Text>
            </View>
            <View style={styles.cashierRow}>
              <MaterialIcons name="person" size={18} color={Colors.primary} />
              <Text style={styles.cashierName}>{currentUser?.username || 'كاشير'}</Text>
            </View>
            <StyledInput
              label="رصيد الصندوق عند الفتح"
              value={openingCash}
              onChangeText={setOpeningCash}
              placeholder="0"
              keyboardType="numeric"
            />
            <StyledInput
              label="ملاحظات (اختياري)"
              value={shiftNotes}
              onChangeText={setShiftNotes}
              placeholder="..."
            />
            <StyledButton
              label={saving ? 'جاري الفتح...' : 'فتح الوردية'}
              onPress={handleOpenShift}
              fullWidth
              disabled={saving}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Close Shift Modal */}
      <Modal visible={showCloseModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowCloseModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>إغلاق الوردية</Text>
            </View>
            {currentOpenShift ? (
              <View style={styles.closeInfo}>
                <Text style={styles.closeInfoText}>النقد المتوقع في الصندوق:</Text>
                <Text style={styles.closeInfoValue}>{formatCurrency(expectedCash, currency)}</Text>
              </View>
            ) : null}
            <StyledInput
              label="النقد الفعلي في الصندوق *"
              value={closingCash}
              onChangeText={setClosingCash}
              placeholder="0"
              keyboardType="numeric"
            />
            {closingCash && !isNaN(parseFloat(closingCash)) ? (
              <View style={[styles.diffRow, { backgroundColor: Math.abs(parseFloat(closingCash) - expectedCash) > 0 ? Colors.danger + '11' : Colors.success + '11' }]}>
                <Text style={[styles.diffText, { color: Math.abs(parseFloat(closingCash) - expectedCash) > 0 ? Colors.danger : Colors.success }]}>
                  الفرق: {formatCurrency(parseFloat(closingCash) - expectedCash, currency)}
                </Text>
              </View>
            ) : null}
            <StyledInput label="ملاحظات (اختياري)" value={shiftNotes} onChangeText={setShiftNotes} placeholder="..." />
            <StyledButton
              label={saving ? 'جاري الإغلاق...' : 'إغلاق الوردية'}
              onPress={handleCloseShift}
              fullWidth
              disabled={saving}
              style={{ marginTop: Spacing.sm, backgroundColor: Colors.danger }}
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
  currentCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 2 },
  currentTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  currentTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  shiftInfoGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  shiftInfoItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  shiftInfoVal: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  shiftInfoLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  historyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.md },
  shiftCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  shiftCardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: Spacing.sm },
  shiftDate: { color: Colors.textSecondary, fontSize: FontSize.sm },
  shiftCashier: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
  shiftStats: { flexDirection: 'row-reverse', gap: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.sm, padding: Spacing.sm },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.lg },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  cashierRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary + '11', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  cashierName: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
  closeInfo: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  closeInfoText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  closeInfoValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  diffRow: { borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'center' },
  diffText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

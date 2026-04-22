// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import { formatCurrency } from '@/utils/format';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { customers, invoices, addPayment, updateCustomer, getCustomerStatement, getInvoiceItems, settings } = useApp();
  const { showAlert } = useAlert();
  const [showPayModal, setShowPayModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [savingBalance, setSavingBalance] = useState(false);

  const customer = customers.find(c => c.id === id);
  const statement = useMemo(() => customer ? getCustomerStatement(id) : [], [customer, id, getCustomerStatement]);
  const currency = settings?.currency || 'د.ج';

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>الزبون غير موجود</Text>
      </View>
    );
  }

  function handlePayment() {
    const amt = Number(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) {
      showAlert('تنبيه', 'يرجى إدخال مبلغ صحيح');
      return;
    }
    addPayment(id, amt, payNote.trim() || undefined);
    setShowPayModal(false);
    setPayAmount('');
    setPayNote('');
    showAlert('تم', 'تم تسجيل الدفعة بنجاح');
  }

  async function handleSaveBalance() {
    const bal = Number(newBalance);
    if (isNaN(bal)) { showAlert('تنبيه', 'الرصيد غير صحيح'); return; }
    setSavingBalance(true);
    await updateCustomer(id, { balance: bal });
    setSavingBalance(false);
    setShowBalanceModal(false);
    showAlert('تم', 'تم تعديل الرصيد بنجاح');
  }

  function toggleInvoice(invoiceId: string) {
    setExpandedInvoiceId(prev => prev === invoiceId ? null : invoiceId);
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Customer Info */}
        <View style={styles.infoCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.charAt(0)}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone}</Text>
          {customer.address ? <Text style={styles.customerAddress}>{customer.address}</Text> : null}
          <View style={[
            styles.balanceBadge,
            { backgroundColor: customer.balance < 0 ? Colors.danger + '22' : Colors.success + '22' }
          ]}>
            <Text style={styles.balanceLabel}>{customer.balance < 0 ? 'المبلغ المستحق' : 'رصيد دائن'}</Text>
            <Text style={[styles.balanceValue, { color: customer.balance < 0 ? Colors.danger : Colors.success }]}>
              {formatCurrency(Math.abs(customer.balance), currency)}
            </Text>
          </View>

          <View style={styles.actionBtns}>
            {customer.balance < 0 ? (
              <Pressable style={[styles.actionBtn, { backgroundColor: Colors.success + '22', borderColor: Colors.success + '55' }]} onPress={() => setShowPayModal(true)}>
                <MaterialIcons name="payment" size={16} color={Colors.success} />
                <Text style={[styles.actionBtnText, { color: Colors.success }]}>تسجيل دفعة</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.actionBtn, { backgroundColor: Colors.info + '22', borderColor: Colors.info + '55' }]} onPress={() => { setNewBalance(customer.balance.toString()); setShowBalanceModal(true); }}>
              <MaterialIcons name="edit" size={16} color={Colors.info} />
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>تعديل الرصيد</Text>
            </Pressable>
          </View>
        </View>

        {/* Statement */}
        <Text style={styles.sectionTitle}>كشف الحساب ({statement.length} عملية)</Text>

        {statement.length === 0 ? (
          <View style={styles.emptyStatement}>
            <MaterialIcons name="receipt-long" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد معاملات</Text>
          </View>
        ) : (
          [...statement].reverse().map((entry, i) => {
            const isInvoice = entry.type === 'فاتورة';
            const isExpanded = isInvoice && entry.invoiceId && expandedInvoiceId === entry.invoiceId;
            const invoiceItems = isExpanded && entry.invoiceId ? getInvoiceItems(entry.invoiceId) : [];

            return (
              <View key={i}>
                <Pressable
                  style={[styles.entryRow, isExpanded && styles.entryRowExpanded]}
                  onPress={isInvoice && entry.invoiceId ? () => toggleInvoice(entry.invoiceId!) : undefined}
                >
                  <View style={[
                    styles.entryBalance,
                    { backgroundColor: entry.balance < 0 ? Colors.danger + '11' : Colors.success + '11' }
                  ]}>
                    <Text style={[styles.entryBalanceText, { color: entry.balance < 0 ? Colors.danger : Colors.success }]}>
                      {formatCurrency(Math.abs(entry.balance), currency)}
                    </Text>
                    <Text style={styles.entryBalanceLabel}>الرصيد</Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.entryDesc}>{entry.description}</Text>
                      {isInvoice && entry.invoiceId ? (
                        <MaterialIcons
                          name={isExpanded ? 'expand-less' : 'expand-more'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.entryDate}>{new Date(entry.date).toLocaleDateString('ar-DZ')}</Text>
                    {isInvoice && entry.invoiceId ? (
                      <Text style={styles.tapHint}>اضغط لعرض التفاصيل</Text>
                    ) : null}
                  </View>
                  <View style={[
                    styles.entryAmtBadge,
                    { backgroundColor: isInvoice ? Colors.danger + '22' : Colors.success + '22' }
                  ]}>
                    <Text style={[styles.entryTypeTxt, { color: isInvoice ? Colors.danger : Colors.success }]}>
                      {entry.type}
                    </Text>
                    <Text style={[styles.entryAmt, { color: isInvoice ? Colors.danger : Colors.success }]}>
                      {isInvoice ? '-' : '+'}{formatCurrency(Math.abs(entry.amount), currency)}
                    </Text>
                  </View>
                </Pressable>

                {/* Invoice items expanded */}
                {isExpanded && invoiceItems.length > 0 ? (
                  <View style={styles.expandedItems}>
                    {invoiceItems.map(item => (
                      <View key={item.id} style={styles.expandedItem}>
                        <Text style={styles.expandedItemTotal}>{formatCurrency(item.price * item.quantity, currency)}</Text>
                        <View style={styles.expandedItemInfo}>
                          <Text style={styles.expandedItemName}>{item.productName}</Text>
                          <Text style={styles.expandedItemDetail}>{item.quantity} × {formatCurrency(item.price, currency)}</Text>
                        </View>
                      </View>
                    ))}
                    <Pressable
                      style={styles.viewFullBtn}
                      onPress={() => router.push({ pathname: '/invoice-detail', params: { id: entry.invoiceId } } as never)}
                    >
                      <MaterialIcons name="open-in-new" size={14} color={Colors.primary} />
                      <Text style={styles.viewFullText}>عرض الفاتورة كاملة</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowPayModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>تسجيل دفعة</Text>
            </View>
            <Text style={styles.debtReminder}>
              المبلغ المستحق: <Text style={{ color: Colors.danger }}>{formatCurrency(-customer.balance, currency)}</Text>
            </Text>
            <TextInput
              style={styles.amtInput}
              placeholder={`المبلغ (${currency})`}
              placeholderTextColor={Colors.textMuted}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              textAlign="right"
            />
            <TextInput
              style={[styles.amtInput, { marginTop: Spacing.sm }]}
              placeholder="ملاحظة (اختياري)"
              placeholderTextColor={Colors.textMuted}
              value={payNote}
              onChangeText={setPayNote}
              textAlign="right"
            />
            <StyledButton label="تسجيل الدفعة" onPress={handlePayment} fullWidth style={{ marginTop: Spacing.lg }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Balance Edit Modal */}
      <Modal visible={showBalanceModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowBalanceModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>تعديل الرصيد</Text>
            </View>
            <Text style={styles.debtReminder}>
              الرصيد الحالي: <Text style={{ color: customer.balance < 0 ? Colors.danger : Colors.success }}>{formatCurrency(customer.balance, currency)}</Text>
            </Text>
            <Text style={styles.balanceHint}>أدخل قيمة سالبة للدين (مثال: -50000) أو موجبة للرصيد</Text>
            <TextInput
              style={styles.amtInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={newBalance}
              onChangeText={setNewBalance}
              keyboardType="numbers-and-punctuation"
              textAlign="right"
            />
            <StyledButton
              label={savingBalance ? 'جاري الحفظ...' : 'حفظ الرصيد'}
              onPress={handleSaveBalance}
              fullWidth
              style={{ marginTop: Spacing.lg }}
              disabled={savingBalance}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  errorText: { color: Colors.danger, textAlign: 'center', marginTop: 40, fontSize: FontSize.md },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontSize: FontSize.xxxl, fontWeight: FontWeight.bold },
  customerName: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  customerPhone: { color: Colors.textSecondary, fontSize: FontSize.md },
  customerAddress: { color: Colors.textMuted, fontSize: FontSize.sm },
  balanceBadge: { borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, width: '100%' },
  balanceLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  balanceValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 4 },
  actionBtns: { flexDirection: 'row-reverse', gap: Spacing.sm, width: '100%', marginTop: Spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1,
  },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.sm },
  emptyStatement: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  entryRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.sm + 4,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  entryRowExpanded: { borderColor: Colors.primary + '55', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  entryAmtBadge: { borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center', minWidth: 80 },
  entryTypeTxt: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  entryAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: 2 },
  entryInfo: { flex: 1, alignItems: 'flex-end' },
  entryDesc: { color: Colors.text, fontSize: FontSize.sm, textAlign: 'right', fontWeight: FontWeight.medium },
  entryDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  tapHint: { color: Colors.primary, fontSize: 10, marginTop: 2 },
  entryBalance: { borderRadius: Radius.sm, padding: 6, alignItems: 'center', minWidth: 72 },
  entryBalanceText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  entryBalanceLabel: { color: Colors.textMuted, fontSize: 10 },

  expandedItems: {
    backgroundColor: Colors.surface, borderWidth: 1, borderTopWidth: 0,
    borderColor: Colors.primary + '55', borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  expandedItem: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  expandedItemInfo: { flex: 1, alignItems: 'flex-end' },
  expandedItemName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right' },
  expandedItemDetail: { color: Colors.textSecondary, fontSize: FontSize.xs },
  expandedItemTotal: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 70, textAlign: 'left' },
  viewFullBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: Spacing.sm, paddingVertical: Spacing.xs,
  },
  viewFullText: { color: Colors.primary, fontSize: FontSize.sm },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  debtReminder: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'right', marginBottom: Spacing.md },
  balanceHint: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'right', marginBottom: Spacing.sm },
  amtInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.xl, borderWidth: 1, borderColor: Colors.border, fontWeight: FontWeight.bold,
  },
});

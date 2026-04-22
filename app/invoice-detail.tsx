// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import { printInvoice, shareInvoice } from '@/services/invoicePrint';
import StyledButton from '@/components/ui/StyledButton';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { invoices, getInvoiceItems, removeInvoice, editInvoice, settings } = useApp();
  const { showAlert } = useAlert();
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const invoice = invoices.find(inv => inv.id === id);
  const items = id ? getInvoiceItems(id) : [];

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>الفاتورة غير موجودة</Text>
      </View>
    );
  }

  const profit = items.reduce((s, i) => s + (i.price - i.buyPrice) * i.quantity, 0);
  const currency = settings?.currency || 'د.ج';

  async function handlePrint() {
    try {
      setPrinting(true);
      await printInvoice(invoice!, items, settings?.storeName);
    } catch {
      showAlert('خطأ', 'تعذّر طباعة الفاتورة');
    } finally {
      setPrinting(false);
    }
  }

  async function handleShare() {
    try {
      setSharing(true);
      await shareInvoice(invoice!, items, settings?.storeName);
    } catch {
      showAlert('خطأ', 'تعذّر مشاركة الفاتورة');
    } finally {
      setSharing(false);
    }
  }

  function handleDelete() {
    showAlert('حذف الفاتورة', `هل أنت متأكد من حذف فاتورة #${invoice!.number}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          await removeInvoice(invoice!.id);
          router.back();
        }
      },
    ]);
  }

  function handleEditNotes() {
    setNotes(invoice?.notes || '');
    setShowEditNotes(true);
  }

  async function saveNotes() {
    await editInvoice(invoice!.id, { notes });
    setShowEditNotes(false);
  }

  const isSale = invoice.invoiceType === 'بيع';
  const typeColor = isSale ? Colors.primary : Colors.info;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
            <MaterialIcons name={isSale ? 'point-of-sale' : 'shopping-bag'} size={13} color={typeColor} />
            <Text style={[styles.typeText, { color: typeColor }]}>فاتورة {invoice.invoiceType}</Text>
          </View>
          <View style={[styles.payBadge, { backgroundColor: invoice.paymentType === 'نقداً' ? Colors.primary + '22' : Colors.warning + '22' }]}>
            <Text style={[styles.payType, { color: invoice.paymentType === 'نقداً' ? Colors.primary : Colors.warning }]}>
              {invoice.paymentType}
            </Text>
          </View>
        </View>
        <View style={styles.invoiceIcon}>
          <MaterialIcons name="receipt" size={32} color={typeColor} />
        </View>
        <Text style={styles.invoiceNum}>فاتورة #{invoice.number}</Text>
        <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
        {invoice.customerName ? (
          <Text style={styles.customerName}>
            {invoice.customerName}
          </Text>
        ) : null}
        {invoice.notes ? (
          <Text style={styles.notesText}>{invoice.notes}</Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.printBtn, { opacity: pressed || printing ? 0.75 : 1 }]}
            onPress={handlePrint}
            disabled={printing || sharing}
          >
            {printing ? <ActivityIndicator size="small" color={Colors.white} /> : <MaterialIcons name="print" size={18} color={Colors.white} />}
            <Text style={styles.actionBtnText}>{printing ? 'جاري...' : 'طباعة'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.shareBtn, { opacity: pressed || sharing ? 0.75 : 1 }]}
            onPress={handleShare}
            disabled={printing || sharing}
          >
            {sharing ? <ActivityIndicator size="small" color={Colors.primary} /> : <MaterialIcons name="share" size={18} color={Colors.primary} />}
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>{sharing ? 'جاري...' : 'مشاركة'}</Text>
          </Pressable>
        </View>

        <View style={styles.editDeleteRow}>
          <Pressable style={[styles.editBtn]} onPress={handleEditNotes}>
            <MaterialIcons name="edit-note" size={16} color={Colors.info} />
            <Text style={[styles.editBtnText, { color: Colors.info }]}>تعديل الملاحظات</Text>
          </Pressable>
          <Pressable style={[styles.deleteBtn]} onPress={handleDelete}>
            <MaterialIcons name="delete" size={16} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>حذف الفاتورة</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>المنتجات ({items.length})</Text>
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemTotal}>
              <Text style={styles.itemTotalText}>{formatCurrency(item.price * item.quantity, currency)}</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemDetails}>{item.quantity} × {formatCurrency(item.price, currency)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>{formatCurrency(invoice.total, currency)}</Text>
          <Text style={styles.summaryLabel}>الإجمالي</Text>
        </View>
        {isSale ? (
          <View style={[styles.summaryRow, styles.summaryRowBorder]}>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{formatCurrency(profit, currency)}</Text>
            <Text style={styles.summaryLabel}>الربح</Text>
          </View>
        ) : null}
      </View>

      {/* Edit Notes Modal */}
      <Modal visible={showEditNotes} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEditNotes(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>تعديل الملاحظات</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="أضف ملاحظة..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlign="right"
              textAlignVertical="top"
            />
            <StyledButton label="حفظ" onPress={saveNotes} fullWidth style={{ marginTop: Spacing.md }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  errorText: { color: Colors.danger, textAlign: 'center', marginTop: 40, fontSize: FontSize.md },
  header: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1 },
  typeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  invoiceIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  invoiceNum: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  invoiceDate: { color: Colors.textSecondary, fontSize: FontSize.md },
  customerName: { color: Colors.textSecondary, fontSize: FontSize.sm },
  notesText: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic', textAlign: 'center' },
  payBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  payType: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  actionRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm, width: '100%' },
  actionBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2, borderRadius: Radius.lg, borderWidth: 1,
  },
  printBtn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  shareBtn: { backgroundColor: Colors.primary + '11', borderColor: Colors.primary },
  actionBtnText: { color: Colors.white, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  editDeleteRow: { flexDirection: 'row-reverse', gap: Spacing.sm, width: '100%' },
  editBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.info + '11', borderWidth: 1, borderColor: Colors.info + '44',
  },
  editBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  deleteBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.danger + '11', borderWidth: 1, borderColor: Colors.danger + '44',
  },
  deleteBtnText: { color: Colors.danger, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.sm },
  itemsSection: { marginBottom: Spacing.lg },
  itemRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
  itemDetails: { color: Colors.textSecondary, fontSize: FontSize.sm },
  itemTotal: { alignItems: 'center' },
  itemTotalText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summary: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  summaryValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  notesInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
    minHeight: 100,
  },
});

// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, formatDate } from '@/utils/format';

type Period = 'اليوم' | 'الشهر' | 'السنة' | 'الكل';
type InvFilter = 'الكل' | 'بيع' | 'شراء';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { invoices, invoiceItems, customers, products, expenses, settings, refresh, syncing } = useApp();
  const [period, setPeriod] = useState<Period>('الشهر');
  const [invFilter, setInvFilter] = useState<InvFilter>('الكل');

  const currency = settings?.currency || 'د.ج';

  const periodFiltered = useMemo(() => {
    const now = new Date();
    return invoices.filter(inv => {
      const d = new Date(inv.date);
      if (period === 'اليوم') return d.toDateString() === now.toDateString();
      if (period === 'الشهر') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'السنة') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [invoices, period]);

  const filtered = useMemo(() => {
    if (invFilter === 'الكل') return periodFiltered;
    return periodFiltered.filter(inv => inv.invoiceType === invFilter);
  }, [periodFiltered, invFilter]);

  const expensesThisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const stats = useMemo(() => {
    const saleInvoices = periodFiltered.filter(i => i.invoiceType === 'بيع');
    const purchaseInvoices = periodFiltered.filter(i => i.invoiceType === 'شراء');
    const totalSales = saleInvoices.reduce((s, i) => s + i.total, 0);
    const totalPurchases = purchaseInvoices.reduce((s, i) => s + i.total, 0);
    const cashSales = saleInvoices.filter(i => i.paymentType === 'نقداً').reduce((s, i) => s + i.total, 0);
    const creditSales = saleInvoices.filter(i => i.paymentType === 'آجل').reduce((s, i) => s + i.total, 0);

    let totalProfit = 0;
    saleInvoices.forEach(inv => {
      const items = invoiceItems.filter(i => i.invoiceId === inv.id);
      items.forEach(item => { totalProfit += (item.price - item.buyPrice) * item.quantity; });
    });

    const totalDebt = customers.reduce((s, c) => s + (c.balance < 0 ? -c.balance : 0), 0);
    const profitMargin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;

    return { totalSales, totalPurchases, cashSales, creditSales, saleCount: saleInvoices.length, purchaseCount: purchaseInvoices.length, totalProfit, totalDebt, profitMargin };
  }, [periodFiltered, invoiceItems, customers]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    periodFiltered.filter(i => i.invoiceType === 'بيع').forEach(inv => {
      const items = invoiceItems.filter(i => i.invoiceId === inv.id);
      items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.price * item.quantity;
        map[item.productId].profit += (item.price - item.buyPrice) * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [periodFiltered, invoiceItems]);

  const recentInvoices = useMemo(() =>
    filtered.slice(0, 15),
    [filtered]
  );

  const periods: Period[] = ['اليوم', 'الشهر', 'السنة', 'الكل'];
  const invFilters: InvFilter[] = ['الكل', 'بيع', 'شراء'];

  async function handleExportCSV() {
    const rows = [
      ['رقم الفاتورة', 'النوع', 'التاريخ', 'العميل', 'الإجمالي', 'طريقة الدفع'].join(','),
      ...invoices.map(inv => [
        inv.number, inv.invoiceType,
        new Date(inv.date).toLocaleDateString('en'),
        inv.customerName || '',
        inv.total, inv.paymentType,
      ].join(',')),
    ].join('\n');

    try {
      await Share.share({ message: rows, title: 'تقرير المبيعات' });
    } catch {}
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <Pressable onPress={handleExportCSV} style={styles.exportBtn} hitSlop={8}>
            <MaterialIcons name="share" size={16} color={Colors.primary} />
            <Text style={styles.exportBtnText}>تصدير</Text>
          </Pressable>
          <Pressable onPress={refresh} style={styles.syncBtn} hitSlop={8}>
            <MaterialIcons name="refresh" size={22} color={syncing ? Colors.primary : Colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>التقارير</Text>
      </View>

      {/* Quick navigation */}
      <View style={styles.quickNav}>
        {[
          { label: 'المصاريف', icon: 'receipt-long', route: '/expenses', color: Colors.danger },
          { label: 'الموردون', icon: 'local-shipping', route: '/suppliers', color: Colors.warning },
          { label: 'الورديات', icon: 'schedule', route: '/shifts', color: Colors.info },
        ].map(n => (
          <Pressable
            key={n.label}
            style={[styles.quickNavBtn, { borderColor: n.color + '44' }]}
            onPress={() => router.push(n.route as never)}
          >
            <MaterialIcons name={n.icon as any} size={22} color={n.color} />
            <Text style={[styles.quickNavText, { color: n.color }]}>{n.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.periodRow}>
        {periods.map(p => (
          <Pressable key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملخص {period}</Text>
        <View style={styles.row}>
          <StatCard title="إجمالي المبيعات" value={formatCurrency(stats.totalSales, currency)} icon="point-of-sale" iconColor={Colors.primary} />
          <View style={{ width: Spacing.sm }} />
          <StatCard title="إجمالي الأرباح" value={formatCurrency(stats.totalProfit, currency)} icon="trending-up" iconColor="#10B981" />
        </View>
        <View style={[styles.row, { marginTop: Spacing.sm }]}>
          <StatCard title="فواتير الشراء" value={formatCurrency(stats.totalPurchases, currency)} icon="shopping-bag" iconColor={Colors.info} />
          <View style={{ width: Spacing.sm }} />
          <StatCard title="مصاريف الشهر" value={formatCurrency(expensesThisMonth, currency)} icon="receipt-long" iconColor={Colors.danger} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.detailGrid}>
          {[
            { label: 'فواتير بيع', value: stats.saleCount.toString(), color: Colors.primary },
            { label: 'فواتير شراء', value: stats.purchaseCount.toString(), color: Colors.info },
            { label: 'نسبة الربح', value: stats.profitMargin + '%', color: '#10B981' },
            { label: 'إجمالي الديون', value: formatCurrency(stats.totalDebt, currency), color: Colors.danger },
          ].map(d => (
            <View key={d.label} style={styles.detailCard}>
              <Text style={[styles.detailValue, { color: d.color }]}>{d.value}</Text>
              <Text style={styles.detailLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>أكثر المنتجات مبيعاً</Text>
        {topProducts.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="bar-chart" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد بيانات لهذه الفترة</Text>
          </View>
        ) : (
          topProducts.map((p, i) => (
            <View key={p.name} style={styles.productRow}>
              <View style={styles.productStats}>
                <Text style={styles.productRevenue}>{formatCurrency(p.revenue, currency)}</Text>
                <Text style={styles.productProfit}>{formatCurrency(p.profit, currency)} ربح</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.productQty}>تم بيع {p.qty} وحدة</Text>
              </View>
              <View style={[styles.rankBadge, { backgroundColor: i < 3 ? Colors.primary + '22' : Colors.surface }]}>
                <Text style={[styles.rankText, { color: i < 3 ? Colors.primary : Colors.textMuted }]}>#{i + 1}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Invoices */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <View style={styles.filterRow}>
            {invFilters.map(f => (
              <Pressable
                key={f}
                style={[styles.filterBtn, invFilter === f && styles.filterBtnActive]}
                onPress={() => setInvFilter(f)}
              >
                <Text style={[styles.filterText, invFilter === f && styles.filterTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionTitle}>الفواتير</Text>
        </View>
        {recentInvoices.map(inv => (
          <Pressable
            key={inv.id}
            style={({ pressed }) => [styles.invoiceRow, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push({ pathname: '/invoice-detail', params: { id: inv.id } } as never)}
          >
            <View style={styles.invoiceRight}>
              <View style={[styles.typeBadge, { backgroundColor: inv.invoiceType === 'بيع' ? Colors.primary + '22' : Colors.info + '22' }]}>
                <Text style={[styles.typeText, { color: inv.invoiceType === 'بيع' ? Colors.primary : Colors.info }]}>{inv.invoiceType}</Text>
              </View>
              <Text style={styles.invoiceTotal}>{formatCurrency(inv.total, currency)}</Text>
            </View>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNum}>فاتورة #{inv.number}</Text>
              <Text style={styles.invoiceDate}>{new Date(inv.date).toLocaleDateString('ar-DZ')}</Text>
              {inv.customerName ? <Text style={styles.invoiceCustomer}>{inv.customerName}</Text> : null}
            </View>
            <View style={[styles.payBadge, { backgroundColor: inv.paymentType === 'نقداً' ? Colors.success + '22' : Colors.warning + '22' }]}>
              <Text style={[styles.payType, { color: inv.paymentType === 'نقداً' ? Colors.success : Colors.warning }]}>{inv.paymentType}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>توزيع المبيعات</Text>
        <View style={styles.chartBars}>
          {[
            { label: 'نقداً', value: stats.cashSales, total: stats.totalSales, color: Colors.primary },
            { label: 'آجل', value: stats.creditSales, total: stats.totalSales, color: Colors.warning },
          ].map(b => (
            <View key={b.label} style={styles.barRow}>
              <Text style={styles.barPct}>{b.total > 0 ? Math.round((b.value / b.total) * 100) : 0}%</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: b.total > 0 ? `${Math.round((b.value / b.total) * 100)}%` : '0%', backgroundColor: b.color }]} />
              </View>
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'right' },
  syncBtn: { padding: 4 },
  headerActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm },
  exportBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '11', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary + '33' },
  exportBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  quickNav: { flexDirection: 'row-reverse', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  quickNavBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1 },
  quickNavText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  periodRow: {
    flexDirection: 'row-reverse', marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  periodBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  periodTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.sm },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  filterRow: { flexDirection: 'row-reverse', gap: 4 },
  filterBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  detailGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  detailCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  detailValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 4 },
  productRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  rankBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  rankText: { fontWeight: FontWeight.bold, fontSize: FontSize.md },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  productName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
  productQty: { color: Colors.textSecondary, fontSize: FontSize.sm },
  productStats: { alignItems: 'flex-end' },
  productRevenue: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  productProfit: { color: '#10B981', fontSize: FontSize.xs },
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  invoiceRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  invoiceInfo: { flex: 1, alignItems: 'flex-end' },
  invoiceNum: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  invoiceDate: { color: Colors.textSecondary, fontSize: FontSize.xs },
  invoiceCustomer: { color: Colors.textMuted, fontSize: FontSize.xs },
  invoiceRight: { alignItems: 'center', gap: 4 },
  typeBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.xs + 2, paddingVertical: 2 },
  typeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  invoiceTotal: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  payBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.xs + 2, paddingVertical: 4 },
  payType: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  chartBars: { gap: Spacing.md },
  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm },
  barLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 40, textAlign: 'right' },
  barTrack: { flex: 1, height: 12, backgroundColor: Colors.surface, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  barPct: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, width: 40, textAlign: 'left' },
});

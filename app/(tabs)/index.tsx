// Powered by OnSpace.AI
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, isExpiringSoon, isExpired } from '@/utils/format';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, customers, invoices, invoiceItems, settings, loading, syncing, refresh } = useApp();

  const currency = settings?.currency || 'د.ج';
  const storeName = settings?.storeName || 'متجري';

  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const saleInvoices = invoices.filter(inv => inv.invoiceType === 'بيع');
    const todayInvoices = saleInvoices.filter(inv => new Date(inv.date).toDateString() === today);
    const monthInvoices = saleInvoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const calcProfit = (invList: typeof invoices) => {
      let total = 0;
      invList.forEach(inv => {
        const items = invoiceItems.filter(i => i.invoiceId === inv.id);
        items.forEach(item => { total += (item.price - item.buyPrice) * item.quantity; });
      });
      return total;
    };

    const todaySales = todayInvoices.reduce((s, i) => s + i.total, 0);
    const monthSales = monthInvoices.reduce((s, i) => s + i.total, 0);
    const todayProfit = calcProfit(todayInvoices);
    const totalDebt = customers.reduce((s, c) => s + (c.balance < 0 ? -c.balance : 0), 0);
    const lowStock = products.filter(p => p.quantity <= p.minQuantity).length;

    return { todaySales, monthSales, todayProfit, totalDebt, lowStock };
  }, [invoices, invoiceItems, customers, products]);

  const lowStockProducts = useMemo(() =>
    products.filter(p => p.quantity <= p.minQuantity).slice(0, 5),
    [products]
  );

  const recentInvoices = useMemo(() =>
    [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [invoices]
  );

  const alerts = useMemo(() => {
    const items: { id: string; text: string; type: 'warning' | 'danger' }[] = [];
    products.forEach(p => {
      if (isExpired(p.expireDate)) items.push({ id: p.id + '_exp', text: `${p.name} - انتهت الصلاحية`, type: 'danger' });
      else if (isExpiringSoon(p.expireDate)) items.push({ id: p.id + '_soon', text: `${p.name} - ينتهي قريباً`, type: 'warning' });
      if (p.quantity <= p.minQuantity) items.push({ id: p.id + '_stock', text: `${p.name} - مخزون منخفض (${p.quantity})`, type: 'warning' });
    });
    return items.slice(0, 4);
  }, [products]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.push('/settings' as never)} style={styles.settingsBtn} hitSlop={8}>
            <MaterialIcons name="settings" size={22} color={Colors.textSecondary} />
          </Pressable>
          {syncing ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} /> : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.greeting}>مرحباً 👋</Text>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملخص اليوم</Text>
        <View style={styles.row}>
          <StatCard title="مبيعات اليوم" value={formatCurrency(stats.todaySales, currency)} icon="shopping-cart" iconColor={Colors.primary} />
          <View style={styles.gap} />
          <StatCard title="أرباح اليوم" value={formatCurrency(stats.todayProfit, currency)} icon="trending-up" iconColor="#10B981" />
        </View>
        <View style={[styles.row, { marginTop: Spacing.sm }]}>
          <StatCard title="مبيعات الشهر" value={formatCurrency(stats.monthSales, currency)} icon="calendar-month" iconColor={Colors.info} />
          <View style={styles.gap} />
          <StatCard title="إجمالي الديون" value={formatCurrency(stats.totalDebt, currency)} icon="account-balance-wallet" iconColor={Colors.danger} />
        </View>
      </View>

      {alerts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>التنبيهات</Text>
          {alerts.map(a => (
            <View key={a.id} style={[styles.alertRow, { borderRightColor: a.type === 'danger' ? Colors.danger : Colors.warning }]}>
              <MaterialIcons name={a.type === 'danger' ? 'error' : 'warning'} size={16} color={a.type === 'danger' ? Colors.danger : Colors.warning} />
              <Text style={[styles.alertText, { color: a.type === 'danger' ? Colors.danger : Colors.warning }]}>{a.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>وصول سريع</Text>
        <View style={styles.quickRow}>
          {[
            { label: 'بيع جديد', icon: 'point-of-sale' as const, route: '/(tabs)/sales', color: Colors.primary },
            { label: 'منتج جديد', icon: 'add-box' as const, route: '/add-product', color: Colors.info },
            { label: 'زبون جديد', icon: 'person-add' as const, route: '/(tabs)/customers', color: '#8B5CF6' },
            { label: 'التقارير', icon: 'bar-chart' as const, route: '/(tabs)/reports', color: '#F59E0B' },
          ].map(q => (
            <Pressable key={q.label} style={({ pressed }) => [styles.quickBtn, { borderColor: q.color, opacity: pressed ? 0.75 : 1 }]} onPress={() => router.push(q.route as never)}>
              <MaterialIcons name={q.icon} size={24} color={q.color} />
              <Text style={[styles.quickLabel, { color: q.color }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => router.push('/(tabs)/products' as never)}>
            <Text style={styles.seeAll}>عرض الكل</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>مخزون منخفض ({stats.lowStock})</Text>
        </View>
        {lowStockProducts.length === 0 ? (
          <View style={styles.emptyAlert}>
            <MaterialIcons name="check-circle" size={24} color={Colors.success} />
            <Text style={styles.emptyAlertText}>المخزون في وضع جيد</Text>
          </View>
        ) : (
          lowStockProducts.map(p => (
            <View key={p.id} style={styles.productRow}>
              <View style={[styles.stockBadge, { backgroundColor: p.quantity === 0 ? Colors.danger + '22' : Colors.warning + '22' }]}>
                <Text style={[styles.stockNum, { color: p.quantity === 0 ? Colors.danger : Colors.warning }]}>{p.quantity}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productCat}>{p.category}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Pressable onPress={refresh}>
            <Text style={styles.seeAll}>تحديث</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>آخر الفواتير</Text>
        </View>
        {recentInvoices.map(inv => (
          <Pressable
            key={inv.id}
            style={({ pressed }) => [styles.invoiceRow, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push({ pathname: '/invoice-detail', params: { id: inv.id } } as never)}
          >
            <View style={styles.invRight}>
              <View style={[styles.typeBadge, { backgroundColor: inv.invoiceType === 'بيع' ? Colors.primary + '22' : Colors.info + '22' }]}>
                <Text style={[styles.typeText, { color: inv.invoiceType === 'بيع' ? Colors.primary : Colors.info }]}>{inv.invoiceType}</Text>
              </View>
              <Text style={styles.invoiceTotal}>{formatCurrency(inv.total, currency)}</Text>
            </View>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNum}>فاتورة #{inv.number}</Text>
              <Text style={styles.invoiceDate}>{new Date(inv.date).toLocaleDateString('ar-DZ')}</Text>
            </View>
            <View style={[styles.payBadge, { backgroundColor: inv.paymentType === 'نقداً' ? Colors.primary + '22' : Colors.warning + '22' }]}>
              <Text style={[styles.payType, { color: inv.paymentType === 'نقداً' ? Colors.primary : Colors.warning }]}>{inv.paymentType}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.md },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerRight: { alignItems: 'flex-end' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  greeting: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right' },
  storeName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'right' },
  date: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'right' },
  settingsBtn: { padding: 4 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: Spacing.sm },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  gap: { width: Spacing.sm },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  alertRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm + 2,
    marginBottom: Spacing.xs, borderRightWidth: 3,
  },
  alertText: { fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickBtn: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.xs, borderWidth: 1,
  },
  quickLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  productRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm + 4, marginBottom: Spacing.xs,
  },
  stockBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
  stockNum: { fontWeight: FontWeight.bold, fontSize: FontSize.md },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  productName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
  productCat: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'right' },
  emptyAlert: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md },
  emptyAlertText: { color: Colors.success, fontSize: FontSize.md },
  invoiceRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  invRight: { alignItems: 'center', gap: 4 },
  typeBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.xs + 2, paddingVertical: 2 },
  typeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  invoiceInfo: { flex: 1, alignItems: 'flex-end' },
  invoiceNum: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  invoiceDate: { color: Colors.textSecondary, fontSize: FontSize.xs },
  invoiceTotal: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  payBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  payType: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
});

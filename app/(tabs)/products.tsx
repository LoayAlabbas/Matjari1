// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { formatCurrency, isExpiringSoon, isExpired, CATEGORIES } from '@/utils/format';

const ALL_CATS = ['الكل', ...CATEGORIES];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, deleteProduct } = useApp();
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('الكل');

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchCat = selectedCat === 'الكل' || p.category === selectedCat;
      const matchSearch = p.name.includes(search) || (p.barcode && p.barcode.includes(search));
      return matchCat && matchSearch;
    }),
    [products, search, selectedCat]
  );

  function handleDelete(id: string, name: string) {
    showAlert('حذف المنتج', `هل أنت متأكد من حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteProduct(id) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/add-product' as never)}
        >
          <MaterialIcons name="add" size={22} color={Colors.white} />
          <Text style={styles.addBtnText}>إضافة</Text>
        </Pressable>
        <Text style={styles.headerTitle}>المنتجات ({products.length})</Text>
      </View>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث بالاسم أو الباركود..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <View style={styles.catContainer}>
        <FlatList
          data={ALL_CATS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.catBtn, selectedCat === item && styles.catBtnActive]}
              onPress={() => setSelectedCat(item)}
            >
              <Text style={[styles.catBtnText, selectedCat === item && styles.catBtnTextActive]}>{item}</Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inventory-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
          </View>
        }
        renderItem={({ item }) => {
          const expired = isExpired(item.expireDate);
          const expSoon = isExpiringSoon(item.expireDate);
          const lowStock = item.quantity <= item.minQuantity;
          return (
            <View style={[styles.card, expired && styles.cardExpired]}>
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => handleDelete(item.id, item.name)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.danger} />
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/add-product', params: { id: item.id } } as never)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={20} color={Colors.info} />
                </Pressable>
              </View>

              <View style={styles.cardMain}>
                <View style={styles.cardTop}>
                  <View style={styles.badgeRow}>
                    {expired ? (
                      <View style={[styles.badge, { backgroundColor: Colors.danger + '22' }]}>
                        <Text style={[styles.badgeText, { color: Colors.danger }]}>منتهية الصلاحية</Text>
                      </View>
                    ) : expSoon ? (
                      <View style={[styles.badge, { backgroundColor: Colors.warning + '22' }]}>
                        <Text style={[styles.badgeText, { color: Colors.warning }]}>قرب الانتهاء</Text>
                      </View>
                    ) : null}
                    {lowStock ? (
                      <View style={[styles.badge, { backgroundColor: Colors.warning + '22' }]}>
                        <Text style={[styles.badgeText, { color: Colors.warning }]}>مخزون منخفض</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.catLabel}>{item.category}</Text>
                </View>
                <Text style={styles.productName}>{item.name}</Text>
                {item.barcode ? <Text style={styles.barcode}>{item.barcode}</Text> : null}

                <View style={styles.priceRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>الكمية</Text>
                    <Text style={[styles.priceValue, { color: lowStock ? Colors.warning : Colors.text }]}>{item.quantity}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>الشراء</Text>
                    <Text style={[styles.priceValue, { color: Colors.textSecondary }]}>{formatCurrency(item.buyPrice)}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>البيع</Text>
                    <Text style={[styles.priceValue, { color: Colors.primary }]}>{formatCurrency(item.sellPrice)}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>الربح</Text>
                    <Text style={[styles.priceValue, { color: '#10B981' }]}>{formatCurrency(item.sellPrice - item.buyPrice)}</Text>
                  </View>
                </View>
                {item.expireDate ? (
                  <Text style={[styles.expDate, { color: expired ? Colors.danger : expSoon ? Colors.warning : Colors.textMuted }]}>
                    صلاحية: {new Date(item.expireDate).toLocaleDateString('ar-DZ')}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: { color: Colors.white, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.sm + 2 },
  catContainer: { marginBottom: Spacing.sm },
  catList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  catBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  catBtnTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 20, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
  cardExpired: { borderColor: Colors.danger + '44', opacity: 0.85 },
  cardActions: { alignItems: 'center', gap: Spacing.sm, paddingTop: 4 },
  iconBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  badgeRow: { flexDirection: 'row-reverse', gap: 4, flexWrap: 'wrap', flex: 1 },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  catLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
  productName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, textAlign: 'right', marginBottom: 2 },
  barcode: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right', marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  priceCol: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 6 },
  priceLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2 },
  priceValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  expDate: { fontSize: FontSize.xs, textAlign: 'right', marginTop: Spacing.xs },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
});

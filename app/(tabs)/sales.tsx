// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledButton from '@/components/ui/StyledButton';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { CartItem, InvoiceType } from '@/types';
import { formatCurrency } from '@/utils/format';

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const appCtx = useApp();
  const { products, customers, saveInvoice, nextInvoiceNumber, settings, syncing, addProduct } = appCtx;
  const { showAlert } = useAlert();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('بيع');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'نقداً' | 'آجل'>('نقداً');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoiceNum, setLastInvoiceNum] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // New product from barcode scan (for purchase invoices)
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductBuyPrice, setNewProductBuyPrice] = useState('');
  const [newProductSellPrice, setNewProductSellPrice] = useState('');
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  const currency = settings?.currency || 'د.ج';

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const matchSearch = p.name.includes(search) || (p.barcode && p.barcode.includes(search));
      return matchSearch && (invoiceType === 'شراء' ? true : p.quantity > 0);
    }).slice(0, 30),
    [products, search, invoiceType]
  );

  const filteredCustomers = useMemo(() =>
    customers.filter(c => c.name.includes(customerSearch) || c.phone.includes(customerSearch)),
    [customers, customerSearch]
  );

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  function addToCart(product: typeof products[0]) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (invoiceType === 'بيع' && existing.quantity >= product.quantity) {
          showAlert('تنبيه', `الكمية المتاحة: ${product.quantity} فقط`);
          return prev;
        }
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        price: invoiceType === 'شراء' ? product.buyPrice : product.sellPrice,
        buyPrice: product.buyPrice,
        quantity: 1,
        maxQuantity: invoiceType === 'شراء' ? 9999 : product.quantity,
      }];
    });
  }

  function handleBarcodeScan(barcode: string) {
    setShowScanner(false);
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else if (invoiceType === 'شراء') {
      // Purchase invoice: offer to add a new product with this barcode
      setScannedBarcode(barcode);
      setNewProductName('');
      setNewProductBuyPrice('');
      setNewProductSellPrice('');
      setShowNewProductModal(true);
    } else {
      showAlert('غير موجود', `لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  }

  async function handleAddNewProductFromScan() {
    if (!newProductName.trim()) { showAlert('تنبيه', 'اسم المنتج مطلوب'); return; }
    if (!newProductBuyPrice || isNaN(Number(newProductBuyPrice))) {
      showAlert('تنبيه', 'سعر الشراء غير صحيح');
      return;
    }
    setSavingNewProduct(true);
    try {
      await addProduct({
        name: newProductName.trim(),
        barcode: scannedBarcode,
        buyPrice: Number(newProductBuyPrice),
        sellPrice: Number(newProductSellPrice) || Number(newProductBuyPrice),
        quantity: 0,
        minQuantity: 10,
        category: 'أخرى',
      });
      setShowNewProductModal(false);
      showAlert('تم', 'تم إضافة المنتج. أضفه إلى الفاتورة من قائمة المنتجات.');
    } catch {
      showAlert('خطأ', 'تعذّر إضافة المنتج');
    } finally {
      setSavingNewProduct(false);
    }
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(i => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (invoiceType === 'بيع' && newQty > i.maxQuantity) {
          showAlert('تنبيه', `الكمية المتاحة: ${i.maxQuantity}`);
          return i;
        }
        return { ...i, quantity: newQty };
      })
    );
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0) { showAlert('تنبيه', 'السلة فارغة'); return; }
    if (paymentType === 'آجل' && !selectedCustomerId) {
      showAlert('تنبيه', 'يجب اختيار زبون للبيع الآجل');
      return;
    }
    const num = nextInvoiceNumber;
    setSaving(true);
    try {
      await saveInvoice(
        {
          date: new Date().toISOString(),
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name,
          total,
          paymentType,
          invoiceType,
        },
        cart.map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          buyPrice: i.buyPrice,
        }))
      );
      setLastInvoiceNum(num);
      setCart([]);
      setSelectedCustomerId(undefined);
      setPaymentType('نقداً');
      setShowSuccessModal(true);
    } catch {
      showAlert('خطأ', 'تعذّر حفظ الفاتورة');
    } finally {
      setSaving(false);
    }
  }

  function switchInvoiceType(t: InvoiceType) {
    setInvoiceType(t);
    setCart([]);
    setPaymentType('نقداً');
    setSelectedCustomerId(undefined);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {syncing ? <MaterialIcons name="sync" size={16} color={Colors.primary} /> : null}
          <Text style={styles.headerSub}>فاتورة #{nextInvoiceNumber}</Text>
        </View>
        <Text style={styles.headerTitle}>الكاشير</Text>
      </View>

      {/* Invoice Type Toggle */}
      <View style={styles.typeToggle}>
        {(['بيع', 'شراء'] as InvoiceType[]).map(t => (
          <Pressable
            key={t}
            style={[styles.typeBtn, invoiceType === t && (t === 'بيع' ? styles.typeBtnSale : styles.typeBtnPurchase)]}
            onPress={() => switchInvoiceType(t)}
          >
            <MaterialIcons
              name={t === 'بيع' ? 'point-of-sale' : 'shopping-bag'}
              size={16}
              color={invoiceType === t ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.typeBtnText, invoiceType === t && styles.typeBtnTextActive]}>
              فاتورة {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.body}>
        {/* Products panel */}
        <View style={styles.productsPanel}>
          <View style={styles.searchWrap}>
            <Pressable onPress={() => setShowScanner(true)} hitSlop={6} style={styles.scanIconBtn}>
              <MaterialIcons name="qr-code-scanner" size={20} color={Colors.primary} />
            </Pressable>
            <MaterialIcons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="بحث أو باركود..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              textAlign="right"
            />
          </View>
          {invoiceType === 'شراء' ? (
            <View style={styles.purchaseTip}>
              <MaterialIcons name="info-outline" size={13} color={Colors.info} />
              <Text style={styles.purchaseTipText}>مسح باركود غير موجود سيضيف منتجاً جديداً</Text>
            </View>
          ) : null}
          <FlatList
            data={filteredProducts}
            keyExtractor={p => p.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.productPrice}>
                  {formatCurrency(invoiceType === 'شراء' ? item.buyPrice : item.sellPrice, currency)}
                </Text>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyProducts}>
                <MaterialIcons name="search-off" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>لا توجد منتجات</Text>
              </View>
            }
          />
        </View>

        {/* Cart panel */}
        <View style={styles.cartPanel}>
          <Text style={styles.cartTitle}>السلة ({cart.length})</Text>
          <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <MaterialIcons name="shopping-cart" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>السلة فارغة</Text>
              </View>
            ) : (
              cart.map(item => (
                <View key={item.productId} style={styles.cartItem}>
                  <Pressable onPress={() => removeFromCart(item.productId)} hitSlop={8}>
                    <MaterialIcons name="close" size={16} color={Colors.danger} />
                  </Pressable>
                  <View style={styles.cartQty}>
                    <Pressable onPress={() => updateQty(item.productId, 1)} style={styles.qtyBtn} hitSlop={4}>
                      <MaterialIcons name="add" size={14} color={Colors.primary} />
                    </Pressable>
                    <Text style={styles.qtyNum}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQty(item.productId, -1)} style={styles.qtyBtn} hitSlop={4}>
                      <MaterialIcons name="remove" size={14} color={Colors.danger} />
                    </Pressable>
                  </View>
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.cartItemPrice}>{formatCurrency(item.price * item.quantity, currency)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
              <Text style={styles.totalLabel}>الإجمالي:</Text>
            </View>

            {invoiceType === 'بيع' ? (
              <>
                <View style={styles.paymentToggle}>
                  {(['نقداً', 'آجل'] as const).map(type => (
                    <Pressable
                      key={type}
                      style={[styles.payBtn, paymentType === type && styles.payBtnActive]}
                      onPress={() => setPaymentType(type)}
                    >
                      <Text style={[styles.payBtnText, paymentType === type && styles.payBtnTextActive]}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
                {paymentType === 'آجل' ? (
                  <Pressable style={styles.customerPicker} onPress={() => setShowCustomerModal(true)}>
                    <MaterialIcons name="person" size={16} color={Colors.primary} />
                    <Text style={[styles.customerPickerText, !selectedCustomer && styles.customerPickerPlaceholder]}>
                      {selectedCustomer ? selectedCustomer.name : 'اختر الزبون...'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            <StyledButton
              label={saving ? 'جاري الحفظ...' : `إتمام ${invoiceType === 'بيع' ? 'البيع' : 'الشراء'}`}
              onPress={handleCheckout}
              fullWidth
              disabled={cart.length === 0 || saving}
            />
          </View>
        </View>
      </View>

      <BarcodeScanner visible={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowCustomerModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>اختر الزبون</Text>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="بحث..."
              placeholderTextColor={Colors.textMuted}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              textAlign="right"
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.customerRow, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => { setSelectedCustomerId(item.id); setShowCustomerModal(false); }}
                >
                  <Text style={[styles.customerBalance, { color: item.balance < 0 ? Colors.danger : Colors.success }]}>
                    {formatCurrency(Math.abs(item.balance), currency)}
                  </Text>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                  </View>
                  <MaterialIcons name="person" size={20} color={Colors.textSecondary} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد زبائن</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* New Product from Barcode Modal (Purchase only) */}
      <Modal visible={showNewProductModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowNewProductModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>منتج جديد من الباركود</Text>
            </View>
            <View style={styles.barcodeTag}>
              <MaterialIcons name="qr-code" size={14} color={Colors.info} />
              <Text style={styles.barcodeTagText}>{scannedBarcode}</Text>
            </View>
            <TextInput
              style={styles.newProductInput}
              placeholder="اسم المنتج *"
              placeholderTextColor={Colors.textMuted}
              value={newProductName}
              onChangeText={setNewProductName}
              textAlign="right"
            />
            <View style={styles.priceInputRow}>
              <TextInput
                style={[styles.newProductInput, { flex: 1 }]}
                placeholder={`سعر الشراء (${currency}) *`}
                placeholderTextColor={Colors.textMuted}
                value={newProductBuyPrice}
                onChangeText={setNewProductBuyPrice}
                keyboardType="numeric"
                textAlign="right"
              />
              <TextInput
                style={[styles.newProductInput, { flex: 1 }]}
                placeholder={`سعر البيع (${currency})`}
                placeholderTextColor={Colors.textMuted}
                value={newProductSellPrice}
                onChangeText={setNewProductSellPrice}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
            <Pressable
              style={[styles.confirmBtn, savingNewProduct && { opacity: 0.7 }]}
              onPress={handleAddNewProductFromScan}
              disabled={savingNewProduct}
            >
              <MaterialIcons name="add-circle" size={18} color={Colors.white} />
              <Text style={styles.confirmBtnText}>{savingNewProduct ? 'جاري الإضافة...' : 'حفظ المنتج'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>
              {invoiceType === 'بيع' ? 'تم البيع بنجاح!' : 'تم تسجيل الشراء!'}
            </Text>
            <Text style={styles.successSub}>فاتورة #{lastInvoiceNum}</Text>
            <StyledButton label="فاتورة جديدة" onPress={() => setShowSuccessModal(false)} fullWidth style={{ marginTop: Spacing.lg }} />
          </View>
        </View>
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
  headerLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  headerSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  typeToggle: {
    flexDirection: 'row-reverse', marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  typeBtnSale: { backgroundColor: Colors.primary },
  typeBtnPurchase: { backgroundColor: Colors.info },
  typeBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  typeBtnTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  body: { flex: 1, flexDirection: 'row-reverse' },
  productsPanel: { flex: 1.2, borderRightWidth: 1, borderRightColor: Colors.border },
  searchWrap: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface,
    margin: Spacing.sm, borderRadius: Radius.md, paddingHorizontal: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { marginLeft: Spacing.xs },
  scanIconBtn: { padding: Spacing.xs, marginLeft: 2 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: Spacing.sm },
  purchaseTip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingBottom: 4,
  },
  purchaseTipText: { color: Colors.info, fontSize: 10 },
  productCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.sm,
    margin: Spacing.xs, borderWidth: 1, borderColor: Colors.border, minHeight: 80,
    alignItems: 'flex-end', position: 'relative',
  },
  productName: { color: Colors.text, fontSize: FontSize.xs + 1, fontWeight: FontWeight.medium, textAlign: 'right', marginBottom: 4 },
  productPrice: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  qtyBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  qtyBadgeText: { color: Colors.textSecondary, fontSize: 10 },
  emptyProducts: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  cartPanel: { flex: 1, flexDirection: 'column' },
  cartTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, padding: Spacing.md, textAlign: 'right', borderBottomWidth: 1, borderBottomColor: Colors.border },
  cartList: { flex: 1 },
  emptyCart: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, marginTop: Spacing.xl },
  cartItem: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cartInfo: { flex: 1, alignItems: 'flex-end' },
  cartItemName: { color: Colors.text, fontSize: FontSize.xs + 1, textAlign: 'right' },
  cartItemPrice: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  cartQty: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  qtyBtn: { backgroundColor: Colors.surface, borderRadius: 4, padding: 4, borderWidth: 1, borderColor: Colors.border },
  qtyNum: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, minWidth: 24, textAlign: 'center' },
  cartFooter: {
    padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface, gap: Spacing.sm,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  paymentToggle: { flexDirection: 'row-reverse', borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  payBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.background },
  payBtnActive: { backgroundColor: Colors.primary },
  payBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  payBtnTextActive: { color: Colors.white },
  customerPicker: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary,
  },
  customerPickerText: { color: Colors.text, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  customerPickerPlaceholder: { color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  modalSearch: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, color: Colors.text, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  customerRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  customerInfo: { flex: 1, alignItems: 'flex-end' },
  customerName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  customerPhone: { color: Colors.textSecondary, fontSize: FontSize.xs },
  customerBalance: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  // New product from scan styles
  barcodeTag: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: Colors.info + '11', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.info + '33',
    alignSelf: 'flex-end',
  },
  barcodeTagText: { color: Colors.info, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  newProductInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  priceInputRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.sm,
    flexDirection: 'row-reverse', justifyContent: 'center', gap: Spacing.xs,
  },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  successModal: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    margin: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.success + '22', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  successTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  successSub: { color: Colors.textSecondary, fontSize: FontSize.md },
});

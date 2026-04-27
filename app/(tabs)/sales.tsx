// Powered by OnSpace.AI
import React, { useState, useMemo, useCallback } from 'react';
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
import { CartItem, DiscountType, InvoiceType, PaymentType, Product } from '@/types';
import { formatCurrency } from '@/utils/format';

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { products, customers, saveInvoice, nextInvoiceNumber, settings, syncing, addProduct, openShift } = useApp();
  const { showAlert } = useAlert();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('بيع');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('نقداً');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoiceNum, setLastInvoiceNum] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Second payment
  const [showSecondPayment, setShowSecondPayment] = useState(false);
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<PaymentType>('بطاقة');
  const [secondPaymentAmount, setSecondPaymentAmount] = useState('');

  // Weight modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState('');

  // New product from barcode
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductBuyPrice, setNewProductBuyPrice] = useState('');
  const [newProductSellPrice, setNewProductSellPrice] = useState('');
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  const currency = settings?.currency || 'د.ج';
  const taxEnabled = settings?.taxEnabled || false;
  const taxRate = settings?.taxRate || 0;

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const matchSearch = p.name.includes(search) || (p.barcode && p.barcode.includes(search));
      if (!matchSearch) return false;
      if (invoiceType === 'بيع' && p.unitType === 'piece' && p.quantity <= 0) return false;
      return true;
    }).slice(0, 50),
    [products, search, invoiceType]
  );

  const filteredCustomers = useMemo(() =>
    customers.filter(c => c.name.includes(customerSearch) || c.phone.includes(customerSearch)),
    [customers, customerSearch]
  );

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percent') return subtotal * val / 100;
    return Math.min(val, subtotal);
  }, [subtotal, discountValue, discountType]);

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = taxEnabled && invoiceType === 'بيع' ? afterDiscount * taxRate / 100 : 0;
  const total = afterDiscount + taxAmount;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const addToCart = useCallback((product: Product) => {
    if (product.unitType === 'weight') {
      setWeightProduct(product);
      setWeightInput('');
      setShowWeightModal(true);
      return;
    }
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
        maxQuantity: invoiceType === 'شراء' || invoiceType === 'مرتجع' ? 9999 : product.quantity,
        unit: product.unit,
        unitType: product.unitType,
      }];
    });
  }, [invoiceType, showAlert]);

  function confirmWeightAdd() {
    if (!weightProduct) return;
    const qty = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) { showAlert('تنبيه', 'أدخل كمية صحيحة'); return; }
    const unitPrice = invoiceType === 'شراء' ? weightProduct.buyPrice : weightProduct.sellPrice;
    setCart(prev => {
      const existing = prev.find(i => i.productId === weightProduct.id);
      if (existing) {
        return prev.map(i => i.productId === weightProduct.id ? { ...i, quantity: parseFloat((i.quantity + qty).toFixed(4)) } : i);
      }
      return [...prev, {
        productId: weightProduct.id, productName: weightProduct.name,
        price: unitPrice, buyPrice: weightProduct.buyPrice,
        quantity: qty, maxQuantity: 99999,
        unit: weightProduct.unit, unitType: weightProduct.unitType,
      }];
    });
    setShowWeightModal(false);
    setWeightProduct(null);
  }

  function handleBarcodeScan(barcode: string) {
    setShowScanner(false);
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else if (invoiceType === 'شراء') {
      setScannedBarcode(barcode);
      setNewProductName(''); setNewProductBuyPrice(''); setNewProductSellPrice('');
      setShowNewProductModal(true);
    } else {
      showAlert('غير موجود', `لم يتم العثور على منتج بالباركود: ${barcode}`);
    }
  }

  async function handleAddNewProductFromScan() {
    if (!newProductName.trim()) { showAlert('تنبيه', 'اسم المنتج مطلوب'); return; }
    if (!newProductBuyPrice || isNaN(Number(newProductBuyPrice))) { showAlert('تنبيه', 'سعر الشراء غير صحيح'); return; }
    setSavingNewProduct(true);
    try {
      await addProduct({
        name: newProductName.trim(), barcode: scannedBarcode,
        buyPrice: Number(newProductBuyPrice),
        sellPrice: Number(newProductSellPrice) || Number(newProductBuyPrice),
        wholesalePrice: 0, quantity: 0, minQuantity: 10, category: 'أخرى',
        unitType: 'piece', unit: 'قطعة',
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
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = parseFloat((i.quantity + delta).toFixed(4));
      if (newQty <= 0) return i;
      if (i.unitType === 'piece' && invoiceType === 'بيع' && newQty > i.maxQuantity) {
        showAlert('تنبيه', `الكمية المتاحة: ${i.maxQuantity}`);
        return i;
      }
      return { ...i, quantity: newQty };
    }));
  }

  function editWeightItem(item: CartItem) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;
    setWeightProduct(prod);
    setWeightInput(item.quantity.toString());
    setShowWeightModal(true);
    setCart(prev => prev.filter(i => i.productId !== item.productId));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0) { showAlert('تنبيه', 'السلة فارغة'); return; }
    if (paymentType === 'آجل' && !selectedCustomerId) {
      showAlert('تنبيه', 'يجب اختيار زبون للبيع الآجل'); return;
    }
    if (settings?.shiftsEnabled && !openShift && invoiceType === 'بيع') {
      showAlert('تنبيه', 'يجب فتح وردية قبل البيع'); return;
    }
    if (showSecondPayment) {
      const secAmt = parseFloat(secondPaymentAmount) || 0;
      if (secAmt <= 0 || secAmt >= total) {
        showAlert('تنبيه', 'مبلغ الدفع الثاني غير صحيح'); return;
      }
    }
    const num = nextInvoiceNumber;
    setSaving(true);
    try {
      const secAmt = showSecondPayment ? (parseFloat(secondPaymentAmount) || 0) : 0;
      await saveInvoice(
        {
          date: new Date().toISOString(),
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name,
          subtotal,
          discountType,
          discountValue: parseFloat(discountValue) || 0,
          discountAmount,
          taxRate: taxEnabled && invoiceType === 'بيع' ? taxRate : 0,
          taxAmount,
          total,
          paymentType,
          secondPaymentMethod: showSecondPayment ? secondPaymentMethod : undefined,
          secondPaymentAmount: secAmt,
          invoiceType,
          shiftId: openShift?.id,
        },
        cart.map(i => ({
          productId: i.productId, productName: i.productName,
          quantity: i.quantity, price: i.price, buyPrice: i.buyPrice,
        }))
      );
      setLastInvoiceNum(num);
      setCart([]);
      setSelectedCustomerId(undefined);
      setPaymentType('نقداً');
      setDiscountValue('');
      setShowSecondPayment(false);
      setSecondPaymentAmount('');
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
    setDiscountValue('');
    setShowSecondPayment(false);
  }

  const paymentOptions: PaymentType[] = invoiceType === 'بيع' ? ['نقداً', 'بطاقة', 'تحويل', 'آجل'] : ['نقداً'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {syncing ? <MaterialIcons name="sync" size={16} color={Colors.primary} /> : null}
          {settings?.shiftsEnabled && openShift ? (
            <View style={styles.shiftBadge}>
              <MaterialIcons name="schedule" size={11} color={Colors.success} />
              <Text style={styles.shiftBadgeText}>{openShift.cashierName}</Text>
            </View>
          ) : null}
          <Text style={styles.headerSub}>فاتورة #{nextInvoiceNumber}</Text>
        </View>
        <Text style={styles.headerTitle}>الكاشير</Text>
      </View>

      {/* Invoice Type Toggle */}
      <View style={styles.typeToggle}>
        {(['بيع', 'شراء', 'مرتجع'] as InvoiceType[]).map(t => (
          <Pressable
            key={t}
            style={[styles.typeBtn, invoiceType === t && (
              t === 'بيع' ? styles.typeBtnSale : t === 'شراء' ? styles.typeBtnPurchase : styles.typeBtnReturn
            )]}
            onPress={() => switchInvoiceType(t)}
          >
            <MaterialIcons
              name={t === 'بيع' ? 'point-of-sale' : t === 'شراء' ? 'shopping-bag' : 'assignment-return'}
              size={14}
              color={invoiceType === t ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.typeBtnText, invoiceType === t && styles.typeBtnTextActive]}>{t}</Text>
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
            <View style={styles.tipRow}>
              <MaterialIcons name="info-outline" size={12} color={Colors.info} />
              <Text style={styles.tipText}>مسح باركود غير موجود يضيف منتجاً جديداً</Text>
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
                <View style={[styles.unitBadge, { backgroundColor: item.unitType === 'weight' ? Colors.warning + '22' : Colors.primary + '22' }]}>
                  <MaterialIcons name={item.unitType === 'weight' ? 'scale' : 'inventory-2'} size={10} color={item.unitType === 'weight' ? Colors.warning : Colors.primary} />
                  <Text style={[styles.unitBadgeText, { color: item.unitType === 'weight' ? Colors.warning : Colors.primary }]}>
                    {item.unitType === 'weight' ? `/${item.unit}` : item.unit}
                  </Text>
                </View>
                <Text style={styles.productPrice}>
                  {formatCurrency(invoiceType === 'شراء' ? item.buyPrice : item.sellPrice, currency)}
                </Text>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                {item.unitType === 'piece' ? (
                  <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>{item.quantity}</Text></View>
                ) : (
                  <View style={[styles.qtyBadge, { backgroundColor: Colors.warning + '22' }]}>
                    <MaterialIcons name="scale" size={9} color={Colors.warning} />
                  </View>
                )}
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
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>السلة ({cart.length})</Text>
            {invoiceType === 'بيع' && (
              <Pressable onPress={() => setShowDiscountModal(true)} style={styles.discountBtn} hitSlop={8}>
                <MaterialIcons name="local-offer" size={14} color={discountValue ? Colors.warning : Colors.textSecondary} />
                <Text style={[styles.discountBtnText, { color: discountValue ? Colors.warning : Colors.textSecondary }]}>
                  {discountValue ? (discountType === 'percent' ? `${discountValue}%` : formatCurrency(parseFloat(discountValue), currency)) : 'خصم'}
                </Text>
              </Pressable>
            )}
          </View>

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
                  {item.unitType === 'weight' ? (
                    <Pressable style={styles.weightQtyBtn} onPress={() => editWeightItem(item)}>
                      <MaterialIcons name="edit" size={11} color={Colors.warning} />
                      <Text style={styles.weightQtyText}>
                        {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}{item.unit}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.cartQty}>
                      <Pressable onPress={() => updateQty(item.productId, 1)} style={styles.qtyBtn} hitSlop={4}>
                        <MaterialIcons name="add" size={14} color={Colors.primary} />
                      </Pressable>
                      <Text style={styles.qtyNum}>{item.quantity}</Text>
                      <Pressable onPress={() => updateQty(item.productId, -1)} style={styles.qtyBtn} hitSlop={4}>
                        <MaterialIcons name="remove" size={14} color={Colors.danger} />
                      </Pressable>
                    </View>
                  )}
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.cartItemPrice}>{formatCurrency(item.price * item.quantity, currency)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.cartFooter}>
            {/* Totals */}
            {discountAmount > 0 || taxAmount > 0 ? (
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownVal}>{formatCurrency(subtotal, currency)}</Text>
                  <Text style={styles.breakdownLabel}>المجموع الفرعي</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownVal, { color: Colors.warning }]}>-{formatCurrency(discountAmount, currency)}</Text>
                    <Text style={styles.breakdownLabel}>الخصم</Text>
                  </View>
                )}
                {taxAmount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownVal, { color: Colors.info }]}>+{formatCurrency(taxAmount, currency)}</Text>
                    <Text style={styles.breakdownLabel}>ضريبة {taxRate}%</Text>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
              <Text style={styles.totalLabel}>الإجمالي:</Text>
            </View>

            {invoiceType === 'بيع' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentScroll}>
                  {paymentOptions.map(type => (
                    <Pressable
                      key={type}
                      style={[styles.payBtn, paymentType === type && styles.payBtnActive]}
                      onPress={() => setPaymentType(type)}
                    >
                      <Text style={[styles.payBtnText, paymentType === type && styles.payBtnTextActive]}>{type}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {paymentType === 'آجل' ? (
                  <Pressable style={styles.customerPicker} onPress={() => setShowCustomerModal(true)}>
                    <MaterialIcons name="person" size={16} color={Colors.primary} />
                    <Text style={[styles.customerPickerText, !selectedCustomer && styles.customerPickerPlaceholder]}>
                      {selectedCustomer ? selectedCustomer.name : 'اختر الزبون...'}
                    </Text>
                  </Pressable>
                ) : null}

                {paymentType !== 'آجل' ? (
                  <Pressable
                    style={styles.secondPayToggle}
                    onPress={() => { setShowSecondPayment(!showSecondPayment); setSecondPaymentAmount(''); }}
                  >
                    <MaterialIcons name={showSecondPayment ? 'check-box' : 'check-box-outline-blank'} size={16} color={Colors.primary} />
                    <Text style={styles.secondPayToggleText}>دفع مزدوج (كاش + بطاقة)</Text>
                  </Pressable>
                ) : null}

                {showSecondPayment ? (
                  <View style={styles.secondPayRow}>
                    <TextInput
                      style={styles.secondPayInput}
                      placeholder="مبلغ البطاقة"
                      placeholderTextColor={Colors.textMuted}
                      value={secondPaymentAmount}
                      onChangeText={setSecondPaymentAmount}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                    <View style={styles.secondPayMethodToggle}>
                      {(['بطاقة', 'تحويل'] as PaymentType[]).map(m => (
                        <Pressable
                          key={m}
                          style={[styles.secondPayMethodBtn, secondPaymentMethod === m && styles.secondPayMethodBtnActive]}
                          onPress={() => setSecondPaymentMethod(m)}
                        >
                          <Text style={[styles.secondPayMethodText, secondPaymentMethod === m && { color: Colors.white }]}>{m}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            <StyledButton
              label={saving ? 'جاري الحفظ...' : `إتمام ${invoiceType === 'بيع' ? 'البيع' : invoiceType === 'شراء' ? 'الشراء' : 'المرتجع'}`}
              onPress={handleCheckout}
              fullWidth
              disabled={cart.length === 0 || saving}
            />
          </View>
        </View>
      </View>

      <BarcodeScanner visible={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />

      {/* Discount Modal */}
      <Modal visible={showDiscountModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.discountCard}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowDiscountModal(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>تطبيق خصم</Text>
            </View>

            <View style={styles.discountTypeRow}>
              {(['percent', 'fixed'] as DiscountType[]).map(t => (
                <Pressable
                  key={t}
                  style={[styles.discountTypeBtn, discountType === t && styles.discountTypeBtnActive]}
                  onPress={() => { setDiscountType(t); setDiscountValue(''); }}
                >
                  <Text style={[styles.discountTypeText, discountType === t && { color: Colors.white }]}>
                    {t === 'percent' ? 'نسبة %' : 'مبلغ ثابت'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.discountInputRow}>
              <Text style={styles.discountUnit}>{discountType === 'percent' ? '%' : currency}</Text>
              <TextInput
                style={styles.discountInput}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                textAlign="center"
                autoFocus
              />
            </View>

            {discountValue && !isNaN(parseFloat(discountValue)) ? (
              <Text style={styles.discountPreview}>
                الخصم: {formatCurrency(discountType === 'percent' ? subtotal * parseFloat(discountValue) / 100 : parseFloat(discountValue), currency)}
              </Text>
            ) : null}

            <View style={styles.discountBtnsRow}>
              <StyledButton label="إزالة الخصم" variant="secondary" onPress={() => { setDiscountValue(''); setShowDiscountModal(false); }} style={{ flex: 1 }} />
              <StyledButton label="تطبيق" onPress={() => setShowDiscountModal(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Weight modal */}
      <Modal visible={showWeightModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.weightModalCard}>
            <View style={styles.weightModalHeader}>
              <Pressable onPress={() => { setShowWeightModal(false); setWeightProduct(null); }} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
              <View style={styles.weightModalIcon}>
                <MaterialIcons name="scale" size={24} color={Colors.warning} />
              </View>
            </View>
            <Text style={styles.weightModalTitle}>{weightProduct?.name}</Text>
            <Text style={styles.weightModalSub}>
              السعر: {formatCurrency(invoiceType === 'شراء' ? (weightProduct?.buyPrice || 0) : (weightProduct?.sellPrice || 0), currency)} / {weightProduct?.unit}
            </Text>
            <View style={styles.weightInputWrap}>
              <Text style={styles.weightInputUnit}>{weightProduct?.unit}</Text>
              <TextInput
                style={styles.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                textAlign="center"
                autoFocus
                selectTextOnFocus
              />
            </View>
            {weightInput && !isNaN(parseFloat(weightInput)) && parseFloat(weightInput) > 0 ? (
              <View style={styles.weightCalc}>
                <Text style={styles.weightCalcText}>
                  {parseFloat(weightInput).toFixed(2)} {weightProduct?.unit} × {formatCurrency(invoiceType === 'شراء' ? (weightProduct?.buyPrice || 0) : (weightProduct?.sellPrice || 0), currency)}
                </Text>
                <Text style={styles.weightCalcTotal}>
                  = {formatCurrency(parseFloat(weightInput) * (invoiceType === 'شراء' ? (weightProduct?.buyPrice || 0) : (weightProduct?.sellPrice || 0)), currency)}
                </Text>
              </View>
            ) : null}
            <View style={styles.presets}>
              {['100', '250', '500', '1000'].map(p => (
                <Pressable key={p} style={styles.presetBtn} onPress={() => setWeightInput(p)}>
                  <Text style={styles.presetText}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <StyledButton label="إضافة إلى السلة" onPress={confirmWeightAdd} fullWidth style={{ marginTop: Spacing.sm }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* New Product from Barcode Modal */}
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
            <TextInput style={styles.newProductInput} placeholder="اسم المنتج *" placeholderTextColor={Colors.textMuted} value={newProductName} onChangeText={setNewProductName} textAlign="right" />
            <View style={styles.priceInputRow}>
              <TextInput style={[styles.newProductInput, { flex: 1 }]} placeholder={`سعر الشراء (${currency}) *`} placeholderTextColor={Colors.textMuted} value={newProductBuyPrice} onChangeText={setNewProductBuyPrice} keyboardType="numeric" textAlign="right" />
              <TextInput style={[styles.newProductInput, { flex: 1 }]} placeholder={`سعر البيع (${currency})`} placeholderTextColor={Colors.textMuted} value={newProductSellPrice} onChangeText={setNewProductSellPrice} keyboardType="numeric" textAlign="right" />
            </View>
            <Pressable style={[styles.confirmBtn, savingNewProduct && { opacity: 0.7 }]} onPress={handleAddNewProductFromScan} disabled={savingNewProduct}>
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
              {invoiceType === 'بيع' ? 'تم البيع بنجاح!' : invoiceType === 'شراء' ? 'تم تسجيل الشراء!' : 'تم تسجيل المرتجع!'}
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
  headerLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  headerSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  shiftBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    backgroundColor: Colors.success + '22', borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  shiftBadgeText: { color: Colors.success, fontSize: 10, fontWeight: FontWeight.semiBold },
  typeToggle: {
    flexDirection: 'row-reverse', marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  typeBtnSale: { backgroundColor: Colors.primary },
  typeBtnPurchase: { backgroundColor: Colors.info },
  typeBtnReturn: { backgroundColor: Colors.danger },
  typeBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: FontWeight.medium },
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
  tipRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingBottom: 4 },
  tipText: { color: Colors.info, fontSize: 10 },
  productCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.sm,
    margin: Spacing.xs, borderWidth: 1, borderColor: Colors.border, minHeight: 76,
    alignItems: 'flex-end', position: 'relative',
  },
  unitBadge: { position: 'absolute', top: 4, left: 4, flexDirection: 'row-reverse', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2 },
  unitBadgeText: { fontSize: 9, fontWeight: FontWeight.semiBold },
  productName: { color: Colors.text, fontSize: FontSize.xs + 1, fontWeight: FontWeight.medium, textAlign: 'right', marginBottom: 4 },
  productPrice: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  qtyBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2 },
  qtyBadgeText: { color: Colors.textSecondary, fontSize: 9 },
  emptyProducts: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  cartPanel: { flex: 1, flexDirection: 'column' },
  cartHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cartTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, textAlign: 'right' },
  discountBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.warning + '33' },
  discountBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  cartList: { flex: 1 },
  emptyCart: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, marginTop: Spacing.xl },
  cartItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cartInfo: { flex: 1, alignItems: 'flex-end' },
  cartItemName: { color: Colors.text, fontSize: FontSize.xs + 1, textAlign: 'right' },
  cartItemPrice: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  cartQty: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
  qtyBtn: { backgroundColor: Colors.surface, borderRadius: 4, padding: 4, borderWidth: 1, borderColor: Colors.border },
  qtyNum: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, minWidth: 22, textAlign: 'center' },
  weightQtyBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2, backgroundColor: Colors.warning + '22', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: Colors.warning + '44' },
  weightQtyText: { color: Colors.warning, fontSize: 11, fontWeight: FontWeight.semiBold },
  cartFooter: { padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, gap: 6 },
  breakdownBox: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  breakdownRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  breakdownLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  breakdownVal: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  paymentScroll: { flexDirection: 'row-reverse', gap: 4 },
  payBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  payBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  payBtnTextActive: { color: Colors.white },
  customerPicker: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary },
  customerPickerText: { color: Colors.text, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  customerPickerPlaceholder: { color: Colors.textMuted },
  secondPayToggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  secondPayToggleText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  secondPayRow: { flexDirection: 'row-reverse', gap: 6, alignItems: 'center' },
  secondPayInput: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, color: Colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border },
  secondPayMethodToggle: { flexDirection: 'row-reverse', borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  secondPayMethodBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: Colors.background },
  secondPayMethodBtnActive: { backgroundColor: Colors.info },
  secondPayMethodText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  // Discount modal
  discountCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, margin: Spacing.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  discountTypeRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginBottom: Spacing.md },
  discountTypeBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  discountTypeBtnActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  discountTypeText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  discountInputRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.warning, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  discountInput: { flex: 1, fontSize: 36, fontWeight: FontWeight.bold, color: Colors.text, paddingVertical: Spacing.md, textAlign: 'center' },
  discountUnit: { color: Colors.warning, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  discountPreview: { color: Colors.warning, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md, fontWeight: FontWeight.semiBold },
  discountBtnsRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },

  // Weight modal
  weightModalCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, margin: Spacing.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  weightModalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  weightModalIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.warning + '22', alignItems: 'center', justifyContent: 'center' },
  weightModalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'right', marginBottom: 4 },
  weightModalSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginBottom: Spacing.lg },
  weightInputWrap: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.warning, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  weightInput: { flex: 1, fontSize: 40, fontWeight: FontWeight.bold, color: Colors.text, paddingVertical: Spacing.md, textAlign: 'center' },
  weightInputUnit: { color: Colors.warning, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, paddingRight: Spacing.sm },
  weightCalc: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  weightCalcText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  weightCalcTotal: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  presets: { flexDirection: 'row-reverse', gap: Spacing.sm, marginBottom: Spacing.sm },
  presetBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  presetText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  modalSearch: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, color: Colors.text, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  customerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  customerInfo: { flex: 1, alignItems: 'flex-end' },
  customerName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  customerPhone: { color: Colors.textSecondary, fontSize: FontSize.xs },
  customerBalance: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  barcodeTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.info + '33', alignSelf: 'flex-end' },
  barcodeTagText: { color: Colors.info, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  newProductInput: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  priceInputRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  confirmBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, flexDirection: 'row-reverse', justifyContent: 'center', gap: Spacing.xs },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  successModal: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, margin: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.success + '22', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  successTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  successSub: { color: Colors.textSecondary, fontSize: FontSize.md },
});

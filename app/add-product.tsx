// Powered by OnSpace.AI
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledInput from '@/components/ui/StyledInput';
import StyledButton from '@/components/ui/StyledButton';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { CATEGORIES } from '@/utils/format';

export default function AddProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct } = useApp();
  const { showAlert } = useAlert();

  const existing = id ? products.find(p => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name || '');
  const [barcode, setBarcode] = useState(existing?.barcode || '');
  const [buyPrice, setBuyPrice] = useState(existing?.buyPrice.toString() || '');
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice.toString() || '');
  const [quantity, setQuantity] = useState(existing?.quantity.toString() || '');
  const [minQuantity, setMinQuantity] = useState(existing?.minQuantity.toString() || '10');
  const [category, setCategory] = useState(existing?.category || CATEGORIES[0]);
  const [expireDate, setExpireDate] = useState(existing?.expireDate || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'اسم المنتج مطلوب';
    if (!buyPrice || isNaN(Number(buyPrice))) e.buyPrice = 'سعر شراء غير صحيح';
    if (!sellPrice || isNaN(Number(sellPrice))) e.sellPrice = 'سعر بيع غير صحيح';
    if (!quantity || isNaN(Number(quantity))) e.quantity = 'الكمية غير صحيحة';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const data = {
      name: name.trim(),
      barcode: barcode.trim() || undefined,
      buyPrice: Number(buyPrice),
      sellPrice: Number(sellPrice),
      quantity: Number(quantity),
      minQuantity: Number(minQuantity) || 10,
      category,
      expireDate: expireDate.trim() || undefined,
    };
    setSaving(true);
    try {
      if (existing) {
        await updateProduct(existing.id, data);
        showAlert('تم', 'تم تعديل المنتج بنجاح');
      } else {
        await addProduct(data);
        showAlert('تم', 'تم إضافة المنتج بنجاح');
      }
      router.back();
    } catch {
      showAlert('خطأ', 'تعذّر حفظ المنتج');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StyledInput
          label="اسم المنتج *"
          value={name}
          onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
          placeholder="مثال: أرز بسمتي 5 كغ"
          error={errors.name}
        />
        <View style={styles.barcodeRow}>
          <View style={{ flex: 1 }}>
            <StyledInput
              label="الباركود (اختياري)"
              value={barcode}
              onChangeText={setBarcode}
              placeholder="6001234567890"
              keyboardType="numeric"
            />
          </View>
          <Pressable style={styles.scanBtn} onPress={() => setShowScanner(true)}>
            <MaterialIcons name="qr-code-scanner" size={22} color={Colors.primary} />
            <Text style={styles.scanBtnText}>مسح</Text>
          </Pressable>
        </View>

        <BarcodeScanner
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={(code) => { setBarcode(code); setShowScanner(false); }}
        />

        <Text style={styles.label}>القسم</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[styles.catBtn, category === cat && styles.catBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <StyledInput
              label="سعر الشراء *"
              value={buyPrice}
              onChangeText={t => { setBuyPrice(t); setErrors(e => ({ ...e, buyPrice: '' })); }}
              placeholder="0"
              keyboardType="numeric"
              error={errors.buyPrice}
            />
          </View>
          <View style={styles.gap} />
          <View style={styles.halfField}>
            <StyledInput
              label="سعر البيع *"
              value={sellPrice}
              onChangeText={t => { setSellPrice(t); setErrors(e => ({ ...e, sellPrice: '' })); }}
              placeholder="0"
              keyboardType="numeric"
              error={errors.sellPrice}
            />
          </View>
        </View>

        {buyPrice && sellPrice && !isNaN(Number(buyPrice)) && !isNaN(Number(sellPrice)) ? (
          <View style={styles.profitInfo}>
            <Text style={styles.profitText}>
              الربح للوحدة: {(Number(sellPrice) - Number(buyPrice)).toLocaleString('ar-DZ')}
              {Number(buyPrice) > 0 ? ` (${Math.round(((Number(sellPrice) - Number(buyPrice)) / Number(buyPrice)) * 100)}%)` : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.halfField}>
            <StyledInput
              label="الكمية *"
              value={quantity}
              onChangeText={t => { setQuantity(t); setErrors(e => ({ ...e, quantity: '' })); }}
              placeholder="0"
              keyboardType="numeric"
              error={errors.quantity}
            />
          </View>
          <View style={styles.gap} />
          <View style={styles.halfField}>
            <StyledInput
              label="أقل كمية للتنبيه"
              value={minQuantity}
              onChangeText={setMinQuantity}
              placeholder="10"
              keyboardType="numeric"
            />
          </View>
        </View>

        <StyledInput
          label="تاريخ الانتهاء (اختياري)"
          value={expireDate}
          onChangeText={setExpireDate}
          placeholder="YYYY-MM-DD"
        />

        <View style={styles.btnRow}>
          <StyledButton label="إلغاء" variant="secondary" onPress={() => router.back()} style={styles.cancelBtn} />
          <StyledButton label={saving ? 'جاري الحفظ...' : (existing ? 'حفظ التعديلات' : 'إضافة المنتج')} onPress={handleSave} style={styles.saveBtn} disabled={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm, textAlign: 'right', fontWeight: '500' },
  catGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  catBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  catBtnTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },
  row: { flexDirection: 'row-reverse' },
  halfField: { flex: 1 },
  gap: { width: Spacing.sm },
  profitInfo: {
    backgroundColor: '#10B981' + '11', borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: '#10B981',
  },
  profitText: { color: '#10B981', fontSize: FontSize.sm, textAlign: 'right', fontWeight: FontWeight.medium },
  barcodeRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: Spacing.sm },
  scanBtn: {
    backgroundColor: Colors.primary + '22', borderRadius: Radius.md, padding: Spacing.sm + 4,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary,
    gap: 4, marginBottom: Spacing.md, minWidth: 64,
  },
  scanBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  btnRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: { flex: 1 },
  cancelBtn: { flex: 1 },
});

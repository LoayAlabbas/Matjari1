// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Pressable, Modal, FlatList, Image, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/hooks/useApp';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import StyledInput from '@/components/ui/StyledInput';
import StyledButton from '@/components/ui/StyledButton';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { CATEGORIES } from '@/utils/format';
import { UnitType, WEIGHT_UNITS, PIECE_UNITS } from '@/types';
import { uploadProductImage } from '@/services/api';

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
  const [wholesalePrice, setWholesalePrice] = useState(existing?.wholesalePrice?.toString() || '');
  const [quantity, setQuantity] = useState(existing?.quantity.toString() || '');
  const [minQuantity, setMinQuantity] = useState(existing?.minQuantity.toString() || '10');
  const [category, setCategory] = useState(existing?.category || CATEGORIES[0]);
  const [expireDate, setExpireDate] = useState(existing?.expireDate || '');
  const [unitType, setUnitType] = useState<UnitType>(existing?.unitType || 'piece');
  const [unit, setUnit] = useState(existing?.unit || 'قطعة');
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUrl || null);
  const [imageChanged, setImageChanged] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableUnits = unitType === 'weight' ? WEIGHT_UNITS : PIECE_UNITS;

  async function handlePickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول إلى المعرض');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  }

  async function handleTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAlert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول إلى الكاميرا');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  }

  function handleUnitTypeChange(type: UnitType) {
    setUnitType(type);
    setUnit(type === 'weight' ? 'جرام' : 'قطعة');
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'اسم المنتج مطلوب';
    if (!buyPrice || isNaN(Number(buyPrice))) e.buyPrice = 'سعر شراء غير صحيح';
    if (!sellPrice || isNaN(Number(sellPrice))) e.sellPrice = 'سعر بيع غير صحيح';
    if (unitType === 'piece' && (!quantity || isNaN(Number(quantity)))) e.quantity = 'الكمية غير صحيحة';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      let finalImageUrl = existing?.imageUrl || undefined;

      const productId = existing?.id || `${Date.now()}`;

      if (imageChanged && imageUri) {
        const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        finalImageUrl = await uploadProductImage(productId, imageUri, ext);
      }

      const data = {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        buyPrice: Number(buyPrice),
        sellPrice: Number(sellPrice),
        wholesalePrice: Number(wholesalePrice) || 0,
        quantity: unitType === 'piece' ? Number(quantity) : 0,
        minQuantity: unitType === 'piece' ? (Number(minQuantity) || 10) : 0,
        category,
        expireDate: expireDate.trim() || undefined,
        unitType,
        unit,
        imageUrl: finalImageUrl,
      };

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

        {/* Product Image */}
        <Text style={styles.label}>صورة المنتج (اختياري)</Text>
        <View style={styles.imageSection}>
          <View style={styles.imagePreview}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
                <Pressable style={styles.removeImageBtn} onPress={() => { setImageUri(null); setImageChanged(true); }}>
                  <MaterialIcons name="close" size={14} color={Colors.white} />
                </Pressable>
              </>
            ) : (
              <MaterialIcons name="image" size={36} color={Colors.textMuted} />
            )}
          </View>
          <View style={styles.imageActions}>
            <Pressable style={styles.imageBtn} onPress={handlePickImage}>
              <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
              <Text style={styles.imageBtnText}>من المعرض</Text>
            </Pressable>
            <Pressable style={styles.imageBtn} onPress={handleTakePhoto}>
              <MaterialIcons name="camera-alt" size={18} color={Colors.info} />
              <Text style={[styles.imageBtnText, { color: Colors.info }]}>التقاط صورة</Text>
            </Pressable>
          </View>
        </View>

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

        {/* Unit Type Toggle */}
        <Text style={styles.label}>نوع البيع</Text>
        <View style={styles.unitTypeToggle}>
          <Pressable
            style={[styles.unitTypeBtn, unitType === 'piece' && styles.unitTypeBtnActive]}
            onPress={() => handleUnitTypeChange('piece')}
          >
            <MaterialIcons
              name="inventory-2"
              size={18}
              color={unitType === 'piece' ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.unitTypeBtnText, unitType === 'piece' && styles.unitTypeBtnTextActive]}>
              بالقطعة
            </Text>
          </Pressable>
          <Pressable
            style={[styles.unitTypeBtn, unitType === 'weight' && styles.unitTypeBtnWeightActive]}
            onPress={() => handleUnitTypeChange('weight')}
          >
            <MaterialIcons
              name="scale"
              size={18}
              color={unitType === 'weight' ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.unitTypeBtnText, unitType === 'weight' && styles.unitTypeBtnTextActive]}>
              بالوزن / الكمية
            </Text>
          </Pressable>
        </View>

        {/* Unit Type Explanation */}
        <View style={[styles.unitHint, { borderColor: unitType === 'weight' ? Colors.warning + '44' : Colors.primary + '44', backgroundColor: unitType === 'weight' ? Colors.warning + '11' : Colors.primary + '11' }]}>
          <MaterialIcons
            name={unitType === 'weight' ? 'scale' : 'inventory-2'}
            size={14}
            color={unitType === 'weight' ? Colors.warning : Colors.primary}
          />
          <Text style={[styles.unitHintText, { color: unitType === 'weight' ? Colors.warning : Colors.primary }]}>
            {unitType === 'weight'
              ? `سعر البيع هو السعر لكل ${unit} واحد. عند البيع يُدخل الكاشير الكمية ويُحسب السعر تلقائياً.`
              : 'يُباع بالعدد. يُتتبّع المخزون تلقائياً عند كل بيع أو شراء.'}
          </Text>
        </View>

        {/* Unit Selector */}
        <Text style={styles.label}>وحدة القياس</Text>
        <Pressable style={styles.unitPicker} onPress={() => setShowUnitModal(true)}>
          <MaterialIcons name="expand-more" size={20} color={Colors.textSecondary} />
          <Text style={styles.unitPickerValue}>{unit}</Text>
          <Text style={styles.unitPickerLabel}>
            {unitType === 'weight' ? 'سعر البيع لكل:' : 'يُباع بوحدة:'}
          </Text>
        </Pressable>

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
              label={`سعر الشراء *`}
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
              label={`سعر البيع / ${unit} *`}
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
              الربح لكل {unit}: {(Number(sellPrice) - Number(buyPrice)).toLocaleString('ar-DZ')}
              {Number(buyPrice) > 0 ? ` (${Math.round(((Number(sellPrice) - Number(buyPrice)) / Number(buyPrice)) * 100)}%)` : ''}
            </Text>
          </View>
        ) : null}

        <StyledInput
          label="سعر الجملة (اختياري)"
          value={wholesalePrice}
          onChangeText={setWholesalePrice}
          placeholder="0"
          keyboardType="numeric"
        />

        {unitType === 'piece' ? (
          <View style={styles.row}>
            <View style={styles.halfField}>
              <StyledInput
                label="الكمية في المخزن *"
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
        ) : (
          <View style={styles.weightNote}>
            <MaterialIcons name="info-outline" size={14} color={Colors.info} />
            <Text style={styles.weightNoteText}>
              منتجات الوزن لا تتطلب كمية في المخزن. كل عملية بيع تُسجّل بالكمية المُدخلة مباشرةً.
            </Text>
          </View>
        )}

        <StyledInput
          label="تاريخ الانتهاء (اختياري)"
          value={expireDate}
          onChangeText={setExpireDate}
          placeholder="YYYY-MM-DD"
        />

        <View style={styles.btnRow}>
          <StyledButton label="إلغاء" variant="secondary" onPress={() => router.back()} style={styles.cancelBtn} />
          <StyledButton
            label={saving ? 'جاري الحفظ...' : (existing ? 'حفظ التعديلات' : 'إضافة المنتج')}
            onPress={handleSave}
            style={styles.saveBtn}
            disabled={saving}
          />
        </View>
      </ScrollView>

      {/* Saving overlay */}
      {saving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.savingText}>جاري الحفظ{imageChanged && imageUri ? ' ورفع الصورة...' : '...'}</Text>
        </View>
      ) : null}

      {/* Unit Picker Modal */}
      <Modal visible={showUnitModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowUnitModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>اختر الوحدة</Text>
            </View>
            <FlatList
              data={availableUnits}
              keyExtractor={u => u}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.unitOption, unit === item && styles.unitOptionActive]}
                  onPress={() => { setUnit(item); setShowUnitModal(false); }}
                >
                  {unit === item
                    ? <MaterialIcons name="check" size={18} color={Colors.primary} />
                    : <View style={{ width: 18 }} />
                  }
                  <Text style={[styles.unitOptionText, unit === item && { color: Colors.primary, fontWeight: FontWeight.semiBold }]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm, textAlign: 'right', fontWeight: '500' },

  unitTypeToggle: {
    flexDirection: 'row-reverse', borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  unitTypeBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm + 2, backgroundColor: Colors.background,
  },
  unitTypeBtnActive: { backgroundColor: Colors.primary },
  unitTypeBtnWeightActive: { backgroundColor: Colors.warning },
  unitTypeBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  unitTypeBtnTextActive: { color: Colors.white, fontWeight: FontWeight.semiBold },

  unitHint: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: Spacing.xs,
    borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1,
  },
  unitHintText: { flex: 1, fontSize: FontSize.xs, textAlign: 'right', lineHeight: 18 },

  unitPicker: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  unitPickerLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  unitPickerValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1, textAlign: 'center' },

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

  weightNote: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: Spacing.xs,
    backgroundColor: Colors.info + '11', borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.info + '33',
  },
  weightNoteText: { color: Colors.info, fontSize: FontSize.xs, flex: 1, textAlign: 'right', lineHeight: 18 },

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

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.xl, maxHeight: '60%',
  },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
  unitOption: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  unitOptionActive: { backgroundColor: Colors.primary + '11', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm },
  unitOptionText: { color: Colors.text, fontSize: FontSize.md },

  imageSection: { flexDirection: 'row-reverse', gap: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  imagePreview: {
    width: 90, height: 90, borderRadius: Radius.lg, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  productImage: { width: 90, height: 90 },
  removeImageBtn: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: Colors.danger, borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  imageActions: { flex: 1, gap: Spacing.sm },
  imageBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  imageBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    zIndex: 100,
  },
  savingText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.medium },
});

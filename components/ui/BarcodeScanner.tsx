// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ visible, onClose, onScan }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <MaterialIcons name="camera-alt" size={64} color={Colors.textMuted} />
            <Text style={styles.permissionTitle}>صلاحية الكاميرا</Text>
            <Text style={styles.permissionText}>يجب السماح بالوصول إلى الكاميرا لمسح الباركود</Text>
            <Pressable style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>السماح بالوصول</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>إلغاء</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
              {/* Top bar */}
              <View style={styles.topBar}>
                <Pressable style={styles.torchBtn} onPress={() => setTorch(t => !t)}>
                  <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={24} color={torch ? Colors.warning : Colors.white} />
                </Pressable>
                <Text style={styles.title}>مسح الباركود</Text>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <MaterialIcons name="close" size={24} color={Colors.white} />
                </Pressable>
              </View>

              {/* Scan frame */}
              <View style={styles.frameArea}>
                <View style={styles.darkenTop} />
                <View style={styles.middleRow}>
                  <View style={styles.darkenSide} />
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {scanned ? (
                      <View style={styles.scannedOverlay}>
                        <MaterialIcons name="check-circle" size={48} color={Colors.success} />
                      </View>
                    ) : (
                      <View style={styles.scanLine} />
                    )}
                  </View>
                  <View style={styles.darkenSide} />
                </View>
                <View style={styles.darkenBottom} />
              </View>

              {/* Bottom bar */}
              <View style={styles.bottomBar}>
                <Text style={styles.hint}>
                  {scanned ? 'تم مسح الباركود ✓' : 'وجّه الكاميرا نحو الباركود'}
                </Text>
                {scanned ? (
                  <Pressable
                    style={styles.rescanBtn}
                    onPress={() => setScanned(false)}
                  >
                    <MaterialIcons name="refresh" size={16} color={Colors.primary} />
                    <Text style={styles.rescanText}>مسح مرة أخرى</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },

  // Permission
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  permissionTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  permissionText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 24 },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  torchBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },

  // Frame area
  frameArea: { flex: 1 },
  darkenTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow: { flexDirection: 'row', height: FRAME_SIZE },
  darkenSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  darkenBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },

  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 4 },

  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.8,
    top: '50%',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },

  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: 60,
  },
  hint: { color: Colors.white, fontSize: FontSize.md, textAlign: 'center' },
  rescanBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  rescanText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});

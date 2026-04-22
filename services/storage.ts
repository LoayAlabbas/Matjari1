// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  PRODUCTS: 'store_products',
  CUSTOMERS: 'store_customers',
  INVOICES: 'store_invoices',
  INVOICE_ITEMS: 'store_invoice_items',
  PAYMENTS: 'store_payments',
  SETTINGS: 'store_settings',
  INITIALIZED: 'store_initialized',
};

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

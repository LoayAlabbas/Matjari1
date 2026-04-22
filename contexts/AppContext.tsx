// Powered by OnSpace.AI
import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Product, Customer, Invoice, InvoiceItem, Payment, AppSettings, InvoiceType, PaymentType } from '@/types';
import * as api from '@/services/api';

interface AppContextType {
  // Data
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  settings: AppSettings;
  loading: boolean;
  syncing: boolean;

  // Products
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Customers
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Invoices
  saveInvoice: (
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ) => Promise<void>;
  editInvoice: (id: string, data: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;

  // Payments
  addPayment: (customerId: string, amount: number, note?: string) => Promise<void>;

  // Settings
  updateSettings: (s: AppSettings) => Promise<void>;

  // Helpers
  getCustomerStatement: (customerId: string) => { date: string; type: string; amount: number; balance: number; description: string; invoiceId?: string }[];
  getInvoiceItems: (invoiceId: string) => InvoiceItem[];
  nextInvoiceNumber: number;
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = { storeName: 'متجري', currency: 'د.ج', theme: 'dark', language: 'ar' };

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1001);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [p, c, inv, items, pay, num, sett] = await Promise.all([
        api.fetchProducts(),
        api.fetchCustomers(),
        api.fetchInvoices(),
        api.fetchInvoiceItems(),
        api.fetchPayments(),
        api.getNextInvoiceNumber(),
        api.fetchSettings(),
      ]);
      setProducts(p);
      setCustomers(c);
      setInvoices(inv);
      setInvoiceItems(items);
      setPayments(pay);
      setNextInvoiceNumber(num);
      setSettings(sett);
    } catch (e) {
      console.error('Load error:', e);
    }
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    await loadAll();
    setSyncing(false);
  }, [loadAll]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();

    // Polling every 30 seconds for sync
    pollRef.current = setInterval(() => {
      loadAll();
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadAll]);

  // ─── Products ────────────────────────────────────────────────────────────────
  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'createdAt'>) => {
    const newP = await api.insertProduct(p);
    setProducts(prev => [newP, ...prev]);
  }, []);

  const updateProduct = useCallback(async (id: string, p: Partial<Product>) => {
    await api.upsertProduct(id, p);
    setProducts(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await api.removeProduct(id);
    setProducts(prev => prev.filter(item => item.id !== id));
  }, []);

  // ─── Customers ────────────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    const newC = await api.insertCustomer(c);
    setCustomers(prev => [newC, ...prev]);
  }, []);

  const updateCustomer = useCallback(async (id: string, c: Partial<Customer>) => {
    await api.upsertCustomer(id, c);
    setCustomers(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await api.removeCustomer(id);
    setCustomers(prev => prev.filter(item => item.id !== id));
  }, []);

  // ─── Invoices ─────────────────────────────────────────────────────────────────
  const saveInvoice = useCallback(async (
    invoiceData: Omit<Invoice, 'id' | 'number' | 'createdAt'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ) => {
    const currentNum = await api.getNextInvoiceNumber();
    const inv = await api.insertInvoiceWithItems({ ...invoiceData, number: currentNum }, items);
    const newItems = await api.fetchInvoiceItems(inv.id);

    setInvoices(prev => [inv, ...prev]);
    setInvoiceItems(prev => [...newItems, ...prev]);
    setNextInvoiceNumber(currentNum + 1);

    // Update product quantities for sale invoices
    if (invoiceData.invoiceType === 'بيع') {
      setProducts(prev => prev.map(product => {
        const item = items.find(i => i.productId === product.id);
        if (item) return { ...product, quantity: Math.max(0, product.quantity - item.quantity) };
        return product;
      }));
      // Update remotely
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await api.upsertProduct(item.productId, { quantity: Math.max(0, product.quantity - item.quantity) });
        }
      }
    } else if (invoiceData.invoiceType === 'شراء') {
      // Purchase invoice increases stock
      setProducts(prev => prev.map(product => {
        const item = items.find(i => i.productId === product.id);
        if (item) return { ...product, quantity: product.quantity + item.quantity };
        return product;
      }));
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await api.upsertProduct(item.productId, { quantity: product.quantity + item.quantity });
        }
      }
    }

    // Update customer balance for credit sales
    if (invoiceData.paymentType === 'آجل' && invoiceData.customerId) {
      const customer = customers.find(c => c.id === invoiceData.customerId);
      if (customer) {
        const newBalance = customer.balance - invoiceData.total;
        await api.upsertCustomer(invoiceData.customerId, { balance: newBalance });
        setCustomers(prev => prev.map(c => c.id === invoiceData.customerId ? { ...c, balance: newBalance } : c));
      }
    }
  }, [products, customers]);

  const editInvoice = useCallback(async (id: string, data: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => {
    await api.updateInvoice(id, data);
    if (items) {
      await api.updateInvoiceItems(id, items);
      const newItems = await api.fetchInvoiceItems(id);
      setInvoiceItems(prev => [...prev.filter(i => i.invoiceId !== id), ...newItems]);
    }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv));
  }, []);

  const removeInvoice = useCallback(async (id: string) => {
    // Restore quantities if it was a sale invoice
    const inv = invoices.find(i => i.id === id);
    if (inv && inv.invoiceType === 'بيع') {
      const items = invoiceItems.filter(i => i.invoiceId === id);
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const restored = product.quantity + item.quantity;
          await api.upsertProduct(item.productId, { quantity: restored });
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, quantity: restored } : p));
        }
      }
      // Restore customer balance
      if (inv.paymentType === 'آجل' && inv.customerId) {
        const customer = customers.find(c => c.id === inv.customerId);
        if (customer) {
          const restoredBalance = customer.balance + inv.total;
          await api.upsertCustomer(inv.customerId, { balance: restoredBalance });
          setCustomers(prev => prev.map(c => c.id === inv.customerId ? { ...c, balance: restoredBalance } : c));
        }
      }
    }
    await api.deleteInvoice(id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    setInvoiceItems(prev => prev.filter(i => i.invoiceId !== id));
  }, [invoices, invoiceItems, products, customers]);

  // ─── Payments ─────────────────────────────────────────────────────────────────
  const addPayment = useCallback(async (customerId: string, amount: number, note?: string) => {
    const pay = await api.insertPayment({ customerId, amount, note, date: new Date().toISOString() });
    setPayments(prev => [pay, ...prev]);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const newBalance = customer.balance + amount;
      await api.upsertCustomer(customerId, { balance: newBalance });
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, balance: newBalance } : c));
    }
  }, [customers]);

  // ─── Settings ─────────────────────────────────────────────────────────────────
  const updateSettings = useCallback(async (s: AppSettings) => {
    await api.saveSettings(s);
    setSettings(s);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getCustomerStatement = useCallback((customerId: string) => {
    const custInvoices = invoices.filter(inv => inv.customerId === customerId && inv.paymentType === 'آجل');
    const custPayments = payments.filter(p => p.customerId === customerId);

    const entries: { date: string; type: string; amount: number; balance: number; description: string; invoiceId?: string }[] = [];

    custInvoices.forEach(inv => {
      entries.push({ date: inv.date, type: 'فاتورة', amount: -inv.total, balance: 0, description: `فاتورة رقم ${inv.number}`, invoiceId: inv.id });
    });

    custPayments.forEach(pay => {
      entries.push({ date: pay.date, type: 'دفعة', amount: pay.amount, balance: 0, description: pay.note || 'دفعة نقدية' });
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    entries.forEach(entry => {
      runningBalance += entry.amount;
      entry.balance = runningBalance;
    });

    return entries;
  }, [invoices, payments]);

  const getInvoiceItems = useCallback((invoiceId: string) => {
    return invoiceItems.filter(i => i.invoiceId === invoiceId);
  }, [invoiceItems]);

  return (
    <AppContext.Provider value={{
      products, customers, invoices, invoiceItems, payments, settings,
      loading, syncing,
      addProduct, updateProduct, deleteProduct,
      addCustomer, updateCustomer, deleteCustomer,
      saveInvoice, editInvoice, removeInvoice,
      addPayment,
      updateSettings,
      getCustomerStatement, getInvoiceItems,
      nextInvoiceNumber, refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

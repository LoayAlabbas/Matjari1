// Powered by OnSpace.AI
import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Product, Customer, Invoice, InvoiceItem, Payment, AppSettings, Expense, Supplier, Shift } from '@/types';
import * as api from '@/services/api';

interface AppContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  expenses: Expense[];
  suppliers: Supplier[];
  shifts: Shift[];
  openShift: Shift | null;
  settings: AppSettings;
  loading: boolean;
  syncing: boolean;
  nextInvoiceNumber: number;

  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  saveInvoice: (
    invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ) => Promise<void>;
  editInvoice: (id: string, data: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;

  addPayment: (customerId: string, amount: number, note?: string) => Promise<void>;

  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  startShift: (cashierName: string, openingCash: number, notes?: string) => Promise<void>;
  endShift: (closingCash: number, notes?: string) => Promise<void>;

  updateSettings: (s: AppSettings) => Promise<void>;

  getCustomerStatement: (customerId: string) => { date: string; type: string; amount: number; balance: number; description: string; invoiceId?: string }[];
  getInvoiceItems: (invoiceId: string) => InvoiceItem[];
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'متجري', currency: 'د.ج', theme: 'dark', language: 'ar',
  taxRate: 0, taxEnabled: false, shiftsEnabled: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1001);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [p, c, inv, items, pay, num, sett, exp, sup, sh, openSh] = await Promise.all([
        api.fetchProducts(),
        api.fetchCustomers(),
        api.fetchInvoices(),
        api.fetchInvoiceItems(),
        api.fetchPayments(),
        api.getNextInvoiceNumber(),
        api.fetchSettings(),
        api.fetchExpenses(),
        api.fetchSuppliers(),
        api.fetchShifts(),
        api.fetchOpenShift(),
      ]);
      setProducts(p);
      setCustomers(c);
      setInvoices(inv);
      setInvoiceItems(items);
      setPayments(pay);
      setNextInvoiceNumber(num);
      setSettings(sett);
      setExpenses(exp);
      setSuppliers(sup);
      setShifts(sh);
      setOpenShift(openSh);
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
    pollRef.current = setInterval(() => { loadAll(); }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

    if (invoiceData.invoiceType === 'بيع') {
      setProducts(prev => prev.map(product => {
        const item = items.find(i => i.productId === product.id);
        if (item && product.unitType === 'piece') return { ...product, quantity: Math.max(0, product.quantity - Math.floor(item.quantity)) };
        return product;
      }));
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.unitType === 'piece') {
          await api.upsertProduct(item.productId, { quantity: Math.max(0, product.quantity - Math.floor(item.quantity)) });
        }
      }
    } else if (invoiceData.invoiceType === 'شراء') {
      setProducts(prev => prev.map(product => {
        const item = items.find(i => i.productId === product.id);
        if (item && product.unitType === 'piece') return { ...product, quantity: product.quantity + Math.floor(item.quantity) };
        return product;
      }));
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.unitType === 'piece') {
          await api.upsertProduct(item.productId, { quantity: product.quantity + Math.floor(item.quantity) });
        }
      }
    } else if (invoiceData.invoiceType === 'مرتجع') {
      // Return restores quantity
      setProducts(prev => prev.map(product => {
        const item = items.find(i => i.productId === product.id);
        if (item && product.unitType === 'piece') return { ...product, quantity: product.quantity + Math.floor(item.quantity) };
        return product;
      }));
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.unitType === 'piece') {
          await api.upsertProduct(item.productId, { quantity: product.quantity + Math.floor(item.quantity) });
        }
      }
    }

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
    const inv = invoices.find(i => i.id === id);
    if (inv && inv.invoiceType === 'بيع') {
      const items = invoiceItems.filter(i => i.invoiceId === id);
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.unitType === 'piece') {
          const restored = product.quantity + Math.floor(item.quantity);
          await api.upsertProduct(item.productId, { quantity: restored });
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, quantity: restored } : p));
        }
      }
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

  // ─── Expenses ─────────────────────────────────────────────────────────────────
  const addExpense = useCallback(async (e: Omit<Expense, 'id' | 'createdAt'>) => {
    const newE = await api.insertExpense(e);
    setExpenses(prev => [newE, ...prev]);
  }, []);

  const updateExpense = useCallback(async (id: string, e: Partial<Expense>) => {
    await api.updateExpense(id, e);
    setExpenses(prev => prev.map(item => item.id === id ? { ...item, ...e } : item));
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    await api.removeExpense(id);
    setExpenses(prev => prev.filter(item => item.id !== id));
  }, []);

  // ─── Suppliers ─────────────────────────────────────────────────────────────────
  const addSupplier = useCallback(async (s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newS = await api.insertSupplier(s);
    setSuppliers(prev => [newS, ...prev]);
  }, []);

  const updateSupplier = useCallback(async (id: string, s: Partial<Supplier>) => {
    await api.upsertSupplier(id, s);
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    await api.removeSupplier(id);
    setSuppliers(prev => prev.filter(item => item.id !== id));
  }, []);

  // ─── Shifts ─────────────────────────────────────────────────────────────────
  const startShift = useCallback(async (cashierName: string, openingCash: number, notes?: string) => {
    const s = await api.openShift({
      cashierName, openingCash, openedAt: new Date().toISOString(), status: 'open', notes,
    });
    setOpenShift(s);
    setShifts(prev => [s, ...prev]);
  }, []);

  const endShift = useCallback(async (closingCash: number, notes?: string) => {
    if (!openShift) return;
    const shiftInvoices = invoices.filter(i => i.shiftId === openShift.id && i.invoiceType === 'بيع');
    const totalSales = shiftInvoices.reduce((s, i) => s + i.total, 0);
    const totalCash = shiftInvoices.filter(i => i.paymentType === 'نقداً').reduce((s, i) => s + i.total, 0);
    const totalCard = shiftInvoices.filter(i => i.paymentType === 'بطاقة').reduce((s, i) => s + i.total, 0);
    const closedAt = new Date().toISOString();
    await api.closeShift(openShift.id, { closedAt, closingCash, totalSales, totalCash, totalCard, notes });
    const updated: Shift = { ...openShift, closedAt, closingCash, totalSales, totalCash, totalCard, status: 'closed', notes };
    setShifts(prev => prev.map(s => s.id === openShift.id ? updated : s));
    setOpenShift(null);
  }, [openShift, invoices]);

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
    entries.forEach(entry => { runningBalance += entry.amount; entry.balance = runningBalance; });
    return entries;
  }, [invoices, payments]);

  const getInvoiceItems = useCallback((invoiceId: string) => {
    return invoiceItems.filter(i => i.invoiceId === invoiceId);
  }, [invoiceItems]);

  return (
    <AppContext.Provider value={{
      products, customers, invoices, invoiceItems, payments, expenses, suppliers, shifts, openShift,
      settings, loading, syncing, nextInvoiceNumber,
      addProduct, updateProduct, deleteProduct,
      addCustomer, updateCustomer, deleteCustomer,
      saveInvoice, editInvoice, removeInvoice,
      addPayment,
      addExpense, updateExpense, deleteExpense,
      addSupplier, updateSupplier, deleteSupplier,
      startShift, endShift,
      updateSettings,
      getCustomerStatement, getInvoiceItems,
      refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

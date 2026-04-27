// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';
import { Product, Customer, Invoice, InvoiceItem, Payment, AppSettings, Expense, Supplier, Shift, StockTaking, StockTakingItem } from '@/types';

const sb = () => getSupabaseClient();

// ─── Products ────────────────────────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await sb().from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProduct);
}

export async function insertProduct(p: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const { data, error } = await sb().from('products').insert([toDbProduct(p)]).select().single();
  if (error) throw error;
  return mapProduct(data);
}

export async function upsertProduct(id: string, p: Partial<Product>): Promise<void> {
  const { error } = await sb().from('products').update(toDbProductPartial(p)).eq('id', id);
  if (error) throw error;
}

export async function removeProduct(id: string): Promise<void> {
  const { error } = await sb().from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadProductImage(productId: string, uri: string, ext: string): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const path = `products/${productId}.${ext}`;
  const { error } = await sb().storage.from('product-images').upload(path, bytes, {
    contentType: `image/${ext}`, upsert: true,
  });
  if (error) throw error;
  const { data } = sb().storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await sb().from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCustomer);
}

export async function insertCustomer(c: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
  const { data, error } = await sb().from('customers').insert([toDbCustomer(c)]).select().single();
  if (error) throw error;
  return mapCustomer(data);
}

export async function upsertCustomer(id: string, c: Partial<Customer>): Promise<void> {
  const { error } = await sb().from('customers').update(toDbCustomerPartial(c)).eq('id', id);
  if (error) throw error;
}

export async function removeCustomer(id: string): Promise<void> {
  const { error } = await sb().from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await sb().from('invoices').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function fetchInvoiceItems(invoiceId?: string): Promise<InvoiceItem[]> {
  let q = sb().from('invoice_items').select('*');
  if (invoiceId) q = q.eq('invoice_id', invoiceId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapInvoiceItem);
}

export async function insertInvoiceWithItems(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
): Promise<Invoice> {
  const { data: invData, error: invErr } = await sb()
    .from('invoices')
    .insert([toDbInvoice(invoice)])
    .select()
    .single();
  if (invErr) throw invErr;
  const inv = mapInvoice(invData);
  if (items.length > 0) {
    const { error: itemErr } = await sb()
      .from('invoice_items')
      .insert(items.map(i => toDbInvoiceItem(inv.id, i)));
    if (itemErr) throw itemErr;
  }
  return inv;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
  const { error } = await sb().from('invoices').update(toDbInvoicePartial(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await sb().from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function updateInvoiceItems(invoiceId: string, items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]): Promise<void> {
  await sb().from('invoice_items').delete().eq('invoice_id', invoiceId);
  if (items.length > 0) {
    await sb().from('invoice_items').insert(items.map(i => toDbInvoiceItem(invoiceId, i)));
  }
}

export async function getNextInvoiceNumber(): Promise<number> {
  const { data } = await sb().from('invoices').select('number').order('number', { ascending: false }).limit(1);
  if (data && data.length > 0) return data[0].number + 1;
  return 1001;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await sb().from('payments').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPayment);
}

export async function insertPayment(p: Omit<Payment, 'id'>): Promise<Payment> {
  const { data, error } = await sb()
    .from('payments')
    .insert([{ customer_id: p.customerId, amount: p.amount, note: p.note, date: p.date }])
    .select()
    .single();
  if (error) throw error;
  return mapPayment(data);
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function fetchSettings(): Promise<AppSettings> {
  const { data } = await sb().from('app_settings').select('*').eq('id', 'global').single();
  if (!data) return { storeName: 'متجري', currency: 'د.ج', theme: 'dark', language: 'ar', taxRate: 0, taxEnabled: false, shiftsEnabled: false };
  return {
    storeName: data.store_name,
    currency: data.currency,
    theme: data.theme,
    language: data.language,
    taxRate: Number(data.tax_rate || 0),
    taxEnabled: data.tax_enabled || false,
    shiftsEnabled: data.shifts_enabled || false,
  };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await sb().from('app_settings').update({
    store_name: s.storeName,
    currency: s.currency,
    theme: s.theme,
    language: s.language,
    tax_rate: s.taxRate,
    tax_enabled: s.taxEnabled,
    shifts_enabled: s.shiftsEnabled,
    updated_at: new Date().toISOString(),
  }).eq('id', 'global');
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await sb().from('expenses').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapExpense);
}

export async function insertExpense(e: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const { data, error } = await sb().from('expenses').insert([{
    description: e.description, amount: e.amount, category: e.category,
    date: e.date, notes: e.notes,
  }]).select().single();
  if (error) throw error;
  return mapExpense(data);
}

export async function updateExpense(id: string, e: Partial<Expense>): Promise<void> {
  const r: any = {};
  if (e.description !== undefined) r.description = e.description;
  if (e.amount !== undefined) r.amount = e.amount;
  if (e.category !== undefined) r.category = e.category;
  if (e.date !== undefined) r.date = e.date;
  if (e.notes !== undefined) r.notes = e.notes;
  const { error } = await sb().from('expenses').update(r).eq('id', id);
  if (error) throw error;
}

export async function removeExpense(id: string): Promise<void> {
  const { error } = await sb().from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ─── Suppliers ─────────────────────────────────────────────────────────────────
export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await sb().from('suppliers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupplier);
}

export async function insertSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const { data, error } = await sb().from('suppliers').insert([{
    name: s.name, phone: s.phone, address: s.address, balance: s.balance, notes: s.notes,
  }]).select().single();
  if (error) throw error;
  return mapSupplier(data);
}

export async function upsertSupplier(id: string, s: Partial<Supplier>): Promise<void> {
  const r: any = {};
  if (s.name !== undefined) r.name = s.name;
  if (s.phone !== undefined) r.phone = s.phone;
  if (s.address !== undefined) r.address = s.address;
  if (s.balance !== undefined) r.balance = s.balance;
  if (s.notes !== undefined) r.notes = s.notes;
  const { error } = await sb().from('suppliers').update(r).eq('id', id);
  if (error) throw error;
}

export async function removeSupplier(id: string): Promise<void> {
  const { error } = await sb().from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Shifts ─────────────────────────────────────────────────────────────────
export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await sb().from('shifts').select('*').order('opened_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []).map(mapShift);
}

export async function fetchOpenShift(): Promise<Shift | null> {
  const { data, error } = await sb().from('shifts').select('*').eq('status', 'open').maybeSingle();
  if (error) throw error;
  return data ? mapShift(data) : null;
}

export async function openShift(s: Omit<Shift, 'id' | 'createdAt' | 'closedAt' | 'closingCash' | 'totalSales' | 'totalCash' | 'totalCard'>): Promise<Shift> {
  const { data, error } = await sb().from('shifts').insert([{
    cashier_name: s.cashierName,
    opened_at: s.openedAt,
    opening_cash: s.openingCash,
    status: 'open',
    notes: s.notes,
  }]).select().single();
  if (error) throw error;
  return mapShift(data);
}

export async function closeShift(id: string, updates: {
  closedAt: string; closingCash: number;
  totalSales: number; totalCash: number; totalCard: number; notes?: string;
}): Promise<void> {
  const { error } = await sb().from('shifts').update({
    closed_at: updates.closedAt,
    closing_cash: updates.closingCash,
    total_sales: updates.totalSales,
    total_cash: updates.totalCash,
    total_card: updates.totalCard,
    status: 'closed',
    notes: updates.notes,
  }).eq('id', id);
  if (error) throw error;
}

// ─── Stock Takings ─────────────────────────────────────────────────────────────
export async function fetchStockTakings(): Promise<StockTaking[]> {
  const { data, error } = await sb().from('stock_takings').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapStockTaking);
}

export async function insertStockTaking(s: Omit<StockTaking, 'id' | 'createdAt'>): Promise<StockTaking> {
  const { data, error } = await sb().from('stock_takings').insert([{
    date: s.date, notes: s.notes, status: s.status,
  }]).select().single();
  if (error) throw error;
  return mapStockTaking(data);
}

export async function insertStockTakingItems(items: Omit<StockTakingItem, 'id'>[]): Promise<void> {
  const { error } = await sb().from('stock_taking_items').insert(items.map(i => ({
    stock_taking_id: i.stockTakingId,
    product_id: i.productId,
    product_name: i.productName,
    system_qty: i.systemQty,
    actual_qty: i.actualQty,
    difference: i.actualQty - i.systemQty,
  })));
  if (error) throw error;
}

export async function completeStockTaking(id: string): Promise<void> {
  const { error } = await sb().from('stock_takings').update({ status: 'completed' }).eq('id', id);
  if (error) throw error;
}

export async function fetchStockTakingItems(stockTakingId: string): Promise<StockTakingItem[]> {
  const { data, error } = await sb().from('stock_taking_items').select('*').eq('stock_taking_id', stockTakingId);
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    stockTakingId: r.stock_taking_id,
    productId: r.product_id,
    productName: r.product_name,
    systemQty: r.system_qty,
    actualQty: r.actual_qty,
    difference: r.difference,
  }));
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapProduct(r: any): Product {
  return {
    id: r.id, name: r.name, barcode: r.barcode,
    buyPrice: Number(r.buy_price), sellPrice: Number(r.sell_price),
    wholesalePrice: Number(r.wholesale_price || 0),
    quantity: r.quantity, minQuantity: r.min_quantity,
    category: r.category, expireDate: r.expire_date,
    unitType: r.unit_type || 'piece',
    unit: r.unit || 'قطعة',
    imageUrl: r.image_url,
    createdAt: r.created_at,
  };
}

function toDbProduct(p: Omit<Product, 'id' | 'createdAt'>) {
  return {
    name: p.name, barcode: p.barcode, buy_price: p.buyPrice, sell_price: p.sellPrice,
    wholesale_price: p.wholesalePrice || 0, quantity: p.quantity, min_quantity: p.minQuantity,
    category: p.category, expire_date: p.expireDate, unit_type: p.unitType || 'piece',
    unit: p.unit || 'قطعة', image_url: p.imageUrl,
  };
}

function toDbProductPartial(p: Partial<Product>) {
  const r: any = {};
  if (p.name !== undefined) r.name = p.name;
  if (p.barcode !== undefined) r.barcode = p.barcode;
  if (p.buyPrice !== undefined) r.buy_price = p.buyPrice;
  if (p.sellPrice !== undefined) r.sell_price = p.sellPrice;
  if (p.wholesalePrice !== undefined) r.wholesale_price = p.wholesalePrice;
  if (p.quantity !== undefined) r.quantity = p.quantity;
  if (p.minQuantity !== undefined) r.min_quantity = p.minQuantity;
  if (p.category !== undefined) r.category = p.category;
  if (p.expireDate !== undefined) r.expire_date = p.expireDate;
  if (p.unitType !== undefined) r.unit_type = p.unitType;
  if (p.unit !== undefined) r.unit = p.unit;
  if (p.imageUrl !== undefined) r.image_url = p.imageUrl;
  return r;
}

function mapCustomer(r: any): Customer {
  return { id: r.id, name: r.name, phone: r.phone, address: r.address, balance: Number(r.balance), notes: r.notes, createdAt: r.created_at };
}

function toDbCustomer(c: Omit<Customer, 'id' | 'createdAt'>) {
  return { name: c.name, phone: c.phone, address: c.address, balance: c.balance, notes: c.notes };
}

function toDbCustomerPartial(c: Partial<Customer>) {
  const r: any = {};
  if (c.name !== undefined) r.name = c.name;
  if (c.phone !== undefined) r.phone = c.phone;
  if (c.address !== undefined) r.address = c.address;
  if (c.balance !== undefined) r.balance = c.balance;
  if (c.notes !== undefined) r.notes = c.notes;
  return r;
}

function mapInvoice(r: any): Invoice {
  return {
    id: r.id, number: r.number,
    date: r.date, customerId: r.customer_id,
    customerName: r.customer_name,
    subtotal: Number(r.subtotal || r.total),
    discountType: r.discount_type,
    discountValue: Number(r.discount_value || 0),
    discountAmount: Number(r.discount_amount || 0),
    taxRate: Number(r.tax_rate || 0),
    taxAmount: Number(r.tax_amount || 0),
    total: Number(r.total),
    paymentType: r.payment_type,
    secondPaymentMethod: r.second_payment_method,
    secondPaymentAmount: Number(r.second_payment_amount || 0),
    invoiceType: r.invoice_type || 'بيع',
    notes: r.notes,
    shiftId: r.shift_id,
    createdAt: r.created_at,
  };
}

function toDbInvoice(i: Omit<Invoice, 'id' | 'createdAt'>) {
  return {
    number: i.number, date: i.date, customer_id: i.customerId,
    customer_name: i.customerName,
    subtotal: i.subtotal,
    discount_type: i.discountType,
    discount_value: i.discountValue,
    discount_amount: i.discountAmount,
    tax_rate: i.taxRate,
    tax_amount: i.taxAmount,
    total: i.total,
    payment_type: i.paymentType,
    second_payment_method: i.secondPaymentMethod,
    second_payment_amount: i.secondPaymentAmount,
    invoice_type: i.invoiceType || 'بيع',
    notes: i.notes,
    shift_id: i.shiftId,
  };
}

function toDbInvoicePartial(i: Partial<Invoice>) {
  const r: any = {};
  if (i.notes !== undefined) r.notes = i.notes;
  if (i.paymentType !== undefined) r.payment_type = i.paymentType;
  if (i.total !== undefined) r.total = i.total;
  return r;
}

function mapInvoiceItem(r: any): InvoiceItem {
  return {
    id: r.id, invoiceId: r.invoice_id, productId: r.product_id,
    productName: r.product_name, quantity: r.quantity,
    price: Number(r.price), buyPrice: Number(r.buy_price),
  };
}

function toDbInvoiceItem(invoiceId: string, i: Omit<InvoiceItem, 'id' | 'invoiceId'>) {
  return { invoice_id: invoiceId, product_id: i.productId, product_name: i.productName, quantity: i.quantity, price: i.price, buy_price: i.buyPrice };
}

function mapPayment(r: any): Payment {
  return { id: r.id, customerId: r.customer_id, amount: Number(r.amount), note: r.note, date: r.date };
}

function mapExpense(r: any): Expense {
  return { id: r.id, description: r.description, amount: Number(r.amount), category: r.category, date: r.date, notes: r.notes, createdAt: r.created_at };
}

function mapSupplier(r: any): Supplier {
  return { id: r.id, name: r.name, phone: r.phone, address: r.address, balance: Number(r.balance || 0), notes: r.notes, createdAt: r.created_at };
}

function mapShift(r: any): Shift {
  return {
    id: r.id, cashierName: r.cashier_name,
    openedAt: r.opened_at, closedAt: r.closed_at,
    openingCash: Number(r.opening_cash || 0),
    closingCash: Number(r.closing_cash || 0),
    totalSales: Number(r.total_sales || 0),
    totalCash: Number(r.total_cash || 0),
    totalCard: Number(r.total_card || 0),
    status: r.status, notes: r.notes,
    createdAt: r.created_at,
  };
}

function mapStockTaking(r: any): StockTaking {
  return { id: r.id, date: r.date, notes: r.notes, status: r.status, createdAt: r.created_at };
}

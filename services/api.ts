// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';
import { Product, Customer, Invoice, InvoiceItem, Payment, AppSettings } from '@/types';

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
  if (!data) return { storeName: 'متجري', currency: 'د.ج', theme: 'dark', language: 'ar' };
  return { storeName: data.store_name, currency: data.currency, theme: data.theme, language: data.language };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await sb().from('app_settings').update({
    store_name: s.storeName, currency: s.currency, theme: s.theme, language: s.language, updated_at: new Date().toISOString()
  }).eq('id', 'global');
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapProduct(r: any): Product {
  return {
    id: r.id, name: r.name, barcode: r.barcode,
    buyPrice: Number(r.buy_price), sellPrice: Number(r.sell_price),
    quantity: r.quantity, minQuantity: r.min_quantity,
    category: r.category, expireDate: r.expire_date,
    createdAt: r.created_at,
  };
}

function toDbProduct(p: Omit<Product, 'id' | 'createdAt'>) {
  return { name: p.name, barcode: p.barcode, buy_price: p.buyPrice, sell_price: p.sellPrice, quantity: p.quantity, min_quantity: p.minQuantity, category: p.category, expire_date: p.expireDate };
}

function toDbProductPartial(p: Partial<Product>) {
  const r: any = {};
  if (p.name !== undefined) r.name = p.name;
  if (p.barcode !== undefined) r.barcode = p.barcode;
  if (p.buyPrice !== undefined) r.buy_price = p.buyPrice;
  if (p.sellPrice !== undefined) r.sell_price = p.sellPrice;
  if (p.quantity !== undefined) r.quantity = p.quantity;
  if (p.minQuantity !== undefined) r.min_quantity = p.minQuantity;
  if (p.category !== undefined) r.category = p.category;
  if (p.expireDate !== undefined) r.expire_date = p.expireDate;
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
    customerName: r.customer_name, total: Number(r.total),
    paymentType: r.payment_type, invoiceType: r.invoice_type || 'بيع',
    notes: r.notes, createdAt: r.created_at,
  };
}

function toDbInvoice(i: Omit<Invoice, 'id' | 'createdAt'>) {
  return {
    number: i.number, date: i.date, customer_id: i.customerId,
    customer_name: i.customerName, total: i.total,
    payment_type: i.paymentType, invoice_type: i.invoiceType || 'بيع', notes: i.notes,
  };
}

function toDbInvoicePartial(i: Partial<Invoice>) {
  const r: any = {};
  if (i.number !== undefined) r.number = i.number;
  if (i.date !== undefined) r.date = i.date;
  if (i.customerId !== undefined) r.customer_id = i.customerId;
  if (i.customerName !== undefined) r.customer_name = i.customerName;
  if (i.total !== undefined) r.total = i.total;
  if (i.paymentType !== undefined) r.payment_type = i.paymentType;
  if (i.invoiceType !== undefined) r.invoice_type = i.invoiceType;
  if (i.notes !== undefined) r.notes = i.notes;
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

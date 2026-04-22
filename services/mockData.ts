// Powered by OnSpace.AI
import { Product, Customer, Invoice, InvoiceItem, Payment } from '@/types';

export const mockProducts: Product[] = [
  {
    id: 'p1', name: 'أرز بسمتي 5 كغ', barcode: '6001234567890',
    buyPrice: 25000, sellPrice: 32000, quantity: 50, minQuantity: 10,
    category: 'مواد غذائية', expireDate: '2026-12-01', createdAt: new Date().toISOString(),
  },
  {
    id: 'p2', name: 'زيت نباتي 1 لتر', barcode: '6001234567891',
    buyPrice: 8000, sellPrice: 11000, quantity: 80, minQuantity: 15,
    category: 'مواد غذائية', expireDate: '2026-06-15', createdAt: new Date().toISOString(),
  },
  {
    id: 'p3', name: 'كولا 330 مل', barcode: '6001234567892',
    buyPrice: 1500, sellPrice: 2500, quantity: 200, minQuantity: 50,
    category: 'مشروبات', expireDate: '2026-08-01', createdAt: new Date().toISOString(),
  },
  {
    id: 'p4', name: 'مسحوق الغسيل OMO 2كغ', barcode: '6001234567893',
    buyPrice: 12000, sellPrice: 16000, quantity: 8, minQuantity: 10,
    category: 'منظفات', expireDate: undefined, createdAt: new Date().toISOString(),
  },
  {
    id: 'p5', name: 'شاي أحمر 100 كيس', barcode: '6001234567894',
    buyPrice: 6000, sellPrice: 9000, quantity: 30, minQuantity: 10,
    category: 'مشروبات', expireDate: '2025-05-01', createdAt: new Date().toISOString(),
  },
  {
    id: 'p6', name: 'معجون أسنان', barcode: '6001234567895',
    buyPrice: 4000, sellPrice: 6500, quantity: 25, minQuantity: 8,
    category: 'عناية شخصية', expireDate: '2027-01-01', createdAt: new Date().toISOString(),
  },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'أحمد محمد', phone: '0791234567', address: 'شارع الاستقلال', balance: -45000, notes: 'زبون منتظم', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'فاطمة الزهراء', phone: '0782345678', address: 'حي الورود', balance: 0, notes: '', createdAt: new Date().toISOString() },
  { id: 'c3', name: 'علي حسن', phone: '0773456789', address: 'شارع النصر', balance: -120000, notes: 'يدفع شهرياً', createdAt: new Date().toISOString() },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv1', number: 1001, date: new Date(Date.now() - 86400000).toISOString(),
    customerId: 'c1', customerName: 'أحمد محمد',
    total: 45000, paymentType: 'آجل', createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'inv2', number: 1002, date: new Date().toISOString(),
    customerId: undefined, customerName: undefined,
    total: 27500, paymentType: 'نقداً', createdAt: new Date().toISOString(),
  },
];

export const mockInvoiceItems: InvoiceItem[] = [
  { id: 'ii1', invoiceId: 'inv1', productId: 'p1', productName: 'أرز بسمتي 5 كغ', quantity: 1, price: 32000, buyPrice: 25000 },
  { id: 'ii2', invoiceId: 'inv1', productId: 'p3', productName: 'كولا 330 مل', quantity: 5, price: 2500, buyPrice: 1500 },
  { id: 'ii3', invoiceId: 'inv2', productId: 'p2', productName: 'زيت نباتي 1 لتر', quantity: 2, price: 11000, buyPrice: 8000 },
  { id: 'ii4', invoiceId: 'inv2', productId: 'p3', productName: 'كولا 330 مل', quantity: 2, price: 2500, buyPrice: 1500 },
  { id: 'ii5', invoiceId: 'inv2', productId: 'p6', productName: 'معجون أسنان', quantity: 1, price: 6500, buyPrice: 4000 },
];

export const mockPayments: Payment[] = [];

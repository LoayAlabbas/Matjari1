// Powered by OnSpace.AI
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  buyPrice: number;
  sellPrice: number;
  wholesalePrice: number;
  quantity: number;
  minQuantity: number;
  category: string;
  expireDate?: string;
  unitType: UnitType;
  unit: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;
  notes?: string;
  createdAt: string;
}

export type InvoiceType = 'بيع' | 'شراء' | 'مرتجع';
export type PaymentType = 'نقداً' | 'آجل' | 'بطاقة' | 'تحويل';
export type DiscountType = 'percent' | 'fixed';

export interface Invoice {
  id: string;
  number: number;
  date: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  discountType?: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentType: PaymentType;
  secondPaymentMethod?: PaymentType;
  secondPaymentAmount: number;
  invoiceType: InvoiceType;
  notes?: string;
  shiftId?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  buyPrice: number;
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  note?: string;
  date: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  buyPrice: number;
  quantity: number;
  maxQuantity: number;
  unit: string;
  unitType: UnitType;
}

export interface AccountEntry {
  id: string;
  date: string;
  type: 'فاتورة' | 'دفعة';
  amount: number;
  balance: number;
  description: string;
  invoiceId?: string;
}

export interface AppSettings {
  storeName: string;
  currency: string;
  theme: string;
  language: string;
  taxRate: number;
  taxEnabled: boolean;
  shiftsEnabled: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;
  notes?: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
}

export interface StockTaking {
  id: string;
  date: string;
  notes?: string;
  status: 'draft' | 'completed';
  createdAt: string;
}

export interface StockTakingItem {
  id: string;
  stockTakingId: string;
  productId: string;
  productName: string;
  systemQty: number;
  actualQty: number;
  difference: number;
}

export type UnitType = 'piece' | 'weight';

export const WEIGHT_UNITS = ['جرام', 'كيلو', 'مل', 'لتر', 'طن'];
export const PIECE_UNITS = ['قطعة', 'علبة', 'كرتون', 'كيس', 'حبة'];

export const EXPENSE_CATEGORIES = [
  'إيجار', 'رواتب', 'كهرباء وماء', 'صيانة', 'مواصلات', 'تسويق', 'أخرى',
];

export type UserRole = 'admin' | 'cashier';

export interface StoreUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  authUid?: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

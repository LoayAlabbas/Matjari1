// Powered by OnSpace.AI
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  category: string;
  expireDate?: string;
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

export type InvoiceType = 'بيع' | 'شراء';
export type PaymentType = 'نقداً' | 'آجل';

export interface Invoice {
  id: string;
  number: number;
  date: string;
  customerId?: string;
  customerName?: string;
  total: number;
  paymentType: PaymentType;
  invoiceType: InvoiceType;
  notes?: string;
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
}

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

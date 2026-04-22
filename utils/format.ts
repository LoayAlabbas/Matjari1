// Powered by OnSpace.AI
export function formatCurrency(amount: number, currency = 'د.ج'): string {
  return amount.toLocaleString('ar-DZ') + ' ' + currency;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function isExpiringSoon(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

export function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export const CATEGORIES = [
  'مواد غذائية',
  'مشروبات',
  'منظفات',
  'عناية شخصية',
  'أدوات منزلية',
  'أخرى',
];

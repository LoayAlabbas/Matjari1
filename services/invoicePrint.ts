// Powered by OnSpace.AI
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, InvoiceItem } from '@/types';

function formatCurrencyHTML(amount: number): string {
  return `${amount.toLocaleString('ar-DZ')} د.ج`;
}

function formatDateHTML(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateInvoiceHTML(invoice: Invoice, items: InvoiceItem[], storeName = 'متجري'): string {
  const profit = items.reduce((s, i) => s + (i.price - i.buyPrice) * i.quantity, 0);
  const profitMargin = invoice.total > 0 ? Math.round((profit / invoice.total) * 100) : 0;

  const itemsHTML = items.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-total">${formatCurrencyHTML(item.price * item.quantity)}</td>
      <td class="col-unit">${formatCurrencyHTML(item.price)}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-name">${item.productName}</td>
      <td class="col-num">${index + 1}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة #${invoice.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Cairo', 'Arial', sans-serif;
      background: #f8fafc;
      color: #1e293b;
      font-size: 14px;
      direction: rtl;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      min-height: 100vh;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 32px 40px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px;
      left: -40px;
      width: 180px;
      height: 180px;
      background: rgba(16,185,129,0.15);
      border-radius: 50%;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .store-name {
      font-size: 28px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: 1px;
    }
    .store-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .invoice-badge {
      text-align: left;
    }
    .invoice-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .invoice-num {
      font-size: 32px;
      font-weight: 900;
      color: white;
    }

    .header-meta {
      display: flex;
      gap: 32px;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 20px;
    }
    .meta-item { flex: 1; }
    .meta-label { font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .meta-value { font-size: 14px; color: #e2e8f0; font-weight: 600; }

    /* Payment badge */
    .pay-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
    }
    .pay-cash { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); }
    .pay-credit { background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }

    /* Items table */
    .items-section { padding: 32px 40px; }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
    }
    thead { background: #1e293b; }
    thead th {
      color: white;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
    }
    .row-even { background: #f8fafc; }
    .row-odd { background: white; }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .col-num { width: 40px; text-align: center; color: #94a3b8; }
    .col-name { font-weight: 600; color: #1e293b; }
    .col-qty { text-align: center; color: #475569; }
    .col-unit { text-align: center; color: #475569; }
    .col-total { text-align: left; font-weight: 700; color: #0f766e; }

    /* Summary */
    .summary-section {
      padding: 0 40px 32px;
    }
    .summary-box {
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #6b7280; font-size: 14px; }
    .summary-value { font-size: 16px; font-weight: 700; }
    .total-row {
      background: #1e293b;
    }
    .total-row .summary-label { color: #94a3b8; font-size: 15px; }
    .total-row .summary-value { color: #10b981; font-size: 22px; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 40px;
      color: #94a3b8;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .footer-brand { color: #10b981; font-weight: 700; font-size: 14px; margin-bottom: 4px; }

    @media print {
      body { background: white; }
      .page { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="store-name">${storeName}</div>
          <div class="store-subtitle">نظام إدارة المتجر</div>
        </div>
        <div class="invoice-badge">
          <div class="invoice-label">فاتورة رقم</div>
          <div class="invoice-num">#${invoice.number}</div>
        </div>
      </div>
      <div class="header-meta">
        <div class="meta-item">
          <div class="meta-label">التاريخ</div>
          <div class="meta-value">${formatDateHTML(invoice.date)}</div>
        </div>
        ${invoice.customerName ? `
        <div class="meta-item">
          <div class="meta-label">الزبون</div>
          <div class="meta-value">${invoice.customerName}</div>
        </div>
        ` : ''}
        <div class="meta-item">
          <div class="meta-label">طريقة الدفع</div>
          <div class="meta-value">
            <span class="pay-badge ${invoice.paymentType === 'نقداً' ? 'pay-cash' : 'pay-credit'}">${invoice.paymentType}</span>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-label">عدد المنتجات</div>
          <div class="meta-value">${items.length} صنف</div>
        </div>
      </div>
    </div>

    <!-- Items -->
    <div class="items-section">
      <div class="section-title">تفاصيل المنتجات</div>
      <table>
        <thead>
          <tr>
            <th class="col-total">الإجمالي</th>
            <th class="col-unit">سعر الوحدة</th>
            <th class="col-qty">الكمية</th>
            <th class="col-name">المنتج</th>
            <th class="col-num">#</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-row">
          <span class="summary-label">عدد الأصناف</span>
          <span class="summary-value" style="color:#374151">${items.length}</span>
        </div>
        ${(invoice.discountAmount ?? 0) > 0 || (invoice.taxAmount ?? 0) > 0 ? `
        <div class="summary-row">
          <span class="summary-label">المجموع الفرعي</span>
          <span class="summary-value" style="color:#374151">${formatCurrencyHTML(invoice.subtotal ?? invoice.total)}</span>
        </div>
        ` : ''}
        ${(invoice.discountAmount ?? 0) > 0 ? `
        <div class="summary-row">
          <span class="summary-label">الخصم</span>
          <span class="summary-value" style="color:#f59e0b">- ${formatCurrencyHTML(invoice.discountAmount)}</span>
        </div>
        ` : ''}
        ${(invoice.taxAmount ?? 0) > 0 ? `
        <div class="summary-row">
          <span class="summary-label">ضريبة ${invoice.taxRate}%</span>
          <span class="summary-value" style="color:#3b82f6">+ ${formatCurrencyHTML(invoice.taxAmount)}</span>
        </div>
        ` : ''}
        <div class="summary-row total-row">
          <span class="summary-label">المبلغ الإجمالي</span>
          <span class="summary-value">${formatCurrencyHTML(invoice.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">${storeName}</div>
      <div>شكراً لتعاملكم معنا — نظام متجري</div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function printInvoice(invoice: Invoice, items: InvoiceItem[], storeName = 'متجري'): Promise<void> {
  const html = generateInvoiceHTML(invoice, items, storeName);
  await Print.printAsync({ html });
}

export async function shareInvoice(invoice: Invoice, items: InvoiceItem[], storeName = 'متجري'): Promise<void> {
  const html = generateInvoiceHTML(invoice, items, storeName);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `فاتورة #${invoice.number}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

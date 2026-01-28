'use client';

import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { getInvoiceData, type InvoiceData } from '@/actions/budget-analytics';

interface InvoiceButtonProps {
  month?: Date;
  variant?: 'default' | 'compact';
  className?: string;
}

export function InvoiceButton({ month, variant = 'default', className = '' }: InvoiceButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // Fetch invoice data from server
      const invoiceData = await getInvoiceData(month);

      // Generate PDF using HTML-to-PDF approach
      const pdfContent = generateInvoiceHTML(invoiceData);

      // Create a new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfContent);
        printWindow.document.close();

        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('[InvoiceButton] Error generating PDF:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={`flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 rounded hover:border-zinc-600 transition-colors disabled:opacity-50 ${className}`}
      >
        {isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
        Invoice
      </button>
    );
  }

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className={`flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export Invoice
        </>
      )}
    </button>
  );
}

/**
 * Generates HTML content for the invoice PDF
 */
function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);

  const lineItemsHTML = data.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${formatCurrency(item.total)}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: #ffffff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
    }
    .logo-subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-size: 14px;
      color: #6b7280;
    }
    .invoice-date {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .address-block {
      width: 45%;
    }
    .address-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .address-content {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
    }
    .billing-period {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .billing-period-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .billing-period-dates {
      font-size: 14px;
      color: #1f2937;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table th:last-child,
    .items-table th:nth-child(2),
    .items-table th:nth-child(3) {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child {
      border-bottom: none;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
    }
    .total-label {
      color: #6b7280;
    }
    .total-value {
      font-weight: 500;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer-notes {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .footer-legal {
      font-size: 11px;
      color: #9ca3af;
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 8px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .invoice-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">Flowent</div>
        <div class="logo-subtitle">AI Agent Platform</div>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">Invoice<span class="badge">AI Services</span></div>
        <div class="invoice-number">${data.invoiceNumber}</div>
        <div class="invoice-date">Issued: ${data.invoiceDate}</div>
      </div>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <div class="address-label">From</div>
        <div class="address-content">
          <strong>Flowent GmbH</strong><br>
          Musterstraße 123<br>
          10115 Berlin<br>
          Germany<br>
          VAT: DE123456789
        </div>
      </div>
      <div class="address-block">
        <div class="address-label">Bill To</div>
        <div class="address-content">
          <strong>${data.customer.name}</strong><br>
          ${data.customer.email}<br>
          ${data.customer.address || 'Address on file'}
        </div>
      </div>
    </div>

    <!-- Billing Period -->
    <div class="billing-period">
      <div class="billing-period-label">Billing Period</div>
      <div class="billing-period-dates">${data.billingPeriod.start} — ${data.billingPeriod.end}</div>
    </div>

    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHTML}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-value">${formatCurrency(data.subtotal)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">VAT (0%)</span>
        <span class="total-value">${formatCurrency(data.tax)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">Total</span>
        <span class="total-value">${formatCurrency(data.total)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-notes">
        ${data.notes}
      </div>
      <div class="footer-legal">
        <strong>VAT Reverse Charge:</strong> According to Art. 196 VAT Directive,
        the recipient of the service is liable for VAT. The service provider is
        not obligated to charge VAT.<br><br>
        <strong>Payment Terms:</strong> Net 30 days. Bank details available upon request.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

import React, { useEffect } from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onPrint?: (fn: () => void) => void;
}

const exchangeRate = 290;
const convertToPKR = (value: number, currency: 'USD' | 'PKR') => currency === 'USD' ? value * exchangeRate : value;
const formatAmount = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseAmount = (value: string) => Number(value.toString().replace(/,/g, '')) || 0;

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onPrint }) => {
  const oneTimePKR = (data.items || []).reduce((acc, item) => acc + convertToPKR((item.unitPrice || 0) * (item.quantity || 1), item.currency || 'PKR'), 0);
  const oneTimeValueUSD = (data.items || []).filter(i => i.currency === 'USD').reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 1), 0);
  const oneTimeValuePKR = (data.items || []).filter(i => i.currency === 'PKR').reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 1), 0);

  const monthlyValue = parseAmount(data.monthlyAmount || '0');
  const monthlyCurrency = data.monthlyCurrency || 'PKR';
  const monthlyPKR = convertToPKR(monthlyValue, monthlyCurrency as 'USD' | 'PKR');
  const totalPKR = oneTimePKR + monthlyPKR;
  const discountPercent = parseAmount(data.discountPercent || '0');
  const discountAmountPKR = Math.max(0, totalPKR * (discountPercent / 100));
  const totalAfterDiscountPKR = totalPKR - discountAmountPKR;
  const discountLabel = `Discount (${formatAmount(discountPercent)}%)`;

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>Invoice ${data.invoiceNumber}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0f172a;
            --accent: #38bdf8;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg-light: #f8fafc;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Montserrat', sans-serif; 
            background: #f1f5f9; 
            color: var(--text-main);
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page-wrapper {
            padding: 20px;
            display: flex;
            justify-content: center;
        }

        .invoice-container {
            width: 100%;
            max-width: 850px;
            min-height: 297mm; /* Full A4 height */
            background: #ffffff;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
        }

        /* Top Accent Bar */
        .top-bar {
            height: 6px;
            background: linear-gradient(90deg, #0f172a 0%, #38bdf8 100%);
        }

        .header {
            padding: 30px 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: #ffffff;
        }

        .company-info .label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--accent);
            margin-bottom: 6px;
        }

        .company-name {
            font-size: 24px;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 8px;
        }

        .company-details {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .invoice-meta {
            text-align: right;
        }

        .invoice-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: var(--text-muted);
        }

        .invoice-number {
            font-size: 32px;
            font-weight: 800;
            color: var(--primary);
            margin: 2px 0 8px;
        }

        .date-badge {
            display: inline-block;
            background: var(--bg-light);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: var(--text-main);
            border: 1px solid var(--border);
        }

        .content-body {
            padding: 0 40px 30px;
            flex-grow: 1; /* Pushes footer down if content is short */
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }

        .info-card {
            padding: 18px;
            background: var(--bg-light);
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .info-card h3 {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted);
            margin-bottom: 12px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 6px;
        }

        .info-card .name {
            font-size: 15px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 6px;
        }

        .info-card .details {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .billing-section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .billing-item {
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 12px;
        }

        .billing-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .billing-tag {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 3px 8px;
            background: var(--primary);
            color: #fff;
            border-radius: 4px;
        }

        .billing-item.monthly .billing-tag {
            background: #10b981;
        }

        .billing-price {
            font-size: 16px;
            font-weight: 700;
            color: var(--primary);
        }

        .billing-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 4px;
        }

        .billing-desc {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed var(--border);
            font-size: 12px;
            color: var(--text-muted);
            font-style: italic;
        }

        .account-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            padding: 20px;
            background: var(--primary);
            color: #fff;
            border-radius: 12px;
            margin-bottom: 25px;
        }

        .account-item .label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
            margin-bottom: 3px;
        }

        .account-item .val {
            font-size: 13px;
            font-weight: 600;
        }

        .total-container {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .total-row {
            display: flex;
            gap: 30px;
            align-items: center;
            margin-bottom: 8px;
        }

        .total-row .label {
            font-size: 12px;
            color: var(--text-muted);
        }

        .total-row .val {
            font-size: 15px;
            font-weight: 600;
            color: var(--primary);
        }

        .total-row.grand {
            margin-top: 12px;
            padding-top: 16px;
            border-top: 2px solid var(--border);
        }

        .total-row.grand .label {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
        }

        .total-row.grand .val {
            font-size: 28px;
            font-weight: 800;
            color: #0c3721;
        }

        .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid var(--border);
            background: var(--bg-light);
            margin-top: auto; /* Pushes to bottom */
        }

        .thanks {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--primary);
        }

        @media print {
            body { background: #fff; padding: 0; margin: 0; }
            .page-wrapper { padding: 0; }
            .invoice-container { 
                box-shadow: none; 
                border-radius: 0; 
                max-width: 100%;
                min-height: unset;
                height: auto;
            }
            .header { padding: 16px 24px; }
            .company-name { font-size: 18px; }
            .invoice-number { font-size: 22px; }
            .content-body { padding: 0 24px 16px; }
            .info-card { padding: 10px; }
            .billing-item { padding: 10px; margin-bottom: 8px; }
            .account-details { padding: 12px; margin-bottom: 14px; }
            .total-container { padding: 12px; }
            .billing-section { margin-bottom: 14px; }
            .section-title { margin-bottom: 8px; }
            .grid-2 { margin-bottom: 14px; }
            @page { size: A4; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <div class="invoice-container">
            <div class="top-bar"></div>
            
            <header class="header">
                <div class="company-info">
                    <div class="label">From</div>
                    <h1 class="company-name">${data.companyName}</h1>
                    <div class="company-details">
                        ${data.companyAddress.replace(/\n/g, '<br/>')}<br/>
                        ${data.companyEmail} &nbsp;|&nbsp; ${data.companyPhone}
                    </div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-label">Invoice</div>
                    <div class="invoice-number">${data.invoiceNumber}</div>
                </div>
            </header>

            <div class="content-body">
                <div class="grid-2">
                    <div class="info-card">
                        <h3>Bill To</h3>
                        <div class="name">${data.clientName}</div>
                        <div class="details">
                            ${data.clientAddress.replace(/\n/g, '<br/>')}<br/>
                            ${data.clientEmail}<br/>
                            ${data.clientPhone}
                        </div>
                    </div>
                </div>

                <section class="billing-section">
                    <div class="section-title">Billing Details</div>
                    
                    ${(data.items || []).length > 0 ? `
                        <div class="billing-item">
                            <div class="billing-header">
                                <span class="billing-tag">One-time Services</span>
                                <span class="billing-price">Subtotal: PKR ${formatAmount(oneTimePKR)}</span>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-muted);">
                                        <th style="padding: 5px 0; width: 45%;">Description</th>
                                        <th style="padding: 5px 0; text-align: center; width: 8%;">Qty</th>
                                        <th style="padding: 5px 0; text-align: right; width: 14%;">Currency</th>
                                        <th style="padding: 5px 0; text-align: right; width: 17%;">Unit Price</th>
                                        <th style="padding: 5px 0; text-align: right; width: 16%;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(data.items || []).map(item => `
                                        <tr style="border-bottom: 1px dashed var(--border);">
                                            <td style="padding: 5px 0;">${item.description || '&mdash;'}</td>
                                            <td style="padding: 5px 0; text-align: center;">${item.quantity || 1}</td>
                                            <td style="padding: 5px 0; text-align: right; color: var(--text-muted);">${item.currency}</td>
                                            <td style="padding: 5px 0; text-align: right;">${item.currency === 'USD' ? '$' : 'PKR '}${formatAmount(item.unitPrice)}</td>
                                            <td style="padding: 5px 0; text-align: right; font-weight: 600;">${item.currency === 'USD' ? '$' : 'PKR '}${formatAmount((item.unitPrice || 0) * (item.quantity || 1))}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            <!-- Summary for USD items if any -->
                            ${oneTimeValueUSD > 0 ? `
                                <div class="billing-row" style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border);">
                                    <span>Exchange Rate</span>
                                    <span>1 USD = ${exchangeRate} PKR</span>
                                </div>
                                <div class="billing-row">
                                    <span>USD Subtotal in PKR</span>
                                    <strong>PKR ${formatAmount(oneTimeValueUSD * exchangeRate)}</strong>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${monthlyValue > 0 ? `
                        <div class="billing-item monthly">
                            <div class="billing-header">
                                <span class="billing-tag">Monthly Retainer</span>
                                <span class="billing-price">${monthlyCurrency === 'USD' ? '$' : 'PKR '}${formatAmount(monthlyValue)}</span>
                            </div>
                            <div class="billing-row">
                                <span>Billing Period</span>
                                <span>${data.billingMonth || 'Current Month'}</span>
                            </div>
                            ${monthlyCurrency === 'USD' ? `
                                <div class="billing-row">
                                    <span>Exchange Rate</span>
                                    <span>1 USD = ${exchangeRate} PKR</span>
                                </div>
                                <div class="billing-row">
                                    <span>Amount in PKR</span>
                                    <strong>PKR ${formatAmount(monthlyValue * exchangeRate)}</strong>
                                </div>
                            ` : ''}
                            ${data.monthlyDescription ? `<div class="billing-desc">${data.monthlyDescription}</div>` : ''}
                        </div>
                    ` : ''}
                </section>

                    ${data.bankName || data.accountNumber || data.accountTitle ? `
                        <section class="billing-section">
                            <div class="section-title">Account Information</div>
                            <div class="account-details">
                                <div class="account-item">
                                    <div class="label">Bank Name</div>
                                    <div class="val">${data.bankName || '—'}</div>
                                </div>
                                <div class="account-item">
                                    <div class="label">Account Title</div>
                                    <div class="val">${data.accountTitle || '—'}</div>
                                </div>
                                <div class="account-item">
                                    <div class="label">Account Number</div>
                                    <div class="val">${data.accountNumber || '—'}</div>
                                </div>
                            </div>
                        </section>
                    ` : ''}

                <div class="total-container">
                    ${oneTimePKR > 0 ? `
                        <div class="total-row">
                            <span class="label">One-time Services Total</span>
                            <span class="val">PKR ${formatAmount(oneTimePKR)}</span>
                        </div>
                    ` : ''}
                    ${monthlyPKR > 0 ? `
                        <div class="total-row">
                            <span class="label">Monthly Subtotal</span>
                            <span class="val">PKR ${formatAmount(monthlyPKR)}</span>
                        </div>
                    ` : ''}
                    ${discountAmountPKR > 0 ? `
                        <div class="total-row">
                            <span class="label">${discountLabel}</span>
                            <span class="val">- PKR ${formatAmount(discountAmountPKR)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand">
                        <span class="label">Total Amount</span>
                        <span class="val">PKR ${formatAmount(totalAfterDiscountPKR)}</span>
                    </div>
                </div>
            </div>

            <footer class="footer">
                <div class="thanks">Thank you for your business!</div>
            </footer>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
            
            window.onafterprint = function() {
                window.close();
            };
        };
    </script>
</body>
</html>`;

    const w = 1000;
    const h = 900;
    const left = (window.screen.width / 2) - (w / 2);
    const top = (window.screen.height / 2) - (h / 2);
    const printWindow = window.open('', 'InvoicePrintWindow', `width=${w},height=${h},left=${left},top=${top}`);
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  // Register handlePrint with parent so navbar Download PDF button can trigger it
  useEffect(() => {
    onPrint?.(handlePrint);
  }, [data]);

  return (
    <div className="space-y-6 sm:space-y-10 invoice-printable">
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">From</p>
            <div className="text-xl sm:text-2xl font-semibold text-slate-950">{data.companyName}</div>
            <p className="text-sm leading-7 text-slate-600">{data.companyAddress}</p>
            <p className="text-sm leading-7 text-slate-600">{data.companyEmail}</p>
            <p className="text-sm leading-7 text-slate-600">{data.companyPhone}</p>
          </div>

          <div className="min-w-full sm:min-w-[240px] rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">Invoice</p>
            <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold text-slate-950">{data.invoiceNumber}</div>
          </div>
        </div>

        <div className="mt-8 rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">Bill To</p>
          <div className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-slate-950">{data.clientName}</div>
          <p className="mt-3 text-sm leading-7 text-slate-600">{data.clientAddress}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{data.clientEmail}</p>
          <p className="mt-1 text-sm leading-7 text-slate-600">{data.clientPhone}</p>
        </div>

        <div className="mt-10 rounded-[18px] border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Billing</p>

          {(data.items || []).length > 0 && (
            <div className="mt-6 rounded-[18px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
              <p className="font-semibold text-slate-950 mb-4">One-time Services</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="pb-3 font-semibold w-2/5">Description</th>
                      <th className="pb-3 font-semibold text-center">Qty</th>
                      <th className="pb-3 font-semibold text-center">Currency</th>
                      <th className="pb-3 font-semibold text-right">Unit Price</th>
                      <th className="pb-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-4 text-slate-700">{item.description || '—'}</td>
                        <td className="py-3 text-center text-slate-600">{item.quantity || 1}</td>
                        <td className="py-3 text-center text-slate-500 font-medium">{item.currency}</td>
                        <td className="py-3 text-right text-slate-600">
                          {item.currency === 'USD' ? '$' : 'PKR '}{formatAmount(item.unitPrice)}
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-900">
                          {item.currency === 'USD' ? '$' : 'PKR '}{formatAmount((item.unitPrice || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-end gap-2 text-right">
                <div className="space-y-1">
                  {oneTimeValueUSD > 0 && (
                    <p className="text-xs text-slate-500 italic">
                      USD Subtotal: ${formatAmount(oneTimeValueUSD)} ≈ PKR {formatAmount(oneTimeValueUSD * exchangeRate)}
                    </p>
                  )}
                  {oneTimeValuePKR > 0 && (
                    <p className="text-xs text-slate-500 italic">
                      PKR Subtotal: PKR {formatAmount(oneTimeValuePKR)}
                    </p>
                  )}
                </div>
                <p className="font-bold text-slate-950 text-base">
                  One-time Total: <span className="text-slate-900">PKR {formatAmount(oneTimePKR)}</span>
                </p>
              </div>
            </div>
          )}

          {monthlyValue > 0 && (
            <div className="mt-6 rounded-[18px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
              <p className="font-semibold text-slate-950">Monthly Retainer</p>
              <p className="mt-3">
                <span className="font-semibold text-slate-900">Amount:</span>{' '}
                {monthlyCurrency === 'USD' ? '$' : 'PKR '}{formatAmount(monthlyValue)}
              </p>
              {monthlyCurrency === 'USD' && (
                <p className="mt-2 font-semibold text-slate-900">PKR {formatAmount(monthlyValue * exchangeRate)}</p>
              )}
              <p className="mt-3 text-sm leading-7 text-slate-600">{data.billingMonth || '—'}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{data.monthlyDescription || '—'}</p>
            </div>
          )}
        </div>

        {(data.bankName || data.accountNumber || data.accountTitle) && (
          <div className="mt-8 rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">Account Details</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.25em] text-slate-500">Bank Name</p>
                <p className="mt-1 sm:mt-2 text-sm leading-7 text-slate-600">{data.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.25em] text-slate-500">Account Title</p>
                <p className="mt-1 sm:mt-2 text-sm leading-7 text-slate-600">{data.accountTitle || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.25em] text-slate-500">Account Number</p>
                <p className="mt-1 sm:mt-2 text-sm leading-7 text-slate-600">{data.accountNumber || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-[26px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">Invoice Total</p>
          <div className="mt-6 space-y-4 rounded-[18px] bg-slate-50 p-6 border border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm uppercase tracking-[0.24em] text-slate-600">Grand Total</span>
              <span className="text-3xl font-bold" style={{ color: '#0c3721' }}>PKR {formatAmount(totalAfterDiscountPKR)}</span>
            </div>
            {discountAmountPKR > 0 && (
              <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                <span>{discountLabel}</span>
                <span>- PKR {formatAmount(discountAmountPKR)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto rounded-[14px] bg-slate-950 px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-black"
          >
            Download / Print
          </button>
        </div>
      </div>
    </div>
  );
};

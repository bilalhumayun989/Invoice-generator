import React, { useEffect } from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onPrint?: (fn: () => void) => void;
}

const exchangeRate = 280;
const convertToPKR = (value: number, currency: 'USD' | 'PKR') => currency === 'USD' ? value * exchangeRate : value;
const formatAmount = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseAmount = (value: string) => Number(value.toString().replace(/,/g, '')) || 0;

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onPrint }) => {
  const oneTimePKR = (data.items || []).reduce((acc, item) => acc + convertToPKR((item.unitPrice || 0) * (item.quantity || 1), item.currency || 'PKR'), 0);

  const monthlyValue = parseAmount(data.monthlyAmount || '0');
  const monthlyCurrency = data.monthlyCurrency || 'PKR';
  const monthlyPKR = convertToPKR(monthlyValue, monthlyCurrency as 'USD' | 'PKR');
  const totalPKR = oneTimePKR + monthlyPKR;
  const subtotalPKR = totalPKR;
  const discountCurrency = data.discountCurrency === 'USD' ? 'USD' : 'PKR';
  const discountAmount = parseAmount(data.discountAmount || '0');

  const discountAmountPKR = discountCurrency === 'USD'
    ? Math.max(0, discountAmount * exchangeRate)
    : Math.max(0, discountAmount);


  const totalAfterDiscountPKR = subtotalPKR - discountAmountPKR;
  const advanceAmount = parseAmount(data.advanceAmount || '0');
  const advanceAmountPKR = convertToPKR(advanceAmount, data.advanceCurrency);

  const activeMilestones = data.isMilestonePayment ? (data.milestones || []) : [];
  const milestonePayments = activeMilestones.map(m => ({
    ...m,
    amountPKR: convertToPKR(parseAmount(m.amount), m.currency)
  }));

  const totalPaidPKR = (data.advanceStatus === 'Paid' ? advanceAmountPKR : 0) +
    milestonePayments.filter(m => m.status === 'Paid').reduce((acc, m) => acc + m.amountPKR, 0);

  // Outstanding Balance calculation
  const remainingBalancePKR = totalAfterDiscountPKR - totalPaidPKR;

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        :root {
            --primary: #0f172a;
            --accent: #38bdf8;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg-light: #f8fafc;
            --success: #10b981;
            --pending: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
            background: #f1f5f9; 
            color: var(--text-main);
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page-wrapper {
    padding: 0;
    display: flex;
    justify-content: center;
}

        .invoice-container {
            width: 100%;
            max-width: 850px;
            min-height: 297mm;
            background: #ffffff;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            border-radius: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .top-bar { height: 6px; background: linear-gradient(90deg, #0f172a 0%, #38bdf8 100%); }

        .header { padding: 30px 40px; display: flex; justify-content: space-between; align-items: flex-start; }

        .company-info .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 6px; }
        .company-name { font-size: 24px; font-weight: 800; color: var(--primary); margin-bottom: 8px; }
        .company-details { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

        .invoice-meta { text-align: right; }
        .invoice-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); }
        .invoice-number { font-size: 32px; font-weight: 800; color: var(--primary); margin: 2px 0 8px; }

        .content-body { padding: 0 40px 30px; flex-grow: 1; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }

        .info-card { padding: 18px; background: var(--bg-light); border-radius: 12px; border: 1px solid var(--border); }
        .info-card h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .info-card .name { font-size: 15px; font-weight: 700; color: var(--primary); margin-bottom: 6px; }
        .info-card .details { font-size: 12px; color: var(--text-muted); }

        .section-title { font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .section-title::after { content: ""; flex: 1; height: 1px; background: var(--border); }

        .billing-item { background: #ffffff; border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .billing-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .billing-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; background: var(--primary); color: #fff; border-radius: 4px; }
        .billing-price { font-size: 16px; font-weight: 700; color: var(--primary); }

        .schedule-card { 
            background: var(--bg-light); 
            border: 1px solid var(--border); 
            border-radius: 12px; 
            padding: 20px; 
            margin-top: 20px;
        }

        .milestone-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px dashed var(--border);
        }
        .milestone-row:last-child { border-bottom: none; }

        .m-info { display: flex; flex-direction: column; gap: 2px; }
        .m-title { font-size: 13px; font-weight: 700; color: var(--primary); }
        .m-date { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
        
        .m-status { 
            font-size: 9px; 
            font-weight: 700; 
            text-transform: uppercase; 
            padding: 2px 8px; 
            border-radius: 4px;
            display: inline-block;
            margin-top: 4px;
        }
        .m-status.paid { background: #d1fae5; color: #065f46; }
        .m-status.pending { background: #fef3c7; color: #92400e; }
        .m-status.overdue { background: #fee2e2; color: #991b1b; }

        .m-amount { font-size: 14px; font-weight: 700; color: var(--primary); text-align: right; }

        .total-container { background: var(--bg-light); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: flex-end; margin-top: 20px; }
        .total-row { display: flex; gap: 30px; align-items: center; margin-bottom: 8px; }
        .total-row .label { font-size: 12px; color: var(--text-muted); }
        .total-row .val { font-size: 15px; font-weight: 600; color: var(--primary); }
        .total-row.grand { margin-top: 12px; padding-top: 16px; border-top: 2px solid var(--border); }
        .total-row.grand .label { font-size: 14px; font-weight: 700; color: var(--primary); }
        .total-row.grand .val { font-size: 20px; font-weight: 800; }

        .total-row.balance {
            margin-top: 12px;
            padding: 16px;
            background: #0f172a;
            color: #fff;
            border-radius: 8px;
            width: 100%;
            justify-content: space-between;
        }
        .total-row.balance .label { color: #94a3b8; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
        .total-row.balance .val { font-size: 24px; font-weight: 800; color: #fff; }

        .footer { text-align: center; padding: 20px 0; border-top: 1px solid var(--border); background: var(--bg-light); margin-top: auto; }
        .thanks { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); }

        @media print {
            body { background: #fff; }
            .invoice-container { box-shadow: none; border-radius: 0; max-width: 100%; }
            .print-hide { display: none !important; }
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
                        ${data.companyAddress.replace(/\n/g, '<br/>')}
                        ${(data.companyEmail || data.companyPhone) ? `<br/>${data.companyEmail}${data.companyEmail && data.companyPhone ? ' &nbsp;|&nbsp; ' : ''}${data.companyPhone}` : ''}
                    </div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-label">Invoice</div>
                    <div class="invoice-number">${data.invoiceNumber}</div>
                    <div class="invoice-label" style="margin-top: 10px; font-size: 9px;">Paid On: ${data.issueDate}</div>
                </div>
            </header>

            <div class="content-body">
                <div class="grid-2">
                    <div class="info-card">
                        <h3>Bill To</h3>
                        <div class="name">${data.clientName}</div>
                        <div class="details">
                            ${data.clientAddress.replace(/\n/g, '<br/>')}
                            ${data.clientEmail ? `<br/>${data.clientEmail}` : ''}
                            ${data.clientPhone ? `<br/>${data.clientPhone}` : ''}
                        </div>
                    </div>
                    ${(data.bankName || data.accountTitle || data.accountNumber) ? `
                    <div class="info-card">
                        <h3>Banking Details</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                            ${data.bankName ? `
                            <div>
                                <div style="font-size: 9px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Bank</div>
                                <div style="font-weight: 600; color: var(--primary);">${data.bankName}</div>
                            </div>
                            ` : ''}
                            ${data.accountTitle ? `
                            <div>
                                <div style="font-size: 9px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Title</div>
                                <div style="font-weight: 600; color: var(--primary);">${data.accountTitle}</div>
                            </div>
                            ` : ''}
                            ${data.accountNumber ? `
                            <div style="grid-column: span 2;">
                                <div style="font-size: 9px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Account / IBAN</div>
                                <div style="font-weight: 700; font-family: monospace; background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${data.accountNumber}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${(data.items.length > 0 || monthlyPKR > 0) ? `
                <section class="billing-section">
                    <div class="section-title">Project Scope</div>
                    <div class="billing-item">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-muted);">
                                    <th style="padding: 8px 0;">Description</th>
                                    <th style="padding: 8px 0; text-align: center;">Qty</th>
                                    <th style="padding: 8px 0; text-align: right;">Price</th>
                                    <th style="padding: 8px 0; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.items.map(item => `
                                    <tr style="border-bottom: 1px dashed var(--border);">
                                        <td style="padding: 10px 0;">${item.description}</td>
                                        <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
                                        <td style="padding: 10px 0; text-align: right;">${item.currency === 'USD' ? '$' : 'PKR '}${formatAmount(item.unitPrice)}</td>
                                        <td style="padding: 10px 0; text-align: right; font-weight: 600;">PKR ${formatAmount(convertToPKR(item.unitPrice * item.quantity, item.currency))}</td>
                                    </tr>
                                `).join('')}
                                ${monthlyPKR > 0 ? `
                                    <tr style="border-bottom: 1px dashed var(--border);">
                                        <td style="padding: 10px 0;">Monthly Retainer Fee</td>
                                        <td style="padding: 10px 0; text-align: center;">1</td>
                                        <td style="padding: 10px 0; text-align: right;">${data.monthlyCurrency === 'USD' ? '$' : 'PKR '}${formatAmount(monthlyValue)}</td>
                                        <td style="padding: 10px 0; text-align: right; font-weight: 600;">PKR ${formatAmount(monthlyPKR)}</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </section>
                ` : ''}

                ${(data.isMilestonePayment || advanceAmountPKR > 0) ? `
                <section class="billing-section">
                    <div class="section-title">Payment Schedule</div>
                    <div class="schedule-card">
                        ${advanceAmountPKR > 0 ? `
                        <div class="milestone-row">
                            <div class="m-info">
                                <span class="m-title">Advance Payment</span>
                                <span class="m-date">${data.advanceDate || 'Immediate'}</span>
                                <span class="m-status ${data.advanceStatus.toLowerCase()}">${data.advanceStatus}</span>
                            </div>
                            <div class="m-amount">PKR ${formatAmount(advanceAmountPKR)}</div>
                        </div>
                        ` : ''}
                        ${data.isMilestonePayment ? milestonePayments.map(m => {
      const isOverdue = m.status === 'Pending' && m.dueDate && new Date(m.dueDate) < new Date();
      return `
                                <div class="milestone-row">
                                    <div class="m-info">
                                        <span class="m-title" style="${isOverdue ? 'color: #991b1b;' : ''}">${m.title}</span>
                                        <span class="m-date" style="${isOverdue ? 'color: #ef4444;' : ''}">Due: ${m.dueDate || 'TBD'}</span>
                                        <span class="m-status ${isOverdue ? 'overdue' : m.status.toLowerCase()}">${isOverdue ? 'Overdue' : m.status}</span>
                                    </div>
                                    <div class="m-amount">PKR ${formatAmount(m.amountPKR)}</div>
                                </div>
                            `;
    }).join('') : ''}
                    </div>
                </section>
                ` : ''}

                <div class="total-container">
                    <div class="total-row">
                        <span class="label">Gross Subtotal</span>
                        <span class="val">PKR ${formatAmount(subtotalPKR)}</span>
                    </div>
                    ${discountAmountPKR > 0 ? `
                    <div class="total-row" style="color: #ef4444;">
                        <span class="label" style="color: #ef4444;">Discount</span>
                        <span class="val">- PKR ${formatAmount(discountAmountPKR)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row" style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
                        <span class="label" style="font-weight: 700; color: var(--primary);">Net Total</span>
                        <span class="val" style="font-weight: 800; color: var(--primary);">PKR ${formatAmount(totalAfterDiscountPKR)}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Total Paid to Date</span>
                        <span class="val" style="color: var(--success);">PKR ${formatAmount(totalPaidPKR)}</span>
                    </div>
                    <div class="total-row balance">
                        <span class="label">Outstanding Balance</span>
                        <span class="val">PKR ${formatAmount(remainingBalancePKR)}</span>
                    </div>
                </div>
            </div>

            <footer class="footer">
                <div class="thanks">Thank you for your business!</div>
            </footer>
        </div>
    </div>

    <!-- Print Control Bar -->
    <div class="print-hide" style="position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100;">
        <div style="color: white; font-family: system-ui, sans-serif; font-weight: 600;">Invoice Preview</div>
        <button onclick="window.print()" style="background: white; color: #0f172a; border: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: system-ui, sans-serif;">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print / Save as PDF
        </button>
    </div>
    <!-- Add padding to top to avoid overlap with the fixed bar -->
    <style>
        @media screen {
            .page-wrapper {
                margin-top: 80px !important;
            }
        }
    </style>
</body>
</html>`;

    const printWindow = window.open('', 'InvoicePrintWindow', 'width=1000,height=900');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  useEffect(() => {
    onPrint?.(handlePrint);
  }, [data]);

  return (
    <div className="space-y-10 invoice-printable">
      <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-900 via-blue-500 to-slate-900"></div>

        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.4em] text-blue-500 font-bold">From</p>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">{data.companyName}</h2>
            <div className="space-y-1 text-sm text-slate-600 leading-relaxed">
              <p className="whitespace-pre-line">{data.companyAddress}</p>
              {data.companyEmail && <p className="font-medium text-slate-900">{data.companyEmail}</p>}
              {data.companyPhone && <p>{data.companyPhone}</p>}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 min-w-[240px]">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-bold">Invoice Reference</p>
            <p className="text-4xl font-black text-slate-950 mt-2">{data.invoiceNumber}</p>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Paid On</span>
              <span className="text-sm font-semibold text-slate-900">{data.issueDate}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-bold mb-4">Client Information</p>
            <h3 className="text-xl font-bold text-slate-900">{data.clientName}</h3>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p className="whitespace-pre-line">{data.clientAddress}</p>
              {data.clientEmail && <p className="mt-2 text-slate-900 font-medium">{data.clientEmail}</p>}
              {data.clientPhone && <p>{data.clientPhone}</p>}
            </div>
          </div>

          {(data.bankName || data.accountTitle || data.accountNumber) && (
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-bold mb-4">Banking Details</p>
              <div className="grid grid-cols-2 gap-4">
                {data.bankName && (
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Bank</p>
                    <p className="text-sm font-semibold text-slate-800">{data.bankName}</p>
                  </div>
                )}
                {data.accountTitle && (
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Title</p>
                    <p className="text-sm font-semibold text-slate-800">{data.accountTitle}</p>
                  </div>
                )}
                {data.accountNumber && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Account / IBAN</p>
                    <p className="text-sm font-bold text-slate-900 tracking-wider font-mono bg-white p-2 rounded border border-slate-100 mt-1 uppercase">{data.accountNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {data.isMilestonePayment ? (
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-6">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-bold whitespace-nowrap">Payment Schedule & Progress</p>
              <div className="h-[1px] w-full bg-slate-100"></div>
            </div>

            <div className="grid gap-4">
              {advanceAmountPKR > 0 && (
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${data.advanceStatus === 'Paid' ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${data.advanceStatus === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      {data.advanceStatus === 'Paid' ? '✓' : '●'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Advance Payment</p>
                      <p className="text-xs text-slate-500 font-medium">Date: {data.advanceDate || 'Immediate'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-950">PKR {formatAmount(advanceAmountPKR)}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${data.advanceStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {data.advanceStatus}
                    </span>
                  </div>
                </div>
              )}

              {milestonePayments.map((milestone) => {
                const isOverdue = milestone.status === 'Pending' && milestone.dueDate && new Date(milestone.dueDate) < new Date();
                return (
                  <div key={milestone.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${milestone.status === 'Paid' ? 'bg-green-50/30 border-green-100' : isOverdue ? 'bg-red-50/50 border-red-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${milestone.status === 'Paid' ? 'bg-green-100 text-green-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        {milestone.status === 'Paid' ? '✓' : isOverdue ? '!' : '○'}
                      </div>
                      <div>
                        <p className={`font-bold ${isOverdue ? 'text-red-900' : 'text-slate-900'}`}>{milestone.title}</p>
                        <p className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>Due: {milestone.dueDate || 'TBD'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-950">PKR {formatAmount(milestone.amountPKR)}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${milestone.status === 'Paid' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isOverdue ? 'Overdue' : milestone.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          advanceAmountPKR > 0 && (
            <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${data.advanceStatus === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  {data.advanceStatus === 'Paid' ? '✓' : '●'}
                </div>
                <span className="text-sm font-bold text-slate-900">Advance Payment Deducted</span>
              </div>
              <span className="font-bold text-slate-950">- PKR {formatAmount(advanceAmountPKR)}</span>
            </div>
          )
        )}

        <div className="mt-12 p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>

          <div className="grid gap-6 sm:grid-cols-4 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Subtotal</p>
              <p className="text-xl font-bold">PKR {formatAmount(subtotalPKR)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Discount</p>
              <p className="text-xl font-bold text-red-400">- PKR {formatAmount(discountAmountPKR)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Paid</p>
              <p className="text-xl font-bold text-green-400">PKR {formatAmount(totalPaidPKR)}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">Balance Due</p>
              <p className="text-4xl font-black text-white">PKR {formatAmount(remainingBalancePKR)}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center print:hidden">
          <button
            onClick={handlePrint}
            className="group relative flex items-center gap-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-black hover:scale-[1.02] active:scale-95 shadow-xl"
          >
            <span>Generate Official PDF</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

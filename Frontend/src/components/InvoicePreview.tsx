import React, { useEffect } from 'react';
import { getInvoiceProjectDomains, type InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onPrint?: (fn: () => void) => void;
}

const exchangeRate = 280;
const convertToPKR = (value: number, currency: 'USD' | 'PKR') => currency === 'USD' ? value * exchangeRate : value;
const formatAmount = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseAmount = (value: string) => Number(value.toString().replace(/,/g, '')) || 0;


export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onPrint }) => {
  const projectDomains = getInvoiceProjectDomains(data);
  const oneTimePKR = (data.items || []).reduce((acc, item) => acc + convertToPKR((item.unitPrice || 0) * (item.quantity || 1), item.currency || 'PKR'), 0);

  const monthlyValue = parseAmount(data.monthlyAmount || '0');
  const monthlyCurrency = data.monthlyCurrency || 'PKR';
  const monthlyPKR = convertToPKR(monthlyValue, monthlyCurrency as 'USD' | 'PKR');
  const milestoneTotalPKR = data.isMilestonePayment ? (data.milestones || []).reduce((sum, milestone) => sum + convertToPKR(parseAmount(milestone.amount), milestone.currency), 0) : 0;
  const totalPKR = oneTimePKR + monthlyPKR + milestoneTotalPKR;
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

  const servicePaidPKR = (data.items || []).filter(item => item.isPaid).reduce((sum, item) => sum + convertToPKR((item.unitPrice || 0) * (item.quantity || 1), item.currency || 'PKR'), 0);
  const totalPaidPKR = servicePaidPKR + (data.advanceStatus === 'Paid' ? advanceAmountPKR : 0) +
    milestonePayments.filter(m => m.status === 'Paid').reduce((acc, m) => acc + m.amountPKR, 0);

  const remainingBalancePKR = data.status === 'Paid'
    ? 0
    : Math.max(0, totalAfterDiscountPKR - totalPaidPKR);
  const paidToDatePKR = data.status === 'Paid' ? totalAfterDiscountPKR : totalPaidPKR;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        :root { --accent: #b65d0d; --text: #111111; --muted: #737373; --line: #d7d7d7; --soft: #f5f5f5; --paid: #28734a; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; color: var(--text); background: #fff; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-wrapper { width: 100%; display: flex; justify-content: center; padding: 0; }
        .invoice-container { width: 100%; max-width: 1220px; min-height: 297mm; background: #fff; padding-bottom: 34px; display: flex; flex-direction: column; }
        .top-bar { display: none; }
        .header { padding: 95px 7.2% 34px; display: flex; justify-content: space-between; align-items: flex-start; min-height: 250px; }
        .brand-mark { width: 145px; height: 145px; flex: 0 0 145px; border-radius: 50%; background: #a95100; color: #fff; display: grid; place-items: center; font-size: 112px; line-height: 1; font-weight: 800; }
        .company-info { text-align: right; max-width: 48%; }
        .company-info .label { display: none; }
        .company-name { color: var(--accent); font-size: 28px; font-weight: 700; margin: 0 0 12px; }
        .company-details { color: var(--muted); font-size: 18px; line-height: 1.55; }
        .invoice-heading { display: flex; align-items: center; gap: 35px; margin: 0 7.2% 42px; color: var(--accent); font-size: 42px; line-height: 1.2; font-weight: 400; white-space: nowrap; }
        .invoice-heading::before, .invoice-heading::after { content: ''; height: 1px; flex: 1; background: #e1dedb; }
        .content-body { padding: 0 7.2% 28px; flex-grow: 1; }
        .intro-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 55px; margin-bottom: 42px; align-items: start; }
        .client-block { padding-top: 5px; }
        .block-title { font-size: 23px; font-weight: 400; margin-bottom: 2px; }
        .client-name { color: var(--accent); font-size: 22px; line-height: 1.35; font-weight: 700; }
        .client-details, .project-details { color: var(--muted); font-size: 17px; line-height: 1.65; }
        .project-block { margin-top: 34px; }
        .project-block .block-title { margin-bottom: 3px; }
        .meta-table { border-collapse: collapse; width: 100%; font-size: 15px; }
        .meta-table td { border: 1px solid var(--line); padding: 12px 16px; }
        .meta-table td:first-child { color: #fff; background: #b9610b; width: 48%; }
        .meta-table td:last-child { color: #111; background: #fff; }
        .billing-section { margin-top: 20px; }
        .section-title { font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: .08em; }
        .billing-item { background: #fff; margin-bottom: 12px; }
        .service-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 15px; }
        .service-table th, .service-table td { border: 1px solid var(--line); }
        .service-table th { padding: 13px 16px; color: #fff; background: #b9610b; text-align: left; font-weight: 500; }
        .service-table td { padding: 24px 20px; vertical-align: top; background: #f5f5f5; }
        .service-table .index-col { width: 5%; text-align: center; }
        .service-table .description-col { width: 58%; }
        .service-table .qty-col, .service-table .rate-col, .service-table .amount-col { width: 12.33%; text-align: right; white-space: nowrap; }
        .service-table th.index-col { text-align: center; }
        .service-note { display: block; margin-top: 3px; color: var(--muted); font-size: 13px; line-height: 1.4; }
        .schedule-card { background: #fff; border: 1px solid var(--line); padding: 12px 20px; margin-top: 14px; }
        .milestone-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }
        .milestone-row:last-child { border-bottom: none; }
        .m-info { display: flex; flex-direction: column; gap: 2px; }
        .m-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .m-date { font-size: 12px; color: var(--muted); }
        .m-status { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; display: inline-block; margin-top: 3px; width: fit-content; }
        .m-status.paid { color: var(--paid); background: #e5f2e9; }
        .m-status.pending { color: #8a5800; background: #fff3d7; }
        .m-status.overdue { color: #991b1b; background: #fee2e2; }
        .m-amount { font-size: 14px; font-weight: 700; text-align: right; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; margin-top: 30px; }
        .terms { padding-top: 12px; }
        .terms h3 { font-size: 18px; font-weight: 400; margin-bottom: 4px; }
        .terms p { max-width: 420px; color: var(--muted); font-size: 14px; line-height: 1.45; }
        .thanks { color: var(--muted); font-size: 14px; margin-bottom: 26px; }
        .total-container { width: 100%; display: flex; flex-direction: column; align-items: stretch; }
        .total-row { display: flex; justify-content: space-between; gap: 24px; align-items: center; padding: 10px 16px; }
        .total-row .label { font-size: 14px; color: var(--text); }
        .total-row .val { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; }
        .total-row.grand { margin-top: 7px; padding-top: 16px; border-top: 1px solid var(--line); }
        .total-row.grand .label, .total-row.grand .val { font-size: 19px; font-weight: 700; }
        .total-row.balance { margin-top: 14px; padding: 13px 18px; color: #fff; background: #b9610b; border: 1px solid var(--line); }
        .total-row.balance .label, .total-row.balance .val { color: #fff; font-size: 17px; font-weight: 700; }
        .footer { margin: auto 7.2% 0; padding-top: 28px; border-top: 1px solid var(--line); text-align: center; }
        .footer .thanks { margin: 0; }
        @media (max-width: 720px) { .header { padding: 36px 6% 24px; min-height: 0; gap: 20px; } .brand-mark { width: 72px; height: 72px; flex-basis: 72px; font-size: 56px; } .company-info { max-width: 65%; } .company-name { font-size: 18px; } .company-details { font-size: 12px; } .invoice-heading { margin: 0 6% 28px; font-size: 24px; gap: 12px; } .content-body { padding: 0 6% 24px; } .intro-grid { grid-template-columns: 1fr; gap: 24px; } .meta-table { font-size: 12px; } .meta-table td { padding: 9px 10px; } .client-details, .project-details { font-size: 14px; } .service-table { font-size: 11px; } .service-table th, .service-table td { padding: 10px 7px; } .service-table .qty-col { width: 9%; } .service-table .rate-col, .service-table .amount-col { width: 17%; } .service-table .description-col { width: 52%; } .summary-grid { grid-template-columns: 1fr; gap: 16px; } }
        @media print { body { background: #fff; } .invoice-container { max-width: 100%; min-height: 297mm; } @page { size: A4; margin: 0; } }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <div class="invoice-container">
            <header class="header">
                <div class="brand-mark">B</div>
                <div class="company-info">
                    <div class="label">From</div>
                    <h1 class="company-name">${data.companyName || 'BROSHTECH'}</h1>
                    <div class="company-details">
                        Account title: ${data.accountTitle || data.companyName || ''}<br/>
                        Account No: ${data.companyAccountNumber || '04100115601102'}<br/>
                        IBAN: ${data.accountNumber || 'PK12MEZN0004100115601102'}<br/>
                        ${data.companyAddress || 'SARGHODHA RD-FSD'}
                    </div>
                </div>
            </header>
            <div class="invoice-heading">INVOICE</div>
            <div class="content-body">
                <div class="intro-grid">
                    <div class="client-block">
                        <div class="block-title">Bill To</div>
                        <div class="client-name">${data.clientName}</div>
                        <div class="client-details">
                            ${data.clientAddress.replace(/\n/g, '<br/>')}
                            ${data.clientEmail ? `<br/>${data.clientEmail}` : ''}
                            ${data.clientPhone ? `<br/>${data.clientPhone}` : ''}
                        </div>
                        ${projectDomains.length ? `
                        <div class="project-block">
                            <div class="block-title">Project Domains</div>
                            ${projectDomains.map(domain => `<div class="project-details" style="margin-bottom: 8px;"><strong>Domain:</strong> ${domain.domain}<br/>${domain.renewalDate ? `<strong>Renewal due:</strong> ${domain.renewalDate}<br/>` : ''}${domain.renewalPrice ? `<strong>Renewal price:</strong> ${domain.renewalCurrency === 'USD' ? '$' : 'PKR '}${formatAmount(parseAmount(domain.renewalPrice))}<br/>` : ''}${domain.renewalPaidThisYear ? `<strong>Renewal status:</strong> Paid${domain.renewalPaidDate ? ` on ${domain.renewalPaidDate}` : ''}` : ''}</div>`).join('')}
                        </div>` : ''}
                    </div>
                    <table class="meta-table"><tbody>
                        <tr><td>Invoice #</td><td>${data.invoiceNumber}</td></tr>
                        <tr><td>Invoice Date</td><td>${data.issueDate}</td></tr>
                        <tr><td>Terms</td><td>Please follow each service, advance, and milestone due date.</td></tr>
                        <tr><td>Final Due Date</td><td>${data.dueDate || 'No pending due date'}</td></tr>
                        
                    </tbody></table>
                </div>
                ${(data.items.length > 0 || monthlyPKR > 0) ? `
                <section class="billing-section">
                    <div class="billing-item">
                        <table class="service-table">
                            <thead><tr>
                                <th class="index-col">#</th><th class="description-col">Item &amp; Description</th><th class="qty-col">Qty</th><th class="rate-col">Rate</th><th class="amount-col">Amount</th>
                            </tr></thead>
                            <tbody>
                                ${data.items.map((item, index) => `
                                    <tr>
                                        <td class="index-col">${index + 1}</td>
                                        <td class="description-col">${item.description}${item.isRecurring ? `<span class="service-note">Recurring service${item.recurrenceDate ? ` - Next invoice: ${item.recurrenceDate}` : ''}</span>` : ''}${item.isPaid ? `<span class="service-note" style="color: var(--paid);">Paid${item.paidDate ? ` on ${item.paidDate}` : ''}</span>` : (item.dueDate ? `<span class="service-note">Payment due: ${item.dueDate}</span>` : '')}</td>
                                        <td class="qty-col">${Number(item.quantity || 1).toFixed(2)}</td>
                                        <td class="rate-col">${item.currency === 'USD' ? '$' : 'PKR '}${formatAmount(item.unitPrice)}</td>
                                        <td class="amount-col">${item.currency === 'USD' ? '$' : 'PKR '}${formatAmount(item.unitPrice * item.quantity)}</td>
                                    </tr>
                                `).join('')}
                                ${monthlyPKR > 0 ? `
                                    <tr>
                                        <td class="index-col">${data.items.length + 1}</td>
                                        <td class="description-col">${data.monthlyDescription || 'Monthly Service'}<span class="service-note">Monthly recurring${data.billingMonth ? ` - ${data.billingMonth}` : ''}</span></td>
                                        <td class="qty-col">1.00</td>
                                        <td class="rate-col">${data.monthlyCurrency === 'USD' ? '$' : 'PKR '}${formatAmount(monthlyValue)}</td>
                                        <td class="amount-col">PKR ${formatAmount(monthlyPKR)}</td>
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

                <div class="summary-grid">
                    <div class="terms">
                        <div class="thanks">Thank you for your business.</div>
                        <h3>Terms &amp; Conditions</h3>
                        <p>Please pay each service and milestone by its listed due date. The final due date summarizes the last pending payment date.</p>
                    </div>
                    <div class="total-container">
                        <div class="total-row"><span class="label">Subtotal</span><span class="val">PKR ${formatAmount(subtotalPKR)}</span></div>
                        ${discountAmountPKR > 0 ? `<div class="total-row"><span class="label">Discount</span><span class="val">- PKR ${formatAmount(discountAmountPKR)}</span></div>` : ''}
                        <div class="total-row grand"><span class="label">Total</span><span class="val">PKR ${formatAmount(totalAfterDiscountPKR)}</span></div>
                        <div class="total-row"><span class="label">Paid so far</span><span class="val">PKR ${formatAmount(paidToDatePKR)}</span></div>
                        <div class="total-row balance"><span class="label">Balance Due</span><span class="val">PKR ${formatAmount(remainingBalancePKR)}</span></div>
                    </div>
                </div>
            </div>
            <footer class="footer"></footer>
        </div>
    </div>
</body>
</html>`;

  const handlePrint = () => {
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
    <div className="space-y-5 invoice-printable">
      <iframe
        title={`Invoice ${data.invoiceNumber}`}
        srcDoc={html}
        sandbox="allow-same-origin"
        onLoad={(event) => {
          const frame = event.currentTarget;
          const contentHeight = frame.contentDocument?.documentElement.scrollHeight || 0;
          frame.style.height = `${Math.max(contentHeight + 8, 1100)}px`;
        }}
        className="block w-full rounded-xl border border-slate-200 bg-white shadow-lg"
        style={{ height: '1100px' }}
      />
      <div className="flex justify-center print:hidden">
        <button onClick={handlePrint} className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Generate Official PDF
        </button>
      </div>
    </div>
  );
};

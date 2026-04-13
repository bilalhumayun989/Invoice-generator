import React, { useRef } from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onBack?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const subtotalPKR = data.items.reduce((sum, item) => {
    const t = item.quantity * Number(item.unitPrice || 0);
    return sum + (item.currency === 'PKR' ? t : t * 290);
  }, 0) + (data.monthlyRetainerCurrency === 'PKR'
    ? Number(data.monthlyRetainer || 0)
    : Number(data.monthlyRetainer || 0) * 290);

  const tax = subtotalPKR * (Number(data.taxRate || 0) / 100);
  const totalPKR = subtotalPKR + tax;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  /* ─── Print handler ────────────────────────────────────────── */
  const handlePrint = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const printHTML = `
      <!DOCTYPE html><html>
      <head>
        <title>Invoice ${data.invoiceNumber}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Georgia,serif;background:#fff;color:#1a1a1a}
          .wrap{max-width:800px;margin:0 auto;padding:56px 64px}
          .accent{height:4px;background:#1a1a1a;margin-bottom:48px}
          .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
          .co-name{font-size:22px;font-weight:bold;letter-spacing:-0.5px}
          .co-sub{font-size:11px;color:#aaa;margin-top:3px}
          .inv-word{font-size:38px;font-weight:300;letter-spacing:8px;text-transform:uppercase;text-align:right;color:#1a1a1a}
          .inv-num{font-size:12px;font-family:monospace;color:#8a7960;text-align:right;margin-top:4px}
          .divider{height:2px;background:#1a1a1a;margin:28px 0}
          .parties{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px}
          .p-label{font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#8a7960;margin-bottom:8px;font-weight:bold}
          .p-name{font-size:15px;font-weight:bold;margin-bottom:5px}
          .p-detail{font-size:12px;color:#555;line-height:1.8}
          table{width:100%;border-collapse:collapse;margin-bottom:36px}
          thead tr{border-bottom:2px solid #1a1a1a}
          th{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#8a7960;padding:0 0 12px;font-weight:700;text-align:left}
          th:not(:first-child){text-align:right;padding-left:16px}
          tbody tr{border-bottom:1px solid #f0ead8}
          td{padding:13px 0;font-size:13px;color:#333;vertical-align:middle}
          td:not(:first-child){text-align:right;padding-left:16px;font-family:monospace;font-size:12px}
          .totals-wrap{display:flex;justify-content:flex-end;margin-bottom:36px}
          .totals{width:260px;background:#1a1a1a;border-radius:12px;padding:16px 20px}
          .t-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#bbb}
          .t-row span:last-child{font-family:monospace}
          .t-total{display:flex;justify-content:space-between;padding:12px 0 0;font-size:18px;font-weight:bold;color:#fff;border-top:1px solid #333;margin-top:8px}
          .t-total span:last-child{font-family:monospace}
          .info-row{display:flex;gap:20px;margin-top:44px}
          .info-box{flex:1;padding:16px 20px;background:#faf9f6;border-left:3px solid #8a7960;border-radius:0 6px 6px 0}
          .info-label{font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#8a7960;margin-bottom:7px;font-weight:bold}
          .info-text{font-size:12px;color:#555;font-style:italic;line-height:1.75;white-space:pre-wrap}
          .footer{margin-top:56px;padding-top:18px;border-top:1px solid #e8e0cc;display:flex;justify-content:space-between}
          .footer span{font-size:11px;color:#ccc;font-family:monospace}
          @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{padding:40px 48px}}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="accent"></div>
          <div class="header">
            <div>
              <div class="co-name">${data.companyName}</div>
              <div class="co-sub">${data.companyEmail}</div>
              <div class="co-sub">${data.companyPhone}</div>
            </div>
            <div>
              <div class="inv-word">Invoice</div>
              <div class="inv-num">${data.invoiceNumber}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="parties">
            <div>
              <div class="p-label">From</div>
              <div class="p-name">${data.companyName}</div>
              <div class="p-detail">${data.companyEmail}<br>${data.companyPhone}</div>
            </div>
            <div>
              <div class="p-label">Bill To</div>
              <div class="p-name">${data.clientName}</div>
              <div class="p-detail">${data.clientEmail}<br>${data.clientAddress}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td>${item.description || '—'}</td>
                  <td>${item.quantity}</td>
                  <td>${item.currency === 'PKR' ? 'Rs.' : '$'}${fmt(Number(item.unitPrice || 0))}</td>
                  <td style="font-weight:600;color:#1a1a1a">${item.currency === 'PKR' ? 'Rs.' : '$'}${fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="totals-wrap">
            <div class="totals">
              ${data.monthlyRetainer ? `<div class="t-row"><span>Monthly Retainer</span><span>${data.monthlyRetainerCurrency === 'PKR' ? 'Rs.' : '$'}${fmt(Number(data.monthlyRetainer || 0))}</span></div>` : ''}
              <div class="t-row"><span>Subtotal</span><span>Rs.${fmt(subtotalPKR)}</span></div>
              <div class="t-row"><span>Tax (${data.taxRate}%)</span><span>Rs.${fmt(tax)}</span></div>
              <div class="t-total"><span>Total (PKR)</span><span>Rs.${fmt(totalPKR)}</span></div>
            </div>
          </div>
          ${data.notes || data.bankAccountDetails || data.debitCardDetails ? `
            <div class="info-row">
              ${data.notes ? `<div class="info-box"><div class="info-label">Notes</div><div class="info-text">${data.notes}</div></div>` : ''}
              ${(data.bankAccountDetails || data.debitCardDetails) ? `<div class="info-box"><div class="info-label">Payment Details</div><div class="info-text">${[data.bankAccountDetails, data.debitCardDetails].filter(Boolean).join('\n\n')}</div></div>` : ''}
            </div>` : ''}
          <div class="footer">
            <span>Thank you for your business.</span>
            <span>${data.invoiceNumber}</span>
          </div>
        </div>
      </body></html>
    `;

    if (isMobile) {
      const style = document.createElement('style');
      style.id = '__inv_print_style';
      style.innerHTML = `@media print{body>*:not(#__inv_print){display:none!important}#__inv_print{display:block!important;position:fixed;top:0;left:0;width:100%;background:#fff}}`;
      const wrapper = document.createElement('div');
      wrapper.id = '__inv_print';
      wrapper.style.cssText = 'display:none;';
      wrapper.innerHTML = printHTML;
      document.head.appendChild(style);
      document.body.appendChild(wrapper);
      window.print();
      setTimeout(() => { document.getElementById('__inv_print_style')?.remove(); document.getElementById('__inv_print')?.remove(); }, 1000);
    } else {
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(printHTML);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 300);
    }
  };

  /* ─── render ───────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col" style={{ background: '#f7f5f0', fontFamily: 'Georgia, serif' }}>

      {/* ── toolbar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: '#fff', borderBottom: '1px solid #2a2218' }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden text-xs font-bold uppercase tracking-[0.15em] transition-colors"
            style={{ color: '#8a7a5a' }}
          >
            ← Edit
          </button>
        )}
        <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: '#8a7a5a' }}>
          Preview
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-lg transition-all"
          style={{ background: '#000000', color: '#ffffff' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#000000')}
          onMouseLeave={e => (e.currentTarget.style.background = '#000000')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span className="hidden sm:inline">Print / PDF</span>
          <span className="sm:hidden">Print</span>
        </button>
      </div>

      {/* ── preview area ────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 flex justify-center">
        <div
          ref={printRef}
          className="bg-white w-full max-w-[740px] rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 4px 24px #0000000f, 0 1px 4px #0000000a',
            border: '1px solid #e5ddd0',
          }}
        >
          {/* top accent */}
          <div style={{ height: '4px', background: '#1a1a1a' }} />

          <div className="p-7 sm:p-10 lg:p-14">

            {/* header */}
            <div className="flex justify-between items-start mb-8 gap-4">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: '#1a1a1a', letterSpacing: '-0.03em' }}>
                  {data.companyName}
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: '#aaa' }}>{data.companyEmail}</div>
                <div className="text-xs truncate" style={{ color: '#aaa' }}>{data.companyPhone}</div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="text-3xl sm:text-4xl font-light uppercase"
                  style={{ letterSpacing: '7px', color: '#1a1a1a', lineHeight: 1 }}
                >
                  Invoice
                </div>
                <div className="text-xs font-mono mt-1.5" style={{ color: '#8a7960' }}>{data.invoiceNumber}</div>
              </div>
            </div>

            {/* divider */}
            <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '28px' }} />

            {/* parties */}
            <div className="grid grid-cols-2 gap-6 sm:gap-12 mb-9">
              {[
                { label: 'From', name: data.companyName, email: data.companyEmail, extra: data.companyPhone },
                { label: 'Bill To', name: data.clientName, email: data.clientEmail, extra: data.clientAddress },
              ].map(p => (
                <div key={p.label}>
                  <div
                    className="text-[9px] sm:text-[10px] uppercase font-bold mb-2"
                    style={{ color: '#000', letterSpacing: '3px' }}
                  >{p.label}</div>
                  <div className="font-bold text-sm sm:text-base" style={{ color: '#1a1a1a' }}>{p.name}</div>
                  <div className="text-xs mt-1" style={{ color: '#666', lineHeight: 1.7 }}>
                    {p.email}<br />{p.extra}
                  </div>
                </div>
              ))}
            </div>

            {/* items table */}
            <div className="overflow-x-auto -mx-7 sm:mx-0 px-7 sm:px-0 mb-6 sm:mb-8">
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '460px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1a1a1a' }}>
                    {['Description', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
                      <th
                        key={h}
                        className="pb-3 text-[9px] sm:text-[10px] uppercase font-bold"
                        style={{
                          color: '#000',
                          letterSpacing: '2px',
                          textAlign: i === 0 ? 'left' : 'right',
                          padding: '8px 10px 10px 0',
                          whiteSpace: 'nowrap',
                        }}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f0ead8', background: idx % 2 === 0 ? 'transparent' : '#fafaf8' }}
                    >
                      <td className="py-3 text-xs sm:text-sm pr-3" style={{ color: '#1a1a1a' }}>{item.description || '—'}</td>
                      <td className="py-3 text-xs text-right font-mono pr-3" style={{ color: '#666' }}>{item.quantity}</td>
                      <td className="py-3 text-xs text-right font-mono pr-3" style={{ color: '#666' }}>
                        {item.currency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(item.unitPrice || 0))}
                      </td>
                      <td className="py-3 text-xs text-right font-mono font-bold" style={{ color: '#1a1a1a' }}>
                        {item.currency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* totals */}
            <div className="flex justify-end mb-8 sm:mb-10">
              <div
                className="w-64 sm:w-72 rounded-2xl overflow-hidden"
                style={{ background: '#1a1a1a' }}
              >
                <div className="px-5 py-4 space-y-1.5">
                  {data.monthlyRetainer ? (
                    <div className="flex justify-between text-xs" style={{ color: '#bbb' }}>
                      <span>Monthly Retainer</span>
                      <span className="font-mono">
                        {data.monthlyRetainerCurrency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(data.monthlyRetainer || 0))}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-xs" style={{ color: '#fff' }}>
                    <span>Subtotal</span><span className="font-mono">Rs.{fmt(subtotalPKR)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#fff' }}>
                    <span>Tax ({data.taxRate}%)</span><span className="font-mono">Rs.{fmt(tax)}</span>
                  </div>
                  <div
                    className="flex justify-between text-lg sm:text-xl font-bold pt-3 mt-1"
                    style={{ borderTop: '1px solid #333', color: '#fff' }}
                  >
                    <span>Total (PKR)</span><span className="font-mono">Rs.{fmt(totalPKR)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* notes & payment info */}
            {(data.notes || data.bankAccountDetails || data.debitCardDetails) && (
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                {data.notes && (
                  <div
                    className="flex-1 p-4 rounded-r-xl"
                    style={{ background: '#faf9f6', borderLeft: '3px solid #000' }}
                  >
                    <div
                      className="text-[9px] uppercase font-bold tracking-[3px] mb-2"
                      style={{ color: '#000000' }}
                    >Notes</div>
                    <div className="text-xs italic" style={{ color: '#666', lineHeight: 1.75 }}>{data.notes}</div>
                  </div>
                )}
                {(data.bankAccountDetails || data.debitCardDetails) && (
                  <div
                    className="flex-1 p-4 rounded-r-xl"
                    style={{ background: '#faf9f6', borderLeft: '3px solid #000000' }}
                  >
                    <div
                      className="text-[9px] uppercase font-bold tracking-[3px] mb-2"
                      style={{ color: '#000000' }}
                    >Payment Details</div>
                    <div className="text-xs italic whitespace-pre-wrap" style={{ color: '#666', lineHeight: 1.75 }}>
                      {[data.bankAccountDetails, data.debitCardDetails].filter(Boolean).join('\n\n')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* footer */}
            <div
              className="mt-14 pt-4 flex justify-between items-center"
              style={{ borderTop: '1px solid #ede8dc' }}
            >
              <span className="text-xs" style={{ color: '#ccc', fontStyle: 'italic' }}>
                Thank you for your business.
              </span>
              <span className="text-xs font-mono" style={{ color: '#ccc' }}>{data.invoiceNumber}</span>
            </div>

          </div>

          {/* bottom accent */}
          <div style={{ height: '4px', background: '#1a1a1a' }} />
        </div>
      </div>
    </div>
  );
};
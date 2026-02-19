import React, { useRef } from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onBack?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${data.invoiceNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Georgia', serif; background: #fff; color: #1a1a1a; }
            .invoice { max-width: 800px; margin: 0 auto; padding: 56px 64px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .logo { font-size: 26px; font-weight: bold; color: #1a1a1a; letter-spacing: -0.5px; }
            .inv-meta { text-align: right; }
            .inv-meta h2 { font-size: 36px; color: #1a1a1a; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; }
            .inv-meta p { font-size: 12px; color: #666; margin-top: 4px; font-family: monospace; }
            .inv-meta .dates { margin-top: 10px; }
            .inv-meta .dates p { font-family: Georgia, serif; font-size: 12px; color: #888; }
            .divider { height: 1px; background: #1a1a1a; margin: 32px 0; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 44px; }
            .party-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #999; margin-bottom: 10px; }
            .party-name { font-size: 15px; font-weight: bold; color: #1a1a1a; margin-bottom: 6px; }
            .party-detail { font-size: 12px; color: #555; line-height: 1.8; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 36px; }
            thead tr { border-bottom: 1.5px solid #1a1a1a; }
            thead th { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #999; padding: 0 0 10px 0; text-align: left; font-weight: 600; }
            thead th:not(:first-child) { text-align: right; padding-left: 16px; }
            tbody tr { border-bottom: 1px solid #f0f0f0; }
            tbody td { padding: 13px 0; font-size: 13px; color: #333; vertical-align: middle; }
            tbody td:not(:first-child) { text-align: right; padding-left: 16px; font-family: monospace; font-size: 12px; }
            tbody tr:last-child { border-bottom: none; }
            .totals { margin-left: auto; width: 240px; border-top: 1px solid #e8e8e8; padding-top: 16px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #666; }
            .total-row span:last-child { font-family: monospace; }
            .total-final { display: flex; justify-content: space-between; padding: 14px 0 0 0; font-size: 17px; font-weight: bold; color: #1a1a1a; border-top: 1.5px solid #1a1a1a; margin-top: 10px; }
            .total-final span:last-child { font-family: monospace; }
            .notes { margin-top: 52px; padding: 20px 24px; background: #fafafa; border-left: 2px solid #1a1a1a; }
            .notes-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #999; margin-bottom: 8px; }
            .notes-text { font-size: 12px; color: #555; font-style: italic; line-height: 1.7; }
            .footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
            .footer-left { font-size: 11px; color: #bbb; }
            .footer-right { font-size: 11px; color: #bbb; font-family: monospace; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .invoice { padding: 40px 48px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="logo">${data.companyName}</div>
              <div class="inv-meta">
                <h2>Invoice</h2>
                <p>${data.invoiceNumber}</p>
                <div class="dates">
                  <p style="margin-top:10px">Issued: ${data.issueDate}</p>
                  <p>Due: ${data.dueDate}</p>
                </div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="parties">
              <div>
                <div class="party-label">From</div>
                <div class="party-name">${data.companyName}</div>
                <div class="party-detail">${data.companyEmail}<br/>${data.companyPhone}</div>
              </div>
              <div>
                <div class="party-label">Bill To</div>
                <div class="party-name">${data.clientName}</div>
                <div class="party-detail">${data.clientEmail}<br/>${data.clientAddress}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align:right;padding-left:16px;font-family:monospace;font-size:12px">${item.quantity}</td>
                    <td style="text-align:right;padding-left:16px;font-family:monospace;font-size:12px">$${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align:right;padding-left:16px;font-family:monospace;font-size:12px;font-weight:600">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
              <div class="total-row"><span>Tax (${data.taxRate}%)</span><span>$${tax.toFixed(2)}</span></div>
              <div class="total-final"><span>Total</span><span>$${total.toFixed(2)}</span></div>
            </div>
            ${data.notes ? `
              <div class="notes">
                <div class="notes-label">Notes</div>
                <div class="notes-text">${data.notes}</div>
              </div>
            ` : ''}
            <div class="footer">
              <span class="footer-left">Thank you for your business.</span>
              <span class="footer-right">${data.invoiceNumber}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="h-full flex flex-col bg-[#ffffff]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1e1e1e] shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden text-xs text-[#666] hover:text-[#c8a96e] transition-colors"
          >
            ← Edit
          </button>
        )}
        <span className="text-xs text-[#444] tracking-widest uppercase">Preview</span>
        <button
          onClick={handlePrint}
          className="bg-[#000000] text-[#ffffff] text-xs font-bold px-4 sm:px-5 py-2 rounded-lg tracking-widest uppercase transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span className="hidden sm:inline">Print / PDF</span>
          <span className="sm:hidden">Print</span>
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8 flex justify-center">
        <div
          ref={printRef}
          className="bg-white text-[#1a1a1a] w-full max-w-[720px] shadow-2xl rounded-sm"
          style={{ fontFamily: 'Georgia, serif', minHeight: '960px' }}
        >
          <div className="p-6 sm:p-8 lg:p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 sm:mb-10 gap-4">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: '#1a1a1a' }}>
                  {data.companyName}
                </div>
                <div className="text-xs sm:text-sm mt-1 truncate" style={{ color: '#888' }}>{data.companyEmail}</div>
                <div className="text-xs sm:text-sm truncate" style={{ color: '#888' }}>{data.companyPhone}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl sm:text-4xl font-light tracking-[4px] sm:tracking-[6px] uppercase" style={{ color: '#000000' }}>
                  Invoice
                </div>
                <div className="text-xs sm:text-sm mt-1 font-mono" style={{ color: '#555' }}>{data.invoiceNumber}</div>
                <div className="text-xs mt-2" style={{ color: '#888' }}>
                  <span>Issued: {data.issueDate}</span>
                  <br />
                  <span>Due: {data.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '2px', background: 'linear-gradient(to right, #000000, #000000, #000000)', marginBottom: '28px' }} />

            {/* Parties */}
            <div className="grid grid-cols-2 gap-6 sm:gap-10 mb-8 sm:mb-10">
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] mb-2" style={{ color: '#000000' }}>From</div>
                <div className="font-bold text-sm sm:text-base">{data.companyName}</div>
                <div className="text-xs sm:text-sm mt-1" style={{ color: '#555', lineHeight: '1.6' }}>
                  {data.companyEmail}<br />{data.companyPhone}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] mb-2" style={{ color: '#000000' }}>Bill To</div>
                <div className="font-bold text-sm sm:text-base">{data.clientName}</div>
                <div className="text-xs sm:text-sm mt-1" style={{ color: '#555', lineHeight: '1.6' }}>
                  {data.clientEmail}<br />{data.clientAddress}
                </div>
              </div>
            </div>

            {/* Items Table — scrollable on mobile */}
            <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0 mb-6 sm:mb-8">
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '460px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000' }}>
                    {['Description', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
                      <th
                        key={h}
                        className="pb-2 text-[9px] sm:text-[10px] uppercase tracking-[2px]"
                        style={{ color: '#000000', textAlign: i === 0 ? 'left' : 'right', padding: '8px 8px 8px 0', whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                      <td className="py-3 text-xs sm:text-sm" style={{ paddingRight: '12px' }}>{item.description || '—'}</td>
                      <td className="py-3 text-xs sm:text-sm text-right" style={{ paddingRight: '12px' }}>{item.quantity}</td>
                      <td className="py-3 text-xs sm:text-sm text-right font-mono" style={{ paddingRight: '12px' }}>${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 text-xs sm:text-sm text-right font-mono font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8 sm:mb-10">
              <div className="w-44 sm:w-56">
                <div className="flex justify-between py-1 text-xs sm:text-sm" style={{ color: '#777' }}>
                  <span>Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs sm:text-sm" style={{ color: '#777' }}>
                  <span>Tax ({data.taxRate}%)</span><span className="font-mono">${tax.toFixed(2)}</span>
                </div>
                <div
                  className="flex justify-between py-2 text-base sm:text-lg font-bold mt-1"
                  style={{ borderTop: '2px solid #000000', color: '#1a1a1a' }}
                >
                  <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="p-3 sm:p-4 rounded" style={{ background: '#fdf9ef', borderLeft: '3px solid #000000' }}>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[2px] mb-1" style={{ color: '#000000' }}>Notes</div>
                <div className="text-xs sm:text-sm italic" style={{ color: '#666' }}>{data.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
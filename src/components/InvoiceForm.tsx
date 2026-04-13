import React from 'react';
import type { InvoiceData, InvoiceItem } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onPreview: () => void;
}

/* ─── shared tokens ─────────────────────────────────────────── */
const INPUT =
  'w-full bg-[#fffdf8] border border-[#ddd0b8] text-[#1a1a1a] rounded-md px-3 py-2 text-sm ' +
  'focus:outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a18] ' +
  'transition-all placeholder-[#c4b89a] appearance-none font-[Georgia,serif]';

const LABEL = 'block text-[10px] font-semibold text-[#8a7960] uppercase tracking-[0.18em] mb-1.5';

/* ─── tiny pill badge ────────────────────────────────────────── */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d8c9a8]" />
    <span
      className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border"
      style={{ background: '#1a1a1a', color: '#f5efe2', borderColor: '#1a1a1a' }}
    >
      {children}
    </span>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d8c9a8]" />
  </div>
);


/* ─── main component ─────────────────────────────────────────── */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange, onPreview }) => {
  const set = (field: keyof InvoiceData, value: any) => onChange({ ...data, [field]: value });

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) =>
    onChange({ ...data, items: data.items.map(i => i.id === id ? { ...i, [field]: value } : i) });

  const addItem = () =>
    onChange({ ...data, items: [...data.items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, currency: 'USD' }] });

  const removeItem = (id: string) => onChange({ ...data, items: data.items.filter(i => i.id !== id) });

  const subtotalPKR = data.items.reduce((sum, item) => {
    const t = item.quantity * Number(item.unitPrice || 0);
    return sum + (item.currency === 'PKR' ? t : t * 290);
  }, 0) + (data.monthlyRetainerCurrency === 'PKR'
    ? Number(data.monthlyRetainer || 0)
    : Number(data.monthlyRetainer || 0) * 290);

  const tax = subtotalPKR * (Number(data.taxRate || 0) / 100);
  const totalPKR = subtotalPKR + tax;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: 'white',
        fontFamily: 'Georgia, serif',
      }}
    >
      {/* top accent bar */}
      <div className="h-1 w-full" style={{ background: 'black'}} />

      <div className="p-6 lg:p-10 max-w-2xl mx-auto">

        {/* ── watermark heading ─────────────────────────────────── */}
        <div className="mb-10 select-none">
          <p
            className="text-[10px] uppercase tracking-[0.35em] font-bold mb-1"
            style={{ color: '#000' }}
          >
            Invoice Generator
          </p>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}
          >
            New Invoice
          </h1>
        </div>

        {/* ── Invoice Meta ──────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Invoice Details</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={LABEL}>Invoice #</label>
              <input className={INPUT} value={data.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
            </div>
            {/* Uncomment if needed:
            <div>
              <label className={LABEL}>Issue Date</label>
              <DateInput value={data.issueDate} onChange={v => set('issueDate', v)} />
            </div>
            <div>
              <label className={LABEL}>Due Date</label>
              <DateInput value={data.dueDate} onChange={v => set('dueDate', v)} />
            </div> */}
          </div>
        </section>

        {/* ── From ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>From (Your Company)</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Company Name</label>
              <input className={INPUT} value={data.companyName} onChange={e => set('companyName', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Email</label>
                <input className={INPUT} value={data.companyEmail} onChange={e => set('companyEmail', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input className={INPUT} value={data.companyPhone} onChange={e => set('companyPhone', e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Bill To ──────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Bill To (Client)</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Client Name</label>
                <input className={INPUT} value={data.clientName} onChange={e => set('clientName', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Client Email</label>
                <input className={INPUT} value={data.clientEmail} onChange={e => set('clientEmail', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <input className={INPUT} value={data.clientAddress} onChange={e => set('clientAddress', e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Line Items ───────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Line Items</SectionTitle>

          {/* column headers */}
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            {['Description', 'Qty', 'Curr', 'Price', 'Total'].map((h, i) => (
              <span
                key={h}
                className={`text-[9px] uppercase tracking-[0.2em] font-bold ${
                  i === 0 ? 'col-span-4' : i === 4 ? 'col-span-2 text-right' : 'col-span-2'
                }`}
                style={{ color: '#8a7960' }}
              >
                {h}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {data.items.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center group rounded-lg px-1 py-1 transition-colors hover:bg-[#f0e8d420]"
              >
                {/* row number */}
                <span className="absolute -left-5 text-[10px] text-[#c4b89a]">{idx + 1}</span>
                <input
                  className={`${INPUT} col-span-4`}
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateItem(item.id, 'description', e.target.value)}
                />
                <input
                  type="number" min={1}
                  className={`${INPUT} col-span-2 text-center`}
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                />
                <select
                  className={`${INPUT} col-span-2 px-2`}
                  value={item.currency || 'USD'}
                  onChange={e => updateItem(item.id, 'currency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                </select>
                <input
                  type="number" min={0}
                  className={`${INPUT} col-span-2`}
                  value={item.unitPrice}
                  onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                />
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className="text-xs font-mono font-bold" style={{ color: '#1a1a1a' }}>
                    {item.currency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:bg-red-50 text-[#ccc] hover:text-red-400 text-xs ml-0.5"
                    title="Remove"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] px-4 py-2.5 rounded-lg w-full justify-center transition-all"
            style={{
              border: '1.5px dashed #c8a96e',
              color: '#8a7960',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#fdf3e0';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#8a7960';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8a96e';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Line Item
          </button>
        </section>

        {/* ── Summary & Settings ───────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Summary & Settings</SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Monthly Retainer</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={INPUT}
                    value={data.monthlyRetainerCurrency || 'USD'}
                    onChange={e => set('monthlyRetainerCurrency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                  </select>
                  <input
                    type="number" min={0}
                    className={INPUT}
                    placeholder="Amount"
                    value={data.monthlyRetainer}
                    onChange={e => set('monthlyRetainer', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Tax Rate (%)</label>
                <input
                  type="number" min={0} max={100}
                  className={INPUT}
                  value={data.taxRate}
                  onChange={e => set('taxRate', e.target.value)}
                />
              </div>
            </div>

            {/* totals card */}
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: '#1a1a1a', color: 'white' }}
            >
              <div className="flex justify-between text-xs" style={{ color: 'white' }}>
                <span>Subtotal</span>
                <span className="font-mono">Rs.{fmt(subtotalPKR)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'white' }}>
                <span>Tax ({data.taxRate}%)</span>
                <span className="font-mono">Rs.{fmt(tax)}</span>
              </div>
              <div
                className="flex justify-between text-base font-bold pt-2 mt-1"
                style={{ borderTop: '1px solid #3a3028', color: 'white' }}
              >
                <span>Total (PKR)</span>
                <span className="font-mono">Rs.{fmt(totalPKR)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Additional Info ──────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Additional Info</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Bank Account Details</label>
                <textarea
                  className={`${INPUT} resize-none h-24`}
                  placeholder="Bank Name, IBAN, SWIFT…"
                  value={data.bankAccountDetails}
                  onChange={e => set('bankAccountDetails', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Credit / Debit Card Details</label>
                <textarea
                  className={`${INPUT} resize-none h-24`}
                  placeholder="Name on card, Card No.…"
                  value={data.debitCardDetails}
                  onChange={e => set('debitCardDetails', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Notes</label>
              <textarea
                className={`${INPUT} resize-none h-20`}
                value={data.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Preview Button (mobile only) ─────────────────────── */}
        <button
          onClick={onPreview}
          className="lg:hidden w-full font-bold py-3.5 rounded-xl text-sm tracking-[0.18em] uppercase transition-colors"
          style={{ background: '#1a1a1a', color: '#c8a96e' }}
        >
          Preview Invoice →
        </button>

      </div>
      {/* bottom accent bar */}
      <div className="h-1 w-full" style={{ background: 'black' }} />
    </div>
  );
};
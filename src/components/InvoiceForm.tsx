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

/* ─── section title ─────────────────────────────────────────── */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #d8c9a8)' }} />
    <span
      className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border whitespace-nowrap"
      style={{ background: '#1a1a1a', color: '#f5efe2', borderColor: '#1a1a1a' }}
    >
      {children}
    </span>
    <span className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #d8c9a8)' }} />
  </div>
);

/* ─── main component ─────────────────────────────────────────── */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange, onPreview }) => {
  const set = (field: keyof InvoiceData, value: any) => onChange({ ...data, [field]: value });

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) =>
    onChange({ ...data, items: data.items.map(i => i.id === id ? { ...i, [field]: value } : i) });

  const addItem = () =>
    onChange({
      ...data,
      items: [
        ...data.items,
        { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, currency: 'USD' },
      ],
    });

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
      style={{ background: 'white', fontFamily: 'Georgia, serif' }}
    >
      {/* top accent bar */}
      <div className="h-1 w-full" style={{ background: '#1a1a1a' }} />

      <div className="p-4 sm:p-6 lg:p-10 max-w-2xl mx-auto pb-10">

        {/* ── heading ───────────────────────────────────────── */}
        <div className="mb-8 sm:mb-10 select-none">
          <p className="text-[10px] uppercase tracking-[0.35em] font-bold mb-1" style={{ color: '#8a7960' }}>
            Invoice Generator
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}
          >
            New Invoice
          </h1>
        </div>

        {/* ── Invoice Details ───────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Invoice Details</SectionTitle>
          <div className="w-full sm:w-1/3">
            <label className={LABEL}>Invoice #</label>
            <input
              className={INPUT}
              value={data.invoiceNumber}
              onChange={e => set('invoiceNumber', e.target.value)}
            />
          </div>
        </section>

        {/* ── From ─────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>From (Your Company)</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Company Name</label>
              <input
                className={INPUT}
                value={data.companyName}
                onChange={e => set('companyName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Email</label>
                <input
                  className={INPUT}
                  type="email"
                  value={data.companyEmail}
                  onChange={e => set('companyEmail', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input
                  className={INPUT}
                  type="tel"
                  value={data.companyPhone}
                  onChange={e => set('companyPhone', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Bill To ──────────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Bill To (Client)</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Client Name</label>
                <input
                  className={INPUT}
                  value={data.clientName}
                  onChange={e => set('clientName', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Client Email</label>
                <input
                  className={INPUT}
                  type="email"
                  value={data.clientEmail}
                  onChange={e => set('clientEmail', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <input
                className={INPUT}
                value={data.clientAddress}
                onChange={e => set('clientAddress', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Line Items ───────────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Line Items</SectionTitle>

          {/* Desktop column headers — hidden on mobile */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 mb-2 px-1">
            {[
              { label: 'Description', cls: 'col-span-4' },
              { label: 'Qty', cls: 'col-span-2' },
              { label: 'Curr', cls: 'col-span-2' },
              { label: 'Price', cls: 'col-span-2' },
              { label: 'Total', cls: 'col-span-2 text-right' },
            ].map(h => (
              <span
                key={h.label}
                className={`text-[9px] uppercase tracking-[0.2em] font-bold ${h.cls}`}
                style={{ color: '#8a7960' }}
              >
                {h.label}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {data.items.map((item, idx) => (
              <div key={item.id}>

                {/* ── Mobile: stacked card ── */}
                <div
                  className="sm:hidden rounded-xl border border-[#e8dfc8] p-3 space-y-2"
                  style={{ background: '#fffdf8' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.15em]"
                      style={{ color: '#8a7960' }}
                    >
                      Item {idx + 1}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#ccc] hover:text-red-400 hover:bg-red-50 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className={LABEL}>Description</label>
                    <input
                      className={INPUT}
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={LABEL}>Qty</label>
                      <input
                        type="number" min={1}
                        className={`${INPUT} text-center`}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Currency</label>
                      <select
                        className={`${INPUT} px-2`}
                        value={item.currency || 'USD'}
                        onChange={e => updateItem(item.id, 'currency', e.target.value)}
                      >
                        <option value="USD">USD</option>
                        <option value="PKR">PKR</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Price</label>
                      <input
                        type="number" min={0}
                        className={INPUT}
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <span
                      className="text-sm font-mono font-bold px-3 py-1 rounded-lg"
                      style={{ background: '#1a1a1a', color: '#fff' }}
                    >
                      {item.currency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                    </span>
                  </div>
                </div>

                {/* ── Desktop: inline row ── */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center group rounded-lg px-1 py-1 transition-colors hover:bg-[#f9f6f0]">
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

              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] px-4 py-3 rounded-xl w-full justify-center transition-all"
            style={{ border: '1.5px dashed #c8a96e', color: '#8a7960', background: 'transparent' }}
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

        {/* ── Summary & Settings ───────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Summary & Settings</SectionTitle>
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 sm:gap-6">

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
            <div className="rounded-xl p-4 space-y-2" style={{ background: '#1a1a1a' }}>
              {data.monthlyRetainer ? (
                <div className="flex justify-between text-xs" style={{ color: '#bbb' }}>
                  <span>Monthly Retainer</span>
                  <span className="font-mono">
                    {data.monthlyRetainerCurrency === 'PKR' ? 'Rs.' : '$'}{fmt(Number(data.monthlyRetainer || 0))}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-xs" style={{ color: '#bbb' }}>
                <span>Subtotal</span>
                <span className="font-mono">Rs.{fmt(subtotalPKR)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: '#bbb' }}>
                <span>Tax ({data.taxRate}%)</span>
                <span className="font-mono">Rs.{fmt(tax)}</span>
              </div>
              <div
                className="flex justify-between text-base font-bold pt-2 mt-1"
                style={{ borderTop: '1px solid #333', color: '#fff' }}
              >
                <span>Total (PKR)</span>
                <span className="font-mono">Rs.{fmt(totalPKR)}</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── Additional Info ──────────────────────────────── */}
        <section className="mb-8">
          <SectionTitle>Additional Info</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* ── Preview Button (mobile only) ─────────────────── */}
        <button
          onClick={onPreview}
          className="lg:hidden w-full font-bold py-4 rounded-xl text-sm tracking-[0.18em] uppercase transition-all"
          style={{ background: '#1a1a1a', color: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#333')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
        >
          Preview Invoice →
        </button>

      </div>

      {/* bottom accent bar */}
      <div className="h-1 w-full" style={{ background: '#1a1a1a' }} />
    </div>
  );
};
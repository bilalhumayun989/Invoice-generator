import React from 'react';
import type { InvoiceData, InvoiceItem } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const INPUT =
  'w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2';

const SectionCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
    <div className="mb-6">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-slate-500">{title}</p>
      <p className="mt-2 text-xs sm:text-sm text-slate-600">{description}</p>
    </div>
    <div className="space-y-6">{children}</div>
  </div>
);

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  const set = (field: keyof InvoiceData, value: string) => onChange({ ...data, [field]: value } as InvoiceData);

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      currency: 'USD',
      unitPrice: 0
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (id: string) => {
    // Keep at least one item
    if (data.items.length <= 1) return;
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <SectionCard title="Company Details" description="Add your business contact information.">
        <div>
          <label className={LABEL}>Company Name</label>
          <input
            className={INPUT}
            value={data.companyName}
            onChange={e => set('companyName', e.target.value)}
            placeholder="Editorial Precision Systems Ltd."
          />
        </div>
        <div>
          <label className={LABEL}>Physical Address</label>
          <textarea
            className={`${INPUT} min-h-[96px] resize-none`}
            value={data.companyAddress}
            onChange={e => set('companyAddress', e.target.value)}
            placeholder="123 Monolith Ave, Ste 400, New York, NY 10001"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Phone Number</label>
            <input
              className={INPUT}
              type="tel"
              value={data.companyPhone}
              onChange={e => set('companyPhone', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className={LABEL}>Email Address</label>
            <input
              className={INPUT}
              type="email"
              value={data.companyEmail}
              onChange={e => set('companyEmail', e.target.value)}
              placeholder="billing@editorialprecision.com"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Client Details" description="Add the recipient contact information.">
        <div>
          <label className={LABEL}>Client Name</label>
          <input
            className={INPUT}
            value={data.clientName}
            onChange={e => set('clientName', e.target.value)}
            placeholder="Modernist Architectures Inc."
          />
        </div>
        <div>
          <label className={LABEL}>Physical Address</label>
          <textarea
            className={`${INPUT} min-h-[96px] resize-none`}
            value={data.clientAddress}
            onChange={e => set('clientAddress', e.target.value)}
            placeholder="The Glass Tower, 5th Floor, London SE1 9SG"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Phone Number</label>
            <input
              className={INPUT}
              type="tel"
              value={data.clientPhone}
              onChange={e => set('clientPhone', e.target.value)}
              placeholder="+44 20 7946 0000"
            />
          </div>
          <div>
            <label className={LABEL}>Email Address</label>
            <input
              className={INPUT}
              type="email"
              value={data.clientEmail}
              onChange={e => set('clientEmail', e.target.value)}
              placeholder="contact@modernist.arch"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Invoice Info" description="Define the invoice number and dates.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL}>Invoice Number</label>
            <input
              className={INPUT}
              value={data.invoiceNumber}
              onChange={e => set('invoiceNumber', e.target.value)}
              placeholder="INV-2024-001"
            />
          </div>
          {/* <div>
            <label className={LABEL}>Issue Date</label>
            <input
              className={INPUT}
              type="date"
              value={data.issueDate}
              onChange={e => set('issueDate', e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Due Date</label>
            <input
              className={INPUT}
              type="date"
              value={data.dueDate}
              onChange={e => set('dueDate', e.target.value)}
            />
          </div> */}
        </div>
      </SectionCard>

      <SectionCard title="Account Details" description="Share the banking information for payment.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Bank Name</label>
            <input
              className={INPUT}
              value={data.bankName}
              onChange={e => set('bankName', e.target.value)}
              placeholder="International Commerce Bank"
            />
          </div>
          <div>
            <label className={LABEL}>Account Title</label>
            <input
              className={INPUT}
              value={data.accountTitle}
              onChange={e => set('accountTitle', e.target.value)}
              placeholder="Editorial Precision Systems"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Account Number / IBAN</label>
            <input
              className={INPUT}
              value={data.accountNumber}
              onChange={e => set('accountNumber', e.target.value)}
              placeholder="GB12 ICBK 6016 1331 9283 74"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Billing & Currency" description="Add one-time and monthly retainer amounts with separate currencies.">
        <div className="grid gap-5 ">
          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">One-time Services</p>
            </div>

            <div className="space-y-6">
              {data.items.map((item, index) => (
                <div key={item.id} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 pt-8 sm:pt-4">
                  <div className="absolute left-4 top-2 text-[10px] font-bold text-slate-300 sm:static sm:mb-2">
                    ITEM {index + 1}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-5">
                      <label className={LABEL}>Description</label>
                      <input
                        className={INPUT}
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Service or product description"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={LABEL}>Qty</label>
                      <input
                        className={INPUT}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Currency</label>
                      <select
                        className={INPUT}
                        value={item.currency}
                        onChange={e => updateItem(item.id, 'currency', e.target.value)}
                      >
                        <option value="USD">USD</option>
                        <option value="PKR">PKR</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={LABEL}>Amount ({item.currency})</label>
                      <input
                        className={INPUT}
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                        disabled={data.items.length <= 1}
                        title="Remove Item"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Service Item
              </button>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Monthly Retainer</p>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Currency</label>
                  <select
                    className={INPUT}
                    value={data.monthlyCurrency}
                    onChange={e => set('monthlyCurrency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Amount ({data.monthlyCurrency})</label>
                  <input
                    className={INPUT}
                    type="text"
                    value={data.monthlyAmount}
                    onChange={e => set('monthlyAmount', e.target.value)}
                    placeholder={data.monthlyCurrency === 'USD' ? '500.00' : '145000'}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Billing Month</label>
                  <input
                    className={INPUT}
                    type="text"
                    value={data.billingMonth}
                    onChange={e => set('billingMonth', e.target.value)}
                    placeholder="January 2024"
                  />
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <input
                    className={INPUT}
                    type="text"
                    value={data.monthlyDescription}
                    onChange={e => set('monthlyDescription', e.target.value)}
                    placeholder="Design Strategy & Editorial Direction Retainer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Discount</p>
            <div className="mt-4 grid gap-4 flex items-start sm:grid-cols-2">
              <div>
                <label className={LABEL}>Discount Currency</label>
                <select
                  className={INPUT}
                  value={data.discountCurrency === 'USD' ? 'USD' : 'PKR'}
                  onChange={e => set('discountCurrency', e.target.value as any)}
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>
                  {data.discountCurrency === 'USD' ? 'Discount Amount (USD)' : 'Discount Amount (PKR)'}
                </label>
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  step="any"
                  value={data.discountAmount}
                  onChange={e => set('discountAmount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              <p>
                {data.discountCurrency === 'USD' 
                  ? 'A fixed discount amount in USD. 1 USD = 290 PKR.' 
                  : 'A fixed discount amount in PKR.'}
              </p>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Advance Payment</p>
            <div className="mt-4 grid gap-4 flex items-start sm:grid-cols-2">
              <div>
                <label className={LABEL}>Advance Currency</label>
                <select
                  className={INPUT}
                  value={data.advanceCurrency === 'USD' ? 'USD' : 'PKR'}
                  onChange={e => set('advanceCurrency', e.target.value as any)}
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>
                  {data.advanceCurrency === 'USD' ? 'Advance Amount (USD)' : 'Advance Amount (PKR)'}
                </label>
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  step="any"
                  value={data.advanceAmount}
                  onChange={e => set('advanceAmount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              <p>
                {data.advanceCurrency === 'USD' 
                  ? 'An advance payment received in USD. 1 USD = 290 PKR.' 
                  : 'An advance payment received in PKR.'}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

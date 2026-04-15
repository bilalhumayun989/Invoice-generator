import React from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const INPUT =
  'w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2';

const SectionCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-6">
    <div className="mb-6">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
    <div className="space-y-6">{children}</div>
  </div>
);

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  const set = (field: keyof InvoiceData, value: string) => onChange({ ...data, [field]: value } as InvoiceData);

  return (
    <div className="space-y-10">
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
          <div>
            <label className={LABEL}>Payment Method</label>
            <select
              className={INPUT}
              value={data.paymentMethod}
              onChange={e => set('paymentMethod', e.target.value)}
            >
              {/* <option>Wire Transfer</option> */}
              {/* <option>ACH</option> */}
              <option>Credit Card</option>
              <option>Cash</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Billing & Currency" description="Add one-time and monthly retainer amounts with separate currencies.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[18px] border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">One-time Invoice</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className={LABEL}>Currency</label>
                <select
                  className={INPUT}
                  value={data.oneTimeCurrency}
                  onChange={e => set('oneTimeCurrency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Amount ({data.oneTimeCurrency})</label>
                <input
                  className={INPUT}
                  type="text"
                  value={data.oneTimeAmount}
                  onChange={e => set('oneTimeAmount', e.target.value)}
                  placeholder={data.oneTimeCurrency === 'USD' ? '500.00' : '145000'}
                />
              </div>
              <div>
                <label className={LABEL}>Description</label>
                <input
                  className={INPUT}
                  type="text"
                  value={data.oneTimeDescription}
                  onChange={e => set('oneTimeDescription', e.target.value)}
                  placeholder="Project completion fee or service charge"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Monthly Retainer</p>
            <div className="mt-4 space-y-4">
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
      </SectionCard>
    </div>
  );
};

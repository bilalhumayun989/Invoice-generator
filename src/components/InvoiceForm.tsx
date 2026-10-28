import React from 'react';
import type { InvoiceData, InvoiceItem, Milestone } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  clients?: Array<{ id: string; name: string; email: string; phone: string }>;
  onClientSelect?: (id: string) => void;
  domains?: Array<{ id: string; clientId: string; value: string }>;
  selectedClientId?: string;
  onDomainSelect?: (value: string) => void;
  onAddDomain?: (value: string) => void;
}

const INPUT =
  'w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2';

const SectionCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <details className="group rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-lg text-slate-500 shadow-sm transition group-open:rotate-45">+</span>
    </summary>
    <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">{children}</div>
  </details>
);

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange, clients = [], onClientSelect, domains = [], selectedClientId, onDomainSelect, onAddDomain }) => {
  const [newDomain, setNewDomain] = React.useState('');
  const set = (field: keyof InvoiceData, value: any) => onChange({ ...data, [field]: value } as InvoiceData);

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
    if (data.items.length <= 1) return;
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      amount: '0',
      currency: 'USD',
      dueDate: '',
      status: 'Pending'
    };
    onChange({ ...data, milestones: [...data.milestones, newMilestone] });
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    const newMilestones = data.milestones.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange({ ...data, milestones: newMilestones });
  };

  const removeMilestone = (id: string) => {
    onChange({ ...data, milestones: data.milestones.filter(m => m.id !== id) });
  };


  return (
    <div className="space-y-3">
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

      <SectionCard title="Project Domain" description="Optionally connect this invoice to a client website domain.">
        <div>
          <label className={LABEL}>Domain (optional)</label>
          <select className={INPUT} value={data.projectDomain} onChange={e => onDomainSelect?.(e.target.value)}>
            <option value="">No domain</option>
            {domains.filter(domain => domain.clientId === selectedClientId).map(domain => <option key={domain.id} value={domain.value}>{domain.value}</option>)}
          </select>
        </div>
        {selectedClientId && <div className="flex flex-col gap-2 sm:flex-row">
          <input className={INPUT} value={newDomain} onChange={e=>setNewDomain(e.target.value)} placeholder="example.com" aria-label="Add a domain" />
          <button type="button" onClick={()=>{const value=newDomain.trim();if(value){onAddDomain?.(value);setNewDomain('');}}} className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Add domain</button>
        </div>}
        {!selectedClientId && <p className="text-xs text-slate-500">Select a client first to choose or add their domain.</p>}
      </SectionCard>

      <SectionCard title="Client Details" description="Choose a saved client for this invoice.">
        <div>
          <label className={LABEL}>Select saved client</label>
          <select className={INPUT} value={selectedClientId ?? ''} onChange={e => onClientSelect?.(e.target.value)}>
            <option value="">Choose a client...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          {clients.length === 0 && <p className="mt-2 text-xs text-slate-500">Add a client from the Clients section to select them here.</p>}
        </div>
        {data.clientName && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{data.clientName}</span>
          {data.clientEmail && <span className="ml-3">{data.clientEmail}</span>}
          {data.clientPhone && <span className="ml-3">{data.clientPhone}</span>}
        </div>}
      </SectionCard>

      <SectionCard title="Invoice Info" description="Define the invoice number and dates.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={LABEL}>Invoice Number</label>
            <input
              className={INPUT}
              value={data.invoiceNumber}
              onChange={e => set('invoiceNumber', e.target.value)}
              placeholder="INV-2024-001"
            />
          </div>
          <div>
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
          </div>
          <div>
            <label className={LABEL}>Payment Status</label>
            <select className={INPUT} value={data.status} onChange={e => set('status', e.target.value)}>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
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

      <SectionCard title="Billing & Currency" description="Add service items and retainer amounts.">
        <div className="grid gap-5">
          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-4">One-time Services</p>
            <div className="space-y-6">
              {data.items.map((item) => (
                <div key={item.id} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-5">
                      <label className={LABEL}>Description</label>
                      <input
                        className={INPUT}
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={LABEL}>Qty</label>
                      <input
                        className={INPUT}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
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
                      <label className={LABEL}>Unit Price</label>
                      <input
                        className={INPUT}
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50">
                + Add Service Item
              </button>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-4">Monthly Retainer</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Currency</label>
                <select className={INPUT} value={data.monthlyCurrency} onChange={e => set('monthlyCurrency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Amount</label>
                <input className={INPUT} type="text" value={data.monthlyAmount} onChange={e => set('monthlyAmount', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-4">Discount</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Currency</label>
                <select className={INPUT} value={data.discountCurrency} onChange={e => set('discountCurrency', e.target.value)}>
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Amount</label>
                <input className={INPUT} type="number" value={data.discountAmount} onChange={e => set('discountAmount', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Payment Schedule" description="Define advance and milestone payments.">
        <div className="space-y-6">
          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-4">Advance Payment</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className={LABEL}>Currency</label>
                <select className={INPUT} value={data.advanceCurrency} onChange={e => set('advanceCurrency', e.target.value)}>
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Amount</label>
                <input className={INPUT} type="number" value={data.advanceAmount} onChange={e => set('advanceAmount', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Date</label>
                <input className={INPUT} type="date" value={data.advanceDate} onChange={e => set('advanceDate', e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select className={INPUT} value={data.advanceStatus} onChange={e => set('advanceStatus', e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Milestone Payments</p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={data.isMilestonePayment}
                  onChange={e => onChange({ ...data, isMilestonePayment: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-slate-950 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
              </label>
            </div>

            {data.isMilestonePayment && (
              <div className="space-y-4">
              {data.milestones.map((milestone) => (
                <div key={milestone.id} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-3">
                      <label className={LABEL}>Title</label>
                      <input className={INPUT} value={milestone.title} onChange={e => updateMilestone(milestone.id, 'title', e.target.value)} placeholder="e.g. Design Phase" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Currency</label>
                      <select className={INPUT} value={milestone.currency} onChange={e => updateMilestone(milestone.id, 'currency', e.target.value)}>
                        <option value="USD">USD</option>
                        <option value="PKR">PKR</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL}>Amount</label>
                      <input className={INPUT} type="number" value={milestone.amount} onChange={e => updateMilestone(milestone.id, 'amount', e.target.value)} />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={LABEL}>Due Date</label>
                      <input className={INPUT} type="date" value={milestone.dueDate} onChange={e => updateMilestone(milestone.id, 'dueDate', e.target.value)} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={LABEL}>Status</label>
                      <select className={INPUT} value={milestone.status} onChange={e => updateMilestone(milestone.id, 'status', e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button onClick={() => removeMilestone(milestone.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addMilestone} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50">
                + Add Milestone
              </button>
            </div>
            )}
          </div>

        </div>
      </SectionCard>
    </div>
  );
};

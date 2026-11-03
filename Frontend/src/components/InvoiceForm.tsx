import React from 'react';
import type { InvoiceData, InvoiceItem, InvoiceProjectDomain, Milestone } from '../types/invoice';
import { getLatestPaymentDueDate } from '../utils/invoiceDates';
import { CalendarDays } from 'lucide-react';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  clients?: Array<{ id: string; name: string; email: string; phone: string }>;
  onClientSelect?: (id: string) => void;
  domains?: Array<{ id: string; clientId: string; value: string }>;
  selectedClientId?: string;
  onAddDomain?: (value: string) => void;
}

const INPUT =
  'w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2';

type CalendarDateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const CalendarDateInput: React.FC<CalendarDateInputProps> = ({ className, 'aria-label': ariaLabel, ...props }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    } catch {
      input.focus();
    }
  };

  return (
    <div className="relative">
      <input {...props} ref={inputRef} aria-label={ariaLabel || 'Choose date'} type="date" className={`${className || INPUT} pr-11`} onKeyDown={event => { if (/^\d$/.test(event.key)) event.preventDefault(); }} onPaste={event => event.preventDefault()} />
      <button type="button" onClick={openCalendar} aria-label={`Open calendar${ariaLabel ? ` for ${ariaLabel}` : ""}`} title="Choose date" className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[14px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-500">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

const SectionCard: React.FC<{ title: string; description: string; children: React.ReactNode; open?: boolean; id?: string }> = ({ title, description, children, open = false, id }) => (
  <details id={id} open={open} className="group rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-lg text-slate-500 shadow-sm transition group-open:rotate-45">+</span>
    </summary>
    <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">{children}</div>
  </details>
);

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange, clients = [], onClientSelect, domains = [], selectedClientId, onAddDomain }) => {
  const [unitPriceDrafts, setUnitPriceDrafts] = React.useState<Record<string, string>>({});
  const priceDraftKey = (itemId: string) => String(data.invoiceNumber || data.clientName) + ':' + itemId;
  const blankProjectDomain = (id = Math.random().toString(36).slice(2, 11)): InvoiceProjectDomain => ({ id, domain: '', renewalPrice: '', renewalCurrency: 'USD', renewalDate: '', renewalPaidThisYear: false, renewalPaidDate: '' });
  const getProjectDomainRows = (): InvoiceProjectDomain[] => data.projectDomains?.length ? data.projectDomains : [{ id: 'primary', domain: data.projectDomain, renewalPrice: data.renewalPrice, renewalCurrency: data.renewalCurrency, renewalDate: data.renewalDate, renewalPaidThisYear: data.renewalPaidThisYear, renewalPaidDate: data.renewalPaidDate }];
  const updateProjectDomain = (id: string, field: keyof InvoiceProjectDomain, value: any) => {
    const rows = getProjectDomainRows().map(row => row.id === id ? { ...row, [field]: value } : row);
    const first = rows[0] || blankProjectDomain('primary');
    onChange({ ...data, projectDomains: rows, projectDomain: first.domain, renewalPrice: first.renewalPrice, renewalCurrency: first.renewalCurrency, renewalDate: first.renewalDate, renewalPaidThisYear: first.renewalPaidThisYear, renewalPaidDate: first.renewalPaidDate });
  };
  const addProjectDomain = () => onChange({ ...data, projectDomains: [...getProjectDomainRows(), blankProjectDomain()] });
  const removeProjectDomain = (id: string) => {
    const rows = getProjectDomainRows().filter(row => row.id !== id);
    const nextRows = rows.length ? rows : [blankProjectDomain('primary')];
    const first = nextRows[0];
    onChange({ ...data, projectDomains: nextRows, projectDomain: first.domain, renewalPrice: first.renewalPrice, renewalCurrency: first.renewalCurrency, renewalDate: first.renewalDate, renewalPaidThisYear: first.renewalPaidThisYear, renewalPaidDate: first.renewalPaidDate });
  };
  const set = (field: keyof InvoiceData, value: any) => {
    const next = { ...data, [field]: value } as InvoiceData;
    const paymentFields: (keyof InvoiceData)[] = ['advanceAmount', 'advanceDate', 'advanceStatus'];
    onChange(paymentFields.includes(field) ? { ...next, dueDate: getLatestPaymentDueDate(next) } : next);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    const current = data.items.find(item => item.id === id);
    if (current && ((field === 'isPaid' && value === false && !current.isRecurring) || (field === 'isRecurring' && value === false && !current.isPaid))) return;
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value, ...(field === 'isRecurring' && value && !item.recurrenceDate ? { recurrenceDate: nextMonthDate() } : {}) } : item
    );
    const next = { ...data, items: newItems };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
  };

  const nextMonthDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const day = Math.min(now.getDate(), new Date(nextYear, nextMonth, 0).getDate());
    return nextYear + '-' + String(nextMonth).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      currency: 'USD',
      unitPrice: 0,
      isRecurring: true,
      recurrenceDate: nextMonthDate(),
      isPaid: false,
      paidDate: '',
      dueDate: ''
    };
    const next = { ...data, items: [...data.items, newItem] };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
  };

  const removeItem = (id: string) => {
    if (data.items.length <= 1) return;
    const next = { ...data, items: data.items.filter(item => item.id !== id) };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
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
    const next = { ...data, milestones: [...data.milestones, newMilestone] };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    const newMilestones = data.milestones.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    );
    const next = { ...data, milestones: newMilestones };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
  };

  const removeMilestone = (id: string) => {
    const next = { ...data, milestones: data.milestones.filter(m => m.id !== id) };
    onChange({ ...next, dueDate: getLatestPaymentDueDate(next) });
  };


  return (
    <div className="space-y-3">
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
      <SectionCard title="Invoice Info" description="Invoice number and due date are automatic. Only the issue date can be changed.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={LABEL}>Invoice Number (Automatic)</label>
            <input className={INPUT + ' cursor-not-allowed bg-slate-50 text-slate-500'} value={data.invoiceNumber} readOnly aria-readonly="true" placeholder="Select a client to generate" />
          </div>
          <div>
            <label className={LABEL}>Issue Date <span className="normal-case tracking-normal text-emerald-700">(editable)</span></label>
            <CalendarDateInput className={INPUT} value={data.issueDate} onChange={e => set('issueDate', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Final Payment Due <span className="normal-case tracking-normal text-slate-400">(automatic)</span></label>
            <input className={INPUT + ' cursor-not-allowed bg-slate-50 text-slate-500'} type="text" value={data.dueDate} readOnly aria-readonly="true" placeholder="Set service or payment due dates" />
            <p className="mt-1 text-xs text-slate-500">Automatically follows the last pending service or payment due date.</p>
          </div>
        </div>
      </SectionCard>
      <SectionCard open title="Project Domain" description="Optionally connect this invoice to one or more client website domains.">
        <div className="space-y-4">
          {getProjectDomainRows().map((domain, index) => (
            <div key={domain.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{getProjectDomainRows().length > 1 ? `Domain ${index + 1}` : 'Project domain'}</p>
                {index > 0 && <button type="button" onClick={() => removeProjectDomain(domain.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Remove</button>}
              </div>
              <label className={LABEL} htmlFor={`invoice-project-domain-${domain.id}`}>Domain (optional)</label>
              <input id={`invoice-project-domain-${domain.id}`} className={INPUT} value={domain.domain} onChange={e => updateProjectDomain(domain.id, 'domain', e.target.value)} onBlur={() => { if (domain.domain.trim() && selectedClientId) onAddDomain?.(domain.domain); }} list="client-project-domains" placeholder="example.com" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Domain renewal price</label>
                  <div className="flex gap-2">
                    <select className={INPUT + ' max-w-28'} value={domain.renewalCurrency} onChange={e => updateProjectDomain(domain.id, 'renewalCurrency', e.target.value)}><option value="USD">USD</option><option value="PKR">PKR</option></select>
                    <input className={INPUT} type="number" min="0" step="0.01" value={domain.renewalPrice} onChange={e => updateProjectDomain(domain.id, 'renewalPrice', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div><label className={LABEL}>Next renewal due date</label><CalendarDateInput className={INPUT} required={Number(domain.renewalPrice) > 0} value={domain.renewalDate} onChange={e => updateProjectDomain(domain.id, 'renewalDate', e.target.value)} /></div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={domain.renewalPaidThisYear} disabled={!domain.domain.trim()} onChange={e => updateProjectDomain(domain.id, 'renewalPaidThisYear', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Domain renewal paid for this year</label>
                {domain.renewalPaidThisYear && <div className="mt-3 max-w-xs"><label className={LABEL}>Date paid</label><CalendarDateInput className={INPUT} required value={domain.renewalPaidDate} onChange={e => updateProjectDomain(domain.id, 'renewalPaidDate', e.target.value)} /><p className="mt-1 text-xs text-slate-500">The next renewal due date remains above.</p></div>}
              </div>
            </div>
          ))}
          <button type="button" onClick={addProjectDomain} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"><span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-lg leading-none text-white">+</span>Add another domain</button>
          <datalist id="client-project-domains">{domains.filter(domain => domain.clientId === selectedClientId).map(domain => <option key={domain.id} value={domain.value} />)}</datalist>
        </div>
      </SectionCard>



      <SectionCard id="invoice-billing-details" title="Billing Details" description="Add one-time or recurring services.">
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
                        type="text"
                        inputMode="decimal"
                        value={unitPriceDrafts[priceDraftKey(item.id)] ?? (item.unitPrice === 0 ? '' : String(item.unitPrice))}
                        onChange={e => {
                          const value = e.target.value;
                          if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
                          setUnitPriceDrafts(current => ({ ...current, [priceDraftKey(item.id)]: value }));
                          updateItem(item.id, 'unitPrice', value === '' || value === '.' ? 0 : Number(value));
                        }}
                        onBlur={() => setUnitPriceDrafts(current => {
                          const next = { ...current };
                          delete next[priceDraftKey(item.id)];
                          return next;
                        })}
                        aria-label="Unit Price"
                        placeholder="0"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={Boolean(item.isRecurring)} onChange={e => updateItem(item.id, 'isRecurring', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                        Recurring monthly
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={Boolean(item.isPaid)} onChange={e => updateItem(item.id, 'isPaid', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                        Paid
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">Keep Paid or Recurring selected. You can select both when this service has been paid and will be charged again next month.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {!item.isPaid && <div><label className={LABEL}>Service payment due date</label><CalendarDateInput required className={INPUT} value={item.dueDate || ''} onChange={e => updateItem(item.id, 'dueDate', e.target.value)} /></div>}{item.isPaid && <div><label className={LABEL}>Date paid</label><CalendarDateInput required className={INPUT} value={item.paidDate || ''} onChange={e => updateItem(item.id, 'paidDate', e.target.value)} /></div>}
                      {item.isRecurring && <div><label className={LABEL}>Next monthly invoice date</label><CalendarDateInput required className={INPUT} value={item.recurrenceDate || ''} onChange={e => updateItem(item.id, 'recurrenceDate', e.target.value)} /><p className="mt-1 text-xs text-slate-500">An unpaid invoice is generated on this date, then monthly.</p></div>}
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
                <label className={LABEL}>{data.advanceStatus === 'Paid' ? 'Date paid' : 'Due date'}</label>
                <CalendarDateInput className={INPUT} value={data.advanceDate} onChange={e => set('advanceDate', e.target.value)} />
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
                  onChange={e => { const next = { ...data, isMilestonePayment: e.target.checked }; onChange({ ...next, dueDate: getLatestPaymentDueDate(next) }); }}
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
                      <CalendarDateInput className={INPUT} value={milestone.dueDate} onChange={e => updateMilestone(milestone.id, 'dueDate', e.target.value)} />
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

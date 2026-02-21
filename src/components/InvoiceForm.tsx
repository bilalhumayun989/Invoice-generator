import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { InvoiceData, InvoiceItem } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onPreview: () => void;
}

const inputClass =
  'w-full bg-white border border-[#e2d9c8] text-[#000000] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#333] focus:ring-2 focus:ring-[#00000015] transition-all placeholder-[#bbb] shadow-sm appearance-none';

const labelClass = 'block text-xs font-semibold text-[#000000] uppercase tracking-widest mb-1';
const sectionClass = 'mb-8';
const sectionTitleClass = 'text-[#000000] font-bold text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-3';

// DateInput — single calendar only, no double trigger
const DateInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        className={inputClass + ' cursor-pointer pr-9'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={e => {
          // prevent any parent from re-triggering
          e.stopPropagation();
          try { (e.target as HTMLInputElement).showPicker(); } catch (_) {}
        }}
      />
      {/* Icon — clicking it triggers the hidden input */}
      <span
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#000000] cursor-pointer"
        aria-hidden="true"
        onClick={e => {
          e.stopPropagation();
          ref.current?.focus();
          try { ref.current?.showPicker(); } catch (_) {}
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </div>
  );
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange, onPreview }) => {
  const set = (field: keyof InvoiceData, value: any) =>
    onChange({ ...data, [field]: value });

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) =>
    onChange({
      ...data,
      items: data.items.map(item =>
        item.id === id
          ? { ...item, [field]: field === 'description' ? value : Number(value) }
          : item
      ),
    });

  const addItem = () =>
    onChange({
      ...data,
      items: [...data.items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }],
    });

  const removeItem = (id: string) =>
    onChange({ ...data, items: data.items.filter(i => i.id !== id) });

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8" style={{ background: '#faf8f4' }}>

      {/* Invoice Meta */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>
          <span className="h-px flex-1 bg-[#e8d9c0]" />
          Invoice Details
          <span className="h-px flex-1 bg-[#e8d9c0]" />
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Invoice #</label>
            <input
              className={inputClass}
              value={data.invoiceNumber}
              onChange={e => set('invoiceNumber', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Issue Date</label>
            <DateInput value={data.issueDate} onChange={v => set('issueDate', v)} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <DateInput value={data.dueDate} onChange={v => set('dueDate', v)} />
          </div>
        </div>
      </div>

      {/* From */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>
          <span className="h-px flex-1 bg-[#e8d9c0]" />
          From (Your Company)
          <span className="h-px flex-1 bg-[#e8d9c0]" />
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelClass}>Company Name</label>
            <input className={inputClass} value={data.companyName} onChange={e => set('companyName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={data.companyEmail} onChange={e => set('companyEmail', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={data.companyPhone} onChange={e => set('companyPhone', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* To */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>
          <span className="h-px flex-1 bg-[#e8d9c0]" />
          Bill To (Client)
          <span className="h-px flex-1 bg-[#e8d9c0]" />
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Client Name</label>
              <input className={inputClass} value={data.clientName} onChange={e => set('clientName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Client Email</label>
              <input className={inputClass} value={data.clientEmail} onChange={e => set('clientEmail', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input className={inputClass} value={data.clientAddress} onChange={e => set('clientAddress', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>
          <span className="h-px flex-1 bg-[#e8d9c0]" />
          Line Items
          <span className="h-px flex-1 bg-[#e8d9c0]" />
        </p>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 mb-1">
            <span className="col-span-5 text-[10px] text-[#000000] uppercase tracking-widest">Description</span>
            <span className="col-span-2 text-[10px] text-[#000000] uppercase tracking-widest">Qty</span>
            <span className="col-span-3 text-[10px] text-[#000000] uppercase tracking-widest">Unit Price</span>
            <span className="col-span-2 text-[10px] text-[#000000] uppercase tracking-widest text-right">Total</span>
          </div>
          {data.items.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center group">
              <input
                className={`${inputClass} col-span-5`}
                placeholder="Description"
                value={item.description}
                onChange={e => updateItem(item.id, 'description', e.target.value)}
              />
              <input
                type="number"
                className={`${inputClass} col-span-2`}
                value={item.quantity}
                min={1}
                onChange={e => updateItem(item.id, 'quantity', e.target.value)}
              />
              <input
                type="number"
                className={`${inputClass} col-span-3`}
                value={item.unitPrice}
                min={0}
                onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
              />
              <div className="col-span-2 flex items-center justify-end gap-1">
                <span className="text-sm text-[#000000] font-mono font-semibold">
                  ${(item.quantity * item.unitPrice).toFixed(0)}
                </span>
                <Link
                  to="#"
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#000] hover:text-red-400 transition-all ml-1 text-xs"
                >✕</Link>
              </div>
            </div>
          ))}
        </div>
        <Link
          to="#"
          onClick={addItem}
          className="mt-3 text-xs text-[#000000] border border-dashed border-[#00000040] hover:border-[#000000] px-4 py-2 rounded-lg transition-colors w-full hover:bg-[#00000008] font-semibold"
        >
          + Add Line Item
        </Link>
      </div>

      {/* Tax & Notes */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>
          <span className="h-px flex-1 bg-[#e8d9c0]" />
          Summary
          <span className="h-px flex-1 bg-[#e8d9c0]" />
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tax Rate (%)</label>
            <input
              type="number"
              className={inputClass}
              value={data.taxRate}
              min={0}
              max={100}
              onChange={e => set('taxRate', Number(e.target.value))}
            />
          </div>
          <div className="text-right space-y-1 text-sm">
            <div className="flex justify-between text-[#555]">
              <span>Subtotal</span><span className="font-mono">R.s{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#555]">
              <span>Tax ({data.taxRate}%)</span><span className="font-mono">R.s{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#000000] font-bold text-base border-t border-[#e8d9c0] pt-1 mt-1">
              <span>Total</span><span className="font-mono">R.s{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Notes</label>
          <textarea
            className={`${inputClass} resize-none h-16`}
            value={data.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>

      {/* Preview Button (mobile) */}
      <Link
        to="#"
        onClick={onPreview}
        className="lg:hidden w-full bg-[#] text-white font-bold py-3 rounded-xl text-sm tracking-widest uppercase hover:bg-[#333] transition-colors shadow-md"
      >
        Preview Invoice →
      </Link>
    </div>
  );
};
import React, { useRef } from 'react';
import type { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
  onBack?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const subtotalPKR =
    data.items.reduce((sum, item) => {
      const t = item.quantity * Number(item.unitPrice || 0);
      return sum + (item.currency === 'PKR' ? t : t * 290);
    }, 0) +
    (data.monthlyRetainerCurrency === 'PKR'
      ? Number(data.monthlyRetainer || 0)
      : Number(data.monthlyRetainer || 0) * 290);

  const tax = subtotalPKR * (Number(data.taxRate || 0) / 100);
  const totalPKR = subtotalPKR + tax;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] font-serif">

      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-600 hover:text-black transition-colors"
          >
            ← Edit
          </button>
        )}

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Preview Mode</span>
        </div>

        <button
          onClick={handlePrint}
          className="text-xs sm:text-sm px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all active:scale-95"
        >
          Print Invoice
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex justify-center p-4 sm:p-6 lg:p-10 overflow-auto print:p-0 print:overflow-visible">
        <div
          ref={printRef}
          className="w-full max-w-[900px] bg-white rounded-2xl shadow border border-gray-200 print:shadow-none print:border-none print:max-w-none print:rounded-none"
        >

          {/* TOP LINE */}
          <div className="h-1 bg-black" />

          <div className="p-5 sm:p-8 lg:p-12">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold truncate">
                  {data.companyName}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {data.companyEmail}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {data.companyPhone}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <h1 className="text-2xl sm:text-4xl font-light tracking-widest">
                  INVOICE
                </h1>
                <p className="text-xs mt-1 text-gray-500">
                  {data.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="h-[2px] bg-black mb-6" />

            {/* PARTIES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  From
                </p>
                <p className="font-semibold">{data.companyName}</p>
                <p className="text-sm text-gray-600">
                  {data.companyEmail}<br />{data.companyPhone}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  Bill To
                </p>
                <p className="font-semibold">{data.clientName}</p>
                <p className="text-sm text-gray-600">
                  {data.clientEmail}<br />{data.clientAddress}
                </p>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-xs uppercase">
                    <th className="text-left py-2">Description</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.description || '-'}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">
                        {item.currency === 'PKR' ? 'Rs.' : '$'}
                        {fmt(Number(item.unitPrice))}
                      </td>
                      <td className="text-right font-semibold">
                        {item.currency === 'PKR' ? 'Rs.' : '$'}
                        {fmt(item.quantity * Number(item.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTAL */}
            <div className="flex justify-end mb-8">
              <div className="w-full sm:w-72 bg-black text-white rounded-xl p-4 space-y-2">
                {data.monthlyRetainer && (
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Monthly Retainer</span>
                    <span>
                      {data.monthlyRetainerCurrency === 'PKR' ? 'Rs.' : '$'}
                      {fmt(Number(data.monthlyRetainer))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>Rs.{fmt(subtotalPKR)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Tax ({data.taxRate}%)</span>
                  <span>Rs.{fmt(tax)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>Rs.{fmt(totalPKR)}</span>
                </div>
              </div>
            </div>

            {/* NOTES */}
            {(data.notes || data.bankAccountDetails || data.debitCardDetails) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.notes && (
                  <div className="p-4 bg-gray-50 border-l-4 border-black">
                    <p className="text-xs uppercase font-bold mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{data.notes}</p>
                  </div>
                )}

                {(data.bankAccountDetails || data.debitCardDetails) && (
                  <div className="p-4 bg-gray-50 border-l-4 border-black">
                    <p className="text-xs uppercase font-bold mb-1">
                      Payment Details
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {[data.bankAccountDetails, data.debitCardDetails]
                        .filter(Boolean)
                        .join('\n\n')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FOOTER */}
            <div className="mt-10 pt-4 border-t text-xs text-gray-400 flex justify-between">
              <span>Thank you for your business.</span>
              <span>{data.invoiceNumber}</span>
            </div>

          </div>

          <div className="h-1 bg-black" />
        </div>
      </div>
    </div>
  );
};
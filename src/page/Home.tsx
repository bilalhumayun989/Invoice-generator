import React, { useState, useRef } from 'react';
import { defaultInvoiceData, type InvoiceData } from '../types/invoice';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';
import { DropZone } from '../components/DropZone';

export const Home: React.FC = () => {
  const [data, setData] = useState<InvoiceData>(defaultInvoiceData);
  const [showPreview, setShowPreview] = useState(false);
  const printFnRef = useRef<(() => void) | null>(null);

  const handleNavPrint = () => {
    if (printFnRef.current) {
      printFnRef.current();
    } else {
      alert('Please generate the invoice preview first.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-body">
      <div className="noise-overlay"></div>
      <nav className="fixed top-0 left-0 z-50 w-full border-b border-slate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] bg-white/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <span className="text-lg sm:text-xl font-bold tracking-tighter text-slate-950 font-headline">
            Broshtech Invoice
          </span>
          <button
            onClick={handleNavPrint}
            disabled={!showPreview}
            title={!showPreview ? 'Generate preview first' : 'Download / Print PDF'}
            className="flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      </nav>

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 sm:gap-12 px-4 sm:px-8 pb-12 pt-24 sm:pb-24 sm:pt-32">
        <header className="text-center">
          <p className="text-[10px] sm:text-sm uppercase tracking-[0.35em] text-slate-500">Creation Workspace</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">New Invoice</h1>
        </header>

        <section className="glass-card rounded-[1.25rem] p-4 sm:p-8 shadow-2xl border border-white/30">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold">Billing &amp; Company</h2>
              <p className="text-sm text-slate-500">Enter your invoice details here.</p>
            </div>
          </div>
          
          <DropZone onDataExtracted={(extractedData) => {
            setData(prev => ({
              ...prev,
              ...extractedData
            }));
          }} />

          <InvoiceForm data={data} onChange={setData} />
        </section>

        <div className="flex justify-center print:hidden">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="rounded-[1rem] bg-slate-950 px-10 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-black"
          >
            Generate Invoice Preview
          </button>
        </div>

        {showPreview && (
          <section className="glass-card rounded-[1.25rem] p-4 sm:p-8 shadow-2xl border border-white/30">
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h2 className="font-headline text-lg font-bold">Invoice Review</h2>
                <p className="text-sm text-slate-500">Preview of your invoice details below.</p>
              </div>
            </div>
            <div className="rounded-[1.25rem] bg-white p-2 sm:p-6 shadow-inner overflow-x-auto">
              <InvoicePreview
                data={data}
                onPrint={(fn) => { printFnRef.current = fn; }}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;

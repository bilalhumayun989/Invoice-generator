import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultInvoiceData, type InvoiceData } from '../types/invoice';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';

type Tab = 'form' | 'preview';

export const Home: React.FC = () => {
  const [data, setData] = useState<InvoiceData>(defaultInvoiceData);
  const [activeTab, setActiveTab] = useState<Tab>('form');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: '#080808',
        fontFamily: "'Georgia', serif",
        color: '#000000',
      }}
    >
      {/* Top Nav */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b print:hidden"
        style={{ borderColor: '#1a1a1a', background: '#ffffff' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: '#000000', letterSpacing: '-0.5px' }}
          >
            <span style={{ color: '#000000' }}>Brosh {" "}</span> Tech

          </div>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex lg:hidden rounded-lg overflow-hidden border" style={{ borderColor: '#2a2a2a' }}>
          {(['form', 'preview'] as Tab[]).map(tab => (
            <Link
              key={tab}
              to="#"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 text-xs uppercase tracking-widest font-semibold transition-all"
              style={{
                background: activeTab === tab ? '#000000' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#666',
              }}
            >
              {tab === 'form' ? 'Edit' : 'Preview'}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs" style={{ color: '#444' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Live Preview
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left: Form */}
        <div
          className={`
            ${activeTab === 'form' ? 'flex' : 'hidden'} lg:flex
            flex-col w-full lg:w-[45%] border-r print:hidden
          `}
          style={{ borderColor: '#1a1a1a', background: '#ffffff', overflow: 'hidden' }}
        >
          <div className="px-6 py-3  sm:py-5 border-b flex items-center gap-2" style={{ borderColor: '#1a1a1a' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#000000' }} />
            <span className="text-xs uppercase tracking-[3px]" style={{ color: '#000' }}>Invoice Editor</span>
          </div>
          <InvoiceForm data={data} onChange={setData} onPreview={() => setActiveTab('preview')} />
        </div>

        {/* Right: Preview */}
        <div
          className={`
            ${activeTab === 'preview' ? 'flex' : 'hidden'} lg:flex
            flex-col flex-1 print:p-0 print:bg-white
          `}
          style={{ background: '#111', overflow: 'hidden' }}
        >
          <InvoicePreview data={data} onBack={() => setActiveTab('form')} />
        </div>
      </main>
    </div>
  );
};

export default Home;
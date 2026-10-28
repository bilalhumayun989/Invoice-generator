import React, { useState, useRef, useEffect } from 'react';
import { defaultInvoiceData, type InvoiceData } from '../types/invoice';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';
import { DropZone } from '../components/DropZone';

interface SavedInvoice {
  id: string;
  updatedAt: string;
  data: InvoiceData;
  clientId?: string;
}

interface SavedInvoiceState {
  invoices: SavedInvoice[];
  error: string;
}

interface Client { id: string; name: string; email: string; phone: string }
interface ClientDomain { id: string; clientId: string; value: string; companyName?: string }

const SAVED_INVOICES_KEY = 'broshtech-saved-invoices';
const CLIENTS_KEY = 'broshtech-clients';
const DOMAINS_KEY = 'broshtech-domains';

const readClients = (): Client[] => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CLIENTS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((client): client is Client => Boolean(client && typeof client.id === 'string' && typeof client.name === 'string' && typeof client.email === 'string' && typeof client.phone === 'string')) : [];
  } catch { return []; }
};

const readDomains = (): ClientDomain[] => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(DOMAINS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((domain): domain is ClientDomain => Boolean(domain && typeof domain.id === 'string' && typeof domain.clientId === 'string' && typeof domain.value === 'string')) : [];
  } catch { return []; }
};

const readSavedInvoiceState = (): SavedInvoiceState => {
  try {
    const storedInvoices = window.localStorage.getItem(SAVED_INVOICES_KEY);
    if (!storedInvoices) return { invoices: [], error: '' };

    const parsed: unknown = JSON.parse(storedInvoices);
    if (!Array.isArray(parsed)) {
      throw new Error('Saved invoice data is not in the expected format.');
    }

    const invoices = parsed.map((entry): SavedInvoice => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        !('id' in entry) ||
        typeof entry.id !== 'string' ||
        !('updatedAt' in entry) ||
        typeof entry.updatedAt !== 'string' ||
        !('data' in entry) ||
        typeof entry.data !== 'object' ||
        entry.data === null
      ) {
        throw new Error('A saved invoice is not in the expected format.');
      }

      const invoiceData = entry.data as Partial<InvoiceData>;
      return {
        id: entry.id,
        updatedAt: entry.updatedAt,
        clientId: 'clientId' in entry && typeof entry.clientId === 'string' ? entry.clientId : undefined,
        data: {
          ...defaultInvoiceData,
          ...invoiceData,
          status: invoiceData.status === 'Paid' ? 'Paid' : 'Unpaid',
          items: Array.isArray(invoiceData.items) ? invoiceData.items : defaultInvoiceData.items,
          milestones: Array.isArray(invoiceData.milestones) ? invoiceData.milestones : defaultInvoiceData.milestones,
        },
      };
    });

    return { invoices, error: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown storage error.';
    return { invoices: [], error: `Could not load saved invoices: ${message}` };
  }
};

const createInvoiceCopy = (): InvoiceData => ({
  ...defaultInvoiceData,
  invoiceNumber: '', issueDate: '', dueDate: '',
  companyName: '', companyAddress: '', companyEmail: '', companyPhone: '',
  clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', projectDomain: '',
  bankName: '', accountTitle: '', accountNumber: '',
  monthlyAmount: '', billingMonth: '', monthlyDescription: '',
  discountPercent: '', discountAmount: '', advanceAmount: '', advanceDate: '', notes: '',
  items: [], milestones: [],
});

export const Home: React.FC = () => {
  const [data, setData] = useState<InvoiceData>(createInvoiceCopy);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState<'new' | 'invoices' | 'clients' | 'domains'>(() => (new URLSearchParams(window.location.search).has('clientId') || new URLSearchParams(window.location.search).has('invoiceId')) ? 'invoices' : 'clients');
  const [detailInvoice, setDetailInvoice] = useState<SavedInvoice | null>(null);
  const [clientFilterId, setClientFilterId] = useState(() => new URLSearchParams(window.location.search).get('clientId') ?? '');
  const [savedInvoiceState, setSavedInvoiceState] = useState<SavedInvoiceState>(readSavedInvoiceState);
  const [clients, setClients] = useState<Client[]>(readClients);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [domains, setDomains] = useState<ClientDomain[]>(readDomains);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const printFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const invoiceId = new URLSearchParams(window.location.search).get('invoiceId');
    if (invoiceId) setDetailInvoice(savedInvoiceState.invoices.find(invoice => invoice.id === invoiceId) ?? null);
  }, [savedInvoiceState.invoices]);

  const updateInvoiceUrl = (clientId = '', invoiceId = '') => {
    const url = new URL(window.location.href);
    if (clientId) url.searchParams.set('clientId', clientId);
    else url.searchParams.delete('clientId');
    if (invoiceId) url.searchParams.set('invoiceId', invoiceId);
    else url.searchParams.delete('invoiceId');
    window.history.pushState({}, '', url);
  };

  const viewClientInvoices = (client: Client) => {
    setClientFilterId(client.id);
    setSelectedClient(client);
    setDetailInvoice(null);
    setPage('invoices');
    updateInvoiceUrl(client.id);
  };

  const filteredInvoices = savedInvoiceState.invoices.filter(invoice => {
    if (!clientFilterId) return true;
    const client = clients.find(item => item.id === clientFilterId);
    return invoice.clientId === clientFilterId || (!invoice.clientId && Boolean(client) && invoice.data.clientName.trim().toLowerCase() === client?.name.trim().toLowerCase());
  });

  const persistInvoices = (invoices: SavedInvoice[]) => {
    try {
      window.localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(invoices));
      setSavedInvoiceState({ invoices, error: '' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown storage error.';
      setSavedInvoiceState(previous => ({
        ...previous,
        error: `Could not save invoices in this browser: ${message}`,
      }));
      return false;
    }
  };

  const handleSaveInvoice = () => {
    const id = selectedInvoiceId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const invoice: SavedInvoice = {
      id,
      updatedAt: new Date().toISOString(),
      clientId: selectedClientId || clients.find(client => client.name === data.clientName && client.email === data.clientEmail && client.phone === data.clientPhone)?.id,
      data,
    };
    const invoices = [
      invoice,
      ...savedInvoiceState.invoices.filter(savedInvoice => savedInvoice.id !== id),
    ];

    if (persistInvoices(invoices)) setSelectedInvoiceId(id);
  };

  const handleLoadInvoice = (invoice: SavedInvoice) => {
    setData({
      ...invoice.data,
      items: invoice.data.items.map(item => ({ ...item })),
      milestones: invoice.data.milestones.map(milestone => ({ ...milestone })),
    });
    setSelectedInvoiceId(invoice.id);
    setSelectedClientId(invoice.clientId ?? clients.find(client => client.name === invoice.data.clientName && client.email === invoice.data.clientEmail && client.phone === invoice.data.clientPhone)?.id ?? '');
    setShowPreview(false);
  };

  const handleNewInvoice = () => {
    setData(createInvoiceCopy());
    setSelectedInvoiceId(null);
    setShowPreview(false);
    setDetailInvoice(null);
    setPage('new');
    setSelectedClientId('');
    setClientFilterId('');
    updateInvoiceUrl();
  };

  const handleCancelInvoice = () => {
    setData(createInvoiceCopy());
    setSelectedInvoiceId(null);
    setSelectedClientId('');
    setShowPreview(false);
    setPage('new');
  };

  const handleDeleteInvoice = (invoice: SavedInvoice) => {
    if (!window.confirm(`Delete invoice ${invoice.data.invoiceNumber}? This cannot be undone.`)) return;
    const invoices = savedInvoiceState.invoices.filter(saved => saved.id !== invoice.id);
    if (persistInvoices(invoices)) {
      if (selectedInvoiceId === invoice.id) handleNewInvoice();
      if (detailInvoice?.id === invoice.id) {
        setDetailInvoice(null);
        updateInvoiceUrl(clientFilterId);
      }
    }
  };

  const saveClient = (event: React.FormEvent) => {
    event.preventDefault();
    const name = clientName.trim();
    if (!name) return;
    const updated = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, email: clientEmail.trim(), phone: clientPhone.trim() }, ...clients];
    try {
      window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(updated));
      setClients(updated);
      setClientName(''); setClientEmail(''); setClientPhone('');
    } catch { alert('Could not save this client in this browser.'); }
  };

  const deleteClient = (client: Client) => {
    if (!window.confirm(`Delete client ${client.name}? Saved invoices will remain.`)) return;
    const updated = clients.filter(saved => saved.id !== client.id);
    try { window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(updated)); setClients(updated); if (selectedClient?.id === client.id) setSelectedClient(null); }
    catch { alert('Could not delete this client in this browser.'); }
  };

  const selectInvoiceClient = (id: string) => {
    const client = clients.find(saved => saved.id === id);
    if (client) { setSelectedClientId(id); setData(current => ({ ...current, clientName: client.name, clientEmail: client.email, clientPhone: client.phone, clientAddress: '', projectDomain: '' })); }
  };

  const addDomain = (value: string) => {
    const clientId = selectedClientId;
    if (!clientId) return;
    const normalized = value.replace(/^https?:\/\//i, '').replace(/\/$/, '').trim();
    if (!normalized) return;
    const existing = domains.find(domain => domain.clientId === clientId && domain.value.toLowerCase() === normalized.toLowerCase());
    if (existing) { setData(current => ({ ...current, projectDomain: existing.value })); return; }
    const updated = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, clientId, value: normalized, companyName: data.companyName }, ...domains];
    try { window.localStorage.setItem(DOMAINS_KEY, JSON.stringify(updated)); setDomains(updated); setData(current => ({ ...current, projectDomain: normalized })); }
    catch { alert('Could not save this domain in this browser.'); }
  };

  const handleTogglePaymentStatus = (invoice: SavedInvoice) => {
    const updatedInvoice = {
      ...invoice,
      updatedAt: new Date().toISOString(),
      data: { ...invoice.data, status: invoice.data.status === 'Paid' ? 'Unpaid' as const : 'Paid' as const },
    };
    const invoices = [
      updatedInvoice,
      ...savedInvoiceState.invoices.filter(savedInvoice => savedInvoice.id !== invoice.id),
    ];

    if (persistInvoices(invoices) && selectedInvoiceId === invoice.id) {
      setData(updatedInvoice.data);
    }
  };

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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex print:hidden">
        <div className="px-3 text-lg font-bold tracking-tight">Broshtech <span className="text-slate-400">Invoice</span></div>
        <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
        <button onClick={() => { setPage('clients'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'clients' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Clients <span className="float-right text-xs opacity-60">{clients.length}</span></button>
        <button onClick={handleNewInvoice} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'new' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>+ New invoice</button>
        <button onClick={() => { setPage('invoices'); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'invoices' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Invoices <span className="float-right text-xs opacity-60">{savedInvoiceState.invoices.length}</span></button>
        <button onClick={() => { setPage('domains'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'domains' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Domains <span className="float-right text-xs opacity-60">{domains.length}</span></button>
        <div className="mt-auto px-3 text-xs text-slate-400">Saved on this device</div>
      </aside>
      <nav className="fixed top-0 left-0 z-50 w-full border-b border-slate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] bg-white/90 backdrop-blur-xl md:left-60 md:w-[calc(100%-15rem)] print:hidden">
        <div className="mx-auto flex w-full items-center justify-between px-4 sm:px-6 py-4">
          <span className="text-lg sm:text-xl font-bold tracking-tighter text-slate-950 font-headline">
            {page === 'new' ? (selectedInvoiceId ? 'Edit invoice' : 'New invoice') : page === 'clients' ? 'Clients' : page === 'domains' ? 'Domains' : 'Invoices'}
          </span>
          <div className="flex items-center gap-2">
            <select aria-label="Navigate" value={page} onChange={e=>{const nextPage=e.target.value as typeof page;setPage(nextPage);setDetailInvoice(null);setSelectedClient(null);if(nextPage!=="invoices"){setClientFilterId("");updateInvoiceUrl();}}} className="max-w-28 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 md:hidden"><option value="clients">Clients</option><option value="new">New invoice</option><option value="invoices">Invoices</option><option value="domains">Domains</option></select>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 pb-12 pt-24 sm:px-8 sm:pt-28 md:ml-60">
        {page === 'domains' ? <section className="glass-card rounded-2xl border border-white/30 p-4 shadow-xl sm:p-8"><h1 className="text-2xl font-black">Domains</h1><p className="mb-6 mt-1 text-sm text-slate-500">Domains saved to invoices, grouped by client.</p>{domains.length===0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No domains yet. Add a domain from an invoice after selecting a client.</p> : <div className="grid gap-3 sm:grid-cols-2">{domains.map(domain=>{const client=clients.find(saved=>saved.id===domain.clientId);const invoice=savedInvoiceState.invoices.find(saved=>saved.data.projectDomain===domain.value && (saved.clientId===domain.clientId || saved.clientId===undefined && saved.data.clientName===client?.name));return <button key={domain.id} onClick={()=>{if(client){setSelectedClient(client);setSelectedDomain(domain.value);setPage('clients');setClientFilterId('');updateInvoiceUrl();}}} className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-400 hover:shadow-sm"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Domain</span><span className="mt-1 block text-lg font-bold">{domain.value}</span><span className="mt-4 block text-sm text-slate-700">{client?.name || 'Client removed'}</span><span className="block text-sm text-slate-500">{domain.companyName || invoice?.data.companyName || 'Company not set'}</span><span className="mt-3 block text-xs font-semibold text-slate-500">Open client domains and invoices â†’</span></button>})}</div>}</section> : page === 'clients' ? <section className="glass-card rounded-2xl border border-white/30 p-4 shadow-xl sm:p-8">
          <h1 className="text-2xl font-black">Clients</h1><p className="mb-6 mt-1 text-sm text-slate-500">Add client contacts and manage their invoices.</p>
          <form onSubmit={saveClient} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 sm:items-end">
            <div><label className="mb-1 block text-xs font-semibold">Name *</label><input required value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client name" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold">Email (optional)</label><input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold">Phone (optional)</label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Add client</button>
          </form>
          {selectedClient ? <div><button onClick={()=>{setSelectedClient(null);setSelectedDomain("");setDetailInvoice(null);}} className="mb-4 text-sm font-semibold text-slate-500">Back to clients</button><div className="mb-4 rounded-xl border bg-white p-4"><h2 className="font-bold">{selectedClient.name}</h2><p className="text-sm text-slate-500">{selectedClient.email || 'No email'} Â· {selectedClient.phone || 'No phone'}</p></div><div className="mb-4 rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Domains</h3><button onClick={()=>setSelectedDomain("")} className="text-xs font-semibold text-slate-500">{selectedDomain ? "Show all invoices" : "All invoices"}</button></div><div className="mt-3 flex flex-wrap gap-2">{domains.filter(domain=>domain.clientId===selectedClient.id).map(domain=><button key={domain.id} onClick={()=>setSelectedDomain(domain.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedDomain===domain.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{domain.value}</button>)}{domains.every(domain=>domain.clientId!==selectedClient.id)&&<span className="text-sm text-slate-500">No domains added</span>}</div><button onClick={()=>{setSelectedInvoiceId(null);setShowPreview(false);setSelectedClientId(selectedClient.id);setData({...createInvoiceCopy(),clientName:selectedClient.name,clientEmail:selectedClient.email,clientPhone:selectedClient.phone});setPage("new");}} className="mt-3 text-xs font-semibold text-slate-600">Add domain from a new invoice</button></div>
            {detailInvoice ? <div className="rounded-xl border bg-white p-5"><button onClick={()=>{setDetailInvoice(null);updateInvoiceUrl(selectedClient.id);}} className="mb-4 text-sm text-slate-500">Back to client invoices</button><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-bold">{detailInvoice.data.invoiceNumber}</h3><p className="text-sm text-slate-500">{detailInvoice.data.status} Â· Due {detailInvoice.data.dueDate || 'â€”'}</p></div><div className="flex gap-2"><button onClick={()=>{handleLoadInvoice(detailInvoice);setPage('new');}} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(detailInvoice)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Delete</button></div></div><dl className="mt-5 grid gap-4 sm:grid-cols-2">{[['Client',detailInvoice.data.clientName],['Email',detailInvoice.data.clientEmail],['Phone',detailInvoice.data.clientPhone],['Company',detailInvoice.data.companyName],['Project domain',detailInvoice.data.projectDomain],['Issue date',detailInvoice.data.issueDate],['Due date',detailInvoice.data.dueDate],['Address',detailInvoice.data.clientAddress],['Bank',detailInvoice.data.bankName]].map(([label,value])=><div key={label}><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-sm">{value || 'â€”'}</dd></div>)}</dl><div className="mt-5 border-t pt-4"><h4 className="font-bold">Line items</h4>{detailInvoice.data.items.map(item=><p key={item.id} className="mt-2 text-sm text-slate-600">{item.description || 'Item'} Â· {item.quantity} Ã— {item.currency} {item.unitPrice}</p>)}</div></div>
            : <div className="space-y-2">{savedInvoiceState.invoices.filter(invoice=>(invoice.clientId===selectedClient.id || (!invoice.clientId && invoice.data.clientName.trim().toLowerCase()===selectedClient.name.trim().toLowerCase())) && (!selectedDomain || invoice.data.projectDomain===selectedDomain)).map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><b>{invoice.data.invoiceNumber}</b><p className="text-sm text-slate-500">{invoice.data.status} Â· Due {invoice.data.dueDate || 'â€”'}</p></div><div className="flex gap-2"><button onClick={()=>{setDetailInvoice(invoice);setClientFilterId(selectedClient.id);setPage("invoices");updateInvoiceUrl(selectedClient.id,invoice.id);}} className="rounded-full border px-4 py-2 text-xs font-bold">Details</button><button onClick={()=>{handleLoadInvoice(invoice);setPage('new');updateInvoiceUrl();setClientFilterId('');}} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(invoice)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}{savedInvoiceState.invoices.every(invoice=>(invoice.clientId!==selectedClient.id && (invoice.clientId || invoice.data.clientName.trim().toLowerCase()!==selectedClient.name.trim().toLowerCase())) || (selectedDomain && invoice.data.projectDomain!==selectedDomain))&&<p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">No invoices for this client yet.</p>}</div>}</div>
          : clients.length===0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No clients yet. Add one above.</p> : <div className="space-y-2">{clients.map(client=><div key={client.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4"><button onClick={()=>setSelectedClient(client)} className="text-left"><b>{client.name}</b><p className="text-sm text-slate-500">{client.email || 'No email'} Â· {client.phone || 'No phone'}</p><p className="mt-1 text-xs text-slate-400">{savedInvoiceState.invoices.filter(invoice=>invoice.data.clientName.trim().toLowerCase()===client.name.trim().toLowerCase()).length} invoices</p></button><div className="flex gap-2"><button onClick={()=>viewClientInvoices(client)} className="rounded-full border px-4 py-2 text-xs font-bold">View invoices</button><button onClick={()=>deleteClient(client)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}</div>}
        </section> : page === 'invoices' ? <section className="glass-card rounded-2xl border border-white/30 p-4 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-black">{clientFilterId ? `Invoices for ${clients.find(client=>client.id===clientFilterId)?.name || 'client'}` : 'All invoices'}</h1><p className="mt-1 text-sm text-slate-500">Review, update, or remove saved invoices.</p>{clientFilterId && <button onClick={()=>{setClientFilterId('');updateInvoiceUrl();}} className="mt-2 text-xs font-semibold text-slate-500">Show all invoices</button>}</div><button onClick={handleNewInvoice} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">+ New invoice</button></div>
          {savedInvoiceState.error && <p role="alert" className="mb-4 text-sm text-red-700">{savedInvoiceState.error}</p>}
          {detailInvoice ? <div className="rounded-xl border border-slate-200 bg-white p-5"><button onClick={() => {setDetailInvoice(null);updateInvoiceUrl(clientFilterId);}} className="mb-4 text-sm font-semibold text-slate-500">â† All invoices</button><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{detailInvoice.data.invoiceNumber}</h2><p className="text-sm text-slate-500">{detailInvoice.data.clientName || 'No client'} Â· {detailInvoice.data.status}</p></div><div className="flex gap-2"><button onClick={() => {handleLoadInvoice(detailInvoice); setPage('new');updateInvoiceUrl();setClientFilterId('');}} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => handleDeleteInvoice(detailInvoice)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Delete</button></div></div><dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Company',detailInvoice.data.companyName],['Client email',detailInvoice.data.clientEmail],['Project domain',detailInvoice.data.projectDomain],['Issue date',detailInvoice.data.issueDate],['Due date',detailInvoice.data.dueDate],['Phone',detailInvoice.data.clientPhone],['Address',detailInvoice.data.clientAddress],['Bank',detailInvoice.data.bankName],['Account title',detailInvoice.data.accountTitle],['Account number',detailInvoice.data.accountNumber]].map(([label,value])=><div key={label}><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{value || 'â€”'}</dd></div>)}</dl><div className="mt-6 border-t pt-4"><h3 className="font-bold">Line items</h3>{detailInvoice.data.items.map(item=><p key={item.id} className="mt-2 text-sm text-slate-600">{item.description || 'Item'} Â· {item.quantity} Ã— {item.currency} {item.unitPrice}</p>)}</div></div> : filteredInvoices.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No saved invoices yet for this client.</p> : <div className="space-y-3">{filteredInvoices.map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><div className="font-bold">{invoice.data.invoiceNumber} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase">{invoice.data.status}</span></div><p className="mt-1 text-sm text-slate-500">{invoice.data.clientName || 'No client'} Â· Due {invoice.data.dueDate || 'â€”'}</p></div><div className="flex gap-2"><button onClick={()=>{setDetailInvoice(invoice);updateInvoiceUrl(clientFilterId,invoice.id);}} className="rounded-full border px-4 py-2 text-xs font-bold">View details</button><button onClick={()=>{handleLoadInvoice(invoice);setPage('new');updateInvoiceUrl();setClientFilterId('');}} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(invoice)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}</div>}
        </section> : <>
        <header className="text-center">
          <p className="text-[10px] sm:text-sm uppercase tracking-[0.35em] text-slate-500">Creation Workspace</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {selectedInvoiceId ? 'Edit Invoice' : 'New Invoice'}
          </h1>
        </header><section className="glass-card rounded-[1.25rem] p-4 sm:p-8 shadow-2xl border border-white/30">
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

          <InvoiceForm data={data} onChange={setData} clients={clients} onClientSelect={selectInvoiceClient} domains={domains} selectedClientId={selectedClientId} onDomainSelect={value=>setData(current=>({...current,projectDomain:value}))} onAddDomain={addDomain} />
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button type="button" onClick={handleCancelInvoice} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel and clear</button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleSaveInvoice} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">{selectedInvoiceId ? 'Update invoice' : 'Save to invoices'}</button>
            <button type="button" onClick={() => { setShowPreview(true); handleNavPrint(); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Generate official PDF
            </button>
          </div>
        </div>

          <section className={showPreview ? 'overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5' : 'hidden'}>
            <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-md shadow-slate-900/15">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 3.75h7l5 5v11.5H7a2 2 0 01-2-2v-12.5a2 2 0 012-2zM14 4v5h5M9 14h8M9 17h6" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700">Ready to review</p>
                  <h2 className="mt-1 font-headline text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Invoice Review</h2>
                  <p className="mt-1 text-sm text-slate-500">Check the details and totals before you download or print.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">{data.invoiceNumber || 'Draft invoice'}</span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${data.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{data.status}</span>
              </div>
            </div>
            <div className="overflow-x-auto bg-slate-100/70 p-3 sm:p-7">
              <InvoicePreview
                data={data}
                onPrint={(fn) => { printFnRef.current = fn; }}
              />
            </div>
          </section>
        </>}
      </main>
    </div>
  );
};

export default Home;

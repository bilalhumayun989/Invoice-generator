import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { defaultInvoiceData, getInvoiceProjectDomains, type InvoiceData } from '../types/invoice';
import { getLatestPaymentDueDate } from '../utils/invoiceDates';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';

interface SavedInvoice {
  id: string;
  updatedAt: string;
  data: InvoiceData;
  clientId?: string;
  recurringSourceId?: string;
}

interface SavedInvoiceState {
  invoices: SavedInvoice[];
  error: string;
}

interface Client { id: string; name: string; email: string; phone: string }
interface ClientDomain { id: string; invoiceId: string; clientId: string; value: string; companyName?: string; clientName?: string; clientEmail?: string; clientPhone?: string; invoiceNumber?: string; invoiceStatus?: string; projectDetail?: string; renewalPrice?: string; renewalCurrency?: string; renewalDate?: string; renewalPaidThisYear?: boolean; renewalPaidDate?: string }
type ApiCollection = 'invoices' | 'clients' | 'domains';

const readApiResponse = async (response: Response) => {
  const raw = await response.text();
  let result: Record<string, unknown> = {};
  try {
    result = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    throw new Error('Backend returned a non-JSON response (HTTP ' + response.status + '). Check that the Express server is running on port 3001.');
  }
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Backend request failed (HTTP ' + response.status + ').');
  return result;
};

const invoiceTotalPKR = (data: InvoiceData) => {
  const toPKR = (amount: number, currency: 'USD' | 'PKR') => amount * (currency === 'USD' ? 280 : 1);
  const services = (data.items || []).reduce((sum, item) => sum + toPKR(Number(item.unitPrice || 0) * Number(item.quantity || 1), item.currency || 'PKR'), 0);
  const monthly = toPKR(Number(data.monthlyAmount || 0), data.monthlyCurrency || 'PKR');
  const milestones = data.isMilestonePayment ? (data.milestones || []).reduce((sum, item) => sum + toPKR(Number(String(item.amount || 0).replace(/,/g, '')), item.currency), 0) : 0;
  const discount = toPKR(Number(data.discountAmount || 0), data.discountCurrency || 'PKR');
  return Math.max(0, services + monthly + milestones - discount);
};

const recurringDate = (invoice: SavedInvoice) => {
  const dates = [...getInvoiceProjectDomains(invoice.data).map(domain => domain.renewalDate), invoice.data.billingType === 'monthly-retainer' ? invoice.data.dueDate : '', ...invoice.data.items.filter(item => item.isRecurring).map(item => item.recurrenceDate || '')].filter(Boolean).sort();
  return dates[0] || '';
};

const localToday = () => {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
};

const createInvoiceCopy = (): InvoiceData => ({
  ...defaultInvoiceData,
  invoiceNumber: '', issueDate: localToday(), dueDate: '',
  clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', projectDomain: '', renewalPrice: '', renewalCurrency: 'USD', renewalDate: '', renewalPaidThisYear: false, renewalPaidDate: '',
  bankName: 'MEZN', accountTitle: 'BROSHTECH', accountNumber: 'PK12MEZN0004100115601102', companyAccountNumber: '04100115601102',
  monthlyAmount: '', billingMonth: '', monthlyDescription: '',
  discountPercent: '', discountAmount: '', advanceAmount: '', advanceDate: '', notes: '',
  items: [], milestones: [],
});

export const Home: React.FC = () => {
  const [data, setData] = useState<InvoiceData>(createInvoiceCopy);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [page, setPage] = useState<'dashboard' | 'new' | 'invoices' | 'clients' | 'domains' | 'recurring' | 'receipts'>(() => (new URLSearchParams(window.location.search).has('clientId') || new URLSearchParams(window.location.search).has('invoiceId')) ? 'invoices' : 'dashboard');
  const [detailInvoice, setDetailInvoice] = useState<SavedInvoice | null>(null);
  const [editOptionsInvoice, setEditOptionsInvoice] = useState<SavedInvoice | null>(null);
  const [quickEditStatus, setQuickEditStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState<SavedInvoice | null>(null);
  const [clientFilterId, setClientFilterId] = useState(() => new URLSearchParams(window.location.search).get('clientId') ?? '');
  const [savedInvoiceState, setSavedInvoiceState] = useState<SavedInvoiceState>({ invoices: [], error: '' });
  const [clients, setClients] = useState<Client[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [domains, setDomains] = useState<ClientDomain[]>([]);
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedReceiptClientId, setSelectedReceiptClientId] = useState('');
  const printFnRef = useRef<(() => void) | null>(null);
  const invoiceNumberRequestsRef = useRef(new Map<string, Promise<string>>());
  const requestInvoiceNumber = useCallback((clientName: string) => {
    const name = clientName.trim();
    if (!name) return Promise.reject(new Error('Select a client before generating an invoice number.'));
    const pending = invoiceNumberRequestsRef.current.get(name);
    if (pending) return pending;

    const request = fetch('/api/invoice-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: name }),
    }).then(readApiResponse).then(result => {
      if (typeof result.invoiceNumber !== 'string') throw new Error('Backend did not return an invoice number.');
      return result.invoiceNumber;
    });
    invoiceNumberRequestsRef.current.set(name, request);
    void request.then(
      () => invoiceNumberRequestsRef.current.delete(name),
      () => invoiceNumberRequestsRef.current.delete(name),
    );
    return request;
  }, []);

  useEffect(() => {
    const clientName = data.clientName.trim();
    if (!clientName || data.invoiceNumber || selectedInvoiceId) return;
    let cancelled = false;
    requestInvoiceNumber(clientName).then(invoiceNumber => {
      if (cancelled) return;
      setData(current => current.invoiceNumber || current.clientName.trim() !== clientName ? current : { ...current, invoiceNumber });
    }).catch(error => {
      if (!cancelled) setDatabaseError(`Could not generate invoice number: ${error instanceof Error ? error.message : 'Database request failed.'}`);
    });
    return () => { cancelled = true; };
  }, [data.clientName, data.invoiceNumber, selectedInvoiceId, requestInvoiceNumber]);

  // Saved invoices are the source of truth for the Domains section.
  const invoiceDomains = useMemo(() => {
    const byKey = new Map<string, ClientDomain>();
    for (const invoice of savedInvoiceState.invoices) {
      if (invoice.recurringSourceId) continue;
      const client = clients.find(saved => saved.id === invoice.clientId)
        ?? clients.find(saved => saved.name.trim().toLowerCase() === invoice.data.clientName.trim().toLowerCase());
      const clientId = client?.id ?? invoice.clientId ?? '';
      for (const projectDomain of getInvoiceProjectDomains(invoice.data)) {
        const value = projectDomain.domain.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
        if (!value) continue;
        const key = (clientId || invoice.data.clientName.trim().toLowerCase()) + '::' + value.toLowerCase();
        if (byKey.has(key)) continue;
        byKey.set(key, { id: key, clientId, clientName: client?.name || invoice.data.clientName, clientEmail: invoice.data.clientEmail, clientPhone: invoice.data.clientPhone, invoiceId: invoice.id, invoiceNumber: invoice.data.invoiceNumber, invoiceStatus: invoice.data.status, projectDetail: invoice.data.items.find(item => item.description.trim())?.description || invoice.data.monthlyDescription || '', renewalPrice: projectDomain.renewalPrice, renewalCurrency: projectDomain.renewalCurrency, renewalDate: projectDomain.renewalDate, renewalPaidThisYear: projectDomain.renewalPaidThisYear, renewalPaidDate: projectDomain.renewalPaidDate, value, companyName: invoice.data.companyName });
      }
    }
    return [...byKey.values()];
  }, [savedInvoiceState.invoices, clients]);

  const recurringInvoices = useMemo(() => savedInvoiceState.invoices
    .filter(invoice => !invoice.recurringSourceId && (invoice.data.billingType === 'monthly-retainer' || getInvoiceProjectDomains(invoice.data).length > 0 || invoice.data.items.some(item => item.isRecurring)))
    .sort((a, b) => (recurringDate(a) || '9999-12-31').localeCompare(recurringDate(b) || '9999-12-31')),
  [savedInvoiceState.invoices]);
  const paidInvoices = useMemo(() => savedInvoiceState.invoices
    .filter(invoice => invoice.data.status === 'Paid')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
  [savedInvoiceState.invoices]);
  const receiptClients = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; count: number }>();
    for (const invoice of paidInvoices) {
      const id = invoice.clientId || invoice.data.clientName.trim().toLowerCase() || invoice.id;
      const previous = grouped.get(id);
      grouped.set(id, { id, name: previous?.name || invoice.data.clientName || 'Unnamed client', count: (previous?.count || 0) + 1 });
    }
    return [...grouped.values()];
  }, [paidInvoices]);
  const upcomingActivities = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activities: Array<{ id: string; invoiceId: string; client: string; title: string; date: string; days: number; amount: string }> = [];
    const add = (invoiceId: string, id: string, client: string, title: string, dateValue: string, amount: string) => {
      if (!dateValue) return;
      const date = new Date(dateValue + 'T00:00:00'); if (Number.isNaN(date.getTime())) return;
      const days = Math.round((date.getTime() - today.getTime()) / 86400000);
      if (days <= 30 && days >= -30) activities.push({ id, invoiceId, client: client || 'No client', title, date: dateValue, days, amount });
    };
    for (const invoice of savedInvoiceState.invoices) {
      const data = invoice.data;
      const hasDetailedDueDates = data.items.some(item => !item.isPaid && item.dueDate) || (data.advanceStatus === 'Pending' && Number(data.advanceAmount) > 0) || data.milestones.some(item => item.status === 'Pending' && Number(item.amount) > 0);
      if (data.status !== 'Paid' && !hasDetailedDueDates) add(invoice.id, invoice.id + '-due', data.clientName, 'Invoice payment due', data.dueDate, data.status);
      if (data.advanceStatus === 'Pending' && Number(data.advanceAmount) > 0) add(invoice.id, invoice.id + '-advance', data.clientName, 'Advance payment', data.advanceDate, data.advanceCurrency + ' ' + data.advanceAmount);
      data.milestones.filter(item => item.status === 'Pending').forEach(item => add(invoice.id, invoice.id + '-milestone-' + item.id, data.clientName, item.title || 'Milestone payment', item.dueDate, item.currency + ' ' + item.amount));
      if (data.status !== 'Paid') data.items.filter(item => !item.isPaid && item.dueDate).forEach(item => add(invoice.id, invoice.id + '-service-due-' + item.id, data.clientName, item.description || 'Service payment', item.dueDate || '', item.currency + ' ' + (Number(item.unitPrice) * Number(item.quantity || 1))));
      getInvoiceProjectDomains(data).forEach(domain => add(invoice.id, invoice.id + '-domain-' + domain.id, data.clientName, 'Domain renewal: ' + domain.domain, domain.renewalDate, domain.renewalPrice ? domain.renewalCurrency + ' ' + domain.renewalPrice : 'Price not set'));
      data.items.filter(item => item.isRecurring).forEach(item => add(invoice.id, invoice.id + '-service-' + item.id, data.clientName, (item.description || 'Recurring service') + ' (monthly)', item.recurrenceDate || '', item.currency + ' ' + (Number(item.unitPrice) * Number(item.quantity || 1))));
    }
    return activities.sort((a, b) => a.days - b.days).slice(0, 12);
  }, [savedInvoiceState.invoices]);

  useEffect(() => {
    let cancelled = false;
    const loadDatabase = async () => {
      try {
        const response = await fetch('/api/data');
        const result = await readApiResponse(response);
        const invoices = (Array.isArray(result.invoices) ? result.invoices : []).map((invoice: SavedInvoice) => ({
          ...invoice,
          data: {
            ...defaultInvoiceData,
            ...invoice.data,
            items: Array.isArray(invoice.data?.items) ? invoice.data.items : [],
            milestones: Array.isArray(invoice.data?.milestones) ? invoice.data.milestones : [],
          },
        }));
        if (cancelled) return;
        setSavedInvoiceState({ invoices, error: '' });
        setClients(Array.isArray(result.clients) ? result.clients : []);
        setDomains(Array.isArray(result.domains) ? result.domains : []);
        setDatabaseError('');
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Database connection failed.';
        setDatabaseError(`Could not connect to the database: ${message}`);
      } finally {
        if (!cancelled) setDatabaseLoading(false);
      }
    };
    void loadDatabase();
    return () => { cancelled = true; };
  }, []);

  const persistCollection = async (collection: ApiCollection, records: Array<{ id: string }>, previousRecords: Array<{ id: string }>) => {
    const keepIds = new Set(records.map(record => record.id));
    const deleteIds = previousRecords.filter(record => !keepIds.has(record.id)).map(record => record.id);
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, records, deleteIds }),
    });
    await readApiResponse(response);
  };

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

  const openInvoiceDetails = (invoiceId: string) => {
    const invoice = savedInvoiceState.invoices.find(saved => saved.id === invoiceId);
    if (!invoice) return;
    const client = invoice.clientId ? clients.find(saved => saved.id === invoice.clientId) : clients.find(saved => saved.name.trim().toLowerCase() === invoice.data.clientName.trim().toLowerCase());
    const clientId = invoice.clientId || client?.id || '';
    setSelectedClient(null);
    setDetailInvoice(invoice);
    setClientFilterId(clientId);
    setPage('invoices');
    updateInvoiceUrl(clientId, invoice.id);
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

  const persistInvoices = async (invoices: SavedInvoice[]) => {
    try {
      await persistCollection('invoices', invoices, savedInvoiceState.invoices);
      setSavedInvoiceState({ invoices, error: '' });
      setDatabaseError('');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error.';
      setDatabaseError(`Could not save invoice: ${message}`);
      return false;
    }
  };

  const handleSaveInvoice = async () => {
    const invalidService = data.items.find(item => (!item.isPaid && !item.isRecurring) || (!item.isPaid && Number(item.unitPrice) * Number(item.quantity || 1) > 0 && !item.dueDate) || (item.isPaid && !item.paidDate) || (item.isRecurring && !item.recurrenceDate));
    if (invalidService) {
      window.alert(!invalidService.isPaid && !invalidService.isRecurring ? 'For each service, select Paid, Recurring, or both.' : !invalidService.isPaid && Number(invalidService.unitPrice) * Number(invalidService.quantity || 1) > 0 && !invalidService.dueDate ? 'Add the due date for each unpaid service.' : invalidService.isPaid && !invalidService.paidDate ? 'Add the paid date for each service marked Paid.' : 'Add the next monthly invoice date for each recurring service.');
      return;
    }
    const domainRows = data.projectDomains?.length ? data.projectDomains : [{ domain: data.projectDomain, renewalPrice: data.renewalPrice, renewalDate: data.renewalDate, renewalPaidThisYear: data.renewalPaidThisYear, renewalPaidDate: data.renewalPaidDate }];
    const invalidDomain = domainRows.find(domain => (Number(domain.renewalPrice) > 0 && (!domain.domain.trim() || !domain.renewalDate)) || (domain.renewalPaidThisYear && !domain.renewalPaidDate));
    if (invalidDomain) { window.alert(invalidDomain.renewalPaidThisYear ? 'Add the date the domain renewal was paid.' : !invalidDomain.domain.trim() ? 'Add a domain name for each renewal charge.' : 'Add a renewal due date for each domain charge.'); return; }
    if (Number(data.advanceAmount) > 0 && !data.advanceDate) { window.alert('Add a date for the advance payment.'); return; }
    if (data.isMilestonePayment && data.milestones.some(item => Number(item.amount) > 0 && !item.dueDate)) { window.alert('Add a due date for each milestone payment.'); return; }
    let invoiceData = { ...data, dueDate: getLatestPaymentDueDate(data) };
    if (!invoiceData.invoiceNumber) {
      try {
        const invoiceNumber = await requestInvoiceNumber(invoiceData.clientName);
        invoiceData = { ...invoiceData, invoiceNumber };
        setData(current => current.invoiceNumber ? current : { ...current, invoiceNumber });
      } catch (error) {
        setDatabaseError(`Could not generate invoice number: ${error instanceof Error ? error.message : 'Database request failed.'}`);
        return;
      }
    }
    const id = selectedInvoiceId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const invoice: SavedInvoice = {
      id,
      updatedAt: new Date().toISOString(),
      clientId: selectedClientId || clients.find(client => client.name === invoiceData.clientName && client.email === invoiceData.clientEmail && client.phone === invoiceData.clientPhone)?.id,
      data: invoiceData,
    };
    const invoices = [
      invoice,
      ...savedInvoiceState.invoices.filter(savedInvoice => savedInvoice.id !== id),
    ];

    if (await persistInvoices(invoices)) setSelectedInvoiceId(id);
  };

  const openInvoiceEditOptions = (invoice: SavedInvoice) => {
    setQuickEditStatus(invoice.data.status);
    setEditOptionsInvoice(invoice);
  };

  const saveQuickEditStatus = async () => {
    if (!editOptionsInvoice) return;
    const invoices = savedInvoiceState.invoices.map(invoice => invoice.id === editOptionsInvoice.id
      ? { ...invoice, updatedAt: new Date().toISOString(), data: { ...invoice.data, status: quickEditStatus } }
      : invoice);
    if (await persistInvoices(invoices)) {
      setEditOptionsInvoice(null);
      if (detailInvoice?.id === editOptionsInvoice.id) setDetailInvoice(invoices.find(invoice => invoice.id === editOptionsInvoice.id) || null);
    }
  };

  const handleLoadInvoice = (invoice: SavedInvoice) => {
    const loadedData: InvoiceData = {
      ...invoice.data,
      items: invoice.data.items.map(item => ({ ...item, dueDate: item.dueDate || (!item.isPaid ? invoice.data.dueDate : '') })),
      milestones: invoice.data.milestones.map(milestone => ({ ...milestone })),
    };
    loadedData.dueDate = getLatestPaymentDueDate(loadedData) || invoice.data.dueDate;
    setData(loadedData);
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

  const handleDeleteInvoice = async (invoice: SavedInvoice) => {
    if (!window.confirm(`Delete invoice ${invoice.data.invoiceNumber}? This cannot be undone.`)) return;
    const invoices = savedInvoiceState.invoices.filter(saved => saved.id !== invoice.id);
    if (await persistInvoices(invoices)) {
      if (selectedInvoiceId === invoice.id) handleNewInvoice();
      if (detailInvoice?.id === invoice.id) {
        setDetailInvoice(null);
        updateInvoiceUrl(clientFilterId);
      }
    }
  };

  const saveClient = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = clientName.trim();
    if (!name) return;
    const updated = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, email: clientEmail.trim(), phone: clientPhone.trim() }, ...clients];
    try {
      await persistCollection('clients', updated, clients);
      setClients(updated);
      setDatabaseError('');
      setClientName(''); setClientEmail(''); setClientPhone('');
    } catch (error) { setDatabaseError(`Could not save client: ${error instanceof Error ? error.message : 'Database error.'}`); }
  };

  const deleteClient = async (client: Client) => {
    if (!window.confirm(`Delete client ${client.name}? Saved invoices will remain.`)) return;
    const updated = clients.filter(saved => saved.id !== client.id);
    try { await persistCollection('clients', updated, clients); setClients(updated); setDatabaseError(''); if (selectedClient?.id === client.id) setSelectedClient(null); }
    catch (error) { setDatabaseError(`Could not delete client: ${error instanceof Error ? error.message : 'Database error.'}`); }
  };

  const selectInvoiceClient = (id: string) => {
    const client = clients.find(saved => saved.id === id);
    if (client) { setSelectedClientId(id); setData(current => ({ ...current, invoiceNumber: selectedInvoiceId ? current.invoiceNumber : '', clientName: client.name, clientEmail: client.email, clientPhone: client.phone, clientAddress: '', projectDomain: '', projectDomains: [], renewalPrice: '', renewalCurrency: 'USD', renewalDate: '', renewalPaidThisYear: false, renewalPaidDate: '' })); }
  };

  const addDomain = async (value: string) => {
    const clientId = selectedClientId;
    if (!clientId) return;
    const normalized = value.replace(/^https?:\/\//i, '').replace(/\/$/, '').trim();
    if (!normalized) return;
    const existing = domains.find(domain => domain.clientId === clientId && domain.value.toLowerCase() === normalized.toLowerCase());
    if (existing) return;
    const updated = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, invoiceId: '', clientId, value: normalized, companyName: data.companyName }, ...domains];
    try { await persistCollection('domains', updated, domains); setDomains(updated); setDatabaseError(''); }
    catch (error) { setDatabaseError(`Could not save domain: ${error instanceof Error ? error.message : 'Database error.'}`); }
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
        <button onClick={() => { setPage('dashboard'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={page === 'dashboard' ? 'rounded-xl bg-slate-950 px-3 py-3 text-left text-sm font-semibold text-white' : 'rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100'}>Dashboard</button>
        <button onClick={() => { setPage('clients'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'clients' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Clients <span className="float-right text-xs opacity-60">{clients.length}</span></button>
        <button onClick={handleNewInvoice} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'new' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>+ New invoice</button>
        <button onClick={() => { setPage('invoices'); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'invoices' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Invoices <span className="float-right text-xs opacity-60">{savedInvoiceState.invoices.length}</span></button>
        <button onClick={() => { setPage('recurring'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'recurring' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Recurrings <span className="float-right text-xs opacity-60">{recurringInvoices.length}</span></button>
        <button onClick={() => { setPage('domains'); setSelectedClient(null); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={`mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold ${page === 'domains' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Domains <span className="float-right text-xs opacity-60">{invoiceDomains.length}</span></button>
        <button onClick={() => { setPage('receipts'); setSelectedReceiptClientId(''); setDetailInvoice(null); setClientFilterId(''); updateInvoiceUrl(); }} className={page === 'receipts' ? 'mt-1 rounded-xl bg-slate-950 px-3 py-3 text-left text-sm font-semibold text-white' : 'mt-1 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100'}>Receipts <span className="float-right text-xs opacity-60">{paidInvoices.length}</span></button>
        <div className="mt-auto px-3 text-xs text-slate-400">Connected database</div>
      </aside>
      <nav className="fixed top-0 left-0 z-50 w-full border-b border-slate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] bg-white/90 backdrop-blur-xl md:left-60 md:w-[calc(100%-15rem)] print:hidden">
        <div className="mx-auto flex w-full items-center justify-between px-4 sm:px-6 py-4">
          <span className="text-lg sm:text-xl font-bold tracking-tighter text-slate-950 font-headline">
            {page === 'dashboard' ? 'Dashboard' : page === 'receipts' ? 'Receipts' : page === 'new' ? (selectedInvoiceId ? 'Edit invoice' : 'New invoice') : page === 'clients' ? 'Clients' : page === 'domains' ? 'Domains' : page === 'recurring' ? 'Recurrings' : 'Invoices'}
          </span>
          <div className="flex items-center gap-2">
            <select aria-label="Navigate" value={page} onChange={e=>{const nextPage=e.target.value as typeof page;setPage(nextPage);setDetailInvoice(null);setSelectedClient(null);if(nextPage!=="invoices"){setClientFilterId("");updateInvoiceUrl();}}} className="max-w-28 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 md:hidden"><option value="dashboard">Dashboard</option><option value="clients">Clients</option><option value="new">New invoice</option><option value="invoices">Invoices</option><option value="domains">Domains</option><option value="recurring">Recurrings</option><option value="receipts">Receipts</option></select>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 pb-12 pt-24 sm:px-8 sm:pt-28 md:ml-60">
        {databaseError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{databaseError}</p>}
        {editOptionsInvoice && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="invoice-edit-options-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="invoice-edit-options-title" className="text-xl font-bold">Edit {editOptionsInvoice.data.invoiceNumber}</h2><p className="mt-1 text-sm text-slate-500">Choose a quick status update or open the complete invoice form.</p><label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Quick edit ? Payment status<select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900" value={quickEditStatus} onChange={event => setQuickEditStatus(event.target.value as 'Paid' | 'Unpaid')}><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option></select></label><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setEditOptionsInvoice(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={() => {handleLoadInvoice(editOptionsInvoice);setEditOptionsInvoice(null);setPage('new');updateInvoiceUrl();setClientFilterId('');}} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Full edit</button><button onClick={() => void saveQuickEditStatus()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Save status</button></div></div></div>}
        {databaseLoading ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading records from the database...</section> : page === 'dashboard' ? <section className="space-y-6"><div><h1 className="text-2xl font-black">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Clients, invoices, renewals, and payments at a glance.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[{ label: 'Clients', value: clients.length }, { label: 'Domains', value: invoiceDomains.length }, { label: 'Recurring', value: recurringInvoices.length }, { label: 'Unpaid invoices', value: savedInvoiceState.invoices.filter(invoice => invoice.data.status !== 'Paid').length }, { label: 'Receipts', value: paidInvoices.length }].map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p></div>)}</div><div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Coming up</h2><p className="mt-1 text-sm text-slate-500">Payments and renewals due within 30 days, including overdue items.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{upcomingActivities.length}</span></div>{upcomingActivities.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Nothing due soon.</p> : <div className="mt-4 divide-y divide-slate-100">{upcomingActivities.map(activity => <button key={activity.id} type="button" onClick={() => openInvoiceDetails(activity.invoiceId)} className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"><div><p className="font-semibold text-slate-800">{activity.title}</p><p className="mt-1 text-sm text-slate-500">{activity.client} - {activity.date}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-800">{activity.amount}</p><p className={activity.days < 0 ? 'mt-1 text-xs font-semibold text-red-600' : activity.days === 0 ? 'mt-1 text-xs font-semibold text-amber-600' : 'mt-1 text-xs font-semibold text-slate-500'}>{activity.days < 0 ? 'Overdue by ' + Math.abs(activity.days) + ' days' : activity.days === 0 ? 'Due today' : 'Due in ' + activity.days + ' days'}</p></div></button>)}</div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent invoices</h2><button onClick={() => setPage('invoices')} className="text-sm font-semibold text-slate-600">View all</button></div>{savedInvoiceState.invoices.length === 0 ? <p className="mt-5 text-sm text-slate-500">Your saved invoices will appear here.</p> : <div className="mt-3 divide-y divide-slate-100">{savedInvoiceState.invoices.slice(0, 6).map(invoice => <button key={invoice.id} onClick={() => { setDetailInvoice(invoice); setClientFilterId(invoice.clientId || ''); setPage('invoices'); updateInvoiceUrl(invoice.clientId || '', invoice.id); }} className="flex w-full items-center justify-between gap-3 py-3 text-left"><span><span className="block text-sm font-semibold">{invoice.data.clientName || 'No client'}</span><span className="mt-1 block text-xs text-slate-500">{invoice.data.invoiceNumber} - Due {invoice.data.dueDate || 'No due date'}</span></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{invoice.data.status}</span></button>)}</div>}</section></div></section> : page === 'receipts' ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-950">Receipts</h1><p className="mt-1 text-sm text-slate-500">Paid invoices, organized by client.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">{paidInvoices.length} paid</span></div>
          {receiptClients.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No receipts yet. Mark an invoice as paid to see it here.</p> : <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-2"><p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Clients</p>{receiptClients.map(client => <button key={client.id} onClick={() => setSelectedReceiptClientId(client.id)} className={selectedReceiptClientId === client.id ? 'flex w-full items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white' : 'flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50'}><span>{client.name}</span><span className="text-xs opacity-70">{client.count}</span></button>)}</aside>
            <div className="space-y-2">{paidInvoices.filter(invoice => (invoice.clientId || invoice.data.clientName.trim().toLowerCase() || invoice.id) === (selectedReceiptClientId || receiptClients[0]?.id)).map(invoice => <button key={invoice.id} type="button" onClick={() => openInvoiceDetails(invoice.id)} className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 sm:grid-cols-[minmax(140px,1fr)_minmax(180px,1.5fr)_auto] sm:items-center">
              <span><span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Receipt</span><span className="mt-1 block font-bold text-slate-900">{invoice.data.invoiceNumber}</span><span className="mt-1 block text-xs text-slate-500">{invoice.data.issueDate || 'Date not set'}</span></span>
              <span className="flex flex-wrap gap-1.5">{getInvoiceProjectDomains(invoice.data).map(domain => <span key={domain.id} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">Domain: {domain.domain}</span>)}{invoice.data.items.filter(item => item.description.trim()).map(item => <span key={item.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.description}</span>)}{invoice.data.monthlyAmount && Number(invoice.data.monthlyAmount) > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{invoice.data.monthlyDescription || 'Monthly service'}</span>}</span>
              <span className="sm:text-right"><span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</span><span className="mt-1 block font-bold text-emerald-700">PKR {invoiceTotalPKR(invoice.data).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></span>
            </button>)}</div>
          </div>}
        </section> : page === 'recurring' ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-950">Recurrings</h1><p className="mt-1 text-sm text-slate-500">Invoices ordered by the next domain or service charge.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{recurringInvoices.length} invoices</span></div>
          {recurringInvoices.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No recurring domains or services yet.</p> : <div className="overflow-hidden rounded-xl border border-slate-200"><div className="hidden grid-cols-[minmax(150px,1fr)_minmax(220px,1.6fr)_minmax(120px,.8fr)_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Client / Invoice</span><span>Recurring charges</span><span>Coming up</span><span>Status</span></div><div className="divide-y divide-slate-100">{recurringInvoices.map(invoice => <button key={invoice.id} type="button" onClick={() => openInvoiceDetails(invoice.id)} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(150px,1fr)_minmax(220px,1.6fr)_minmax(120px,.8fr)_auto] md:items-center md:gap-4">
            <span><span className="block font-bold text-slate-900">{invoice.data.clientName || 'No client'}</span><span className="mt-1 block text-xs text-slate-500">{invoice.data.invoiceNumber}</span></span>
            <span className="space-y-1.5">{getInvoiceProjectDomains(invoice.data).map(domain => <span key={domain.id} className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold text-slate-800">Domain: {domain.domain}</span><span className="text-slate-500">{domain.renewalPrice ? `${domain.renewalCurrency} ${domain.renewalPrice} / year` : 'Renewal price not set'}</span></span>)}{invoice.data.billingType === 'monthly-retainer' && Number(invoice.data.monthlyAmount) > 0 && <span className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold text-slate-800">{invoice.data.monthlyDescription || 'Monthly service'}</span><span className="text-slate-500">{invoice.data.monthlyCurrency} {Number(invoice.data.monthlyAmount).toLocaleString('en-US')} / month</span></span>}{invoice.data.items.filter(item => item.isRecurring).map(item => <span key={item.id} className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold text-slate-800">{item.description || 'Recurring service'}</span><span className="text-slate-500">{item.currency} {(Number(item.unitPrice) * Number(item.quantity || 1)).toLocaleString('en-US')} / month</span></span>)}</span>
            <span><span className="block text-sm font-semibold text-slate-800">{recurringDate(invoice) || 'Date not set'}</span><span className="mt-1 block text-xs text-slate-500">Next charge</span></span>
            <span className={invoice.data.status === 'Paid' ? 'w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700' : 'w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800'}>{invoice.data.status}</span>
          </button>)}</div></div>}
        </section> : page === 'domains' ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-950">Domains</h1><p className="mt-1 text-sm text-slate-500">Client domains with project and renewal details.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{invoiceDomains.length} domains</span></div>
          {invoiceDomains.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No domains yet. Add a domain to an invoice to list it here.</p> : <div className="overflow-hidden rounded-xl border border-slate-200"><div className="hidden grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(140px,1fr)_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Domain / Client</span><span>Project</span><span>Renewal</span><span>Invoice</span></div><div className="divide-y divide-slate-100">{invoiceDomains.map(domain => <button key={domain.id} type="button" onClick={() => openInvoiceDetails(domain.invoiceId)} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(140px,1fr)_auto] md:items-center md:gap-4">
            <span><span className="block font-bold text-slate-900">{domain.value}</span><span className="mt-1 block text-sm text-slate-600">{domain.clientName || 'Client not linked'}</span><span className="mt-0.5 block text-xs text-slate-500">{domain.clientEmail || domain.clientPhone || 'No contact details'}</span></span>
            <span><span className="block text-sm font-medium text-slate-800">{domain.projectDetail || 'Project details not set'}</span><span className="mt-1 block text-xs text-slate-500">{domain.companyName || ''}</span></span>
            <span><span className="block text-sm font-semibold text-slate-800">{domain.renewalPrice ? `${domain.renewalCurrency} ${Number(domain.renewalPrice).toLocaleString('en-US')}` : 'Price not set'}</span><span className="mt-1 block text-xs text-slate-500">Due {domain.renewalDate || 'Date not set'}</span>{domain.renewalPaidThisYear && <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Paid this year</span>}</span>
            <span className="text-xs font-semibold text-slate-600">{domain.invoiceNumber || 'Open invoice'}<span className="mt-1 block text-slate-400">{domain.invoiceStatus || ''}</span></span>
          </button>)}</div></div>}
        </section> : page === 'clients' ? <section className="glass-card rounded-2xl border border-white/30 p-4 shadow-xl sm:p-8">
          <h1 className="text-2xl font-black">Clients</h1><p className="mb-6 mt-1 text-sm text-slate-500">Add client contacts and manage their invoices.</p>
          <form onSubmit={saveClient} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4 sm:items-end">
            <div><label className="mb-1 block text-xs font-semibold">Name *</label><input required value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Client name" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold">Email (optional)</label><input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-semibold">Phone (optional)</label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Add client</button>
          </form>
          {selectedClient ? <div><button onClick={()=>{setSelectedClient(null);setSelectedDomain("");setDetailInvoice(null);}} className="mb-4 text-sm font-semibold text-slate-500">Back to clients</button><div className="mb-4 rounded-xl border bg-white p-4"><h2 className="font-bold">{selectedClient.name}</h2><p className="text-sm text-slate-500">{selectedClient.email || 'No email'} · {selectedClient.phone || 'No phone'}</p></div><div className="mb-4 rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Domains</h3><button onClick={()=>setSelectedDomain("")} className="text-xs font-semibold text-slate-500">{selectedDomain ? "Show all invoices" : "All invoices"}</button></div><div className="mt-3 flex flex-wrap gap-2">{invoiceDomains.filter(domain=>domain.clientId===selectedClient.id).map(domain=><button key={domain.id} onClick={()=>setSelectedDomain(domain.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedDomain===domain.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{domain.value}</button>)}{invoiceDomains.every(domain=>domain.clientId!==selectedClient.id)&&<span className="text-sm text-slate-500">No domains added</span>}</div><button onClick={()=>{setSelectedInvoiceId(null);setShowPreview(false);setSelectedClientId(selectedClient.id);setData({...createInvoiceCopy(),clientName:selectedClient.name,clientEmail:selectedClient.email,clientPhone:selectedClient.phone});setPage("new");}} className="mt-3 text-xs font-semibold text-slate-600">Add domain from a new invoice</button></div>
            {detailInvoice ? <div className="rounded-xl border bg-white p-5"><button onClick={()=>{setDetailInvoice(null);updateInvoiceUrl(selectedClient.id);}} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to client invoices</button><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-bold">{detailInvoice.data.invoiceNumber}</h3><p className="text-sm text-slate-500">Due {detailInvoice.data.dueDate || '—'}</p></div><div className="flex gap-2"><button onClick={()=>setPdfPreviewInvoice(detailInvoice)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Open PDF</button><button onClick={()=>{handleLoadInvoice(detailInvoice);setPage('new');}} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(detailInvoice)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Delete</button></div></div><div className="my-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-600">Invoice total</span><span className="text-lg font-black text-slate-950">PKR {invoiceTotalPKR(detailInvoice.data).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div><dl className="mt-5 grid gap-4 sm:grid-cols-2">{[['Client',detailInvoice.data.clientName],['Email',detailInvoice.data.clientEmail],['Phone',detailInvoice.data.clientPhone],['Company',detailInvoice.data.companyName],['Project domain',getInvoiceProjectDomains(detailInvoice.data).map(domain => domain.domain).join(', ')],['Issue date',detailInvoice.data.issueDate],['Due date',detailInvoice.data.dueDate],['Address',detailInvoice.data.clientAddress]].map(([label,value])=><div key={label}><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-sm">{value || '—'}</dd></div>)}</dl><div className="mt-5 border-t pt-4"><h4 className="font-bold">Line items</h4>{detailInvoice.data.items.map(item=><p key={item.id} className="mt-2 text-sm text-slate-600">{item.description || 'Item'} · {item.quantity} × {item.currency} {item.unitPrice}</p>)}</div></div>
            : <div className="space-y-2">{savedInvoiceState.invoices.filter(invoice=>(invoice.clientId===selectedClient.id || (!invoice.clientId && invoice.data.clientName.trim().toLowerCase()===selectedClient.name.trim().toLowerCase())) && (!selectedDomain || getInvoiceProjectDomains(invoice.data).some(domain => domain.domain===selectedDomain))).map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><b>{invoice.data.invoiceNumber}</b><p className="text-sm text-slate-500">{invoice.data.status} · Due {invoice.data.dueDate || '—'}</p></div><div className="flex gap-2"><button onClick={()=>{setDetailInvoice(invoice);setClientFilterId(selectedClient.id);setPage("invoices");updateInvoiceUrl(selectedClient.id,invoice.id);}} className="rounded-full border px-4 py-2 text-xs font-bold">Details</button><button onClick={()=>openInvoiceEditOptions(invoice)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(invoice)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}{savedInvoiceState.invoices.every(invoice=>(invoice.clientId!==selectedClient.id && (invoice.clientId || invoice.data.clientName.trim().toLowerCase()!==selectedClient.name.trim().toLowerCase())) || (selectedDomain && !getInvoiceProjectDomains(invoice.data).some(domain => domain.domain===selectedDomain)))&&<p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">No invoices for this client yet.</p>}</div>}</div>
          : clients.length===0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No clients yet. Add one above.</p> : <div className="space-y-2">{clients.map(client=><div key={client.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4"><button onClick={()=>setSelectedClient(client)} className="text-left"><b>{client.name}</b><p className="text-sm text-slate-500">{client.email || 'No email'} · {client.phone || 'No phone'}</p><p className="mt-1 text-xs text-slate-400">{savedInvoiceState.invoices.filter(invoice=>invoice.data.clientName.trim().toLowerCase()===client.name.trim().toLowerCase()).length} invoices</p></button><div className="flex gap-2"><button onClick={()=>viewClientInvoices(client)} className="rounded-full border px-4 py-2 text-xs font-bold">View invoices</button><button onClick={()=>deleteClient(client)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}</div>}
        </section> : page === 'invoices' ? <section className="glass-card rounded-2xl border border-white/30 p-4 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-black">{clientFilterId ? `Invoices for ${clients.find(client=>client.id===clientFilterId)?.name || 'client'}` : 'All invoices'}</h1><p className="mt-1 text-sm text-slate-500">Review, update, or remove saved invoices.</p>{clientFilterId && <button onClick={()=>{setClientFilterId('');updateInvoiceUrl();}} className="mt-2 text-xs font-semibold text-slate-500">Show all invoices</button>}</div><button onClick={handleNewInvoice} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">+ New invoice</button></div>
          {savedInvoiceState.error && <p role="alert" className="mb-4 text-sm text-red-700">{savedInvoiceState.error}</p>}
          {detailInvoice ? <div className="rounded-xl border border-slate-200 bg-white p-5"><button onClick={() => {setDetailInvoice(null);updateInvoiceUrl(clientFilterId);}} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">← {clientFilterId ? 'Back to client invoices' : 'Back to invoices'}</button><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{detailInvoice.data.invoiceNumber}</h2><p className="text-sm text-slate-500">{detailInvoice.data.clientName || 'No client'}</p></div><div className="flex gap-2"><button onClick={() => setPdfPreviewInvoice(detailInvoice)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Open PDF</button><button onClick={() => openInvoiceEditOptions(detailInvoice)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Edit</button><button onClick={() => handleDeleteInvoice(detailInvoice)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Delete</button></div></div><div className="my-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-600">Invoice total</span><span className="text-lg font-black text-slate-950">PKR {invoiceTotalPKR(detailInvoice.data).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div><dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Company',detailInvoice.data.companyName],['Client email',detailInvoice.data.clientEmail],['Project domain',getInvoiceProjectDomains(detailInvoice.data).map(domain => domain.domain).join(', ')],['Issue date',detailInvoice.data.issueDate],['Due date',detailInvoice.data.dueDate],['Phone',detailInvoice.data.clientPhone],['Address',detailInvoice.data.clientAddress]].map(([label,value])=><div key={label}><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{value || '—'}</dd></div>)}</dl><div className="mt-6 border-t pt-4"><h3 className="font-bold">Line items</h3>{detailInvoice.data.items.map(item=><p key={item.id} className="mt-2 text-sm text-slate-600">{item.description || 'Item'} · {item.quantity} × {item.currency} {item.unitPrice}</p>)}</div></div> : filteredInvoices.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No saved invoices yet for this client.</p> : <div className="space-y-3">{filteredInvoices.map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><div className="font-bold">{invoice.data.invoiceNumber} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase">{invoice.data.status}</span></div><p className="mt-1 text-sm text-slate-500">{invoice.data.clientName || 'No client'} · Due {invoice.data.dueDate || '—'}</p></div><div className="flex gap-2"><button onClick={()=>setPdfPreviewInvoice(invoice)} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800">View invoice PDF</button><button onClick={()=>{setDetailInvoice(invoice);updateInvoiceUrl(clientFilterId,invoice.id);}} className="rounded-full border px-4 py-2 text-xs font-bold">View details</button><button onClick={()=>openInvoiceEditOptions(invoice)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">Edit</button><button onClick={()=>handleDeleteInvoice(invoice)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Delete</button></div></div>)}</div>}
        </section> : <>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] sm:text-sm uppercase tracking-[0.3em] text-slate-500">Creation Workspace</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {selectedInvoiceId ? 'Edit Invoice' : 'New Invoice'}
            </h1>
          </div>
                    <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <details className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex min-w-64 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M15 13v.01M15 16v.01M15 19v.01" /></svg></span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Your organisation</span><span className="block truncate text-sm font-bold text-slate-800">{data.companyName || 'Add company name'}</span></span>
                <span className="text-xs font-semibold text-slate-500 group-open:hidden">Edit</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Close</span>
              </summary>
              <div className="grid gap-3 border-t border-slate-100 p-4 sm:absolute sm:right-0 sm:top-full sm:z-30 sm:mt-2 sm:w-[28rem] sm:rounded-2xl sm:border sm:bg-white sm:shadow-xl">
                <label className="text-xs font-semibold text-slate-600">Organisation name<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyName} onChange={e=>setData(current=>({...current,companyName:e.target.value}))} /></label>
                <label className="text-xs font-semibold text-slate-600">Address<textarea className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyAddress} onChange={e=>setData(current=>({...current,companyAddress:e.target.value}))} /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Email<input type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyEmail} onChange={e=>setData(current=>({...current,companyEmail:e.target.value}))} /></label><label className="text-xs font-semibold text-slate-600">Phone<input type="tel" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyPhone} onChange={e=>setData(current=>({...current,companyPhone:e.target.value}))} /></label></div>
              </div>
            </details>
            <details className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex min-w-64 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm2 9h4" /></svg></span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing</span><span className="block truncate text-sm font-bold text-slate-800">{data.accountTitle || 'Add account details'}</span></span>
                <span className="text-xs font-semibold text-slate-500 group-open:hidden">Edit</span><span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Close</span>
              </summary>
              <div className="grid gap-3 border-t border-slate-100 p-4 sm:absolute sm:right-0 sm:top-full sm:z-30 sm:mt-2 sm:w-[28rem] sm:rounded-2xl sm:border sm:bg-white sm:shadow-xl">
                <p className="text-xs leading-5 text-slate-500">These payment details appear on invoices and paid receipts. Changes apply to this invoice.</p>
                <label className="text-xs font-semibold text-slate-600">Account title<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.accountTitle} onChange={e=>setData(current=>({...current,accountTitle:e.target.value}))} /></label>
                <label className="text-xs font-semibold text-slate-600">Account number<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyAccountNumber || ''} onChange={e=>setData(current=>({...current,companyAccountNumber:e.target.value}))} /></label>
                <label className="text-xs font-semibold text-slate-600">IBAN<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.accountNumber} onChange={e=>setData(current=>({...current,accountNumber:e.target.value}))} /></label>
                <label className="text-xs font-semibold text-slate-600">Address<textarea className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={data.companyAddress} onChange={e=>setData(current=>({...current,companyAddress:e.target.value}))} /></label>
              </div>
            </details>
          </div>
        </header><section className="glass-card rounded-[1.25rem] p-4 sm:p-8 shadow-2xl border border-white/30">
          <InvoiceForm data={data} onChange={setData} clients={clients} onClientSelect={selectInvoiceClient} domains={invoiceDomains} selectedClientId={selectedClientId} onAddDomain={addDomain} />
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
      {pdfPreviewInvoice && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3 sm:p-8 print:hidden"><section className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div><h2 className="font-bold">Invoice PDF Preview</h2><p className="text-xs text-slate-500">{pdfPreviewInvoice.data.invoiceNumber} - {pdfPreviewInvoice.data.clientName}</p></div><button onClick={() => setPdfPreviewInvoice(null)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Close</button></div><div className="max-h-[calc(100vh-90px)] overflow-y-auto bg-slate-100 p-2 sm:p-6"><InvoicePreview data={pdfPreviewInvoice.data} /></div></section></div>}
      </main>
    </div>
  );
};

export default Home;

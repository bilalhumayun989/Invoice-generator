export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  currency: 'USD' | 'PKR';
  unitPrice: number;
  isRecurring?: boolean;
  recurrenceDate?: string;
  isPaid?: boolean;
  paidDate?: string;
  dueDate?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount: string;
  currency: 'USD' | 'PKR';
  dueDate: string;
  status: 'Pending' | 'Paid';
}

export interface InvoiceProjectDomain {
  id: string;
  domain: string;
  renewalPrice: string;
  renewalCurrency: 'USD' | 'PKR';
  renewalDate: string;
  renewalPaidThisYear: boolean;
  renewalPaidDate: string;
}
export interface InvoiceData {
  invoiceNumber: string;
  status: 'Unpaid' | 'Paid';
  issueDate: string;
  dueDate: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDomain: string;
  projectDomains?: InvoiceProjectDomain[];
  renewalPrice: string;
  renewalCurrency: 'USD' | 'PKR';
  renewalDate: string;
  renewalPaidThisYear: boolean;
  renewalPaidDate: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  companyAccountNumber: string;
  oneTimeCurrency: 'USD' | 'PKR';
  monthlyCurrency: 'USD' | 'PKR';
  billingType: 'one-time' | 'monthly-retainer';
  monthlyAmount: string;
  billingMonth: string;
  monthlyDescription: string;
  discountCurrency: 'USD' | 'PKR';
  discountPercent: string;
  discountAmount: string;
  advanceCurrency: 'USD' | 'PKR';
  advanceAmount: string;
  advanceDate: string;
  advanceStatus: 'Pending' | 'Paid';
  isMilestonePayment: boolean;
  milestones: Milestone[];
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
}

export const getInvoiceProjectDomains = (data: InvoiceData): InvoiceProjectDomain[] => {
  const savedDomains = (data.projectDomains || []).filter(domain => domain.domain?.trim());
  if (savedDomains.length) return savedDomains;
  return data.projectDomain?.trim() ? [{ id: 'primary', domain: data.projectDomain, renewalPrice: data.renewalPrice || '', renewalCurrency: data.renewalCurrency || 'USD', renewalDate: data.renewalDate || '', renewalPaidThisYear: Boolean(data.renewalPaidThisYear), renewalPaidDate: data.renewalPaidDate || '' }] : [];
};
export const defaultInvoiceData: InvoiceData = {
  invoiceNumber: 'INV-2026-001',
  status: 'Unpaid',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  companyName: 'BROSHTECH',
  companyAddress: 'SARGHODHA RD-FSD',
  companyEmail: 'info@broshtech.com',
  companyPhone: '+92 317 7676560',
  clientName: 'Modernist Architectures Inc.',
  clientEmail: 'contact@modernist.arch',
  clientPhone: '+44 20 7946 0000',
  clientAddress: 'The Glass Tower, 5th Floor, London SE1 9SG',
  projectDomain: '',
  projectDomains: [],
  renewalPrice: '',
  renewalCurrency: 'USD',
  renewalDate: '',
  renewalPaidThisYear: false,
  renewalPaidDate: '',
  bankName: 'MEZN',
  accountTitle: 'BROSHTECH',
  accountNumber: 'PK12MEZN0004100115601102',
  companyAccountNumber: '04100115601102',
  oneTimeCurrency: 'USD',
  monthlyCurrency: 'PKR',
  billingType: 'one-time',
  monthlyAmount: '0',
  billingMonth: 'January 2026',
  monthlyDescription: 'Design Strategy & Editorial Direction Retainer',
  discountCurrency: 'PKR',
  discountPercent: '0',
  discountAmount: '0',
  advanceCurrency: 'PKR',
  advanceAmount: '0',
  advanceDate: new Date().toISOString().split('T')[0],
  advanceStatus: 'Pending',
  isMilestonePayment: false,
  milestones: [],
  items: [
    { id: '1', description: 'Design Strategy & Editorial Direction', quantity: 1, currency: 'USD', unitPrice: 10, isRecurring: true, recurrenceDate: (() => { const today = new Date(); const year = today.getFullYear(); const month = today.getMonth() + 1; const day = today.getDate(); const nextMonth = month === 12 ? 1 : month + 1; const nextYear = month === 12 ? year + 1 : year; const safeDay = Math.min(day, new Date(nextYear, nextMonth, 0).getDate()); return nextYear + '-' + String(nextMonth).padStart(2, '0') + '-' + String(safeDay).padStart(2, '0'); })(), isPaid: false, paidDate: '' }
  ],
  taxRate: 0,
  notes: 'Thank you for your business!',
};

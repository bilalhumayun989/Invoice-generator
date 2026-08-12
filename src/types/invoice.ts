export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  currency: 'USD' | 'PKR';
  unitPrice: number;
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

export interface InvoiceData {
  invoiceNumber: string;
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
  bankName: string;
  accountTitle: string;
  accountNumber: string;
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

export const defaultInvoiceData: InvoiceData = {
  invoiceNumber: 'INV-2026-001',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  companyName: 'BROSHTECH ',
  companyAddress: '113 Mall of, Zia Colony Nasar Ullah Khan Town, Faisalabad',
  companyEmail: 'info@broshtech.com',
  companyPhone: '+1 (555) 000-0000',
  clientName: 'Modernist Architectures Inc.',
  clientEmail: 'contact@modernist.arch',
  clientPhone: '+44 20 7946 0000',
  clientAddress: 'The Glass Tower, 5th Floor, London SE1 9SG',
  bankName: 'International Commerce Bank',
  accountTitle: 'Editorial Precision Systems',
  accountNumber: 'GB12 ICBK 6016 1331 9283 74',
  oneTimeCurrency: 'USD',
  monthlyCurrency: 'PKR',
  billingType: 'monthly-retainer',
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
    { id: '1', description: 'Design Strategy & Editorial Direction', quantity: 1, currency: 'USD', unitPrice: 10 }
  ],
  taxRate: 0,
  notes: 'Thank you for your business!',
};
export interface InvoiceItem {
  id: string;
  description: string;
  quantity?: number;
  currency: 'USD' | 'PKR';
  unitPrice: number;
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
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
}

export const defaultInvoiceData: InvoiceData = {
  invoiceNumber: 'INV-2024-001',
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
  monthlyAmount: '5000',
  billingMonth: 'January 2024',
  monthlyDescription: 'Design Strategy & Editorial Direction Retainer',
  items: [
    { id: '1', description: 'Design Strategy & Editorial Direction', currency: 'USD', unitPrice: 5000 }
  ],
  taxRate: 0,
  notes: 'Thank you for your business!',
};
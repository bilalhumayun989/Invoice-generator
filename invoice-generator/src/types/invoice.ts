export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
}

export const defaultInvoiceData: InvoiceData = {
  invoiceNumber: 'INV-001',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  companyName: 'iTech Company',
  companyEmail: 'info@itech.com',
  companyPhone: '+1 (555) 123-4567',
  clientName: 'Client Name',
  clientEmail: 'client@example.com',
  clientAddress: 'Address Line',
  items: [
    { id: '1', description: 'Service Description', quantity: 1, unitPrice: 1000 }
  ],
  taxRate: 10,
  notes: 'Thank you for your business!'
};
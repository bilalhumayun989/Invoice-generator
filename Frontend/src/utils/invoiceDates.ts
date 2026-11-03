import type { InvoiceData } from '../types/invoice';

export function getLatestPaymentDueDate(data: Pick<InvoiceData, 'items' | 'isMilestonePayment' | 'milestones' | 'advanceAmount' | 'advanceDate' | 'advanceStatus'>): string {
  const dates = [
    ...data.items.filter(item => !item.isPaid && Number(item.unitPrice || 0) * Number(item.quantity || 1) > 0).map(item => item.dueDate || ''),
    ...(data.isMilestonePayment ? data.milestones.filter(item => item.status === 'Pending' && Number(String(item.amount || 0).replace(/,/g, '')) > 0).map(item => item.dueDate || '') : []),
    ...(data.advanceStatus === 'Pending' && Number(String(data.advanceAmount || 0).replace(/,/g, '')) > 0 ? [data.advanceDate || ''] : []),
  ].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
  return dates.sort().at(-1) || '';
}

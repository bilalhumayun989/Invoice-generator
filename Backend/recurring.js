import { allocateInvoiceNumber } from './invoiceNumbers.js';

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function dateForTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addRecurrence(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const targetMonth = month;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function nextDateAfterToday(dateValue, today) {
  let next = addRecurrence(dateValue);
  while (next <= today) next = addRecurrence(next);
  return next;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}


async function makeGeneratedInvoice(db, source, schedule, scheduledDate) {
  const generatedId = `${source.id}-auto-${schedule.kind}-${schedule.id}-${scheduledDate}`;
  const sourceData = source.data;
  const issueDate = scheduledDate;
  const dueDate = addDays(issueDate, 30);
  const generatedItem = {
    ...schedule.item,
    id: schedule.item.id + '-' + scheduledDate,
    isRecurring: false,
    recurrenceDate: '',
    isPaid: false,
    paidDate: '',
    dueDate,
  };
  const data = {
    ...sourceData,
    invoiceNumber: await allocateInvoiceNumber(db, sourceData.clientName, source.ownerId),
    status: 'Unpaid',
    issueDate,
    dueDate,
    billingType: 'one-time',
    monthlyAmount: '0',
    advanceAmount: '0',
    advanceDate: '',
    advanceStatus: 'Pending',
    isMilestonePayment: false,
    milestones: [],
    items: [generatedItem],
    renewalPrice: '',
    renewalDate: '',
  };

  return {
    id: generatedId,
    ownerId: source.ownerId,
    recurringSourceId: source.id,
    clientId: source.clientId,
    updatedAt: new Date().toISOString(),
    data,
  };
}

export async function processDueRecurringInvoices(getDatabase, { now = new Date(), timezone = process.env.SCHEDULER_TIMEZONE || 'Asia/Karachi' } = {}) {
  const db = await getDatabase();
  const invoices = db.collection('invoices');
  await invoices.createIndex({ id: 1 }, { unique: true });

  const today = dateForTimezone(now, timezone);
  const sources = await invoices.find({ recurringSourceId: { $exists: false }, ownerId: { $exists: true } }).toArray();
  let generatedCount = 0;

  for (const source of sources) {
    if (!source?.id || !source.data) continue;
    const updatedData = { ...source.data };
    let changed = false;
    const schedules = [];

    for (const item of Array.isArray(source.data.items) ? source.data.items : []) {
      if (!item.isRecurring || !item.recurrenceDate || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) continue;
      if (item.recurrenceDate <= today) schedules.push({ kind: 'service', id: item.id, item, date: item.recurrenceDate });
    }


    for (const schedule of schedules) {
      const generated = await makeGeneratedInvoice(db, source, schedule, schedule.date);
      await invoices.updateOne({ id: generated.id, ownerId: source.ownerId }, { $setOnInsert: generated }, { upsert: true });
      generatedCount += 1;

      const nextDate = nextDateAfterToday(schedule.date, today);
      updatedData.items = updatedData.items.map((item) => item.id === schedule.id ? { ...item, recurrenceDate: nextDate } : item);
      changed = true;
    }

    if (changed) {
      await invoices.updateOne(
        { id: source.id, ownerId: source.ownerId, updatedAt: source.updatedAt },
        { $set: { data: updatedData, updatedAt: new Date().toISOString() } },
      );
    }
  }

  return { generatedCount };
}

function getClientInitials(clientName) {
  const tokens = String(clientName || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z]+|\d+/g) || [];
  const initials = tokens.map((token) => token[0]).join('').toUpperCase();
  return initials || 'CL';
}

export async function allocateInvoiceNumber(db, clientName, ownerId) {
  const invoices = await db.collection('invoices').find({ ownerId }, { projection: { _id: 0, 'data.invoiceNumber': 1 } }).toArray();
  const highestSavedNumber = invoices.reduce((highest, invoice) => {
    const match = String(invoice?.data?.invoiceNumber || '').match(/-(\d+)$/);
    return match ? Math.max(highest, Number(match[1]) || 0) : highest;
  }, 50);

  const counters = db.collection('invoiceNumberCounters');
  await counters.updateOne(
    { _id: `BT:${ownerId}` },
    { $max: { value: highestSavedNumber } },
    { upsert: true },
  );

  const counter = await counters.findOneAndUpdate(
    { _id: `BT:${ownerId}` },
    { $inc: { value: 1 } },
    { returnDocument: 'after', includeResultMetadata: false },
  );

  return `BT-${getClientInitials(clientName)}-${counter.value}`;
}

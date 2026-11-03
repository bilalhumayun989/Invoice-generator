import app, { getDatabase } from './app.js';
import { processDueRecurringInvoices } from './recurring.js';

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log('Invoice API listening on http://127.0.0.1:' + port);
});

let schedulerRunning = false;
async function runRecurringInvoiceScheduler() {
  if (schedulerRunning || (!process.env.MONGODB_URI && !process.env.MONODDB_URI)) return;
  schedulerRunning = true;
  try {
    const result = await processDueRecurringInvoices(getDatabase);
    if (result.generatedCount > 0) console.log('Generated ' + result.generatedCount + ' recurring invoice(s).');
  } catch (error) {
    console.error('Recurring invoice scheduler error:', error instanceof Error ? error.message : error);
  } finally {
    schedulerRunning = false;
  }
}

setTimeout(runRecurringInvoiceScheduler, 5000).unref();
setInterval(runRecurringInvoiceScheduler, 60_000).unref();

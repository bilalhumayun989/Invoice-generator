import dotenv from 'dotenv';
import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allocateInvoiceNumber } from './invoiceNumbers.js';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, '.env') });
if (!process.env.MONGODB_URI && !process.env.MONODDB_URI) {
  dotenv.config({ path: path.resolve(backendDirectory, '../Frontend/.env') });
}

const collections = ['invoices', 'clients', 'domains'];
let mongoClientPromise;

async function getDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONODDB_URI;
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI in the server environment.');
  }

  if (!mongoClientPromise) {
    mongoClientPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect().catch((error) => {
      mongoClientPromise = undefined;
      throw error;
    });
  }

  const client = await mongoClientPromise;
  return client.db();
}

function isCollectionName(value) {
  return typeof value === 'string' && collections.includes(value);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.post('/api/invoice-number', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const clientName = typeof req.body?.clientName === 'string' ? req.body.clientName.trim() : '';
  if (!clientName) return res.status(400).json({ error: 'Select a client before generating an invoice number.' });

  try {
    const invoiceNumber = await allocateInvoiceNumber(await getDatabase(), clientName);
    return res.json({ invoiceNumber });
  } catch (error) {
    console.error('Invoice number generation failed:', error);
    return res.status(500).json({ error: 'Could not generate a unique invoice number. Check the database connection and try again.' });
  }
});


async function handleDataRequest(req, res) {
  res.set('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.set('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const db = await getDatabase();

    if (req.method === 'GET') {
      const [invoices, clients, domains] = await Promise.all(
        collections.map((name) => db.collection(name)
          .find({}, { projection: { _id: 0 } })
          .toArray()),
      );
      return res.json({ invoices, clients, domains });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || !isCollectionName(body.collection)) {
      return res.status(400).json({ error: 'A valid collection is required.' });
    }

    const records = Array.isArray(body.records) ? body.records : [];
    const deleteIds = Array.isArray(body.deleteIds) ? body.deleteIds : [];
    if (records.some((record) => !record || typeof record !== 'object' || typeof record.id !== 'string')) {
      return res.status(400).json({ error: 'Every record must have a string id.' });
    }

    const collection = db.collection(body.collection);
    if (records.length) {
      await collection.bulkWrite(records.map((record) => {
        const { id, ...values } = record;
        return { updateOne: { filter: { id }, update: { $set: values }, upsert: true } };
      }));
    }
    if (deleteIds.length) {
      await collection.deleteMany({ id: { $in: deleteIds.filter((id) => typeof id === 'string') } });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Database API error:', error);
    let nested = error;
    let nestedCode;
    while (nested && typeof nested === 'object') {
      if (typeof nested.code === 'string') nestedCode = nested.code;
      nested = nested.cause;
    }

    let message = 'Database unavailable. Check the MongoDB URI, Atlas network access, and database credentials.';
    if (error instanceof Error && error.message.startsWith('Missing MongoDB connection string')) {
      message = error.message;
    } else if (nestedCode?.startsWith('ERR_SSL_')) {
      message = 'MongoDB TLS connection failed. Check network/firewall access to Atlas and the Atlas IP access list.';
    } else if (nestedCode === 'EACCES') {
      message = 'Node.js was denied permission to open the MongoDB socket (EACCES). Check the local runtime sandbox or firewall; the Atlas IP access list does not override outbound socket restrictions.';
    } else if (nestedCode === 'ECONNREFUSED') {
      message = 'The MongoDB host refused the connection. Check outbound TCP access to the Atlas host on port 27017 and confirm the cluster is running.';
    }
    return res.status(500).json({ error: message, code: nestedCode || 'DATABASE_ERROR' });
  }
}

app.all(['/api/data', '/'], handleDataRequest);

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Express request error:', error);
  return res.status(500).json({ error: 'Server request failed.' });
});

export { getDatabase };
export default app;

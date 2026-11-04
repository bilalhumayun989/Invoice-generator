import dotenv from 'dotenv';
import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { allocateInvoiceNumber } from './invoiceNumbers.js';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, '.env') });
dotenv.config({ path: path.resolve(backendDirectory, '../Frontend/.env') });

const collections = ['invoices', 'clients', 'domains'];
let mongoClientPromise;
async function getDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONODDB_URI;
  if (!uri) throw new Error('Missing MongoDB connection string. Set MONGODB_URI in the server environment.');
  if (!mongoClientPromise) mongoClientPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect().catch((error) => { mongoClientPromise = undefined; throw error; });
  return (await mongoClientPromise).db();
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
const cookieName = 'invoice_session';
const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const clearCookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const parseCookies = (header = '') => Object.fromEntries(header.split(';').map(part => part.trim().split(/=(.*)/s)).filter(([key, value]) => key && value !== undefined).map(([key, value]) => [key, decodeURIComponent(value)]));
const b64 = value => Buffer.from(value).toString('base64url');
function sign(value) { return createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('base64url'); }
function issueSession(user) {
  const payload = b64(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 31536000 }));
  const input = `v1.${payload}`;
  return `${input}.${sign(input)}`;
}
function readSession(token) {
  if (!process.env.SESSION_SECRET || !token) return null;
  const [version, payload, signature, extra] = token.split('.');
  if (version !== 'v1' || !payload || !signature || extra) return null;
  const expected = Buffer.from(sign(`${version}.${payload}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try { const user = JSON.parse(Buffer.from(payload, 'base64url').toString()); return user.exp > Date.now() / 1000 ? user : null; } catch { return null; }
}

app.get('/api/auth/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = readSession(parseCookies(req.headers.cookie)[cookieName]);
  return user ? res.json({ user: { email: user.email, name: user.name, picture: user.picture } }) : res.status(401).json({ error: 'Sign in required.' });
});
app.get('/api/auth/google', (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, SESSION_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !SESSION_SECRET) return res.status(503).send('Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and SESSION_SECRET in the server environment.');
  const state = randomBytes(32).toString('base64url');
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: GOOGLE_REDIRECT_URI, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }).toString();
  res.redirect(url.toString());
});
app.get('/api/auth/google/callback', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  res.set('Cache-Control', 'no-store');
  if (!req.query.code || !req.query.state || !cookies.oauth_state || req.query.state !== cookies.oauth_state) return res.status(400).send('Invalid sign-in state. Please try again.');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(req.query.code), client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: process.env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }) });
    if (!tokenResponse.ok) throw new Error('Google token exchange failed.');
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token || '')}`);
    if (!profileResponse.ok) throw new Error('Google identity verification failed.');
    const profile = await profileResponse.json();
    if (profile.aud !== process.env.GOOGLE_CLIENT_ID || profile.email_verified !== 'true' || !profile.sub || !profile.email) throw new Error('Google identity could not be verified.');
    const user = { sub: profile.sub, email: profile.email, name: profile.name || profile.email, picture: profile.picture || '' };
    res.setHeader('Set-Cookie', [`${cookieName}=${issueSession(user)}; ${cookieFlags}`, `oauth_state=; ${clearCookieFlags.replace('Path=/', 'Path=/api/auth')}`]);
    return res.redirect(process.env.APP_URL || '/');
  } catch (error) {
    console.error('Google sign-in failed:', error instanceof Error ? error.message : error);
    return res.status(401).send('Google sign-in failed. Please try again.');
  }
});
app.post('/api/auth/logout', (_req, res) => { res.setHeader('Set-Cookie', `${cookieName}=; ${clearCookieFlags}`); res.json({ ok: true }); });

function requireAuth(req, res, next) {
  const user = readSession(parseCookies(req.headers.cookie)[cookieName]);
  if (!user) return res.status(401).json({ error: 'Sign in required.' });
  req.user = user;
  next();
}

app.post('/api/invoice-number', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const clientName = typeof req.body?.clientName === 'string' ? req.body.clientName.trim() : '';
  if (!clientName) return res.status(400).json({ error: 'Select a client before generating an invoice number.' });
  try { return res.json({ invoiceNumber: await allocateInvoiceNumber(await getDatabase(), clientName, req.user.sub) }); }
  catch (error) { console.error('Invoice number generation failed:', error); return res.status(500).json({ error: 'Could not generate a unique invoice number. Check the database connection and try again.' }); }
});

async function handleDataRequest(req, res) {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') { res.set('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  try {
    const db = await getDatabase();
    if (req.method === 'GET') {
      const [invoices, clients, domains] = await Promise.all(collections.map(name => db.collection(name).find({ ownerId: req.user.sub }, { projection: { _id: 0, ownerId: 0 } }).toArray()));
      return res.json({ invoices, clients, domains });
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || !collections.includes(body.collection)) return res.status(400).json({ error: 'A valid collection is required.' });
    const records = Array.isArray(body.records) ? body.records : [];
    const deleteIds = Array.isArray(body.deleteIds) ? body.deleteIds : [];
    if (records.some(record => !record || typeof record !== 'object' || typeof record.id !== 'string')) return res.status(400).json({ error: 'Every record must have a string id.' });
    const collection = db.collection(body.collection);
    if (records.length) {
      await collection.bulkWrite(records.map((record) => {
        const { id, ownerId, ...values } = record;
        return {
          updateOne: {
            filter: { id, ownerId: req.user.sub },
            update: { $set: { ...values, ownerId: req.user.sub, id } },
            upsert: true,
          },
        };
      }));
    }
    if (deleteIds.length) await collection.deleteMany({ ownerId: req.user.sub, id: { $in: deleteIds.filter(id => typeof id === 'string') } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Database API error:', error);
    let nested = error; let nestedCode;
    let message = 'Database unavailable. Check the MongoDB URI, Atlas network access, and database credentials.';
    while (nested && typeof nested === 'object') {
      if (typeof nested.code === 'string' || typeof nested.code === 'number') nestedCode = nested.code;
      if (nested.code === 8000 || (nested.codeName === 'AtlasError' && /auth/i.test(String(nested.message || '')))) {
        nestedCode = nested.code ?? nested.codeName;
        message = 'MongoDB authentication failed. Check the Atlas database username, password, and authSource.';
      }
      nested = nested.cause;
    }
    if (error instanceof Error && error.message.startsWith('Missing MongoDB connection string')) message = error.message;
    else if (typeof nestedCode === 'string' && nestedCode.startsWith('ERR_SSL_')) message = 'MongoDB TLS connection failed. Check network/firewall access to Atlas and the Atlas IP access list.';
    else if (nestedCode === 'EACCES') message = 'Node.js was denied permission to open the MongoDB socket (EACCES).';
    else if (nestedCode === 'ECONNREFUSED') message = 'The MongoDB host refused the connection. Check outbound TCP access and confirm the cluster is running.';
    return res.status(500).json({ error: message, code: nestedCode || 'DATABASE_ERROR' });
  }
}

app.all(['/api/data', '/'], requireAuth, handleDataRequest);
app.use((error, _req, res, _next) => { if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Request body must be valid JSON.' }); console.error('Express request error:', error); return res.status(500).json({ error: 'Server request failed.' }); });

export { getDatabase };
export default app;

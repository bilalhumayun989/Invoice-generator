import { useEffect, useState } from 'react';
import Home from './page/Home';
import './App.css';
type User = { email: string; name: string; picture: string };
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null).then(result => setUser(result?.user ?? null)).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Checking your sign-in…</div>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-2xl font-black text-white">B</div><h1 className="mt-6 text-2xl font-black text-slate-950">Sign in to Broshtech Invoice</h1><p className="mt-2 text-sm leading-6 text-slate-500">Continue with your Google account to open your private workspace.</p><a href="/api/auth/google" className="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">Continue with Google</a></section></main>;
  return <Home user={user} onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); setUser(null); }} />;
}
export default App;

import { useCallback, useEffect, useState } from 'react';
import { AuthContext, ToastContext } from './context';
import { mockApi } from '../services/mockApi';
export function ToastProvider({ children }) {
  const [items,setItems] = useState([]);
  const toast = useCallback((message, type = 'success') => { const id = crypto.randomUUID(); setItems(old => [...old,{id,message,type}]); setTimeout(() => setItems(old => old.filter(t => t.id !== id)),6000); },[]);
  return <ToastContext value={toast}>{children}<div className="toasts" aria-live="polite">{items.map(t => <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>{t.message}<button aria-label="Dismiss notification" onClick={() => setItems(old => old.filter(x => x.id !== t.id))}>×</button></div>)}</div></ToastContext>;
}
export function AuthProvider({ children }) {
  const [user,setUser] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const refresh = useCallback(async () => { try { setUser(await mockApi.getSession()); setError(''); } catch(e) { setError(e.message); } finally { setLoading(false); } },[]);
  useEffect(() => { const sync = () => refresh(); const timer = setTimeout(sync,0); window.addEventListener('storage',sync); window.addEventListener('bazerlens-data',sync); return () => { clearTimeout(timer); window.removeEventListener('storage',sync); window.removeEventListener('bazerlens-data',sync); }; },[refresh]);
  const login = async values => { const next = await mockApi.login(values); setUser(next); return next; };
  const logout = async () => { await mockApi.logout(); setUser(null); };
  return <AuthContext value={{ user, loading, error, login, logout, refresh }}>{children}</AuthContext>;
}

export const DB_KEY = 'bazerlens_mock_db_v1';
const SESSION_KEY = 'bazerlens_session_v1';
function read(store, key) {
  try { const raw = store.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { throw new Error('Browser storage is unavailable or contains invalid data. Restore a valid backup or clear this site’s demo storage.'); }
}
function write(store, key, value) {
  try { store.setItem(key, JSON.stringify(value)); }
  catch { throw new Error('Could not save demo data. Check browser storage permissions and available space.'); }
}
export const readDatabase = () => read(localStorage, DB_KEY);
export const writeDatabase = value => write(localStorage, DB_KEY, value);
export const readSession = () => read(sessionStorage, SESSION_KEY) || read(localStorage, SESSION_KEY);
export function clearSession() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }
export function writeSession(userId, remember) {
  clearSession(); write(remember ? localStorage : sessionStorage, SESSION_KEY, { userId, remember });
}

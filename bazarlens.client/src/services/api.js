// Live API only. No browser database or seeded-data fallback.
const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let currentUser = null;
const changed = () => window.dispatchEvent(new Event('bazerlens-data'));
export async function request(path, { method = 'GET', body, notify = true } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, { method, credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new Error('Cannot reach the API. Check that the backend and frontend proxy are running.'); }
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error('The API returned an unexpected response. Check the API base URL and proxy.'); }
  if (!response.ok) {
    if (response.status === 401) { currentUser = null; window.dispatchEvent(new Event('bazerlens-auth')); }
    throw new Error(data?.message || (data?.errors && Object.values(data.errors).flat().join(' ')) || data?.detail || data?.title || `Request failed (${response.status}).`);
  }
  if (method !== 'GET' && notify) changed();
  return data;
}
const normalizeUser = u => u && ({ ...u, area: u.thana || '', city: u.city || '', avatarUrl: u.avatarUrl || '', role: u.role.toLowerCase(), status: (u.status || 'active').toLowerCase() });
const profile = input => ({ ...input, thana: input.area });
const save = (path, input) => request(`${path}${input.id ? `/${input.id}` : ''}`, { method: input.id ? 'PUT' : 'POST', body: input });
const remove = path => request(path, { method: 'DELETE' });
const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => value === '' || value == null || key === 'sort' || (key === 'search' ? Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(value.toLowerCase())) : key === 'from' ? row.date >= value : key === 'to' ? row.date <= value : String(row[key]) === String(value)));
const grouped = (rows, key) => Object.entries(rows.reduce((groups, row) => ({ ...groups, [row[key]]: (groups[row[key]] || 0) + 1 }), {})).map(([label, value]) => ({ label, value }));
export function priceRows(rows, filters = {}) {
  const groups = new Map();
  rows.filter(r => matches(r, filters)).forEach(row => { const key = `${row.productId}:${row.marketId}:${row.unit}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); });
  return [...groups.entries()].map(([id, history]) => {
    const date = history.map(r => r.date).sort().at(-1), current = history.filter(r => r.date === date), values = current.map(r => r.price);
    return { ...current[0], id, date, average: values.reduce((a,b) => a+b,0)/values.length, lowest: Math.min(...values), highest: Math.max(...values), history };
  }).sort((a,b) => filters.sort === 'price-desc' ? b.average-a.average : filters.sort === 'price' ? a.average-b.average : filters.sort === 'date' ? b.date.localeCompare(a.date) : a.product.localeCompare(b.product));
}
const trendRows = rows => [...new Set(rows.map(r => r.date))].sort().map(date => { const day = rows.filter(r => r.date === date); return { date, value: day.reduce((sum,r) => sum+r.price,0)/day.length }; });
async function actor() { const user = currentUser || await api.getSession(); if (!user) throw new Error('Please sign in.'); return user; }
function passwords(input) { if (input.password !== input.confirmPassword) throw new Error('Passwords do not match.'); }
export const api = {
  login: async input => { const data = await request('/Auth/login', { method: 'POST', body: input, notify: false }); currentUser = normalizeUser(data.user); changed(); return currentUser; },
  signup: input => { passwords(input); if (!input.agreeTerms) throw new Error('You must agree to the terms.'); return request('/Auth/register', { method: 'POST', body: profile(input) }); },
  logout: async () => { await request('/Auth/logout', { method: 'POST', notify: false }); currentUser = null; changed(); },
  getSession: async () => { currentUser = normalizeUser(await request('/Auth/session')); return currentUser; },
  updateProfile: async input => { const u = await actor(); const result = await request(`/Users/${u.id}/profile`, { method: 'PUT', body: profile(input) }); currentUser = normalizeUser(result); return currentUser; },
  changePassword: async input => { passwords(input); const u = await actor(); return request(`/Users/${u.id}/password`, { method: 'PUT', body: { currentPassword: input.currentPassword, newPassword: input.password } }); },
  listUsers: async filters => (await request('/Users')).map(normalizeUser).filter(r => matches(r, filters)),
  saveUser: input => save('/Users', profile(input)),
  deleteUser: id => remove(`/Users/${id}`),
  listProducts: () => request('/Products'),
  listMarkets: () => request('/Markets'),
  saveProduct: input => save('/Products', input),
  saveMarket: input => save('/Markets', input),
  deleteProduct: id => remove(`/Products/${id}`),
  deleteMarket: id => remove(`/Markets/${id}`),
  listSubmissions: async filters => { const u = await actor(); return (await request(u.role === 'admin' ? '/Submission/admin/review' : `/Submission/user/${u.id}`)).filter(r => matches(r, filters)); },
  saveSubmission: input => save('/Submission', { ...input, observedOn: input.date, price: Number(input.price) }),
  deleteSubmission: id => remove(`/Submission/${id}`),
  reviewSubmission: input => request(`/Submission/${input.id}/review`, { method: 'PUT', body: { status: input.status, rejectionReason: input.reason || '' } }),
  listAlerts: async filters => (await request('/Account/alerts')).filter(r => matches(r, filters)),
  saveAlert: input => save('/Account/alerts', { ...input, targetPrice: Number(input.targetPrice) }),
  deleteAlert: id => remove(`/Account/alerts/${id}`),
  getSettings: () => request('/Account/settings'),
  saveSettings: input => request('/Account/settings', { method: 'PUT', body: input }),
  resetSettings: () => api.saveSettings({ defaultArea: '', emailAlerts: false, inAppNotifications: true, compactTables: false }),
  getPrices: async filters => priceRows(await request('/Submission'), filters),
  getTrends: async filters => trendRows((await request('/Submission')).filter(r => matches(r, filters))),
  getPublicStatistics: async (filters = {}) => {
    const [rows, products, markets] = await Promise.all([request('/Submission'), api.listProducts(), api.listMarkets()]);
    return { prices: priceRows(rows, filters), trend: trendRows(rows.filter(r => matches(r, { ...filters, productId: filters.productId || products[0]?.id }))), products, markets, areas: [...new Set(markets.map(m => m.area))] };
  },
  getNotifications: async () => {
    const [settings, alerts, prices] = await Promise.all([api.getSettings(), api.listAlerts(), api.getPrices()]);
    if (!settings.inAppNotifications) return [];
    return alerts.filter(a => a.enabled).flatMap(a => prices.filter(p => p.productId === a.productId && (!a.area || p.area === a.area) && (a.direction === 'above' ? p.average > a.targetPrice : p.average < a.targetPrice)).map(p => ({ id: `${a.id}-${p.id}`, message: `${p.product} is ৳${p.average.toFixed(2)}/${p.unit} in ${p.area}, ${a.direction} your ৳${a.targetPrice} target.`, emailPreview: false })));
  },
  getSummary: async () => {
    const u = await actor();
    const [rows, products, markets, prices, notifications, overview] = await Promise.all([api.listSubmissions(), api.listProducts(), api.listMarkets(), api.getPrices(), api.getNotifications(), u.role === 'admin' ? request('/Admin/overview') : null]);
    return { total: overview?.totalSubmissions ?? rows.length, pending: overview?.pendingReview ?? rows.filter(r => r.status === 'pending').length, verified: overview?.verifiedSubmissions ?? rows.filter(r => r.status === 'verified').length, rejected: overview?.rejectedSubmissions ?? rows.filter(r => r.status === 'rejected').length, users: overview?.totalUsers, activeUsers: overview?.activeUsers, blockedUsers: overview?.blockedUsers, products: overview?.totalProducts ?? products.length, markets: overview?.totalMarkets ?? markets.length, prices, notifications, recent: rows.slice(0,6) };
  },
  getAnalytics: async () => {
    const u = await actor(); const [rows, prices, activity, users] = await Promise.all([api.listSubmissions(), api.getPrices(), request('/Account/activity'), u.role === 'admin' ? api.listUsers() : []]);
    return { total: rows.length, verifiedRate: rows.length ? Math.round(rows.filter(r => r.status === 'verified').length/rows.length*100) : 0, pending: rows.filter(r => r.status === 'pending').length, byStatus: grouped(rows,'status'), byProduct: grouped(rows,'product'), byArea: grouped(rows,'area'), byMonth: grouped(rows.map(r => ({ ...r, month: r.date.slice(0,7) })),'month').sort((a,b) => a.label.localeCompare(b.label)), contributors: grouped(rows,'user').sort((a,b) => b.value-a.value), userGrowth: grouped(users.map(u => ({ month: u.createdAt.slice(0,7) })),'month').sort((a,b) => a.label.localeCompare(b.label)), prices, rejected: rows.filter(r => r.status === 'rejected'), flagged: rows.filter(r => r.flagged && r.status === 'pending'), activity };
  },
  getDatabaseStats: async () => { const d = await request('/Admin/overview'); return { Users: d.totalUsers, Products: d.totalProducts, Markets: d.totalMarkets, Submissions: d.totalSubmissions }; },
  exportDatabase: async () => { const [users,products,markets,submissions] = await Promise.all([api.listUsers(),api.listProducts(),api.listMarkets(),api.listSubmissions()]); return { exportedAt: new Date().toISOString(), users, products, markets, submissions }; },
};

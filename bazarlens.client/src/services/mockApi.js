// FRONTEND PROTOTYPE ONLY: passwords and authorization live in editable browser storage.
// Never use this storage/authentication implementation for real accounts.
import { seedData, defaultSettings } from '../data/seedData.js';
import { readDatabase, writeDatabase, readSession, writeSession, clearSession } from '../utils/storage.js';
import { requireValue as check, text, email, password, url, positive, today } from '../utils/validation.js';
import { qualityOptions } from '../data/submissionOptions.js';
import { screenPrice } from './priceScreening.js';

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const safeUser = user => user && Object.fromEntries(Object.entries(user).filter(([key]) => key !== 'password'));
function database() { let db = readDatabase(); if (!db) { db = seedData(); writeDatabase(db); } return db; }
function actor(db, admin = false) {
  const user = db.users.find(u => u.id === readSession()?.userId);
  check(user?.status === 'active', 'Please sign in with an active account.');
  check(!admin || user.role === 'admin', 'Administrator access is required.');
  return user;
}
function find(db, kind, key) { const row = db[kind].find(r => r.id === key); check(row, 'Record no longer exists.'); return row; }
function activity(db, userId, message) { db.activity.unshift({ id: id(), userId, message, createdAt: stamp() }); }
async function request(work, mutate = false) {
  await new Promise(resolve => setTimeout(resolve, 350));
  const db = database();
  const result = work(db);
  if (mutate) { writeDatabase(db); window.dispatchEvent(new Event('bazerlens-data')); }
  return structuredClone(result);
}
function account(input, db, existing) {
  const value = { name: text(input.name, 'Full name'), email: email(input.email), city: text(input.city, 'City'), area: text(input.area, 'Thana'), avatarUrl: url(input.avatarUrl || '') };
  check(!db.users.some(u => u.email === value.email && u.id !== existing?.id), 'An account with this email already exists.');
  return value;
}
function preferences(db, userId) { return { ...defaultSettings, ...db.settings[userId] }; }
function enriched(db, rows) { return rows.map(s => ({ ...s, product: find(db,'products',s.productId).name, category: find(db,'products',s.productId).category, division: find(db,'markets',s.marketId).division, district: find(db,'markets',s.marketId).district, market: find(db,'markets',s.marketId).name, user: find(db,'users',s.userId).name })); }
function matches(row, filters = {}) {
  return Object.entries(filters).every(([key,value]) => !value || key === 'sort' || (key === 'search' ? Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(value.toLowerCase())) : key === 'from' ? row.date >= value : key === 'to' ? row.date <= value : String(row[key]) === String(value)));
}
function priceRows(db, filters = {}) {
  const groups = new Map();
  enriched(db, db.submissions.filter(s => s.status === 'verified')).filter(s => matches(s, filters)).forEach(s => {
    const key = `${s.productId}:${s.marketId}:${s.unit}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });
  const rows = [...groups.entries()].map(([key, history]) => {
    const latest = history.map(s => s.date).sort().at(-1);
    const current = history.filter(s => s.date === latest);
    const values = current.map(s => s.price);
    return { ...current[0], id: key, average: values.reduce((a,b) => a+b,0)/values.length, lowest: Math.min(...values), highest: Math.max(...values), date: latest, history };
  });
  return rows.sort((a,b) => filters.sort === 'price-desc' ? b.average-a.average : filters.sort === 'price' ? a.average-b.average : filters.sort === 'date' ? b.date.localeCompare(a.date) : a.product.localeCompare(b.product));
}
function grouped(rows, key) { const groups = {}; rows.forEach(s => { groups[s[key]] = (groups[s[key]] || 0) + 1; }); return Object.entries(groups).map(([label,value]) => ({ label,value })); }
function notifications(db, user) {
  const settings = preferences(db,user.id);
  if (!settings.inAppNotifications) return [];
  return db.alerts.filter(a => a.userId === user.id && a.enabled).flatMap(a => {
    const prices = priceRows(db, { productId: a.productId, area: a.area });
    return prices.filter(p => a.direction === 'above' ? p.average > a.targetPrice : p.average < a.targetPrice).map(p => ({ id: `${a.id}-${p.id}`, message: `${p.product} is ৳${p.average.toFixed(2)}/${p.unit} in ${p.area}, ${a.direction} your ৳${a.targetPrice} target.`, emailPreview: settings.emailAlerts }));
  });
}

export const mockApi = {
  login: input => request(db => {
    const address = email(input.email); check(input.password, 'Enter your password.');
    const user = db.users.find(u => u.email === address && u.password === input.password);
    check(user, 'Invalid email or password.'); check(user.status === 'active', 'This account is blocked. Contact an administrator.');
    writeSession(user.id, Boolean(input.remember)); return safeUser(user);
  }),
  signup: input => request(db => {
    check(input.agreeTerms, 'You must agree to the terms.'); check(input.password === input.confirmPassword, 'Passwords do not match.');
    const user = { ...account(input,db), password: password(input.password), id: id(), role: 'user', status: 'active', createdAt: stamp() };
    db.users.push(user); db.settings[user.id] = { ...defaultSettings, defaultArea: db.markets.find(m => m.area.toLowerCase() === user.area.toLowerCase())?.area || db.markets.find(m => m.district.toLowerCase() === user.city.toLowerCase())?.area || '' }; activity(db,user.id,'Created an account'); return safeUser(user);
  }, true),
  logout: () => request(() => { clearSession(); return { success: true }; }),
  getSession: () => request(db => { const user = db.users.find(u => u.id === readSession()?.userId && u.status === 'active'); if (!user) clearSession(); return safeUser(user) || null; }),
  forgotPassword: input => request(db => { const user = db.users.find(u => u.email === email(input.email)); check(user, 'No demo account exists for that email.'); check(user.status === 'active','This account is blocked.'); return { email: user.email, demoOnly: true }; }),
  resetPassword: input => request(db => { const user = db.users.find(u => u.email === email(input.email)); check(user?.status === 'active','An active demo account is required.'); check(input.password === input.confirmPassword,'Passwords do not match.'); user.password = password(input.password); activity(db,user.id,'Reset demo password'); return { success: true }; },true),
  updateProfile: input => request(db => { const user = actor(db); Object.assign(user,account(input,db,user)); activity(db,user.id,'Updated profile'); return safeUser(user); },true),
  changePassword: input => request(db => { const user = actor(db); check(user.password === input.currentPassword,'Current password is incorrect.'); check(input.password === input.confirmPassword,'Passwords do not match.'); user.password = password(input.password); activity(db,user.id,'Changed password'); return { success: true }; },true),
  listUsers: (filters = {}) => request(db => { actor(db,true); return db.users.map(u => ({ ...safeUser(u), contributions: db.submissions.filter(s => s.userId === u.id).length })).filter(u => matches(u,filters)); }),
  saveUser: input => request(db => {
    const me = actor(db,true); const existing = input.id ? find(db,'users',input.id) : null;
    check(existing || input.role !== 'admin', 'New accounts must be users or agents.');
    check(['admin','agent','user'].includes(input.role) && ['active','blocked'].includes(input.status),'Select a valid role and status.');
    check(!(existing?.id === me.id && input.status === 'blocked'),'You cannot block yourself.');
    if (existing?.role === 'admin' && existing.status === 'active' && (input.role !== 'admin' || input.status !== 'active')) check(db.users.some(u => u.id !== existing.id && u.role === 'admin' && u.status === 'active'),'Keep at least one active administrator.');
    const row = { ...existing, ...account(input,db,existing), role: input.role, status: input.status };
    if (!existing) { row.id = id(); row.createdAt = stamp(); row.password = password(input.password); db.users.push(row); db.settings[row.id] = { ...defaultSettings }; }
    else Object.assign(existing,row);
    activity(db,me.id,`${existing ? 'Updated' : 'Added'} user ${row.name}`); return safeUser(row);
  },true),
  deleteUser: key => request(db => { const me = actor(db,true); const user = find(db,'users',key); check(key !== me.id,'You cannot delete yourself.'); check(user.role !== 'admin' || user.status !== 'active' || db.users.some(u => u.id !== key && u.role === 'admin' && u.status === 'active'),'Keep at least one active administrator.'); check(!db.submissions.some(s => s.userId === key || s.history.some(h => h.reviewerId === key)),'This user has submission history. Block the account instead.'); db.users = db.users.filter(u => u.id !== key); db.alerts = db.alerts.filter(a => a.userId !== key); delete db.settings[key]; db.activity = db.activity.filter(a => a.userId !== key); activity(db,me.id,`Deleted user ${user.name}`); return { success: true }; },true),
  listProducts: () => request(db => { actor(db); return db.products; }),
  listMarkets: () => request(db => { actor(db); return db.markets; }),
  saveProduct: input => request(db => {
    const me = actor(db,true); const value = { name: text(input.name,'Product name'), category: text(input.category,'Category'), unit: text(input.unit,'Unit',20), active: Boolean(input.active) };
    check(!db.products.some(p => p.name.toLowerCase() === value.name.toLowerCase() && p.id !== input.id),'Product name already exists.');
    const row = input.id ? find(db,'products',input.id) : { id: id(), createdAt: stamp() };
    check(!input.id || row.unit === value.unit || !db.submissions.some(s => s.productId === row.id),'Units on referenced products cannot change. Create a new product instead.');
    Object.assign(row,value); if (!input.id) db.products.push(row); activity(db,me.id,`Saved product ${row.name}`); return row;
  },true),
  deleteProduct: key => request(db => { const me = actor(db,true); find(db,'products',key); check(!db.submissions.some(s => s.productId === key) && !db.alerts.some(a => a.productId === key),'This product is referenced. Deactivate it instead.'); db.products = db.products.filter(p => p.id !== key); activity(db,me.id,'Deleted a product'); return { success: true }; },true),
  saveMarket: input => request(db => {
    const me = actor(db,true); const value = { name: text(input.name,'Market name'), area: text(input.area,'Area'), district: text(input.district,'District'), division: text(input.division,'Division'), active: Boolean(input.active) };
    check(!db.markets.some(m => m.name.toLowerCase() === value.name.toLowerCase() && m.area === value.area && m.id !== input.id),'Market already exists in this area.');
    const row = input.id ? find(db,'markets',input.id) : { id: id(), createdAt: stamp() }; Object.assign(row,value); if (!input.id) db.markets.push(row); activity(db,me.id,`Saved market ${row.name}`); return row;
  },true),
  deleteMarket: key => request(db => { const me = actor(db,true); find(db,'markets',key); check(!db.submissions.some(s => s.marketId === key),'This market has submissions. Deactivate it instead.'); db.markets = db.markets.filter(m => m.id !== key); activity(db,me.id,'Deleted a market'); return { success: true }; },true),
  listSubmissions: (filters = {}) => request(db => { const me = actor(db); return enriched(db,db.submissions.filter(s => me.role === 'admin' || s.userId === me.id)).filter(s => matches(s,filters)).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }),
  saveSubmission: input => request(db => {
    const me = actor(db); const row = input.id ? find(db,'submissions',input.id) : { id: id(), userId: me.id, status: 'pending', history: [], rejectionReason: '', createdAt: stamp() };
    check(row.userId === me.id && row.status === 'pending','Only your own pending submissions can be edited.');
    const product = find(db,'products',input.productId), market = find(db,'markets',input.marketId);
    const quality = input.quality ?? row.quality ?? 'Standard';
    check(qualityOptions.includes(quality), 'Choose a valid quality.');
    check(input.category === undefined || input.category === product.category, 'Category must match the selected product.');
    check(['division','district','area'].every(key => input[key] === undefined || input[key] === market[key]), 'Choose a bazar within the selected division, district and thana.');
    check(product.active && market.active,'Choose an active product and market.'); check(input.unit === product.unit,'Use the product’s default unit.');
    check(/^\d{4}-\d{2}-\d{2}$/.test(input.date) && !Number.isNaN(Date.parse(input.date)) && new Date(input.date).toISOString().slice(0,10) === input.date && input.date <= today(),'Choose a valid date that is not in the future.');
    Object.assign(row,{ category: product.category, quality, productId: product.id, marketId: market.id, area: market.area, unit: product.unit, price: positive(input.price), date: input.date, note: (input.note || '').trim().slice(0,1000), evidenceUrl: url(input.evidenceUrl), updatedAt: stamp() });
    row.screening = screenPrice(db, row);
    row.flagged = ['unusual','insufficient-data'].includes(row.screening.decision);
    if (me.role === 'agent' && row.screening.decision === 'normal') {
      row.status = 'verified';
      row.screening.decision = 'auto-approved';
      row.history.push({ status: 'verified', reviewerId: null, source: 'automatic', at: row.updatedAt, reason: row.screening.reason });
      activity(db,me.id,`Automatically approved ${product.name} agent price`);
    }
    if (!input.id) db.submissions.unshift(row); activity(db,me.id,`${input.id ? 'Edited' : 'Submitted'} ${product.name} price`); return row;
  },true),
  deleteSubmission: key => request(db => { const me = actor(db); const row = find(db,'submissions',key); check(row.userId === me.id && row.status === 'pending','Only your own pending submissions can be deleted.'); db.submissions = db.submissions.filter(s => s.id !== key); activity(db,me.id,'Deleted pending submission'); return { success: true }; },true),
  reviewSubmission: input => request(db => { const me = actor(db,true), row = find(db,'submissions',input.id); check(row.status === 'pending','This submission has already been reviewed.'); check(['verified','rejected'].includes(input.status),'Invalid review status.'); const reason = input.status === 'rejected' ? text(input.reason,'Rejection reason',1000) : ''; row.status = input.status; row.rejectionReason = reason; row.updatedAt = stamp(); row.history.push({ status: row.status, reason, reviewerId: me.id, at: row.updatedAt }); activity(db,me.id,`${row.status} a submission`); return row; },true),
  listAlerts: (filters = {}) => request(db => { const me = actor(db); return db.alerts.filter(a => a.userId === me.id).map(a => ({ ...a, product: find(db,'products',a.productId).name, unit: find(db,'products',a.productId).unit })).filter(a => matches(a,filters)); }),
  saveAlert: input => request(db => { const me = actor(db), row = input.id ? find(db,'alerts',input.id) : { id: id(), userId: me.id, createdAt: stamp() }; check(row.userId === me.id,'You can only change your own alerts.'); check(find(db,'products',input.productId).active,'Choose an active product.'); check(['above','below'].includes(input.direction),'Choose above or below.'); check(!input.area || db.markets.some(m => m.area === input.area),'Choose a known area.'); Object.assign(row,{ productId: input.productId, area: input.area || '', direction: input.direction, targetPrice: positive(input.targetPrice), enabled: Boolean(input.enabled) }); if (!input.id) db.alerts.unshift(row); activity(db,me.id,'Saved price alert'); return row; },true),
  deleteAlert: key => request(db => { const me = actor(db); check(find(db,'alerts',key).userId === me.id,'You can only delete your own alerts.'); db.alerts = db.alerts.filter(a => a.id !== key); return { success: true }; },true),
  getSettings: () => request(db => preferences(db,actor(db).id)),
  saveSettings: input => request(db => { const me = actor(db); check(!input.defaultArea || db.markets.some(m => m.area === input.defaultArea),'Choose a known area.'); db.settings[me.id] = { defaultArea: input.defaultArea || '', emailAlerts: Boolean(input.emailAlerts), inAppNotifications: Boolean(input.inAppNotifications), compactTables: Boolean(input.compactTables) }; return db.settings[me.id]; },true),
  resetSettings: () => request(db => { const me = actor(db); db.settings[me.id] = { ...defaultSettings }; return db.settings[me.id]; },true),
  getNotifications: () => request(db => notifications(db,actor(db))),
  getPrices: filters => request(db => { actor(db); return priceRows(db,filters); }),
  getPublicStatistics: (filters = {}) => request(db => {
    // Explicit projection: no contributor IDs/names, notes, evidence or history.
    const prices = priceRows(db, filters).map(p => ({ id: p.id, productId: p.productId, product: p.product, category: p.category, marketId: p.marketId, market: p.market, division: p.division, district: p.district, area: p.area, unit: p.unit, date: p.date, average: p.average, lowest: p.lowest, highest: p.highest }));
    const selected = filters.productId || db.products[0]?.id;
    const rows = enriched(db,db.submissions.filter(s => s.status === 'verified')).filter(s => matches(s,{...filters,productId:selected}));
    const trend = [...new Set(rows.map(s => s.date))].sort().map(date => { const day = rows.filter(s => s.date === date); return { date, value: day.reduce((sum,s) => sum+s.price,0)/day.length }; });
    return { prices, trend, markets: db.markets.map(m => ({id:m.id,name:m.name,division:m.division,district:m.district,area:m.area})), products: db.products.map(p => ({ id: p.id, name: p.name, unit: p.unit })), areas: [...new Set(db.markets.map(m => m.area))] };
  }),
  getTrends: (filters = {}) => request(db => { actor(db); const rows = enriched(db,db.submissions.filter(s => s.status === 'verified')).filter(s => matches(s,filters)); const days = [...new Set(rows.map(s => s.date))].sort(); return days.map(date => { const samples = rows.filter(s => s.date === date); return { date, value: samples.reduce((sum,s) => sum+s.price,0)/samples.length }; }); }),
  getSummary: () => request(db => { const me = actor(db); const rows = db.submissions.filter(s => me.role === 'admin' || s.userId === me.id); return { total: rows.length, pending: rows.filter(s => s.status === 'pending').length, verified: rows.filter(s => s.status === 'verified').length, rejected: rows.filter(s => s.status === 'rejected').length, users: me.role === 'admin' ? db.users.length : undefined, activeUsers: me.role === 'admin' ? db.users.filter(u => u.status === 'active').length : undefined, blockedUsers: me.role === 'admin' ? db.users.filter(u => u.status === 'blocked').length : undefined, products: db.products.length, markets: db.markets.length, prices: priceRows(db), notifications: notifications(db,me), recent: enriched(db,rows).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,6) }; }),
  getAnalytics: () => request(db => { const me = actor(db); const rows = enriched(db,db.submissions.filter(s => me.role === 'admin' || s.userId === me.id)); return { total: rows.length, verifiedRate: rows.length ? Math.round(rows.filter(s => s.status === 'verified').length/rows.length*100) : 0, pending: rows.filter(s => s.status === 'pending').length, byStatus: grouped(rows,'status'), byProduct: grouped(rows,'product'), byArea: grouped(rows,'area'), byMonth: grouped(rows.map(s => ({ ...s, month: s.date.slice(0,7) })),'month').sort((a,b) => a.label.localeCompare(b.label)), contributors: grouped(rows,'user').sort((a,b) => b.value-a.value), userGrowth: me.role === 'admin' ? grouped(db.users.map(u => ({ month: u.createdAt.slice(0,7) })),'month').sort((a,b) => a.label.localeCompare(b.label)) : [], prices: priceRows(db), rejected: rows.filter(s => s.status === 'rejected'), flagged: rows.filter(s => s.flagged && s.status === 'pending'), activity: db.activity.filter(a => me.role === 'admin' || a.userId === me.id).slice(0,20) }; }),
  getDatabaseStats: () => request(db => { actor(db,true); return Object.fromEntries(['users','products','markets','submissions','alerts','activity'].map(k => [k,db[k].length])); }),
  exportDatabase: () => request(db => { actor(db,true); return db; }),
  importDatabase: input => request(db => { const me = actor(db,true); validateDatabase(input); check(input.users.some(u => u.id === me.id && u.role === 'admin' && u.status === 'active'),'The backup must retain your active administrator account.'); Object.keys(db).forEach(key => delete db[key]); Object.assign(db,structuredClone(input)); activity(db,me.id,'Imported demo backup'); return { success: true }; },true),
  resetDatabase: confirmation => request(db => { actor(db,true); check(confirmation === 'RESET BAZERLENS','Type RESET BAZERLENS to confirm.'); Object.assign(db,seedData()); writeSession('admin-demo',true); return safeUser(db.users[0]); },true),
};

function validateDatabase(db) {
  check(db && db.version === 1,'Expected a BazerLens version 1 backup.');
  check(Object.keys(db).every(k => ['version','users','products','markets','submissions','alerts','settings','activity'].includes(k)), 'Unexpected backup fields.');
  for (const row of [...(Array.isArray(db.submissions) ? db.submissions : []), ...(Array.isArray(db.alerts) ? db.alerts : [])]) check(typeof (row.price ?? row.targetPrice) === 'number','Prices in backups must be numbers.');
  for (const kind of ['users','products','markets','submissions','alerts','activity']) {
    check(Array.isArray(db[kind]) && db[kind].length <= 50000,`Invalid ${kind} collection.`);
    const ids = new Set(); db[kind].forEach(row => { check(row && typeof row === 'object','Invalid record.'); text(row.id,'Record ID'); check(!ids.has(row.id),'Duplicate record ID.'); ids.add(row.id); check(typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)),'Invalid creation timestamp.'); });
  }
  check(db.settings && typeof db.settings === 'object' && !Array.isArray(db.settings),'Invalid settings.');
  db.users.forEach(u => { account(u,db,u); password(u.password); check(['admin','agent','user'].includes(u.role) && ['active','blocked'].includes(u.status),'Invalid user role/status.'); });
  check(db.users.some(u => u.role === 'admin' && u.status === 'active'),'An active administrator is required.');
  db.products.forEach(p => { text(p.name,'Product'); text(p.category,'Category'); text(p.unit,'Unit',20); check(typeof p.active === 'boolean','Invalid product state.'); });
  db.markets.forEach(m => { ['name','area','district','division'].forEach(k => text(m[k],k)); check(typeof m.active === 'boolean','Invalid market state.'); });
  db.submissions.forEach(s => { find(db,'users',s.userId); const p = find(db,'products',s.productId); find(db,'markets',s.marketId); positive(s.price); check(s.quality === undefined || qualityOptions.includes(s.quality), 'Invalid submission quality.'); check(s.category === undefined || typeof s.category === 'string' && s.category.trim().length > 0 && s.category.length <= 120, 'Invalid submission category.'); text(s.area,'Area'); check(s.unit === p.unit,'Submission unit mismatch.'); check(/^\d{4}-\d{2}-\d{2}$/.test(s.date) && Number.isFinite(Date.parse(s.date)) && new Date(s.date).toISOString().slice(0,10) === s.date && s.date <= today(),'Invalid submission date.'); check(['pending','verified','rejected'].includes(s.status),'Invalid submission status.'); check(typeof s.note === 'string' && s.note.length <= 1000,'Invalid note.'); url(s.evidenceUrl); check(typeof s.rejectionReason === 'string' && (s.status !== 'rejected' || s.rejectionReason.trim()),'Missing rejection reason.'); check(Number.isFinite(Date.parse(s.updatedAt)),'Invalid update timestamp.'); check(Array.isArray(s.history),'Invalid review history.'); s.history.forEach(h => { if (h.source === 'automatic') { check(h.reviewerId === null && h.status === 'verified' && s.screening?.decision === 'auto-approved', 'Invalid automatic review.'); } else find(db,'users',h.reviewerId); check(['verified','rejected'].includes(h.status) && Number.isFinite(Date.parse(h.at)) && typeof h.reason === 'string','Invalid review.'); }); });
  db.submissions.forEach(s => { if (s.screening) { const v = s.screening; check(typeof s.flagged === 'boolean' && v.policy === 'market-median-v1' && ['normal','unusual','insufficient-data','auto-approved'].includes(v.decision), 'Invalid screening metadata.'); check(v.thresholdPercent === 25 && Number.isInteger(v.sampleDays) && v.sampleDays >= 0 && typeof v.reason === 'string' && Number.isFinite(Date.parse(v.checkedAt)), 'Invalid screening metadata.'); check(v.baseline === null || (typeof v.baseline === 'number' && v.baseline > 0 && Number.isFinite(v.baseline)), 'Invalid screening baseline.'); check(v.deviationPercent === null || (typeof v.deviationPercent === 'number' && v.deviationPercent >= 0 && Number.isFinite(v.deviationPercent)), 'Invalid screening deviation.'); check(s.flagged === ['unusual','insufficient-data'].includes(v.decision), 'Inconsistent screening flag.'); if (v.decision === 'auto-approved') check(s.status === 'verified' && s.history.some(h => h.source === 'automatic'), 'Invalid automatic approval.'); } });
  db.alerts.forEach(a => { find(db,'users',a.userId); find(db,'products',a.productId); positive(a.targetPrice); check(['above','below'].includes(a.direction) && typeof a.enabled === 'boolean','Invalid alert.'); check(typeof a.area === 'string' && (!a.area || db.markets.some(m => m.area === a.area)),'Invalid alert area.'); });
  Object.entries(db.settings).forEach(([key,s]) => { find(db,'users',key); check(s && typeof s.defaultArea === 'string' && (!s.defaultArea || db.markets.some(m => m.area === s.defaultArea)),'Invalid default area.'); ['emailAlerts','inAppNotifications','compactTables'].forEach(k => check(typeof s[k] === 'boolean','Invalid preference.')); });
  db.activity.forEach(a => { find(db,'users',a.userId); text(a.message,'Activity message',1000); });
}

import assert from 'node:assert/strict';
import { mockApi as api } from '../src/services/mockApi.js';
import { homeForRole, agentPaths } from '../src/utils/navigation.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const timer = globalThis.setTimeout;
globalThis.setTimeout = fn => timer(fn, 0);

await api.login({email:'agent@bazarlens.com',password:'Agent@123'});
const input = { productId:'p0', category:'Grains', quality:'Premium', marketId:'m1', unit:'kg', price:900, date:new Date().toISOString().slice(0,10), note:'Flagged premium rice', evidenceUrl:'' };
const row = await api.saveSubmission(input);
assert.equal(row.category, 'Grains');
assert.equal(row.quality, 'Premium');
assert.equal(row.flagged, true);
assert.equal(row.status, 'pending');
assert.equal((await api.listSubmissions()).find(s => s.id === row.id).quality, 'Premium');
await assert.rejects(() => api.saveSubmission({...input,quality:'Unknown'}), /quality/);
await assert.rejects(() => api.saveSubmission({...input,quality:''}), /quality/);
await assert.rejects(() => api.saveSubmission({...input,category:'Meat'}), /Category/);
const edited = await api.saveSubmission({...row,quality:'Economy'});
assert.equal(edited.quality, 'Economy');
await assert.rejects(() => api.reviewSubmission({id:row.id,status:'verified'}), /Administrator/);

await api.login({email:'admin@bazarlens.com',password:'Admin@123'});
assert.ok((await api.listSubmissions({flagged:true,status:'pending'})).some(s => s.id === row.id));
await assert.rejects(() => api.saveUser({name:'Admin Two',email:'second@example.com',city:'Dhaka',area:'Mirpur',password:'Test@123',role:'admin',status:'active'}), /users or agents/);
const backup = await api.exportDatabase();
await api.importDatabase(backup);
assert.equal((await api.listSubmissions()).find(s => s.id === row.id).quality, 'Economy');
const invalid = structuredClone(backup);
invalid.submissions.find(s => s.id === row.id).quality = 'Invalid';
await assert.rejects(() => api.importDatabase(invalid), /quality/);
await api.reviewSubmission({id:row.id,status:'rejected',reason:'Price could not be verified.'});
assert.ok(!(await api.listSubmissions({flagged:true,status:'pending'})).some(s => s.id === row.id));
assert.equal((await api.listSubmissions()).find(s => s.id === row.id).rejectionReason, 'Price could not be verified.');

const signup = {name:'Local Contributor',email:'local@example.com',city:'Chattogram',area:'Kotwali',password:'Local@123',confirmPassword:'Local@123',agreeTerms:true};
const account = await api.signup(signup);
assert.equal(account.city, 'Chattogram');
assert.equal(account.area, 'Kotwali');
assert.equal(homeForRole('agent'), '/submissions');
assert.equal(homeForRole('admin'), '/admin');
assert.equal(homeForRole('user'), '/dashboard');
assert.deepEqual(agentPaths, ['/submissions','/profile','/settings']);
console.log('PASS: category, quality, signup location, flagged review lifecycle, admin creation restriction, backup validation and role navigation.');

import assert from 'node:assert/strict';
import { seedData } from '../src/data/seedData.js';
import { changeLocation, emptyLocation, locationForMarket, locationOptions, matchesLocation } from '../src/utils/locations.js';
import { mockApi as api } from '../src/services/mockApi.js';

const markets = seedData().markets;
assert.deepEqual(locationForMarket(), emptyLocation, 'New submissions do not default to Dhaka');
let location = changeLocation(emptyLocation,'division','Chattogram');
assert.deepEqual(locationOptions(markets,location).districts,['Chattogram']);
location = changeLocation(location,'district','Chattogram');
assert.deepEqual(locationOptions(markets,location).thanas,['Kotwali']);
location = changeLocation(location,'area','Kotwali');
assert.deepEqual(locationOptions(markets,location).markets.map(m=>m.name),['Reazuddin Bazar']);
location = changeLocation(location,'marketId','m2');
assert.equal(markets.filter(m=>matchesLocation(m,location)).length,1);
assert.deepEqual(changeLocation(location,'division','Dhaka'),{division:'Dhaka',district:'',area:'',marketId:''});
assert.deepEqual(changeLocation(location,'district','Other'),{division:'Chattogram',district:'Other',area:'',marketId:''});
assert.equal(locationOptions(markets,{division:'Dhaka',district:'Dhaka',area:'Unknown'}).markets.length,0);
const sameName = [...markets,{id:'custom',name:'Other Kotwali Bazar',division:'Dhaka',district:'Dhaka',area:'Kotwali'}];
assert.deepEqual(locationOptions(sameName,location).markets.map(m=>m.id),['m2'],'Same thana name in another district stays excluded');
assert.deepEqual(locationForMarket(markets[2]),location,'Editing restores all parents');

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key,value) { this.values.set(key,String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const timer = globalThis.setTimeout;
globalThis.setTimeout = fn => timer(fn,0);
const publicData = await api.getPublicStatistics(location);
assert.ok(publicData.prices.length>0);
assert.ok(publicData.prices.every(p=>p.marketId==='m2'));
assert.equal(publicData.markets.length,markets.length,'Changing location keeps the complete picker catalog');
await api.login({email:'user@bazarlens.com',password:'User@123'});
const input = {...location,productId:'p0',category:'Grains',quality:'Standard',unit:'kg',price:80,date:new Date().toISOString().slice(0,10)};
await assert.rejects(()=>api.saveSubmission({...input,district:'Dhaka'}),/selected division/);
const row=await api.saveSubmission(input);
assert.equal(row.marketId,'m2');
assert.equal(row.area,'Kotwali');
console.log('PASS: dependent location options, parent resets, same-name thana isolation, edit restoration, public filtering and submission location validation.');

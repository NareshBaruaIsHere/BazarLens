import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from '../src/services/mockApi.js';
class MemoryStorage { data = new Map(); getItem(k) { return this.data.get(k) ?? null; } setItem(k,v) {this.data.set(k,String(v));} removeItem(k) {this.data.delete(k);} }
globalThis.localStorage = new MemoryStorage(); globalThis.sessionStorage = new MemoryStorage(); globalThis.window = new EventTarget();
globalThis.__renderData = new Map();
const originalError = console.error;
const warnings = [];
console.error = (...args) => { warnings.push(args.join(' ')); originalError(...args); };
const root = new URL('../',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
// Preload the same async service loaders during server rendering. This verifies
// populated component markup, not browser effects, events, focus or layout.
const server = await createServer({ root, configFile:false, plugins:[react(), {
  name:'test-preloaded-data', enforce:'pre',
  transform(code,id) { if (id.replaceAll('\\','/').endsWith('/src/services/api.js')) return 'export { mockApi as api } from "./mockApi.js";'; if(id.replaceAll('\\','/').endsWith('/src/components/useData.js')) return `export function useData(loader) { const key=loader.toString(); let entry=globalThis.__renderData.get(key); if(!entry) {entry={data:null,loading:true,error:''}; entry.promise=loader().then(data=>{entry.data=data;entry.loading=false;}).catch(e=>{entry.error=e.message;entry.loading=false;}); globalThis.__renderData.set(key,entry);} return {...entry,reload:()=>{}}; }`; return code; },
}], server:{middlewareMode:true}, appType:'custom' });
try {
  const context = await server.ssrLoadModule('/src/contexts/context.js');
  const auth = await server.ssrLoadModule('/src/pages/AuthPages.jsx');
  const market = await server.ssrLoadModule('/src/pages/MarketPages.jsx');
  const submissions = await server.ssrLoadModule('/src/pages/SubmissionsPage.jsx');
  const alerts = await server.ssrLoadModule('/src/pages/AlertsPage.jsx');
  const account = await server.ssrLoadModule('/src/pages/AccountPages.jsx');
  const admin = await server.ssrLoadModule('/src/pages/AdminPages.jsx');
  const publicStats = await server.ssrLoadModule('/src/pages/PublicStatisticsPage.jsx');
  const publicPages = await server.ssrLoadModule('/src/pages/PublicPages.jsx');
  const layout = await server.ssrLoadModule('/src/layouts/AppLayout.jsx');
  let count=0;
  async function render(Component,props,expected,user=null) {
    globalThis.__renderData.clear();
    const tree=React.createElement(MemoryRouter,null,React.createElement(context.ToastContext.Provider,{value:()=>{}},React.createElement(context.AuthContext.Provider,{value:{user,loading:false,refresh:async()=>{},logout:async()=>{}}},React.createElement(Component,props))));
    let html='';
    for(let pass=0;pass<4;pass++) { html=renderToString(tree); await Promise.all([...globalThis.__renderData.values()].map(e=>e.promise)); }
    html=html.replace(/<!--.*?-->/g,'');
    assert.ok(html.includes(expected),`${Component.name}: expected ${expected}`);
    assert.ok(!html.includes('href="#"'),'No placeholder anchors');
    assert.doesNotMatch(html, /\u00e2[\u0080-\u00bf\u0152\u0161\u02dc\u2013\u2014\u2018-\u2022\u20ac\u2122]|\u00c2\u00b7|\u00c3\u2014|\u00e0\u00a7\u00b3|\ufffd/, 'No corrupted UTF-8 text in rendered pages');
    assert.ok(!html.includes('Record no longer exists') && !html.includes('Please sign in with'),'Data loaders completed');
    count++; return html;
  }
  const loginHtml = await render(auth.LoginPage,{},'Welcome back');
  assert.doesNotMatch(loginHtml, /Continue with|Fill Admin|google-btn/);
  await render(publicStats.default,{},'Public price statistics');
  await render(auth.SignUpPage,{},'Confirm password');
  await render(auth.ForgotPasswordPage,{},'Password recovery is not enabled yet');
  for(const page of ['about','privacy','terms','help']) await render(publicPages.PublicPage,{page},'Go to dashboard');
  await render(publicPages.ErrorPage,{},'Page not found'); await render(publicPages.ErrorPage,{denied:true},'Access denied');
  let user=await mockApi.login({email:'user@bazarlens.com',password:'User@123'});
  for(const [Component,props,expected] of [[market.DashboardPage,{},'Recent price submissions'],[market.PricesPage,{},'Average price'],[submissions.default,{},'Quality'],[alerts.default,{},'Disable'],[market.AnalyticsPage,{},'Verified rate'],[account.ProfilePage,{},'Tanvir Ahmed'],[account.SettingsPage,{},'Use compact tables'],[layout.default,{},'Open profile menu']]) await render(Component,props,expected,user);
  user=await mockApi.login({email:'agent@bazarlens.com',password:'Agent@123'});
  await render(submissions.default,{},'My submissions',user);
  const agentHtml = await render(layout.default,{},'Price submissions',user);
  assert.doesNotMatch(agentHtml, /href="\/(prices|trends|dashboard|analytics|alerts)"|View notifications/);
  const settingsHtml = await render(account.SettingsPage,{},'Use compact tables',user);
  assert.doesNotMatch(settingsHtml, /Default area|price notifications|email previews/);
  user=await mockApi.login({email:'admin@bazarlens.com',password:'Admin@123'});
  for(const [Component,props,expected] of [[market.DashboardPage,{admin:true},'Submissions by month'],[admin.UsersPage,{},'Tanvir Ahmed'],[submissions.default,{admin:true},'Approve'],[admin.CatalogPage,{kind:'products'},'Hilsa'],[admin.CatalogPage,{kind:'markets'},'Karwan Bazar'],[market.AnalyticsPage,{admin:true},'Most active contributors'],[account.ProfilePage,{},'BazerLens Admin'],[admin.AdminSettingsPage,{},'Export JSON'],[layout.default,{admin:true},'ADMINISTRATION']]) await render(Component,props,expected,user);
  const pricesHtml = await render(market.PricesPage,{},'Average price',user);
  assert.doesNotMatch(pricesHtml, /Low \/ high|View details|Market \/ area|>Area<|>Market</);
  const statsHtml = await render(publicStats.default,{},'Public price statistics');
  assert.doesNotMatch(statsHtml, /Lowest|Highest|price history/);
  const formHtml = await render(submissions.SubmissionForm,{products:await mockApi.listProducts(),markets:await mockApi.listMarkets(),onClose:()=>{}},'Select quality',user);
  assert.match(formHtml, /name="category"/);
  assert.match(formHtml, /name="quality"/);
  await render(submissions.default,{admin:true,flaggedOnly:true},'Flagged prices awaiting a decision',user);
  assert.equal(warnings.length,0,'No React rendering warnings');
  console.log(`PASS: ${count} populated page/layout render checks. Browser interactions and responsive visual checks are not covered.`);
} finally { console.error=originalError; await server.close(); }

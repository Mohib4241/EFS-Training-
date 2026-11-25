import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeRoute,decodeRoute} from '../src/route-cipher.js';

test('every page address round-trips and does not show the page name',()=>{
 const routes=['home','maintenance','hard-services','junior-103','junior-429','junior-103/maintenance','junior-429/maintenance','hyper-2000b','hyper-2000b/maintenance','equipment/motor-1ph','equipment/motor-3ph/maintenance/2','equipment/megger/experiment','équipement/ü'];
 for(const route of routes){
  const token=encodeRoute(route);
  assert.equal(decodeRoute(token),route,route);
  assert.match(token,/^[A-Za-z0-9_-]+$/,'safe to put after #');
  for(const word of ['junior','maintenance','equipment','motor','home','hyper','megger'])assert.ok(!token.toLowerCase().includes(word)||route.length<6,`${token} must not spell ${word}`);
 }
});

test('the same page gets a different address each time, and altered or foreign addresses are refused',()=>{
 const seen=new Set();for(let i=0;i<40;i++)seen.add(encodeRoute('junior-103'));
 assert.ok(seen.size>20,'a fresh scramble each time');
 assert.equal(encodeRoute('home',[1,2]),encodeRoute('home',[1,2]),'but fixed by its two random bytes');
 const token=encodeRoute('junior-103',[7,9]);
 assert.equal(decodeRoute(token.slice(0,-1)+(token.at(-1)==='A'?'B':'A')),null,'one changed letter');
 assert.equal(decodeRoute(token+'A'),null);
 for(const foreign of ['','home','junior-103','junior-103/maintenance','equipment/motor-1ph','!!!','a'])assert.equal(decodeRoute(foreign),null,`"${foreign}" is not one of ours`);
});

test('the app uses scrambled addresses, still opens old readable ones, and the machine pages have no sidebar but a logo',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8'),css=readFileSync(new URL('../src/look/look.css',import.meta.url),'utf8');
 assert.match(app,/`#\$\{encodeRoute\(hash\)\}`/,'addresses written to the browser are scrambled');
 assert.match(app,/decodeRoute\(raw\)\?\?raw/,'an old readable address still opens its page');
 assert.match(app,/decodeRoute\(location\.hash\.slice\(1\)\)===null\?'replace':'none'/,'and is then scrambled');
 assert.doesNotMatch(html,/href="#home"/,'the logo link does not spell the page either');
 assert.match(html,/class="eq-logo"[^>]*>\s*<img src="\/assets\/efs-coe-mark\.png"/,'the small EFS logo is on the page');
 assert.match(css,/body:is\(\[data-view=equipment\],\[data-view=soft-checklist\]\) :is\(\.sidebar,#nav-backdrop,#menu\)\{display:none!important\}/,'no sidebar on machine pages');
});

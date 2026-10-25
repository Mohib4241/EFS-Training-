import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {App} from '../src/app.js';
import {World} from '../src/scene/world.js';
import {guideFor, readReview, sourcePages} from '../src/data/procedure.js';
import {frameBounds} from '../src/scene/framing.js';
import {Head} from '../src/scene/character.js';
import {store} from '../src/shell.js';

test('storage failures are reported without throwing away the current session', () => {
  const previous=globalThis.localStorage;
  try {globalThis.localStorage={setItem(){throw new Error('Blocked');}};assert.equal(store.set('test','value'),false);
    const values=new Map();globalThis.localStorage={setItem:(k,v)=>values.set(k,v)};assert.equal(store.set('test','value'),true);assert.equal(values.get('test'),'value');
  } finally {globalThis.localStorage=previous;}
});

test('new character heads reuse the shared cheek texture instead of orphaning it', () => {
  const map=new THREE.Texture(),blush=new THREE.MeshBasicMaterial({map});
  const head={M:{blush},zAt:()=>0,_mesh:(geometry,material)=>new THREE.Mesh(geometry,material)};
  Head.prototype._cheeks.call(head);Head.prototype._cheeks.call(head);
  assert.equal(blush.map,map);assert.equal(head.cheeks.length,2);
});

test('automatic framing contains all equipment bounds in portrait and landscape views', () => {
  const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,2,2));
  for(const aspect of [.65,1,2]) {
    const camera=new THREE.PerspectiveCamera(42,aspect,.1,90);
    frameBounds(camera,bounds,new THREE.Vector3(3,2,4));
    for(const x of [-2,2])for(const y of [0,2])for(const z of [-2,2]){
      const p=new THREE.Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1,`${aspect}: a corner is clipped`);
    }
  }
});

test('every SOP step has source-backed verification and persisted review rejects invalid records', () => {
  for (let i=0;i<16;i++) {
    const g=guideFor('sop',i);assert.equal(g.n,i+1);
    assert.equal(g.verification.answer,0);assert.ok(g.verification.question.length>30);
    assert.ok(g.verification.checks.every(id=>g.checks.some(c=>c.id===id)));
    assert.notEqual(...g.verification.choices);assert.ok(g.pages.length);
  }
  assert.equal(guideFor('instructions',0).verification,null);
  assert.equal(guideFor('sop',16),null);
  assert.deepEqual(readReview('[1,1,16,-1,0,17,2.5,"3",null]'),[1,16]);
  assert.deepEqual(readReview('{"1":true}'),[]);assert.deepEqual(readReview('bad'),[]);
  assert.deepEqual(sourcePages(12),[2,3]);
});

test('world cleanup releases owned resources once and preserves shared geometry/material/texture', () => {
  const sharedGeo=new THREE.BoxGeometry(),ownGeo=new THREE.BoxGeometry();sharedGeo.userData.shared=true;
  const sharedTexture=new THREE.Texture(),ownTexture=new THREE.Texture();
  const sharedMat=new THREE.MeshStandardMaterial({map:sharedTexture}),ownMat=new THREE.MeshStandardMaterial({map:ownTexture}),cloneMat=sharedMat.clone();
  const content=new THREE.Group();content.add(new THREE.Mesh(sharedGeo,sharedMat),new THREE.Mesh(ownGeo,ownMat),new THREE.Mesh(ownGeo,ownMat),new THREE.Mesh(sharedGeo,cloneMat));
  const disposed=new Map();for(const resource of [sharedGeo,ownGeo,sharedTexture,ownTexture,sharedMat,ownMat,cloneMat])resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
  World.prototype.disposeContent.call({M:{clothes:{sharedMat}},content});
  for(const resource of [sharedGeo,sharedTexture,sharedMat])assert.equal(disposed.get(resource),undefined);
  for(const resource of [ownGeo,ownTexture,ownMat,cloneMat])assert.equal(disposed.get(resource),1);
});

test('a late lazy route cannot replace the screen chosen more recently', async () => {
  const previous=globalThis.document;globalThis.document={body:{dataset:{}}};
  try {
    let finish;const slow=new Promise(resolve=>{finish=resolve;});const built=[];
    const screen=name=>({title:()=>name,build:()=>built.push(name),enter(){},leave(){}});
    const app={request:0,route:'',screen:null,screens:{},host:{style:{}},shell:{loading(){},paint(){}},narrator:{stop(){}},hint(){},get:App.prototype.get,factories:{home:()=>slow,library:()=>screen('library')}};
    const first=App.prototype.show.call(app,'home');await Promise.resolve();
    await App.prototype.show.call(app,'library');finish(screen('home'));await first;
    assert.equal(app.route,'library');assert.equal(app.screen.title(),'library');assert.deepEqual(built,['library']);
  } finally {globalThis.document=previous;}
});

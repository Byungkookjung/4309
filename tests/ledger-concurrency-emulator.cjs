// Exercise the SAME mutation implementation as ledger.js against the actual rules, locally only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8189'||!process.env.GCLOUD_PROJECT?.startsWith('demo-')||!process.env.EE_ACTUAL_RULES)throw Error('Actual rules, localhost:8189 and a demo-* project are mandatory.');
const resolve=name=>require.resolve(name,{paths:[path.resolve(process.env.EE_EMULATOR_DEPS||'.')]}),{initializeTestEnvironment}=require(resolve('@firebase/rules-unit-testing'));
const sdk=require(resolve('firebase/firestore')),M=require('../ledger-mutations.js');
const gate=()=>{let release;const promise=new Promise(resolve=>release=resolve);return {promise,release};};
(async()=>{
 const env=await initializeTestEnvironment({projectId:process.env.GCLOUD_PROJECT,firestore:{host:'127.0.0.1',port:8189,rules:fs.readFileSync(process.env.EE_ACTUAL_RULES,'utf8')}});
 try{
  await env.clearFirestore();const db=env.authenticatedContext('owner').firestore(),prefix='users/owner/';
  const wrap=snapshot=>({id:snapshot.id,exists:snapshot.exists(),data:()=>snapshot.data()});
  const ref=relative=>{const native=sdk.doc(db,prefix+relative);return {native,id:native.id,path:native.path,get:async()=>wrap(await sdk.getDoc(native))};};
  const list=async name=>(await sdk.getDocs(sdk.collection(db,prefix+name))).docs.map(doc=>({...doc.data(),id:doc.id}));
  const store=()=>({revision:ref('ledgerSettings/eeRevision'),plan:id=>ref('ledgerPlanItems/'+id),entry:id=>ref('ledgerEntries/'+id),listPlans:()=>list('ledgerPlanItems'),listEntries:()=>list('ledgerEntries'),assertAccount(){},transaction:callback=>sdk.runTransaction(db,tx=>callback({get:async r=>wrap(await tx.get(r.native)),set:(r,data)=>tx.set(r.native,data),delete:r=>tx.delete(r.native)}))});
  const seed=async(id,type='expected')=>sdk.setDoc(ref('ledgerPlanItems/'+id).native,{id,type,label:id,amount:100,metadata:'preserve'});
  const entry=(id,parent,sourceType='expected')=>({id,date:'2026-11-01',type:sourceType==='income'?'income':'expense',sourceType,linkedPlanItemId:parent,linkedPlanItemLabel:parent,reason:parent,detail:'original',amount:80,isShared:true});
  const exists=async relative=>(await ref(relative).get()).exists;
  for(const type of ['expected','fixed','income']){
   const parent='save-first-'+type;await seed(parent,type);const read=gate(),resume=gate(),del=store(),normal=del.listEntries;
   del.listEntries=async()=>{const rows=await normal();read.release();await resume.promise;return rows;};
   const deletion=M.deleteRemote(del,[parent]).then(()=>null,error=>error);await read.promise;
   await M.saveRemote(store(),[entry(parent,parent,type)]);resume.release();assert.match((await deletion).message,/changed while deleting/);
   assert.ok(await exists('ledgerPlanItems/'+parent));assert.ok(await exists('ledgerEntries/'+parent));
   console.log(type+': entry commits after deletion history query; revision fence blocks deletion PASS');
  }
  await seed('delete-first');await M.deleteRemote(store(),['delete-first']);
  await assert.rejects(M.saveRemote(store(),[entry('stale','delete-first')]),/budget was deleted/);assert.equal(await exists('ledgerEntries/stale'),false);
  console.log('Deletion commits first; stale form/linked transaction rejected without partial writes PASS');
  await seed('retry');const read=gate(),resume=gate(),saving=store();let held=false,attempts=0;const transact=saving.transaction;
  saving.transaction=callback=>transact(async tx=>{attempts++;const get=tx.get;tx.get=async r=>{const doc=await get(r);if(r.path.endsWith('/ledgerPlanItems/retry')&&!held){held=true;read.release();await resume.promise;}return doc;};return callback(tx);});
  const pending=M.saveRemote(saving,[entry('retry-entry','retry')]).then(()=>null,error=>error);await read.promise;
  await M.deleteRemote(store(),['retry']);resume.release();assert.match((await pending).message,/budget was deleted/);assert.ok(attempts>=2,'Firestore retried conflicting save');assert.equal(await exists('ledgerEntries/retry-entry'),false);
  console.log('True Firestore transaction conflict/retry revalidates missing parent PASS');
  await seed('import-a');await seed('import-b');await M.deleteRemote(store(),['import-b']);
  await assert.rejects(M.saveRemote(store(),[entry('import-1','import-a'),entry('import-2','import-b')]),/budget was deleted/);
  assert.equal(await exists('ledgerEntries/import-1'),false);assert.equal(await exists('ledgerEntries/import-2'),false);
  console.log('TXT batch with one stale parent fails atomically PASS');
  await seed('source');await seed('target');await M.saveRemote(store(),[entry('moving','source')]);await M.deleteRemote(store(),['target']);
  await assert.rejects(M.saveRemote(store(),[entry('moving','target')],['moving']),/budget was deleted/);
  assert.equal((await ref('ledgerEntries/moving').get()).data().linkedPlanItemId,'source');
  console.log('Edit/relink to deleted target preserves original relationship and amount PASS');
  for(let n=0;n<8;n++){
   const id='simultaneous-'+n;await seed(id);
   await Promise.allSettled([M.saveRemote(store(),[entry(id,id)]),M.deleteRemote(store(),[id])]);
   if(await exists('ledgerEntries/'+id))assert.ok(await exists('ledgerPlanItems/'+id),'no orphan after simultaneous race');
  }
  console.log('8 real simultaneous races: no orphaned transaction PASS');
  const hierarchy=require('../ee-model.js').applyTemplate([])[0];
  await sdk.setDoc(ref('ledgerPlanItems/'+hierarchy.id).native,hierarchy);
  const historical={...entry('cascade-history',hierarchy.id),subcategoryId:hierarchy.subcategories[0].id};
  await M.saveRemote(store(),[historical]);await M.deleteRemote(store(),[hierarchy.id]);
  const deleted=(await ref('ledgerPlanItems/'+hierarchy.id).get()).data();
  assert.equal(deleted.deleted,true);assert.ok(deleted.subcategories.every(child=>child.deleted));assert.equal(deleted.amount,0);
  assert.deepEqual((await ref('ledgerEntries/cascade-history').get()).data(),historical);
  await assert.rejects(M.saveRemote(store(),[{...historical,id:'new-after-cascade'}]),/budget was deleted/);
  console.log('Hierarchical EE cascade preserves exact historical entry, marks all children and rejects new assignments PASS');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});

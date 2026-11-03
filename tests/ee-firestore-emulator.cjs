// Actual rules are mandatory. Never fall back to a live Firebase project.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const host=process.env.FIRESTORE_EMULATOR_HOST,projectId=process.env.GCLOUD_PROJECT;
if(host!=='127.0.0.1:8189'||!projectId?.startsWith('demo-'))throw Error('Release blocker: use localhost:8189 and an explicit demo-* project only.');
if(!process.env.EE_ACTUAL_RULES)throw Error('Release blocker: EE_ACTUAL_RULES must identify the actual read-only rules snapshot.');
const rules=fs.readFileSync(process.env.EE_ACTUAL_RULES,'utf8');
const dependencies=process.env.EE_EMULATOR_DEPS;
const resolve=name=>dependencies?require.resolve(name,{paths:[path.resolve(dependencies)]}):name;
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(resolve('@firebase/rules-unit-testing'));
const {doc,collection,setDoc,getDoc,getDocs,updateDoc,deleteDoc,runTransaction}=require(resolve('firebase/firestore'));
const EE=require('../ee-model.js');
(async()=>{
 const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8189,rules}});
 try{
  await env.clearFirestore();
  const owner=env.authenticatedContext('owner').firestore(),other=env.authenticatedContext('other').firestore(),anonymous=env.unauthenticatedContext().firestore();
  const prefix='users/owner/',parent=EE.applyTemplate([])[0],parentPath=prefix+'ledgerPlanItems/'+parent.id,revisionPath=prefix+'ledgerSettings/eeRevision',entryPath=prefix+'ledgerEntries/history';
  const reference=doc(owner,parentPath),revision=doc(owner,revisionPath);
  await assertSucceeds(setDoc(reference,{...parent,customMetadata:'preserve'}));
  await assertSucceeds(setDoc(doc(owner,prefix+'ledgerPlanItems/fe'),{type:'fixed',label:'Rent',amount:900}));
  await assertSucceeds(setDoc(doc(owner,prefix+'ledgerPlanItems/ei'),{type:'income',label:'Salary',amount:3000}));
  await assertSucceeds(setDoc(doc(owner,entryPath),{type:'expense',sourceType:'expected',date:'2026-11-01',reason:'장보기',linkedPlanItemId:parent.id,amount:80,isShared:true,subcategoryId:parent.subcategories[0].id,subcategoryLabel:parent.subcategories[0].label}));
  await assertSucceeds(runTransaction(owner,async tx=>{
   const [rev,plan]=await Promise.all([tx.get(revision),tx.get(reference)]);
   const next=EE.normalize({...plan.data(),subcategories:plan.data().subcategories.map((child,i)=>i===0?{...child,archived:true}:child)});
   tx.set(reference,next,{merge:true});tx.set(revision,{version:Number(rev.data()?.version||0)+1});
  }));
  assert.equal((await getDoc(revision)).data().version,1);
  const saved=(await getDoc(reference)).data();assert.equal(saved.customMetadata,'preserve');assert.equal(saved.subcategories[0].archived,true);assert.equal(saved.amount,70);
  assert.equal((await getDoc(doc(owner,entryPath))).data().subcategoryId,parent.subcategories[0].id);
  assert.equal((await getDoc(doc(owner,prefix+'ledgerPlanItems/fe'))).data().amount,900);assert.equal((await getDoc(doc(owner,prefix+'ledgerPlanItems/ei'))).data().amount,3000);
  await assertSucceeds(getDocs(collection(owner,prefix+'ledgerPlanItems')));
  for(const db of [other,anonymous]){
   for(const record of [parentPath,revisionPath,entryPath]){
    const ref=doc(db,record);
    await assertFails(getDoc(ref));await assertFails(setDoc(ref,{version:999},{merge:true}));await assertFails(updateDoc(ref,{version:999}));await assertFails(deleteDoc(ref));
   }
   await assertFails(setDoc(doc(db,prefix+'ledgerSettings/newDocument'),{version:1}));
   await assertFails(getDocs(collection(db,prefix+'ledgerEntries')));
   await assertFails(runTransaction(db,async tx=>{await tx.get(doc(db,revisionPath));tx.set(doc(db,revisionPath),{version:999});}));
  }
  await assertSucceeds(setDoc(doc(other,'users/other/ledgerSettings/eeRevision'),{version:1}));
  assert.equal((await getDoc(revision)).data().version,1,'denied writes leave owner revision unchanged');
  console.log('Actual Firestore rules SHA256 '+crypto.createHash('sha256').update(rules).digest('hex'));
  console.log('PASS: owner schema, revision transaction, archive/history, FE/EI preservation; cross-user and unauthenticated read/create/update/delete/query/transaction denied.');
  console.log('Rules are ownership-only: they do NOT enforce EE schema, revision monotonicity or parent referential integrity. Application deletion guards remain necessary.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});

const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../ledger-mutations.js'),EE=require('../ee-model.js');
const parent={id:'p',type:'expected',label:'Parent',amount:100},record={id:'e',type:'expense',sourceType:'expected',linkedPlanItemId:'p',amount:80};
test('new entries cannot link missing/type-changed parents; historical orphan edits retain original links',()=>{
 assert.throws(()=>M.validateEntries([record],[],[]),/budget was deleted/);
 assert.throws(()=>M.validateEntries([record],[],[{...parent,type:'fixed'}]),/type changed/);
 assert.doesNotThrow(()=>M.validateEntries([record],[record],[],['e']));
 assert.throws(()=>M.validateEntries([{...record,linkedPlanItemId:'other'}],[record],[],['e']),/budget was deleted/);
 assert.throws(()=>M.validateEntries([record],[],[parent],['e']),/transaction was deleted/);
 assert.throws(()=>M.validateEntries([record],[record],[parent]),/ID already exists/);
});
test('archived/missing children are allowed only on unchanged historical assignments',()=>{
 const plan=EE.applyTemplate([])[0],entry={...record,linkedPlanItemId:plan.id,subcategoryId:plan.subcategories[0].id};
 plan.subcategories[0].archived=true;
 assert.throws(()=>M.validateEntries([entry],[],[plan]),/subcategory is unavailable/);
 assert.doesNotThrow(()=>M.validateEntries([entry],[entry],[plan],['e']));
 assert.throws(()=>M.validateEntries([{...entry,subcategoryId:'missing'}],[entry],[plan],['e']),/subcategory is unavailable/);
});
test('referenced income budgets stay protected; fixed and EE use history-preserving deletion',()=>{
 assert.doesNotThrow(()=>M.checkDeletion(['p'],[parent],[record]));
 const removed=EE.removeParent(parent);
 assert.throws(()=>M.validateEntries([record],[],[removed]),/budget was deleted/);
 assert.doesNotThrow(()=>M.validateEntries([record],[record],[removed],['e']));
 for(const type of ['income']){
  assert.throws(()=>M.checkDeletion(['p'],[{...parent,type}],[{...record,sourceType:type}]),/historical/);
  assert.doesNotThrow(()=>M.checkDeletion(['p'],[{...parent,type}],[]));
 }
});
test('local saving fails closed without Web Locks rather than using an unsafe storage lease',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
 try{await assert.rejects(M.withLocalLock(()=>assert.fail('unsafe fallback')),/Web Locks support/);}
 finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
test('a batch cannot overwrite itself through duplicate transaction IDs',()=>{
 assert.throws(()=>M.validateEntries([record,record],[],[parent]),/Duplicate transaction IDs/);
});
test('new budget-linked records require an explicit parent ID; legacy unlinked edits retain original meaning',()=>{
 const legacy={...record,linkedPlanItemId:'',reason:'Old category'};
 assert.throws(()=>M.validateEntries([legacy],[],[parent]),/Choose an existing budget/);
 assert.doesNotThrow(()=>M.validateEntries([legacy],[legacy],[],['e']));
 assert.throws(()=>M.validateEntries([{...legacy,reason:'Another category'}],[legacy],[],['e']),/Choose an existing budget/);
});

test('fixed expense deletion retains parent metadata and historical transaction links',()=>{
 const fixed={...parent,type:'fixed',customMetadata:'keep'},entry={...record,sourceType:'fixed'};
 assert.doesNotThrow(()=>M.checkDeletion(['p'],[fixed],[entry]));
 const removed=EE.removeParent(fixed);assert.equal(removed.deleted,true);assert.equal(removed.amount,0);assert.equal(removed.customMetadata,'keep');
 assert.throws(()=>M.validateEntries([{...entry,id:'new'}],[],[removed]),/budget was deleted/);
 assert.doesNotThrow(()=>M.validateEntries([entry],[entry],[removed],['e']));
});
test('remote fixed deletion writes a tombstone and revision atomically, never deletes history',async()=>{
 const fixed={...parent,type:'fixed',metadata:'keep'},history=[{...record,sourceType:'fixed'}],writes=[],deletes=[];
 const snapshot={id:'p',exists:true,data:()=>({...fixed})},revision={get:async()=>({data:()=>({version:4})})},ref={id:'p'};
 const store={revision,plan:()=>ref,listPlans:async()=>[fixed],listEntries:async()=>history,assertAccount(){},transaction:async fn=>fn({get:async r=>r===revision?{data:()=>({version:4})}:snapshot,set:(r,value)=>writes.push({r,value}),delete:r=>deletes.push(r)})};
 await M.deleteRemote(store,['p']);assert.equal(deletes.length,0);assert.equal(writes[0].value.deleted,true);assert.equal(writes[0].value.metadata,'keep');assert.equal(writes[1].value.version,5);assert.equal(history[0].linkedPlanItemId,'p');
});

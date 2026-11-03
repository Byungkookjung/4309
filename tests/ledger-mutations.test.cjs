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
test('all referenced budgets are protected but unused FE/EI budgets remain removable',()=>{
 for(const type of ['expected','fixed','income']){
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

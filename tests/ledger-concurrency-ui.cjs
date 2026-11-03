// Two real tabs share localStorage. Barriers force both orderings of the app's Web Lock.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8006';
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   const a=await context.newPage(),b=await context.newPage(),errors=[];
   for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
   await a.goto(base+'/ledger.html');
   const fixture=async(type)=>{
    await a.evaluate(type=>{
     localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:2000,etc:0});localStorage.ledgerActivity='[]';
     localStorage.ledgerPlanItems=JSON.stringify([{id:'parent',type,label:'Parent',amount:100,customMetadata:'keep'},{id:'other',type:'fixed',label:'Other',amount:900}]);
    },type);
    await a.reload();await b.goto(base+'/ledger.html');
   };
   const hold=async()=>{
    await a.evaluate(()=>{window.held=false;window.holding=navigator.locks.request('ledger-budget-activity-write',async()=>{window.held=true;await new Promise(resolve=>window.release=resolve);});});
    await a.waitForFunction(()=>window.held);
   };
   const pending=async n=>a.waitForFunction(async n=>(await navigator.locks.query()).pending.filter(lock=>lock.name==='ledger-budget-activity-write').length===n,n);
   const save=async type=>a.evaluate(type=>{
    window.result=saveEntriesSafely([{id:'new',date:'2026-11-01',type:type==='income'?'income':'expense',sourceType:type,linkedPlanItemId:'parent',reason:'Parent',amount:80,isShared:true,detail:'original'}]).then(()=>({ok:true}),error=>({error:error.message}));
   },type);
   const remove=async()=>b.evaluate(()=>{window.result=deletePlanItemsSafely(['parent']).then(()=>({ok:true}),error=>({error:error.message}));});
   for(const type of ['expected','fixed','income'])for(const first of ['save','delete']){
    await fixture(type);await hold();
    if(first==='save'){await save(type);await pending(1);await remove();}else{await remove();await pending(1);await save(type);}
    await pending(2);await a.evaluate(()=>window.release());
    const [saved,deleted]=[await a.evaluate(()=>window.result),await b.evaluate(()=>window.result)];
    const data=await a.evaluate(()=>({plans:JSON.parse(localStorage.ledgerPlanItems),entries:JSON.parse(localStorage.ledgerActivity)}));
    if(first==='save'){
     assert.equal(saved.ok,true);if(type==='expected'){assert.equal(deleted.ok,true);assert.equal(data.plans.find(row=>row.id==='parent').deleted,true);}else assert.match(deleted.error,/historical/);
     assert.equal(data.entries[0].linkedPlanItemId,'parent');assert.equal(data.plans.find(row=>row.id==='parent').customMetadata,'keep');
    }else{assert.equal(deleted.ok,true);assert.match(saved.error,/budget was deleted/);assert.equal(data.entries.length,0);assert.equal(data.plans.some(row=>row.id==='parent'&&!row.deleted),false);}
    console.log(name+' '+type+' '+first+' first: actual app, two tabs, no broken link PASS');
   }
   await fixture('expected');await a.evaluate(()=>{localStorage.ledgerPlanItems=JSON.stringify(JSON.parse(localStorage.ledgerPlanItems).filter(row=>row.id!=='parent'));});
   const imported=await a.evaluate(()=>saveEntriesSafely([{id:'one',reason:'Other',sourceType:'fixed',linkedPlanItemId:'other',amount:10},{id:'two',reason:'Parent',sourceType:'expected',linkedPlanItemId:'parent',amount:20}]).then(()=>null,error=>error.message));
   assert.match(imported,/budget was deleted/);assert.equal(await a.evaluate(()=>JSON.parse(localStorage.ledgerActivity).length),0);
   await fixture('expected');await a.evaluate(()=>{localStorage.ledgerActivity=JSON.stringify([{id:'legacy-invalid',reason:'',amount:0,linkedPlanItemId:'parent'}]);});
   const protectedHistory=await a.evaluate(()=>deletePlanItemsSafely(['parent']).then(()=>null,error=>error.message));
   assert.equal(protectedHistory,null);assert.equal(await a.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='parent').deleted),true);
   assert.equal(await a.evaluate(()=>JSON.parse(localStorage.ledgerActivity)[0].linkedPlanItemId),'parent','invisible legacy records keep their historical parent reference');
   assert.deepEqual(errors,[]);console.log(name+': stale TXT batch fails all-or-nothing PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});

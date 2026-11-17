// Isolated local/Firestore-double fixtures only. No live accounts or financial writes.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8008';
function remoteFixture(){
 const user={uid:'settings-fixture'};const root='users/'+user.uid;
 window.remoteRows={[root+'/ledgerBalances/main']:{checking:1000,saving:2000,etc:0,metadata:'keep'}};window.remoteWrites=0;const listeners=new Map();
 const snapshot=path=>({id:path.split('/').pop(),exists:Object.hasOwn(remoteRows,path),data:()=>structuredClone(remoteRows[path])});
 function read(path){if(path.split('/').length%2===0)return snapshot(path);return {docs:Object.keys(remoteRows).filter(key=>key.startsWith(path+'/')&&key.slice(path.length+1).indexOf('/')<0).map(snapshot)};}
 function reference(path){return {path,doc:id=>reference(path+'/'+id),collection:id=>reference(path+'/'+id),orderBy(){return this;},limit(){return this;},async get(){return read(path);},onSnapshot(cb){listeners.set(path,cb);queueMicrotask(()=>cb(read(path)));return ()=>listeners.delete(path);}};}
 window.emitBalances=patch=>{if(patch)Object.assign(remoteRows[root+'/ledgerBalances/main'],patch);listeners.get(root+'/ledgerBalances/main')(read(root+'/ledgerBalances/main'));};
 window.__ledgerAuth={auth:{currentUser:user},requireAuth:async()=>user,db:{collection:reference,runTransaction:async callback=>{const writes=[];await callback({get:ref=>ref.get(),set:(ref,value)=>writes.push([ref.path,structuredClone(value)])});for(const [path,value] of writes){remoteRows[path]=value;remoteWrites++;}for(const [path] of writes)listeners.get(path)?.(read(path));}}};
}
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(()=>{if(localStorage.settingsFixture)return;localStorage.settingsFixture='yes';localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:2000,etc:0,metadata:'keep'});localStorage.ledgerPlanItems=JSON.stringify([{id:'rent',type:'fixed',label:'Rent',amount:900,metadata:'keep'},{id:'food',type:'expected',label:'Food',amount:500}]);localStorage.ledgerActivity=JSON.stringify([{id:'old',date:'2026-11-01',type:'expense',sourceType:'fixed',reason:'Rent',linkedPlanItemId:'rent',amount:75}]);});
   const page=await context.newPage(),errors=[],dialogs=[];let accept=true;page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());accept?d.accept():d.dismiss();});
   await page.goto(base+'/ledger.html');await page.locator('#toggleBalancesBtn').click();assert.equal(await page.locator('#editBalancesBtn').isVisible(),true);
   await page.locator('#editBalancesBtn').click();assert.equal(await page.locator('#setupSection').isVisible(),true);assert.equal(await page.locator('#checkingBalance').inputValue(),'1000.00');
   await page.locator('#checkingBalance').fill('1234.56');await page.locator('#savingBalance').fill('345.67');await page.locator('#etcBalance').fill('8.90');await page.locator('#saveBalancesBtn').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.ledgerBalances).checking===1234.56);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.ledgerBalances)),{checking:1234.56,saving:345.67,etc:8.9,metadata:'keep'});
   await page.reload();await page.locator('#editBalancesBtn').click();assert.equal(await page.locator('#checkingBalance').inputValue(),'1234.56');await page.locator('#checkingBalance').fill('99');await page.locator('#setupBackBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerBalances).checking),1234.56);
   await page.locator('#activitySourceType').selectOption('fixed');await page.locator('#activityLinkedItem').selectOption('rent');await page.locator('#activityAmount').fill('40');
   const checkbox=page.locator('#activityShared');assert.notEqual(await checkbox.evaluate(e=>getComputedStyle(e).appearance),'none');await page.locator('label[for="activityShared"]').click();assert.equal(await checkbox.isChecked(),true);
   await page.locator('#addActivityBtn').click();await page.waitForFunction(()=>JSON.parse(localStorage.ledgerActivity).length===2);const added=await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id!=='old'));assert.equal(added.isShared,true);assert.equal(await page.evaluate(id=>getEntryEffectiveAmount(activityEntries.find(row=>row.id===id)),added.id),20);
   const before=await page.evaluate(()=>localStorage.ledgerActivity);await page.locator('#openPlanBtn').click();await page.getByRole('button',{name:'Rent 상위 분류 수정',exact:true}).click();assert.equal(await page.locator('#removePlanItemBtn').isEnabled(),true);
   accept=false;await page.locator('#removePlanItemBtn').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='rent').deleted),undefined);accept=true;await page.locator('#removePlanItemBtn').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='rent').deleted);assert.equal(await page.evaluate(()=>localStorage.ledgerActivity),before);assert.equal(await page.locator('#fixedPlanList [data-id="rent"]').count(),0);
   await page.locator('#closePlanBtn').click();await page.locator('#activitySourceType').selectOption('fixed');assert.equal(await page.locator('#activityLinkedItem option[value="rent"]').count(),0);
   await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id==='old').linkedPlanItemId),'rent');assert.deepEqual(errors,[]);
   const relink=await page.evaluate(()=>{
    const replacement={id:'replacement',type:'fixed',label:'Rent',amount:900};planItems.push(replacement);enterActivityEditMode('old');
    const selected=activityLinkedItemSelect.selectedOptions[0],linked=selected.dataset.linkedId;
    const previous=activityEntries;activityEntries=[{id:'legacy',date:getTodayDateString(),type:'expense',sourceType:'fixed',reason:'Rent',amount:75,linkedPlanItemId:''}];
    const actual=getActivityAmountForPlanItem(replacement);activityEntries=previous;return {linked,saved:selected.dataset.savedItem,actual};
   });assert.deepEqual(relink,{linked:'rent',saved:'true',actual:0});assert.equal(await page.evaluate(()=>localStorage.ledgerActivity),before);
   await context.route('**/auth.js',r=>r.fulfill({body:'('+remoteFixture.toString()+')();'}));await page.goto(base+'/ledger.html');await page.locator('#dashboardSection').waitFor();await page.locator('#editBalancesBtn').click();await page.locator('#checkingBalance').fill('1111.11');
   await page.evaluate(()=>emitBalances());assert.equal(await page.locator('#setupSection').isVisible(),true);assert.equal(await page.locator('#checkingBalance').inputValue(),'1111.11');
   await page.evaluate(()=>emitBalances({checking:999}));await page.locator('#saveBalancesBtn').click();await page.waitForFunction(()=>!balanceSaving);assert.equal(await page.evaluate(()=>remoteWrites),0);assert.ok(dialogs.some(text=>text.includes('다른 화면에서 변경')));assert.equal(await page.locator('#checkingBalance').inputValue(),'1111.11');
   await page.locator('#setupBackBtn').click();await page.locator('#editBalancesBtn').click();assert.equal(await page.locator('#checkingBalance').inputValue(),'999.00');await page.locator('#checkingBalance').fill('2222.22');await page.locator('#saveBalancesBtn').click();await page.waitForFunction(()=>!balanceSaving);
   assert.equal(await page.evaluate(()=>remoteRows['users/settings-fixture/ledgerBalances/main'].checking),2222.22);assert.equal(await page.evaluate(()=>remoteRows['users/settings-fixture/ledgerBalances/main'].metadata),'keep');assert.equal(await page.evaluate(()=>Object.keys(remoteRows).filter(path=>path.includes('/ledgerBalanceHistory/')).length),1);assert.equal(await page.locator('#dashboardSection').isVisible(),true);assert.deepEqual(errors,[]);
   console.log(name+': mobile balance edit/cancel/persistence, native shared checkmark, fixed deletion/history, reconnect draft and atomic remote balance/history save PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

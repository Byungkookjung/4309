// Mock Firestore only. No Firebase SDK or production account is accessed.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const EE=require('../ee-model.js');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8001';
function fakeAuth(){
 const read=()=>JSON.parse(localStorage.getItem('eeRemote')||'{}'),watchers=new Map();
 const snap=path=>({id:path.split('/').at(-1),exists:Object.hasOwn(read(),path),data:()=>read()[path]});
 function ref(path){
  if(!path.startsWith('users/owner')&&path!=='users')throw Error('Wrong account path');
  const object={path,id:path.split('/').at(-1),doc:id=>ref(path+'/'+id),collection:id=>ref(path+'/'+id),orderBy:()=>object,limit:()=>object,
   async get(){if(window.__eeFailServerReads)throw Object.assign(Error('server read failed'),{code:'permission-denied'});return path.split('/').length%2===0?snap(path):{docs:Object.keys(read()).filter(key=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1).map(snap)};},
   onSnapshot(callback){watchers.set(path,callback);queueMicrotask(async()=>callback(await object.get()));return ()=>watchers.delete(path);}};return object;
 }
 const user={uid:'owner'};
 const db={collection:ref,runTransaction:async callback=>{
  const writes=[];await callback({get:reference=>reference.get(),set:(reference,value,options)=>writes.push([reference,value,options])});
  const data=read();for(const [reference,value,options] of writes){data[reference.path]=options?.merge?{...data[reference.path],...value}:value;window.__eeWrites.push(reference.path);}
  localStorage.setItem('eeRemote',JSON.stringify(data));
  for(const [path,callback] of watchers)if(writes.some(([reference])=>reference.path.startsWith(path+'/')||reference.path===path))queueMicrotask(async()=>callback(await ref(path).get()));
 }};
 window.__eeWrites=[];window.__ledgerAuth={auth:{currentUser:user},requireAuth:async()=>user,db};
}
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'('+fakeAuth.toString()+')();'}));
   await context.addInitScript(()=>{
    if(localStorage.eeRemote)return;
    localStorage.eeRemote=JSON.stringify({'users/owner/ledgerBalances/main':{checking:1000,saving:2000,etc:0},'users/owner/ledgerPlanItems/g':{id:'g',type:'expected',label:'장보기',amount:500,customField:'preserve',subcategories:[{id:'food',label:'식료품',amount:500}]},'users/owner/ledgerEntries/old':{id:'old',date:'2026-11-03',type:'expense',sourceType:'expected',linkedPlanItemId:'g',subcategoryId:'food',reason:'장보기',amount:80}});
    localStorage.ledgerPlanItems=JSON.stringify([{id:'foreign',type:'expected',label:'Wrong account',amount:999}]);
   });
   const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
   await page.goto(base+'/ledger.html');await page.locator('#openPlanBtn').click();let editor=page.locator('#expectedPlanList [data-id="g"] .ee-editor');
   assert.equal(await page.locator('#eeTemplatePreviewBtn').count(),0);await editor.getByLabel('식료품 수정',{exact:true}).click();await editor.getByLabel('하위 분류 월예산').fill('510');
   await page.evaluate(()=>{const s=JSON.parse(localStorage.eeRemote);s['users/owner/ledgerPlanItems/g'].subcategories[0].amount=600;localStorage.eeRemote=JSON.stringify(s);});
   await editor.getByLabel('저장',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ee-inline-form button').disabled===false);
   assert.ok(dialogs.some(message=>message.includes('changed in another tab')));assert.deepEqual(await page.evaluate(()=>window.__eeWrites),[]);
   await page.reload();await page.locator('#openPlanBtn').click();editor=page.locator('#expectedPlanList [data-id="g"] .ee-editor');await editor.getByLabel('식료품 수정',{exact:true}).click();await editor.getByLabel('하위 분류 월예산').fill('550');await editor.getByLabel('저장',{exact:true}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.eeRemote)['users/owner/ledgerPlanItems/g'].amount===550);
   let store=await page.evaluate(()=>JSON.parse(localStorage.eeRemote));assert.equal(store['users/owner/ledgerPlanItems/g'].customField,'preserve');const old=store['users/owner/ledgerEntries/old'];
   await page.evaluate(()=>enterEditMode('g'));await page.locator('#removePlanItemBtn').click();await page.waitForFunction(()=>JSON.parse(localStorage.eeRemote)['users/owner/ledgerPlanItems/g'].deleted);
   store=await page.evaluate(()=>JSON.parse(localStorage.eeRemote));assert.equal(store['users/owner/ledgerPlanItems/g'].subcategories[0].deleted,true);assert.deepEqual(store['users/owner/ledgerEntries/old'],old);assert.equal(store['users/owner/ledgerBalances/main'].checking,1000);
   assert.ok(!JSON.stringify(store).includes('foreign'));assert.deepEqual(errors,[]);console.log(name+': remote edit, stale-write protection, metadata and history-preserving cascade PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

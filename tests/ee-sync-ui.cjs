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
   async get(){return path.split('/').length%2===0?snap(path):{docs:Object.keys(read()).filter(key=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1).map(snap)};},
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
    localStorage.eeRemote=JSON.stringify({'users/owner/ledgerBalances/main':{checking:1000,saving:2000,etc:0},'users/owner/ledgerPlanItems/g':{id:'g',type:'expected',label:'장보기',amount:500,customField:'preserve'},'users/owner/ledgerPlanItems/fe':{id:'fe',type:'fixed',label:'Rent',amount:900}});
    localStorage.ledgerPlanItems=JSON.stringify([{id:'foreign',type:'expected',label:'Wrong account',amount:999}]);
   });
   const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
   await page.goto(base+'/ledger.html');await page.locator('#openPlanBtn').click();await page.locator('#eeTemplatePreviewBtn').click();await page.getByRole('button',{name:'Apply reviewed template',exact:true}).click();
   await page.waitForFunction(()=>Object.keys(JSON.parse(localStorage.eeRemote)).filter(key=>key.includes('/ledgerPlanItems/')).length===7);
   let store=await page.evaluate(()=>JSON.parse(localStorage.eeRemote));assert.equal(store['users/owner/ledgerPlanItems/g'].amount,500);assert.equal(store['users/owner/ledgerPlanItems/g'].customField,'preserve');assert.equal(store['users/owner/ledgerPlanItems/fe'].amount,900);
   assert.equal(store['users/owner/ledgerBalances/main'].checking,1000);assert.ok(!JSON.stringify(store).includes('foreign'));
   assert.ok((await page.evaluate(()=>window.__eeWrites)).every(path=>path.startsWith('users/owner/ledgerPlanItems/')||path==='users/owner/ledgerSettings/eeRevision'));
   await page.reload();await page.locator('#openPlanBtn').click();let editor=page.locator('#expectedPlanList [data-id="g"] .ee-editor');await editor.locator('summary').click();
   await page.evaluate(()=>{const store=JSON.parse(localStorage.eeRemote);store['users/owner/ledgerPlanItems/g'].subcategories[0].amount+=1;localStorage.eeRemote=JSON.stringify(store);window.__eeWrites=[];});
   await editor.getByRole('button',{name:'Save subcategories',exact:true}).click();assert.ok(dialogs.some(message=>message.includes('changed in another tab')));assert.deepEqual(await page.evaluate(()=>window.__eeWrites),[]);
   await page.evaluate(()=>window.__ledgerAuth.auth.currentUser={uid:'other'});await editor.getByRole('button',{name:'Save subcategories',exact:true}).click();assert.ok(dialogs.some(message=>message.includes('Account changed')));assert.deepEqual(await page.evaluate(()=>window.__eeWrites),[]);
   assert.deepEqual(errors,[]);console.log(name+': mock Firestore template/persistence, merge preservation, stale-write and account-change protection PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

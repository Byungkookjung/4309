// Local fixtures only; authentication and Firebase requests are stubbed.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));
   await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(()=>{
    localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:0,etc:0});
    localStorage.ledgerActivity='[]';
    localStorage.ledgerPlanItems=JSON.stringify(['fixed','expected','income'].map((type,i)=>({id:type,type,label:type+' parent',amount:100, ...(i===1?{subcategories:[{id:'child',label:'Child',amount:100}]}:{})})));
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.MOBILE_TEST_URL||'http://127.0.0.1:8009')+'/ledger.html');
   await page.locator('#openPlanBtn').click();
   const stored=await page.evaluate(()=>localStorage.ledgerPlanItems);
   for(const width of [390,1440]){
    await page.setViewportSize({width,height:600});
    for(const reducedMotion of ['no-preference','reduce']){
     await page.emulateMedia({reducedMotion});
     for(const type of ['fixed','expected','income']){
      await page.getByRole('button',{name:type+' parent 상위 분류 수정',exact:true}).click();
      // Let smooth scrolling settle before Playwright scrolls to the next Edit button.
      await page.waitForTimeout(1000);
      await page.waitForFunction(()=>{const r=document.getElementById('planItem').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
      const state=await page.evaluate(()=>{const input=document.getElementById('planItem');return {focus:document.activeElement===input,value:input.value,start:input.selectionStart,end:input.selectionEnd,readOnly:document.getElementById('planAmount').readOnly,editing:editingPlanId};});
      assert.equal(state.focus,true);assert.equal(state.value,type+' parent');assert.equal(state.start,0);assert.equal(state.end,state.value.length);assert.equal(state.editing,type);assert.equal(state.readOnly,type==='expected');
     }
    }
   }
   assert.equal(await page.evaluate(()=>localStorage.ledgerPlanItems),stored);assert.deepEqual(errors,[]);
   console.log(name+': parent Edit scroll, focus, selection, reduced motion and unchanged budgets PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1);});

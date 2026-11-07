// Read-only fixtures. Firebase SDK and authentication are stubbed; no live records.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Edmonton'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:'window.firebase={auth(){},firestore(){}};'}));
   await context.route('**/auth.js',r=>r.fulfill({body:`
    window.fixtureCalls=[];window.failBudget=false;window.overBudget=false;window.authCallback=null;
    window.__ledgerAuth={auth:{onAuthStateChanged(cb){authCallback=cb;cb(null)},async signOut(){authCallback(null)}},async signInWithGoogle(){authCallback({uid:'test-user'})},db:{collection(){return {doc(){return {collection(name){return {async get(){
     fixtureCalls.push(name);if(name==='ledgerPlanItems'&&failBudget)throw Error('offline');const date=MobileModel.dayKey(new Date());
     const rows=name==='ledgerPlanItems'?[{id:'fixed',type:'fixed',amount:900,label:'Rent'},{id:'ee',type:'expected',label:'Food',amount:999,subcategories:[{id:'a',label:'Food',amount:500},{id:'old',label:'Old',amount:80,archived:true}]}]:name==='ledgerEntries'?[
      {date,type:'expense',sourceType:'fixed',amount:900},{date,type:'expense',sourceType:'expected',amount:overBudget?1400:200,isShared:true,subcategoryId:'a'},{date,type:'expense',sourceType:'expected',amount:50},{date,type:'expense',sourceType:'custom',amount:100},{date,type:'income',amount:1800}]:[];
     return {docs:rows.map((row,i)=>({id:row.id||String(i),data:()=>row}))};
    }}}}}}}}};` }));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.MOBILE_TEST_URL||'http://127.0.0.1:8008')+'/mobile/');
   await page.locator('#signIn').click();await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.startsWith('Updated'));
   assert.deepEqual(await page.locator('#dashboard>section h2').allTextContents(),['Monthly money','고정 + 예상 지출']);
   assert.equal(await page.locator('#budgetRemaining').textContent(),'$350.00');assert.match(await page.locator('#budgetTotal').textContent(),/1,050.00.*1,400.00/);
   assert.match(await page.locator('#budgetGroups').textContent(),/고정 지출.*0.00 남음.*예상 지출.*350.00 남음/s);
   assert.equal(await page.locator('#spent').textContent(),'$1,150.00');assert.equal(await page.locator('#earned').textContent(),'$1,800.00');
   assert.ok((await page.evaluate(()=>fixtureCalls)).every(name=>['ledgerEntries','ledgerPlanItems'].includes(name)));
   for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' overflow '+width);}
   await page.setViewportSize({width:390,height:900});await page.waitForTimeout(400);await page.screenshot({path:'/tmp/mobile-budget-'+name+'.png',fullPage:true});
   await page.evaluate(()=>overBudget=true);await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('budgetRemainingLabel').textContent==='이번 달 초과 지출');
   assert.equal(await page.locator('#budgetRemaining').textContent(),'$250.00');assert.equal(await page.locator('#budgetRemaining').getAttribute('class'),'over-budget');assert.equal(await page.locator('#budgetGroups progress').nth(1).evaluate(e=>e.value),1);
   await page.evaluate(()=>failBudget=true);await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.includes('Could not sync'));assert.equal(await page.locator('#budgetRemaining').textContent(),'$250.00');
   page.once('dialog',d=>d.accept());await page.locator('#signOut').click();assert.equal(await page.locator('#dashboard').isHidden(),true);assert.equal(await page.locator('#budgetRemaining').textContent(),'—');assert.equal(await page.locator('#budgetGroups article').count(),0);
   assert.deepEqual(errors,[]);console.log(name+': budget totals, shared/unclassified EE, no double count, overage, responsive layout, atomic sync, sign-out and no unrelated reads PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

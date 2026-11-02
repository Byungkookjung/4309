// Local fixtures only; never read or write live account data.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8000';
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',route=>route.fulfill({body:''}));
   await context.route('**/auth.js',route=>route.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(()=>{
    for(const suffix of ['', 'IronPeak']){
     localStorage.setItem('weeklySheetSettings'+suffix,JSON.stringify({hourlyRate:20}));
     localStorage.setItem('weeklySheetPayouts'+suffix,JSON.stringify(Array.from({length:8},(_,i)=>({id:'p'+i,date:'2026-10-23',amount:100+i}))));
    }
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   for(const job of ['booster','iron'])for(const width of [390,1180,1280,1440,1920]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/index.html?job='+job);
    await page.locator('#payoutList .payout-record').first().waitFor();
    const log=await page.locator('.sheet-log-grid .payout-card').boundingBox();
    const history=await page.locator('.payout-history-card').boundingBox();
    if(width>1180){assert.ok(Math.abs(log.y-history.y)<1);assert.ok(Math.abs(log.height-history.height)<1,`${name} ${job} ${width}: matching card heights`);}
    else assert.ok(history.y>=log.y+log.height,'stacked cards do not overlap');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   }
   assert.deepEqual(errors,[]);console.log(name+': both jobs have equal desktop payout card heights and responsive stacking');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

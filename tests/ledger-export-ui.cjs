// Isolated local data; Firebase is disabled and no real account is accessed.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8000';
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(()=>{
    const NativeDate=Date;
    window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-12-01T12:00:00Z']));}static now(){return +new NativeDate('2026-12-01T12:00:00Z');}};
    localStorage.setItem('ledgerBalances',JSON.stringify({checking:1000,saving:2000,etc:0}));
    localStorage.setItem('ledgerActivity',JSON.stringify([{id:'a',date:'2026-11-01',reason:'장보기',detail:'Milk & bread',amount:20,type:'expense',isShared:true},{id:'b',date:'2026-11-30',reason:'Paycheck',amount:500,type:'income'},{id:'c',date:'2026-12-01',reason:'Excluded boundary',amount:999,type:'expense'}]));
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/ledger.html');
   const start=page.locator('#activityExportStart'),end=page.locator('#activityExportEnd'),button=page.locator('#activityExportBtn');
   assert.equal(await start.getAttribute('max'),'2026-12-01');assert.equal(await end.getAttribute('max'),'2026-12-01');
   assert.equal(await start.inputValue(),'2026-11-01');assert.equal(await end.inputValue(),'2026-12-01');
   await end.fill('2026-12-02');assert.equal(await end.evaluate(input=>input.validity.rangeOverflow),true);
   await start.fill('2026-12-02');assert.equal(await start.evaluate(input=>input.validity.rangeOverflow),true);
   await start.fill('2026-11-01');await end.fill('2026-12-01');
   const downloadPromise=page.waitForEvent('download');await button.click();const download=await downloadPromise;
   assert.equal(download.suggestedFilename(),'26.11.01-26.12.01.xlsx');const bytes=await fs.readFile(await download.path());
   assert.equal(bytes.readUInt32LE(0),0x04034b50);assert.ok(bytes.includes(Buffer.from('장보기')));assert.ok(bytes.includes(Buffer.from('Paycheck')));assert.ok(!bytes.includes(Buffer.from('Excluded boundary')));
   assert.match(await page.locator('#activityExportStatus').textContent(),/2개 내역/);
   await end.fill('2026-10-01');await button.click();assert.match(await page.locator('#activityExportStatus').textContent(),/종료일은 시작일보다/);assert.equal(await button.isEnabled(),true);
   await start.fill('2026-09-01');await end.fill('2026-10-01');await button.click();assert.match(await page.locator('#activityExportStatus').textContent(),/내역이 없습니다/);
   assert.equal(await page.locator('#activityExportStatus').getAttribute('data-state'),'error');
   assert.equal(await page.locator('#activityExportStatus').evaluate(node=>getComputedStyle(node).color),'rgb(181, 46, 53)');
   await end.fill('2026-12-02');await button.click();assert.match(await page.locator('#activityExportStatus').textContent(),/미래 날짜/);
   for(const width of [320,390,700,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overflow '+width);}
   assert.equal(await page.locator('.activity-import-card').first().evaluate((element)=>element.nextElementSibling.id),'activityExportSection');
   assert.deepEqual(errors,[]);console.log(name+': Excel download, range, Unicode, errors, section placement and responsive layout PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

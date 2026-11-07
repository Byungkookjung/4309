// Local financial fixtures only. No real Firebase SDK, account or production records.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8009';
const plans=[{id:'g',type:'expected',label:'장보기',amount:500,subcategories:[{id:'food',label:'식료품·마트',amount:460},{id:'snack',label:'편의점·간식',amount:40},{id:'deleted',label:'삭제된 항목',amount:10,deleted:true}]}];
const entries=[{id:'existing',date:'2026-11-01',type:'expense',sourceType:'expected',linkedPlanItemId:'g',subcategoryId:'food',subcategoryLabel:'식료품·마트',reason:'장보기',detail:'Existing receipt',amount:12.34,createdAt:'2026-11-01T12:00:00Z'}];
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Edmonton'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(({plans,entries})=>{
    const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-06T18:00:00Z']));}static now(){return +new NativeDate('2026-11-06T18:00:00Z');}};
    if(localStorage.fixture)return;localStorage.fixture='1';localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:2000,etc:0});localStorage.ledgerPlanItems=JSON.stringify(plans);localStorage.ledgerActivity=JSON.stringify(entries);
   },{plans,entries});
   const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
   await page.goto(base+'/ledger.html');const preview=page.locator('#activityImportText'),button=page.locator('#importActivityBtn'),matches=page.locator('#activityImportMatches'),status=page.locator('#activityImportStatus');
   assert.match(await page.locator('#activityImportBudgetHints').textContent(),/장보기 > 식료품·마트, 편의점·간식/);assert.ok(!(await page.locator('#activityImportBudgetHints').textContent()).includes('삭제된 항목'));
   const text='11/5/2026\n- 25 EE 장보기 > 식료품·마트 | 우유, 계란\n- 10 EE 장보기 | 기타 구매\n+ 50 UI 생일 선물 | 가족';
   await preview.fill(text);assert.equal(await button.isEnabled(),true);assert.equal(await matches.locator('.activity-import-match').count(),3);
   assert.match(await matches.locator('strong').first().textContent(),/EE · 장보기 > 식료품·마트/);assert.match(await matches.locator('strong').nth(1).textContent(),/장보기 > 미분류/);
   const before=await page.evaluate(()=>({entries:JSON.parse(localStorage.ledgerActivity),plans:localStorage.ledgerPlanItems,balances:localStorage.ledgerBalances}));
   await preview.fill('11/5/2026\n'+Array.from({length:51},()=>'- 1 EE 장보기 | detail').join('\n'));assert.equal(await matches.locator('.activity-import-match').count(),50);assert.match(await matches.textContent(),/총 51개/);assert.equal(await button.isEnabled(),true);
   await preview.fill('');assert.equal(await matches.locator('.activity-import-match').count(),0);assert.equal(await button.isDisabled(),true);
   await preview.fill('11/5/2026\n- 25 EE 장보기 > 식료품·마트 | valid\n- 10 EE 장보기 > 삭제된 항목 | invalid');assert.equal(await button.isDisabled(),true);assert.match(await status.textContent(),/Line 3:/);assert.equal(await matches.locator('.activity-import-match').count(),0);
   await page.evaluate(()=>importActivityEntriesFromText());assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).length),1);assert.equal(dialogs.length,0);
   await preview.fill('11/5/2026\n- 1 EE 장보기 > 식료품·마트 | <img src=x onerror=alert(1)>');assert.equal(await matches.locator('img').count(),0);assert.match(await matches.textContent(),/<img/);
   await preview.fill(text);
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'preview overflow '+width);}
   // Two immediate clicks must not import the same file twice while awaiting the local lock.
   await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{document.getElementById('importActivityBtn').click();document.getElementById('importActivityBtn').click();})]);
   await page.locator('#activityImportText').waitFor();
   const after=await page.evaluate(()=>({entries:JSON.parse(localStorage.ledgerActivity),plans:localStorage.ledgerPlanItems,balances:localStorage.ledgerBalances}));
   assert.equal(after.entries.length,4);assert.deepEqual(after.entries.find(row=>row.id==='existing'),before.entries[0]);assert.equal(after.plans,before.plans);assert.equal(after.balances,before.balances);assert.equal(dialogs.length,1);
   const imported=after.entries.filter(row=>row.id!=='existing');assert.equal(imported[0].subcategoryId,'food');assert.equal(imported[0].subcategoryLabel,'식료품·마트');assert.equal(imported[1].subcategoryId,undefined);assert.equal(imported[2].reason,'생일 선물');
   const totals=await page.evaluate(()=>ExpectedBudget.breakdown(planItems[0],activityEntries,planItems));assert.equal(totals.actual,47.34);assert.equal(totals.children.find(row=>row.id==='food').actual,37.34);assert.equal(totals.children.find(row=>row.id==='__unclassified__').actual,10);
   const exported=await page.evaluate(()=>{const result=LedgerExport.build(activityEntries,'2026-11-01','2026-11-06',planItems),parts=EEExport.unpack(result.bytes);return {count:result.count,activity:parts['xl/worksheets/sheet1.xml']};});
   assert.equal(exported.count,4);assert.match(exported.activity,/식료품·마트/);assert.match(exported.activity,/미분류/);
   await preview.fill('11/5/2026\n- 1 EE 장보기 > 식료품·마트 | stale');
   await page.evaluate(()=>{planItems[0].subcategories[0].deleted=true;renderPlan();});assert.equal(await button.isDisabled(),true);assert.equal(await matches.locator('.activity-import-match').count(),0);
   await page.evaluate(()=>{loadPlanItems();renderPlan();});assert.equal(await button.isEnabled(),true);
   // Change storage without updating the preview: the save-time guard must still reject it.
   await page.evaluate(()=>{const plans=JSON.parse(localStorage.ledgerPlanItems);plans[0].subcategories[0].deleted=true;localStorage.ledgerPlanItems=JSON.stringify(plans);});
   await button.click();await page.waitForFunction(()=>!activityImportBusy);assert.match(await status.textContent(),/하위 분류가 변경/);assert.equal(await matches.locator('.activity-import-match').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).length),4);
   assert.deepEqual(errors,[]);console.log(name+': TXT preview, exact child IDs, legacy/unclassified, invalid-line atomicity, double-click guard, totals, Excel, reload and stale-child rejection PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

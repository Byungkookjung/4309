// Run against the isolated combined preview, never a production website.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const EE=require('../ee-model.js'),adapter=require('../ee-export.js');
const base=process.env.MOBILE_TEST_URL;
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Use a localhost integrated preview only.');
if(!process.env.LEDGER_EXPORT_BASE)throw Error('Set LEDGER_EXPORT_BASE to the untouched existing exporter.');
const exporter=require(process.env.LEDGER_EXPORT_BASE),plans=EE.applyTemplate([]),parent=plans[3];
parent.subcategories[0].archived=true;parent.amount=EE.budget(parent);
const entries=[{id:'shared',date:'2026-11-01',type:'expense',sourceType:'expected',linkedPlanItemId:parent.id,reason:'쇼핑',detail:'Original detail <&>',amount:80,isShared:true,subcategoryId:parent.subcategories[0].id},
 {id:'legacy',date:'2026-11-02',type:'expense',sourceType:'expected',reason:'쇼핑',amount:10},
 {id:'income',date:'2026-11-03',type:'income',sourceType:'income',reason:'Salary',amount:3000},
 {id:'end',date:'2026-12-01',type:'expense',reason:'Excluded boundary',amount:999}];
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block',timezoneId:'America/Edmonton'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(({plans,entries})=>{
    const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-12-01T18:00:00Z']));}static now(){return +new NativeDate('2026-12-01T18:00:00Z');}};
    localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:2000,etc:0});
    localStorage.ledgerPlanItems=JSON.stringify(plans);localStorage.ledgerActivity=JSON.stringify(entries);
   },{plans,entries});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/ledger.html');
   assert.equal(await page.evaluate(()=>LedgerExport.build.eeEnhanced),true);
   // Compare at the exporter boundary, after the app's existing entry normalization.
   const input=await page.evaluate(()=>({entries:activityEntries,plans:planItems}));
   const promise=page.waitForEvent('download');await page.locator('#activityExportBtn').click();const download=await promise;
   assert.equal(download.suggestedFilename(),'26.11.01-26.12.01.xlsx');
   const parts=adapter.unpack(await fs.readFile(await download.path())),original=adapter.unpack(exporter.build(input.entries,'2026-11-01','2026-12-01',input.plans).bytes);
   for(const [name,xml] of Object.entries(original)){
    if(!name.startsWith('xl/worksheets/'))assert.equal(parts[name],xml);
    for(const match of xml.matchAll(/<c\b[^>]*>[\s\S]*?<\/c>/g))assert.ok(parts[name].includes(match[0]),'original cell preserved');
   }
   const activity=parts['xl/worksheets/sheet1.xml'],summary=parts['xl/worksheets/sheet2.xml'];
   assert.match(activity,/의류·패션잡화 \(이전 분류\)/);assert.match(activity,/미분류/);assert.match(activity,/Original detail &lt;&amp;&gt;/);assert.ok(!activity.includes('Excluded boundary'));
   assert.match(activity,/<c r="D2"[^>]*><v>40<\/v><\/c>/);assert.match(summary,/<c r="B7"[^>]*><v>50<\/v><\/c>/);assert.match(summary,/<c r="B9"[^>]*><v>2950<\/v><\/c>/);
   assert.match(summary,/EE breakdown/);assert.match(await page.locator('#activityExportStatus').textContent(),/3개 내역/);assert.deepEqual(errors,[]);
   console.log(name+': combined-preview Excel download preserves all original cells, shared amounts, Summary, dates and archived/uncategorized EE details PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});

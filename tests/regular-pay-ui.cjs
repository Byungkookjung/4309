// Isolated local fixtures. No production accounts or records are accessed.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8008';
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(()=>{if(localStorage.regularFixture)return;localStorage.regularFixture='1';for(const suffix of ['','IronPeak']){localStorage.setItem('weeklySheetSettings'+suffix,JSON.stringify({hourlyRate:20,periodAnchor:'2026-11-01',payoutDelay:7}));localStorage.setItem('weeklySheetPayouts'+suffix,'[]');}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   for(const job of ['booster','iron']){
    await page.goto(base+'/index.html?job='+job);await page.locator('#currentHourlyRate').waitFor();const suffix=job==='iron'?'IronPeak':'',tips=job==='booster'?7:0;
    const regular=page.locator('#payoutRegularPay');assert.equal(await regular.isEditable(),true);assert.equal(await page.locator('#payoutRegularPayAuto').count(),0);
    await page.locator('#payoutHours').fill('10');assert.equal(await regular.inputValue(),'200.00');assert.equal(await page.evaluate(()=>regularPayManual),false);
    await regular.fill('250.25');assert.equal(await page.locator('#payoutGross').inputValue(),'250.25');assert.equal(await page.evaluate(()=>regularPayManual),true);
    await page.locator('#payoutHours').fill('12');assert.equal(await regular.inputValue(),'250.25');
    for(const [id,value] of [['payoutHolidayWorkPay','10'],['payoutStatHolidayPay','5'],['payoutVacation','5'],['payoutDeductions','20']])await page.locator('#'+id).fill(value);
    if(tips)await page.locator('#payoutTips').fill(String(tips));assert.equal(Number(await page.locator('#payoutAmount').inputValue()),250.25+tips);
    await page.locator('#editRateBtn').click();await page.locator('#hourlyRateInput').fill('25');await page.locator('#saveRateBtn').click();assert.equal(await regular.inputValue(),'250.25');
    await page.evaluate(()=>resetPayoutForm());await page.locator('#payoutHours').fill('12');assert.equal(await regular.inputValue(),'300.00');await page.locator('#payoutHours').fill('13');assert.equal(await regular.inputValue(),'325.00');
    for(const [id,value] of [['payoutHolidayWorkPay','10'],['payoutStatHolidayPay','5'],['payoutVacation','5'],['payoutDeductions','20']])await page.locator('#'+id).fill(value);
    if(tips)await page.locator('#payoutTips').fill(String(tips));
    await regular.fill('280.75');await page.locator('#payoutDate').fill('2026-11-15');await page.locator('#payoutPeriodStart').fill('2026-11-01');await page.locator('#payoutPeriodEnd').fill('2026-11-14');await page.locator('#savePayoutBtn').click();
    await page.waitForFunction(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix)).length===1,suffix);
    const saved=await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix))[0],suffix);assert.equal(saved.regularPay,280.75);assert.equal(saved.grossPay,300.75+tips);assert.equal(saved.amount,280.75+tips);
    assert.equal(await page.evaluate(()=>regularPayManual),false,'successful save resets to automatic');
    await page.reload();await page.getByRole('button',{name:'Edit payout',exact:true}).first().click();assert.equal(await regular.inputValue(),'280.75');await page.locator('#payoutHours').fill('20');assert.equal(await regular.inputValue(),'280.75','editing stored pay does not recalculate historical amounts');
    await page.locator('#payoutDeductions').fill('21');await page.locator('#savePayoutBtn').click();await page.waitForFunction(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix))[0].deductions===21,suffix);assert.equal(await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix))[0].regularPay,suffix),280.75);
    await page.locator('#payoutHours').fill('10');await regular.fill('0');await page.locator('#payoutStatHolidayPay').fill('5');await page.locator('#payoutDate').fill('2026-11-16');await page.locator('#payoutPeriodStart').fill('2026-11-01');await page.locator('#payoutPeriodEnd').fill('2026-11-14');await page.locator('#savePayoutBtn').click();
    await page.waitForFunction(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix)).length===2,suffix);assert.equal(await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix)).find(row=>row.date==='2026-11-16').regularPay,suffix),0);
    for(const value of ['', '-1', '1.001']){await regular.fill(value);await page.locator('#savePayoutBtn').click();assert.equal(await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetPayouts'+suffix)).length,suffix),2,'invalid regular pay cannot save');}
    await page.evaluate(()=>resetPayoutForm());await regular.fill('123.45');await page.evaluate(()=>{settings.hourlyRate=30;refreshPayoutTotals();});assert.equal(await regular.inputValue(),'123.45','manual pay without hours survives refresh');await page.evaluate(()=>resetPayoutForm());assert.equal(await regular.inputValue(),'0.00');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   }
   assert.deepEqual(errors,[]);console.log(name+': both jobs auto/manual regular pay, reset, gross/net, saved history, zero/invalid amounts and mobile layout PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

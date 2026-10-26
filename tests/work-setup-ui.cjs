// All browser fixtures are local. Firebase is disabled; no live user records are touched.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8000';
(async()=>{
 for(const [name,type] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await type.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));
  await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html');await page.getByLabel('Number of workplaces').fill('3');
  const rows=page.locator('.work-setup fieldset');await rows.nth(0).getByLabel('Name',{exact:true}).fill('Cafe');await rows.nth(1).getByLabel('Name',{exact:true}).fill('Shop');await rows.nth(2).getByLabel('Name',{exact:true}).fill('Office');
  for(let i=0;i<3;i++)await rows.nth(i).getByLabel('Hourly rate (CAD)').fill(String(20+i));
  await rows.first().getByLabel('Pay frequency').selectOption('monthly');
  await rows.first().getByLabel('Monthly payday').selectOption('31');
  assert.equal(await rows.first().getByLabel('2-week period start').isVisible(),false);
  await page.getByRole('button',{name:'Save workplaces',exact:true}).click();
  await page.waitForURL('**/index.html?job=job_*');await page.locator('#currentHourlyRate').filter({hasText:'20.00'}).waitFor();
  assert.equal(await page.locator('#currentJobName').textContent(),'Cafe');assert.equal(await page.locator('#workplaceSelect').count(),0);
  assert.equal(await page.locator('#manageJobsBtn').textContent(),'⚙️');
  const profile=await page.evaluate(()=>JSON.parse(localStorage.weeklyWorkProfile));
  const month=await page.evaluate(()=>{const now=new Date();return {start:new Date(now.getFullYear(),now.getMonth(),1),days:new Date(now.getFullYear(),now.getMonth()+1,0).getDate()};});
  assert.equal(await page.locator('.sheet-board tr[data-date]').count(),month.days,'monthly sheet covers every day, including partial final week');
  await page.locator('#editRateBtn').click();
  assert.equal(await page.locator('#payFrequencyInput').inputValue(),'monthly');
  await page.locator('#monthlyPayDayInput').selectOption('15');await page.locator('#monthlyPayMonthInput').selectOption('1');await page.locator('#saveRateBtn').click();
  const pay=await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetSettings'+suffix)),profile.jobs[0].suffix);
  assert.equal(pay.monthlyPayDay,'15');assert.equal(pay.monthlyPayMonth,1);
  const expected=await page.evaluate(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth()+1,15).toLocaleDateString('en-CA');});
  assert.equal(await page.locator('#payoutDate').inputValue(),expected);
  await page.evaluate(jobs=>{for(const [i,job] of jobs.entries())localStorage.setItem('weeklySheetPayouts'+job.suffix,JSON.stringify([{id:'p'+i,date:'2026-10-25',amount:100+i}]));},profile.jobs);
  await page.reload();await page.locator('#combinedPayoutStats').filter({hasText:'$303.00'}).waitFor();
  await page.locator('#switchJobBtn').click();await page.locator('#currentJobName').filter({hasText:'Shop'}).waitFor();
  await page.locator('#switchJobBtn').click();await page.locator('#currentJobName').filter({hasText:'Office'}).waitFor();
  assert.match(await page.locator('#currentHourlyRate').textContent(),/22.00/);
  await page.locator('#manageJobsBtn').click();await page.locator('.work-setup fieldset').first().getByLabel('Name',{exact:true}).fill('New Cafe');
  await page.getByRole('button',{name:'Save workplaces',exact:true}).click();await page.locator('#currentJobName').filter({hasText:'New Cafe'}).waitFor();
  assert.equal(await page.evaluate(suffix=>JSON.parse(localStorage.getItem('weeklySheetSettings'+suffix)).hourlyRate,profile.jobs[0].suffix),20);
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+width);}
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('weeklySheetSettings',JSON.stringify({hourlyRate:19,periodAnchor:'2026-07-31',payoutDelay:7}));localStorage.setItem('weeklySheetSettingsIronPeak',JSON.stringify({hourlyRate:28,periodAnchor:'2026-10-05',payoutDelay:5,payrollScheduleVersion:1}));});
  await page.goto(base+'/index.html?job=iron');await page.locator('#currentHourlyRate').filter({hasText:'28.00'}).waitFor();
  assert.equal(await page.locator('.work-setup').isVisible(),false);assert.equal(await page.locator('#workplaceSelect').count(),0);
  // Exercise the signed-in path and transaction writes with an isolated Firestore double.
  await page.route('**/auth.js',r=>r.fulfill({body:'('+function(){
   const read=()=>JSON.parse(localStorage.getItem('remoteWorkFixture')||'{}');
   const snapshot=path=>({exists:Object.hasOwn(read(),path),data:()=>read()[path]});
   function reference(path){return {path,doc:id=>reference(path+'/'+id),collection:id=>reference(path+'/'+id),limit:()=>reference(path),
    async get(){if(path.split('/').length%2===0)return snapshot(path);return {empty:true,docs:[]};},
    async set(value){const store=read();store[path]=value;localStorage.setItem('remoteWorkFixture',JSON.stringify(store));},
    onSnapshot(callback){queueMicrotask(()=>callback(path.split('/').length%2===0?snapshot(path):{docs:[]}));return ()=>{};}};}
   const user={uid:'test-owner'};
   const db={collection:reference,waitForPendingWrites:async()=>{},runTransaction:async callback=>{const writes=[];await callback({get:ref=>ref.get(),set:(ref,value)=>writes.push([ref,value])});for(const [ref,value] of writes)await ref.set(value);}};
   window.__ledgerAuth={auth:{currentUser:user},requireAuth:async()=>user,db};
  }.toString()+')();'}));
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('weeklySheetSettings',JSON.stringify({hourlyRate:999}));});
  await page.goto(base+'/index.html');await page.getByLabel('Number of workplaces').waitFor();
  await page.locator('.work-setup fieldset').first().getByLabel('Name',{exact:true}).fill('Remote Cafe');
  await page.locator('.work-setup fieldset').first().getByLabel('Hourly rate (CAD)').fill('23');
  await page.getByRole('button',{name:'Save workplaces',exact:true}).click();await page.locator('#currentHourlyRate').filter({hasText:'23.00'}).waitFor();
  const store=await page.evaluate(()=>JSON.parse(localStorage.remoteWorkFixture));
  const remoteProfile=store['users/test-owner/weeklyWorkMeta/jobs'];assert.equal(remoteProfile.jobs.length,1);
  assert.equal(store['users/test-owner/weeklyWorkMeta/settings'+remoteProfile.jobs[0].suffix].hourlyRate,23);
  assert.equal(await page.locator('#switchJobBtn').isVisible(),false);
  await page.evaluate(()=>{localStorage.setItem('remoteWorkFixture',JSON.stringify({'users/test-owner/weeklyWorkMeta/settings':{hourlyRate:19},'users/test-owner/weeklyWorkMeta/settingsIronPeak':{hourlyRate:28,periodAnchor:'2026-10-05',payoutDelay:5,payrollScheduleVersion:1}}));});
  await page.goto(base+'/index.html?job=iron');await page.locator('#currentHourlyRate').filter({hasText:'28.00'}).waitFor();
  assert.equal(await page.locator('.work-setup').isVisible(),false);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.remoteWorkFixture)).length),2,'opening legacy records does not rewrite settings or create a profile');
  assert.deepEqual(errors,[]);console.log(name+' workplace onboarding, settings preservation, switching, totals, responsive layout PASS');
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});

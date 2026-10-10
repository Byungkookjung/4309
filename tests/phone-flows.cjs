// Isolated local-storage fixtures; Firebase is stubbed so tests cannot write live records.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const os=require('node:os'),path=require('node:path');
const base=process.env.MOBILE_TEST_URL || 'http://localhost:8000';
(async()=>{
 for(const [engine,type] of [['Chrome',chromium],['WebKit',webkit]]){
 const browser=await type.launch(engine==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));
 await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
 await context.addInitScript(()=>{
   if(localStorage.getItem('phoneFixture'))return;
   localStorage.setItem('phoneFixture','yes');
   const d=new Date(),key=n=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
   const rows=Array.from({length:new Date(d.getFullYear(),d.getMonth()+1,0).getDate()},(_,i)=>({id:key(i+1),date:key(i+1),checkIn:'08:00',checkOut:'21:15',isHoliday:i===4}));
   for(const suffix of ['', 'IronPeak'])localStorage.setItem('weeklySheetShifts'+suffix,JSON.stringify(rows));
   localStorage.setItem('ledgerBalances',JSON.stringify({checking:1234,saving:5678,etc:99}));
   localStorage.setItem('ledgerActivity',JSON.stringify([{id:'long',date:key(1),type:'expense',amount:999999.99,reason:'Long title 한국어 '+ 'verylongword'.repeat(15),detail:'https://example.com/'+ 'longurl'.repeat(30)}]));
 });
 async function checkHeader(page,width){
 const layout=await page.locator('.page-header').evaluate(header=>{
  const links=[...header.querySelectorAll('.header-actions:not(.header-actions-right) .icon-btn')].map(e=>e.getBoundingClientRect());
  const logout=header.querySelector('#logoutBtn').getBoundingClientRect(),title=header.querySelector('h1').getBoundingClientRect();
  return {sameRow:links.every(r=>Math.abs(r.y-logout.y)<1),adjacent:Math.abs(links[1].x-links[0].right-8)<1,below:title.top>=logout.bottom,right:logout.left>links[1].right};
 });
 assert.deepEqual(layout,{sameRow:true,adjacent:true,below:true,right:true},'header alignment '+width);
}
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/mobile/');await page.locator('#preview').tap();
 await page.getByRole('link',{name:'Work sheet'}).tap();await page.waitForURL('**/index.html');
 assert.equal(await page.locator('#sheetCalendar .calendar-day-header').first().textContent(),'Mon');
assert.equal(await page.getByRole('link',{name:'Home widgets'}).getAttribute('href'),'mobile/');
assert.equal(await page.locator('#logoutBtn').getAttribute('aria-label'),'Log out');
for(const width of [320,375,390,430,768,1024,1440,1920]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(350);
   await checkHeader(page,width);
   await page.locator('#sheetCalendar').scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,engine+' page overflow '+width);
   const bad=await page.locator('#sheetCalendar').evaluate(cal=>[...cal.querySelectorAll('.calendar-day-header,.work-calendar-hours')].filter(el=>{
     const box=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect();
     const parent=el.closest('button')?.getBoundingClientRect() || box;
     return text.width>parent.width+1 || (el.classList.contains('calendar-day-header')&&text.height>parseFloat(getComputedStyle(el).lineHeight)*1.2);
   }).map(e=>e.textContent));assert.deepEqual(bad,[],engine+' calendar text '+width);
   const day=page.locator('.work-calendar-day').first();await day.tap();assert.equal(await page.locator('#selectedDayCard').isVisible(),true);
   const cal=await page.locator('#sheetCalendarCard').boundingBox(),detail=await page.locator('#selectedDayCard').boundingBox();assert.ok(detail.y>=cal.y+cal.height-1 || detail.x>=cal.x+cal.width-1,'detail overlaps calendar');
   await day.tap();assert.equal(await page.locator('#selectedDayCard').isVisible(),false);
   if(width===390)await page.screenshot({path:path.join(os.tmpdir(),`phone-calendar-${engine}.png`)});
   console.log(engine,width,'calendar, page width, tap details PASS');
 }
 await page.setViewportSize({width:390,height:844});
 const range=await page.locator('#sheetRangeTitle').textContent();
 await page.locator('#nextWeekBlockBtn').tap();assert.notEqual(await page.locator('#sheetRangeTitle').textContent(),range);
 await page.locator('#prevWeekBlockBtn').tap();assert.equal(await page.locator('#sheetRangeTitle').textContent(),range);
 const month=await page.locator('#calendarMonthLabel').textContent();
 await page.locator('#nextCalendarMonthBtn').tap();assert.notEqual(await page.locator('#calendarMonthLabel').textContent(),month);
 await page.locator('#prevCalendarMonthBtn').tap();assert.equal(await page.locator('#calendarMonthLabel').textContent(),month);
 const scrollable=await page.locator('.sheet-table-wrap').first().evaluate(el=>{el.scrollLeft=100;const moved=el.scrollLeft>0;el.scrollLeft=0;return moved});
 assert.equal(scrollable,true,'wide table must scroll rather than shrink inputs');
 await page.locator('.mobile-time-trigger').first().tap();
 await page.locator('#mobileCheckIn').fill('14:15');await page.locator('#mobileCheckOut').fill('21:15');
 assert.match(await page.locator('.mobile-time-summary').textContent(),/6.50 hours/);
 await page.locator('.mobile-time-dialog button[type=submit]').tap();
 assert.equal(await page.locator('.mobile-time-dialog').isVisible(),false);
 await page.locator('.mobile-time-trigger').first().tap();assert.equal(await page.locator('#mobileCheckIn').inputValue(),'14:15');
 await page.locator('[data-action=clear]').tap();await page.locator('[data-action=cancel]').tap();
 await page.locator('.mobile-time-trigger').first().tap();assert.equal(await page.locator('#mobileCheckIn').inputValue(),'14:15');await page.locator('[data-action=cancel]').tap();
 await page.goto(base+'/index.html?job=iron');await page.locator('#sheetCalendar').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.goto(base+'/mobile/');await page.getByRole('link',{name:'Ledger'}).tap();await page.waitForURL('**/ledger.html');
 for(const width of [320,390,430,768,1024,1440,1920]){await page.setViewportSize({width,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,engine+' ledger width '+width);
 await checkHeader(page,width);
 const alignment=await page.evaluate(()=>{
  const a=document.querySelector('.activity-shared-field .checkbox-label').getBoundingClientRect(),b=document.querySelector('#addActivityBtn').getBoundingClientRect();
  const icons=[...document.querySelectorAll('.app-header .icon-btn')].map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
  return {sharedOverlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,iconOverlap:icons.some((a,i)=>icons.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};
 });assert.equal(alignment.sharedOverlap,false,'shared/submit overlap '+width);assert.equal(alignment.iconOverlap,false,'header icons overlap '+width);
}
 assert.equal(await page.locator('.abbreviations-card').getAttribute('open'),null);
await page.locator('.abbreviations-card summary').tap();assert.equal(await page.locator('.activity-import-abbrev-grid').isVisible(),true);
await page.locator('.abbreviations-card summary').tap();assert.equal(await page.locator('.activity-import-abbrev-grid').isVisible(),false);
assert.equal(await page.locator('.activity-shared-field #addActivityBtn').count(),1);
assert.equal(await page.evaluate(()=>new Set(buildColorPalette(100)).size),10);
await page.locator('#activitySourceType').selectOption('unexpected_income');
await page.locator('#activityAmount').fill('12.34');await page.locator('#activityReason').fill('UI fixture income');
await page.locator('#addActivityBtn').tap();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ledgerActivity')).some(e=>e.reason==='UI fixture income'&&e.amount===12.34));

assert.equal(await page.getByRole('link',{name:'Home widgets'}).getAttribute('href'),'mobile/');
assert.deepEqual(errors,[]);console.log(engine,'mobile time save/cancel, Iron Peak, ledger navigation PASS');await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});

// Every account and financial record below is a local fixture. Firebase is stubbed.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const EE=require('../ee-model.js'),fs=require('node:fs/promises');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8001';
const plans=[{id:'g',type:'expected',label:'장보기',amount:500},{id:'shop',type:'expected',label:'쇼핑',amount:450},{id:'rent',type:'fixed',label:'Rent',amount:900,customMetadata:'keep fixed untouched'},{id:'pay',type:'income',label:'Salary',amount:3000,customMetadata:'keep income untouched'}];
const entries=[{id:'history',date:'2026-11-10',type:'expense',sourceType:'expected',reason:'쇼핑',detail:'Sephora original',amount:80,isShared:true,createdAt:'2026-11-10T12:00:00Z'},
 {id:'grocery',date:'2026-11-02',type:'expense',sourceType:'expected',reason:'장보기',linkedPlanItemId:'g',amount:20,createdAt:'2026-11-02T12:00:00Z'},
 {id:'fe',date:'2026-11-01',type:'expense',sourceType:'fixed',reason:'Rent',linkedPlanItemId:'rent',amount:900},
 {id:'ei',date:'2026-11-01',type:'income',sourceType:'income',reason:'Salary',linkedPlanItemId:'pay',amount:3000},
 {id:'ui',date:'2026-11-01',type:'income',sourceType:'unexpected_income',reason:'Gift',amount:5}];
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block',timezoneId:'America/Edmonton',viewport:{width:1440,height:1000}});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(({plans,entries})=>{
    const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-15T18:00:00Z']));}static now(){return +new NativeDate('2026-11-15T18:00:00Z');}};
    if(localStorage.getItem('eeFixture'))return;localStorage.setItem('eeFixture','1');
    localStorage.setItem('ledgerBalances',JSON.stringify({checking:1000,saving:2000,etc:0}));localStorage.setItem('ledgerPlanItems',JSON.stringify(plans));localStorage.setItem('ledgerActivity',JSON.stringify(entries));
   },{plans,entries});
   const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
   await page.goto(base+'/ledger.html');await page.locator('#activityList [data-id="history"]').waitFor();
   const original=await page.evaluate(()=>({transactions:localStorage.ledgerActivity,balances:localStorage.ledgerBalances}));
   await page.evaluate(async()=>{enterEditMode('shop');await removeEditingPlanItem();});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).length),4,'legacy EE with historical alias references cannot be removed');
   await page.locator('#openPlanBtn').click();await page.locator('#eeTemplatePreviewBtn').click();
   assert.equal(await page.locator('#eeTemplatePreview .ee-template-row select').first().inputValue(),'keep');
   await page.getByRole('button',{name:'Apply reviewed template',exact:true}).click();
   let saved=await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems));
   assert.equal(saved.filter(row=>row.type==='expected').length,6);assert.equal(saved.find(row=>row.id==='g').amount,500);assert.equal(saved.find(row=>row.id==='shop').label,'개인쇼핑');
   assert.deepEqual(saved.filter(row=>row.type!=='expected'),plans.filter(row=>row.type!=='expected'));
   assert.deepEqual(await page.evaluate(()=>({transactions:localStorage.ledgerActivity,balances:localStorage.ledgerBalances})),original);
   await page.locator('#eeTemplatePreviewBtn').click();await page.getByRole('button',{name:'Apply reviewed template',exact:true}).click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).length),8,'repeat template adds no duplicate parents');
   await page.evaluate(()=>enterEditMode('shop'));assert.equal(await page.locator('#removePlanItemBtn').isDisabled(),true);
   const deletionSnapshot=await page.evaluate(()=>[localStorage.ledgerPlanItems,localStorage.ledgerActivity]);
   await page.evaluate(async()=>{await removeEditingPlanItem();await clearPlan();});
   assert.deepEqual(await page.evaluate(()=>[localStorage.ledgerPlanItems,localStorage.ledgerActivity]),deletionSnapshot);
   await page.evaluate(async()=>{
    const previous=localStorage.ledgerPlanItems;
    const rows=JSON.parse(previous);rows.find(row=>row.id==='shop').subcategories.forEach(child=>child.archived=true);
    localStorage.ledgerPlanItems=JSON.stringify(rows);planItems=normalizePlanItems(rows);enterEditMode('shop');await removeEditingPlanItem();
    if(localStorage.ledgerPlanItems!==JSON.stringify(rows))throw Error('Archived-only parent deleted');
    localStorage.ledgerPlanItems=previous;planItems=normalizePlanItems(JSON.parse(previous));
    const fixed={id:'temporary-unused-fe',type:'fixed',label:'Temporary test',amount:1,metadata:'preserved'};
    localStorage.ledgerPlanItems=JSON.stringify([...JSON.parse(previous),fixed]);planItems=normalizePlanItems(JSON.parse(localStorage.ledgerPlanItems));
    enterEditMode(fixed.id);await removeEditingPlanItem();
   });
   assert.deepEqual(await page.evaluate(()=>[localStorage.ledgerPlanItems,localStorage.ledgerActivity]),deletionSnapshot,'allowed FE removal preserves all remaining raw metadata/history');
   assert.ok(dialogs.some(message=>message.includes('Clear all is blocked')));
   await page.evaluate(()=>exitEditMode());
   const imported=await page.evaluate(()=>parseActivityImportText('11/10\n- 12 EE 쇼핑 Sephora\n- 5 FE Rent\n+ 30 EI Salary'));
   assert.equal(imported[0].linkedPlanItemId,'shop');assert.equal(imported[0].detail,'Sephora');assert.equal(imported[0].subcategoryId,undefined);assert.equal(imported[1].sourceType,'fixed');assert.equal(imported[2].sourceType,'income');
   await page.locator('#closePlanBtn').click();
   await page.locator('#activityList [data-id="history"]').getByRole('button',{name:'Edit activity entry'}).click();
   assert.equal(await page.locator('#activityLinkedItem').inputValue(),'shop');assert.equal(await page.locator('#activitySubcategory').inputValue(),'');
   await page.locator('#activitySubcategory').selectOption('ee_shopping_1');await page.locator('#addActivityBtn').click();
   let history=await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id==='history'));
   assert.equal(history.reason,'쇼핑');assert.equal(history.detail,'Sephora original');assert.equal(history.amount,80);assert.equal(history.isShared,true);assert.equal(history.subcategoryId,'ee_shopping_1');
   await page.locator('#budgetProgressRows [data-plan-type="expected"]').click();await page.locator('#eeProgressRows').waitFor();
   let totals=await page.evaluate(()=>ExpectedBudget.breakdown(planItems.find(row=>row.id==='shop'),getEntriesInSelectedRange(),planItems));
   assert.equal(totals.actual,40);assert.equal(totals.children.find(row=>row.id==='ee_shopping_1').actual,40);assert.equal(totals.children.at(-1).actual,0);
   await page.locator('.activity-range-btn[data-range="week"]').click();
   assert.match(await page.locator('#budgetProgressPeriodNote').textContent(),/2026-11-09 to 2026-11-15/);
   assert.match(await page.locator('#budgetProgressPeriodNote').textContent(),/not prorated or multiplied/);
   const weeklyRows=await page.evaluate(()=>buildBudgetProgressRows());
   assert.equal(await page.evaluate(()=>getActivityAmountForPlanItem(planItems.find(row=>row.id==='g'))),0);
   await page.locator('.activity-range-btn[data-range="year"]').click();assert.equal(await page.evaluate(()=>getActivityAmountForPlanItem(planItems.find(row=>row.id==='g'))),20);
   assert.match(await page.locator('#budgetProgressPeriodNote').textContent(),/2026 \(year\)/);
   const yearlyRows=await page.evaluate(()=>buildBudgetProgressRows());
   assert.deepEqual(yearlyRows.map(row=>row.planned),weeklyRows.map(row=>row.planned),'monthly reference budgets remain unchanged across spending periods');
   await page.locator('.activity-month-btn[data-month="11"]').click();
   assert.match(await page.locator('#budgetProgressPeriodNote').textContent(),/2026-11 \(month\)/);
   const monthlyRows=await page.evaluate(()=>buildBudgetProgressRows());
   assert.deepEqual(monthlyRows.filter(row=>['fixed','income','unexpected_income'].includes(row.key)).map(row=>[row.key,row.planned,row.actual]),[['fixed',900,900],['income',3000,3000],['unexpected_income',null,5]]);
   for(const key of ['fixed','income','unexpected_income']){
    assert.deepEqual(monthlyRows.find(row=>row.key===key),yearlyRows.find(row=>row.key===key),'FE/EI/UI unchanged with identical period fixture actuals');
   }
   await page.locator('#openPlanBtn').click();let editor=page.locator('#expectedPlanList [data-id="shop"] .ee-editor');
   await editor.locator('summary').click();await editor.locator('[data-subcategory-id="ee_shopping_1"]').getByRole('button',{name:'Archive',exact:true}).click();
   await editor.getByRole('button',{name:'Save subcategories',exact:true}).click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop').subcategories.find(row=>row.id==='ee_shopping_1').archived),true);
   await page.reload();await page.locator('#activityList [data-id="history"]').waitFor();assert.match(await page.locator('#activityList [data-id="history"]').textContent(),/보관됨/);
   await page.locator('#activitySourceType').selectOption('expected');await page.locator('#activityLinkedItem').selectOption('shop');
   assert.equal(await page.locator('#activitySubcategory option[value="ee_shopping_1"]').count(),0,'archived category not offered on new entries');
   await page.locator('#activityList [data-id="history"]').getByRole('button',{name:'Edit activity entry'}).click();assert.equal(await page.locator('#activitySubcategory').inputValue(),'ee_shopping_1');
   await page.locator('#activitySubcategory').selectOption('ee_shopping_0');await page.locator('#addActivityBtn').click();
   assert.equal(await page.evaluate(()=>ExpectedBudget.breakdown(planItems.find(row=>row.id==='shop'),activityEntries,planItems).children.find(row=>row.id==='ee_shopping_1').actual),0);
   await page.locator('#activityList [data-id="history"]').getByRole('button',{name:'Delete activity entry'}).click();
   assert.equal(await page.evaluate(()=>ExpectedBudget.breakdown(planItems.find(row=>row.id==='shop'),activityEntries,planItems).actual),0);
   await page.locator('#openPlanBtn').click();editor=page.locator('#expectedPlanList [data-id="shop"] .ee-editor');if(!await editor.evaluate(node=>node.open))await editor.locator('summary').click();
   await editor.getByRole('button',{name:'Add subcategory',exact:true}).click();let last=editor.locator('.ee-edit-row').last();await last.getByLabel('Subcategory name').fill('Custom 🐸');await last.getByLabel('Subcategory monthly budget').fill('12.34');await editor.getByRole('button',{name:'Save subcategories',exact:true}).click();
   saved=await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems));assert.equal(saved.find(row=>row.id==='shop').amount,362.34);
   editor=page.locator('#expectedPlanList [data-id="shop"] .ee-editor');if(!await editor.evaluate(node=>node.open))await editor.locator('summary').click();
   last=editor.locator('.ee-edit-row').last();await last.getByLabel('Subcategory name').fill('Renamed custom');
   await editor.locator('[data-subcategory-id="ee_shopping_1"]').getByRole('button',{name:'Restore',exact:true}).click();await editor.getByRole('button',{name:'Save subcategories',exact:true}).click();
   saved=await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems));assert.equal(saved.find(row=>row.id==='shop').amount,462.34);assert.equal(saved.find(row=>row.id==='shop').subcategories.at(-1).label,'Renamed custom');
   await page.locator('#closePlanBtn').click();
   for(const width of [320,390,600,1024,1440]){
    await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overflow '+width);
    await page.locator('#openPlanBtn').click();const panel=page.locator('#expectedPlanList [data-id="shop"] .ee-editor');if(!await panel.evaluate(node=>node.open))await panel.locator('summary').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' expanded editor overflow '+width);await page.locator('#closePlanBtn').click();
   }
   assert.deepEqual(errors,[]);assert.ok(dialogs.every(message=>!message.includes('Invalid')));console.log(name+': EE template, preserved budgets/history, assignment, archive, move, delete, custom edits, ranges and refresh PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

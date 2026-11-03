// Isolated local fixtures only; real Firebase SDK and account access are disabled.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),EE=require('../ee-model.js');
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8008';
const plans=[...EE.applyTemplate([{id:'g',type:'expected',label:'장보기',amount:500},{id:'shop',type:'expected',label:'쇼핑',amount:450}]),{id:'rent',type:'fixed',label:'Rent',amount:900,customMetadata:'keep'},{id:'pay',type:'income',label:'Salary',amount:3000}];
const entries=[{id:'history',date:'2026-11-02',type:'expense',sourceType:'expected',reason:'쇼핑',detail:'Original Sephora',amount:80,isShared:true,createdAt:'2026-11-02T12:00:00Z'},{id:'grocery',date:'2026-11-02',type:'expense',sourceType:'expected',reason:'장보기',linkedPlanItemId:'g',amount:20},
 {id:'salary',date:'2026-11-02',type:'income',sourceType:'income',reason:'Salary',linkedPlanItemId:'pay',amount:3500},
 {id:'gift-a',date:'2026-11-02',type:'income',sourceType:'unexpected_income',reason:'Gift',amount:15},{id:'gift-b',date:'2026-11-02',type:'income',sourceType:'unexpected_income',reason:'Gift',amount:35}];
(async()=>{
 for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]){
  const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
   await context.route('https://www.gstatic.com/**',r=>r.fulfill({body:''}));await context.route('**/auth.js',r=>r.fulfill({body:'window.__ledgerAuth={};'}));
   await context.addInitScript(({plans,entries})=>{
    const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-03T18:00:00Z']));}static now(){return +new NativeDate('2026-11-03T18:00:00Z');}};
    if(localStorage.fixture)return;localStorage.fixture='1';localStorage.ledgerBalances=JSON.stringify({checking:1000,saving:2000,etc:0});localStorage.ledgerPlanItems=JSON.stringify(plans);localStorage.ledgerActivity=JSON.stringify(entries);localStorage.ledgerExchangeHistory='[{"id":"historical-exchange","amount":25}]';
   },{plans,entries});
   const page=await context.newPage(),errors=[],rateRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(request.url().includes('frankfurter'))rateRequests.push(request.url());});let accept=true;const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.message());accept?dialog.accept():dialog.dismiss();});
   await page.goto(base+'/ledger.html');await page.locator('#budgetProgressRows').waitFor();
   for(const selector of ['#dashboardSection','#spendingSummarySection','#activitySection','#activitySummarySection','#investmentHubSection'])assert.equal(await page.locator(selector).evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(240, 245, 228)','shared outer card '+selector);
   for(const selector of ['.balance-card','.budget-overview-card','.investment-hub-summary-card','.ledger-activity-item','.summary-chart','.activity-import-card'])assert.equal(await page.locator(selector).first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)','shared inner card '+selector);
   assert.equal(await page.locator('#eeProgressRows').count(),0,'expected expense details start closed');
   await page.locator('#budgetProgressRows [data-plan-type="fixed"]').click();await page.locator('#fixedProgressRows').waitFor();
   assert.equal(await page.locator('#fixedProgressRows .ee-progress-parent').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
   assert.match(await page.locator('#fixedProgressRows').textContent(),/Rent/);assert.match(await page.locator('#fixedProgressRows').textContent(),/\$900\.00/);
   await page.locator('#budgetProgressRows [data-plan-type="income"]').click();await page.locator('#incomeProgressRows').waitFor();
   assert.match(await page.locator('#incomeProgressRows').textContent(),/\$3,500\.00/);assert.match(await page.locator('#incomeProgressRows').textContent(),/\$3,000\.00/);assert.match(await page.locator('#incomeProgressRows').textContent(),/예상보다 \$500\.00 더 입금/);
   assert.equal(await page.locator('#incomeProgressRows .ee-over,#incomeProgressRows .ee-warning').count(),0,'higher income is not an expense overspend');
   await page.locator('#budgetProgressRows [data-plan-type="unexpected_income"]').click();await page.locator('#unexpectedIncomeProgressRows').waitFor();
   assert.match(await page.locator('#unexpectedIncomeProgressRows').textContent(),/Gift/);assert.match(await page.locator('#unexpectedIncomeProgressRows').textContent(),/\$50\.00/);
   assert.equal(await page.locator('#unexpectedIncomeProgressRows .ee-progress-parent').count(),1,'unexpected income keeps existing reason grouping');
   assert.equal(await page.locator('#unexpectedIncomeProgressRows progress').count(),0,'no invented budget for unexpected income');
   for(const type of ['income','unexpected_income']){
    await page.evaluate(type=>{selectedPlanDetailType=type;renderActivity();},type);
    const card=page.locator(type==='income'?'#incomeProgressRows .ee-progress-parent':'#unexpectedIncomeProgressRows .ee-progress-parent');
    assert.equal(await card.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
    for(const width of [320,390,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'income overflow '+type+' '+width);}
   }
   await page.locator('#budgetProgressRows [data-plan-type="expected"]').click();await page.locator('#eeProgressRows').waitFor();
   assert.equal(await page.locator('.summary-progress-detail-row').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(240, 245, 228)');
   assert.equal(await page.locator('.ee-progress-parent').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
   assert.equal(await page.locator('.ee-progress-parent>summary').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
   assert.equal(await page.locator('#eeTemplatePreviewBtn,#eeTemplatePreview,#exchangeSection,#exchangeHistorySection').count(),0);
   assert.equal(await page.locator('.ee-progress-parent[open]').count(),6,'progress children are expanded by default');
   const progress=page.locator('.ee-progress-parent').first();await progress.locator('summary').click();assert.equal(await progress.evaluate(node=>node.open),false);await progress.locator('summary').click();assert.equal(await progress.evaluate(node=>node.open),true);
   for(const width of [320,390,1024,1440]){
    await page.setViewportSize({width,height:1000});
    assert.ok((await progress.locator('summary').boundingBox()).height<=56,'compact parent height '+width);
    assert.ok((await progress.locator('.ee-progress-children .ee-metric').first().boundingBox()).height<=36,'compact child height '+width);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'compact card overflow '+width);
    const sizes=await progress.evaluate(node=>{const size=selector=>parseFloat(getComputedStyle(node.querySelector(selector)).fontSize);return {parent:size('.ee-parent-metric .ee-metric-amount strong'),child:size('.ee-progress-children .ee-metric-amount strong'),parentBudget:size('.ee-parent-metric .ee-metric-amount small'),childBudget:size('.ee-progress-children .ee-metric-amount small')};});
    assert.ok(sizes.parent>sizes.child&&sizes.parentBudget>sizes.childBudget,'only parent amounts are enlarged '+width);
   }
   await page.setViewportSize({width:1100,height:1000});
   await page.locator('.summary-progress-table-wrap').screenshot({path:'/tmp/ledger-all-cards-progress-'+name+'.png'});
   await page.locator('#spendingSummarySection').screenshot({path:'/tmp/ledger-all-cards-overview-'+name+'.png'});
   await page.setViewportSize({width:390,height:1000});await page.locator('.summary-progress-table-wrap').screenshot({path:'/tmp/ledger-all-cards-mobile-'+name+'.png'});
   await page.locator('#openPlanBtn').click();let editor=page.locator('#expectedPlanList [data-id="shop"] .ee-editor');
   assert.equal(await editor.evaluate(node=>node.open),true);assert.equal(await editor.locator('.ee-child-row').count(),5);
   assert.equal(await page.locator('.ee-subheading,.ee-count').count(),0,'no child heading or count badge');
   assert.equal(await page.locator('#expectedPlanList [data-id="shop"]').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
   for(const selector of ['.ledger-plan-item','.plan-label','.plan-amount']){
    const read=node=>{const style=getComputedStyle(node);return [style.backgroundColor,style.color,style.fontSize,style.fontWeight,style.padding,style.borderColor];};
    assert.deepEqual(await page.locator('#fixedPlanList '+selector).first().evaluate(read),await page.locator('#expectedPlanList '+selector).first().evaluate(read),'matching expense style '+selector);
   }
   assert.equal(await page.locator('#fixedPlanList').getByLabel('Rent 상위 분류 수정',{exact:true}).count(),1);
   for(const [fixed,income] of [['.ledger-plan-item','.ledger-plan-item'],['.plan-label','.plan-label'],['.plan-amount','.plan-income-amount']]){
    const read=node=>{const style=getComputedStyle(node);return [style.backgroundColor,style.color,style.fontSize,style.fontWeight,style.padding,style.borderColor];};
    assert.deepEqual(await page.locator('#fixedPlanList '+fixed).first().evaluate(read),await page.locator('#incomePlanList '+income).first().evaluate(read),'matching income overview style');
   }
   assert.equal(await page.locator('#incomePlanList').getByLabel('Salary 상위 분류 수정',{exact:true}).count(),1);
   assert.ok(await editor.locator('.ee-child-row').first().evaluate(node=>node.getBoundingClientRect().left-node.closest('li').querySelector('.plan-label').getBoundingClientRect().left)>=16,'children are indented');
   assert.equal(await page.getByRole('button',{name:'Archive',exact:true}).count(),0);
   await editor.locator('summary').click();assert.equal(await editor.evaluate(node=>node.open),false);await editor.locator('summary').click();
   await editor.getByLabel('뷰티·화장품 수정',{exact:true}).click();await editor.getByLabel('하위 분류 이름').fill('화장품');await editor.getByLabel('하위 분류 월예산').fill('107');await editor.getByLabel('저장',{exact:true}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop').amount===457);
   assert.equal(await editor.locator('.ee-child-name').filter({hasText:'화장품'}).count(),1);
   await editor.getByRole('button',{name:'하위 분류 추가',exact:true}).click();await editor.getByLabel('하위 분류 이름').fill('작은 기쁨');await editor.getByLabel('하위 분류 월예산').fill('12.34');await editor.getByLabel('저장',{exact:true}).click();
   await page.waitForFunction(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop').amount===469.34);
   await page.locator('#closePlanBtn').click();await page.locator('#activityList [data-id="history"]').getByRole('button',{name:'Edit activity entry'}).click();
   await page.locator('#activitySubcategory').selectOption('ee_shopping_1');await page.locator('#addActivityBtn').click();await page.waitForFunction(()=>!editingActivityId);
   const historical=await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id==='history'));
   await page.locator('#openPlanBtn').click();accept=false;await editor.getByLabel('화장품 삭제',{exact:true}).click();assert.equal(await editor.getByLabel('화장품 삭제',{exact:true}).count(),1);
   accept=true;await editor.getByLabel('화장품 삭제',{exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop').subcategories.find(row=>row.id==='ee_shopping_1').deleted);
   assert.equal(await editor.getByLabel('화장품 수정',{exact:true}).count(),0);
   await page.locator('#closePlanBtn').click();assert.match(await page.locator('#activityList [data-id="history"]').textContent(),/삭제됨/);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id==='history')),historical);
   await page.locator('#activitySourceType').selectOption('expected');await page.locator('#activityLinkedItem').selectOption('shop');assert.equal(await page.locator('#activitySubcategory option[value="ee_shopping_1"]').count(),0);
   await page.locator('#openPlanBtn').click();await page.evaluate(()=>enterEditMode('shop'));assert.equal(await page.locator('#removePlanItemBtn').isEnabled(),true);
   accept=false;await page.locator('#removePlanItemBtn').click();assert.equal(await page.locator('#expectedPlanList [data-id="shop"]').count(),1);
   accept=true;await page.locator('#removePlanItemBtn').click();await page.waitForFunction(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop').deleted);
   assert.equal(await page.locator('#expectedPlanList [data-id="shop"]').count(),0);assert.ok(dialogs.some(message=>message.includes('하위 분류도 모두 삭제')));
   const removed=await page.evaluate(()=>JSON.parse(localStorage.ledgerPlanItems).find(row=>row.id==='shop'));assert.ok(removed.subcategories.every(child=>child.deleted));
   await page.locator('#closePlanBtn').click();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.ledgerActivity).find(row=>row.id==='history')),historical);
   assert.equal(await page.locator('#activityLinkedItem option[value="shop"]').count(),0);
   assert.equal(await page.evaluate(()=>ExpectedBudget.breakdown(planItems.find(row=>row.id==='shop'),activityEntries,planItems).actual),40);
   for(const width of [320,390,600,1024,1440]){
    await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' progress overflow '+width);
    await page.locator('#openPlanBtn').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overview overflow '+width);
    if(width===390)await page.locator('#planSection').screenshot({path:'/tmp/ledger-frog-overview-'+name+'.png'});await page.locator('#closePlanBtn').click();
   }
   await page.setViewportSize({width:1024,height:1000});await page.locator('.summary-progress-table-wrap').screenshot({path:'/tmp/ledger-frog-progress-'+name+'.png'});
   await page.reload();await page.locator('#budgetProgressRows').waitFor();assert.equal(await page.locator('#eeProgressRows').count(),0);assert.equal(await page.locator('#activityLinkedItem option[value="shop"]').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.ledgerExchangeHistory),'[{"id":"historical-exchange","amount":25}]');assert.deepEqual(rateRequests,[]);
   assert.deepEqual(errors,[]);console.log(name+': frog UI, default expansion, child edit/add/delete, parent confirmation/cascade, historical links, reload and responsive PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

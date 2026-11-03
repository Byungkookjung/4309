// Isolated local fixtures; Firebase is disabled so no live account data is touched.
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
    localStorage.setItem('ledgerBalances',JSON.stringify({checking:1000,saving:2000,etc:0}));
    localStorage.setItem('ledgerPlanItems',JSON.stringify([{id:'food',type:'expected',label:'장보기',amount:500}]));
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/ledger.html');await page.locator('#activityForm').waitFor();
   await page.locator('#activitySourceType').selectOption('expected');
   for(const width of [320,390,600,601,700,760,761,1024,1440,1920]){
    await page.setViewportSize({width,height:1000});
    const geometry=await page.locator('#activityForm').evaluate(form=>{
     const detail=form.querySelector('#activityDetail').getBoundingClientRect(),box=form.getBoundingClientRect();
     const label=form.querySelector('.checkbox-label'),text=label.querySelector('span'),range=document.createRange();range.selectNodeContents(text);
     const textBox=range.getBoundingClientRect();
     const fields=[...form.children].filter(field=>getComputedStyle(field).display!=='none');
     return {detailWidth:detail.width,formWidth:box.width,sharedTextHeight:textBox.height,lineHeight:parseFloat(getComputedStyle(text).lineHeight),
      fullFields:fields.every(field=>Math.abs(field.getBoundingClientRect().width-box.width)<2),
      overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.equal(geometry.overflow,false,name+' overflow '+width);
    assert.ok(geometry.sharedTextHeight<=geometry.lineHeight+2,name+' shared label wraps '+width);
    if(width<=760){assert.ok(geometry.fullFields,name+' fields are full width '+width);assert.ok(geometry.detailWidth>geometry.formWidth*.9);}
    else assert.ok(geometry.detailWidth>geometry.formWidth*.4,name+' desktop detail width '+width);
   }
   await page.setViewportSize({width:700,height:1000});await page.locator('#activityForm').screenshot({path:'/tmp/ledger-activity-'+name+'.png'});
   assert.deepEqual(errors,[]);console.log(name+': Activity layout and single-line shared label pass at 10 widths');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exit(1)});

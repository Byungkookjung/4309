const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const mock=`
window.store={personalTasks:{},personalRoutines:{},personalRoutineChecks:{},personalCategories:{}};window.failWrites=false;let sequence=0;const listeners={};
function emit(name){for(const cb of listeners[name]||[])cb({docs:Object.entries(store[name]).map(([id,data])=>({id,data:()=>data}))})}
function collection(name){if(!Object.hasOwn(store,name))throw Error('Unexpected collection');return {onSnapshot(cb){(listeners[name]||=[]).push(cb);queueMicrotask(()=>emit(name));return()=>listeners[name]=listeners[name].filter(x=>x!==cb)},doc(id='id'+(++sequence)){return {id,async set(data){if(failWrites)throw Error('denied');store[name][id]=data;emit(name)},async update(data){if(failWrites)throw Error('denied');store[name][id]={...store[name][id],...data};emit(name)},async delete(){if(failWrites)throw Error('denied');delete store[name][id];emit(name)}}}}}
window.__ledgerAuth={auth:{onAuthStateChanged(cb){window.authCallback=cb;cb({uid:'test-only'})},async signOut(){authCallback(null)}},signInWithGoogle:async()=>authCallback({uid:'test-only'}),db:{batch(){const ops=[];return{set(ref,data){ops.push(()=>ref.set(data))},delete(ref){ops.push(()=>ref.delete())},async commit(){if(failWrites)throw Error('denied');for(const op of ops)await op()}}},collection(name){if(name!=='users')throw Error('wrong root');return{doc(id){if(id!=='test-only')throw Error('wrong user');return{collection}}}}}};
`;

(async()=>{for(const [engine,type] of [['Chrome',chromium],['WebKit',webkit]]){
 const browser=await type.launch(engine==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 await page.clock.setFixedTime(new Date('2026-10-19T18:00:00Z'));
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({body:'window.firebase={auth(){},firestore(){}};'}));
 await page.route('**/auth.js',r=>r.fulfill({body:mock}));
 await page.goto('http://localhost:8000/mobile/planner.html');
 await page.waitForFunction(()=>!document.querySelector('#addTask').disabled);
 await page.evaluate(()=>{
  store.personalTasks={a:{title:'Done',date:'2026-10-20',completed:true},b:{title:'Pending',date:'2026-10-20',completed:false},c:{title:'All done',date:'2026-10-21',completed:true}};
  for(let i=0;i<12;i++)store.personalTasks['many'+i]={title:'Long task '+i,date:'2026-10-24',completed:false};
  store.personalRoutines={r:{title:'Routine',startDate:'2026-10-20',endDate:'2026-10-20',frequency:'daily'}};
  store.personalCategories={work:{name:'Work',color:'#a18ae5'},daily:{name:'일상',color:'#202127'},home:{name:'Home',color:'#53bca5'}};
  emit('personalTasks');emit('personalRoutines');emit('personalCategories');
 });
 assert.deepEqual(await page.locator('#categoryList strong').allTextContents(),['일상','Work','Home']);
 assert.deepEqual(await page.locator('#taskList .category-heading h3').allTextContents(),['일상','Work','Home']);
 await page.locator('#addTask').click();assert.deepEqual(await page.locator('#taskCategory option').allTextContents(),['일상','Work','Home']);await page.locator('#closeEditor').click();
 const cell=date=>page.locator('[data-date="2026-10-'+date+'"]');
 assert.equal(await cell('20').locator('.calendar-task-status').textContent(),'2');
 assert.equal(await cell('21').locator('.is-complete').textContent(),'✓');
 assert.equal(await cell('23').locator('.calendar-task-status').count(),0);
 assert.equal(await cell('24').locator('.calendar-task-status').textContent(),'12');
 assert.match(await cell('20').getAttribute('aria-label'),/2 tasks remaining/);
 await cell('20').click();
 assert.equal(await cell('19').getAttribute('aria-current'),'date');assert.equal(await cell('19').getAttribute('aria-pressed'),'false');
 assert.equal(await cell('20').getAttribute('aria-pressed'),'true');assert.equal(await cell('20').getAttribute('aria-current'),null);
 assert.equal(await cell('19').locator('.calendar-date-number').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(88, 123, 56)');
 assert.notEqual(await cell('19').evaluate(n=>getComputedStyle(n).boxShadow),'none');
 await page.getByRole('button',{name:'Complete: Pending',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-date="2026-10-20"] .calendar-task-status').textContent==='1');
 await page.getByRole('button',{name:'Complete: Routine',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-date="2026-10-20"] .is-complete'));
 await page.getByRole('button',{name:'Mark incomplete: Pending',exact:true}).click();
 assert.equal(await cell('20').locator('.calendar-task-status').textContent(),'1');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.calendar-task-status').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+1)),false);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.planner-calendar').screenshot({path:'/tmp/planner-counts-'+engine+'.png'});
 console.log(engine,'remaining counts, completed badge, empty dates, routines and responsive layout PASS');await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});

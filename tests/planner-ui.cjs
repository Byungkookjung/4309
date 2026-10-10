const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const path=require('node:path'),os=require('node:os');
const base=process.env.MOBILE_TEST_URL||'http://localhost:8000';
const mock=`
window.store={personalTasks:{},personalRoutines:{},personalRoutineChecks:{},personalCategories:{}};window.failWrites=false;let sequence=0;const listeners={};
function emit(name){for(const cb of listeners[name]||[])cb({docs:Object.entries(store[name]).map(([id,data])=>({id,data:()=>data}))})}
function collection(name){if(!Object.hasOwn(store,name))throw Error('Unexpected collection');return {onSnapshot(cb){(listeners[name]||=[]).push(cb);queueMicrotask(()=>emit(name));return()=>listeners[name]=listeners[name].filter(x=>x!==cb)},doc(id='id'+(++sequence)){return {id,async set(data){if(failWrites)throw Error('denied');store[name][id]=data;emit(name)},async update(data){if(failWrites)throw Error('denied');store[name][id]={...store[name][id],...data};emit(name)},async delete(){if(failWrites)throw Error('denied');delete store[name][id];emit(name)}}}}}
window.__ledgerAuth={auth:{onAuthStateChanged(cb){window.authCallback=cb;cb({uid:'test-only'})},async signOut(){authCallback(null)}},signInWithGoogle:async()=>authCallback({uid:'test-only'}),db:{batch(){const ops=[];return{set(ref,data){ops.push(()=>ref.set(data))},delete(ref){ops.push(()=>ref.delete())},async commit(){if(failWrites)throw Error('denied');for(const op of ops)await op()}}},collection(name){if(name!=='users')throw Error('wrong root');return{doc(id){if(id!=='test-only')throw Error('wrong user');return{collection}}}}}};
`;
(async()=>{for(const [name,type] of [['Chrome',chromium],['WebKit',webkit]]){
const browser=await type.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('https://www.gstatic.com/**',r=>r.fulfill({body:'window.firebase={auth(){},firestore(){}};'}));await page.route('**/auth.js',r=>r.fulfill({body:mock}));
await page.goto(base+'/mobile/planner.html');await page.waitForFunction(()=>!document.querySelector('#addTask').disabled);
await page.locator('#addCategory').tap();await page.locator('#categoryName').fill('Home & cats');await page.getByRole('radio',{name:'Lilac',exact:true}).check();await page.locator('#saveCategory').tap();await page.waitForFunction(()=>!document.querySelector('#categoryEditor').open);
await page.getByRole('button',{name:'Add task to Home & cats',exact:true}).tap();
assert.notEqual(await page.locator('#taskCategory').inputValue(),'');
await page.locator('#taskTitle').fill('A long task 한국어 https://example.com/'+ 'longword'.repeat(18));await page.locator('#taskDate').fill('2026-10-12');await page.locator('#saveTask').tap();await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);
assert.match(await page.locator('#holidayNames').textContent(),/Thanksgiving/);assert.equal(await page.locator('#taskList .task-item').count(),1);
await page.locator('#taskList .task-check').tap();assert.match(await page.locator('#taskProgress').textContent(),/1 of 1/);
await page.locator('#taskList .task-open').tap();await page.locator('#menuEdit').tap();await page.locator('#taskTitle').fill('Updated task');await page.locator('#saveTask').tap();await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);assert.match(await page.locator('#taskList').textContent(),/Updated task/);
async function moveTask(targetId,touch=false) {
 const handle=page.locator('#taskList .task-drag').first();
 await handle.scrollIntoViewIfNeeded();
 let from=await handle.boundingBox();
 const target=page.locator('.category-group').filter({has:page.locator('h3',{hasText:targetId})}).locator('.category-heading');
 let to=await target.boundingBox();
 await page.evaluate(y=>window.scrollBy(0,y),(from.y+to.y)/2-350);
 from=await handle.boundingBox();to=await target.boundingBox();
 if(touch){
 const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x+from.width/2,y:from.y+from.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x+to.width/2,y:to.y+to.height/2}]});
 await page.waitForTimeout(80);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
} else {
await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:12});await page.waitForTimeout(80);await page.mouse.up();
 }
 await page.waitForFunction(()=>!document.querySelector('.drag-ghost'));
}
await moveTask('일상');
await page.waitForFunction(()=>Object.values(store.personalTasks)[0].categoryId==='__daily__');
assert.equal(await page.locator('#taskEditor').evaluate(el=>el.open),false);
await moveTask('Home & cats');
await page.waitForFunction(()=>Object.values(store.personalTasks)[0].categoryId!=='__daily__');
assert.equal(await page.evaluate(()=>Object.values(store.personalTasks)[0].completed),true);
await page.evaluate(()=>failWrites=true);
await moveTask('일상');
await page.waitForFunction(()=>document.querySelector('#plannerStatus').textContent.includes('Could not save'));
assert.notEqual(await page.evaluate(()=>Object.values(store.personalTasks)[0].categoryId),'');
await page.evaluate(()=>failWrites=false);
if(name==='Chrome'){
 await moveTask('일상',true);
 await page.waitForFunction(()=>Object.values(store.personalTasks)[0].categoryId==='__daily__');
 await moveTask('Home & cats',true);
 await page.waitForFunction(()=>Object.values(store.personalTasks)[0].categoryId!=='__daily__');
}
await page.locator('#addRoutine').tap();assert.equal(await page.locator('#taskCategory').inputValue(),'__daily__');await page.locator('#taskTitle').fill('Read with the cat');await page.locator('#taskDate').fill('2026-10-12');
for(const day of ['Tue','Wed','Thu','Fri'])await page.locator('#weekdayChoices').getByRole('button',{name:day,exact:true}).tap();
await page.locator('#saveTask').tap();await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);
assert.equal(await page.locator('#routineList .task-item').count(),1);assert.equal(await page.locator('#taskList .task-item').count(),2);
await page.locator('#taskList .task-check').last().tap();await page.locator('[data-date="2026-10-19"]').tap();assert.equal(await page.locator('#taskList .task-item').count(),1);assert.equal(await page.locator('#taskList .task-check').getAttribute('aria-pressed'),'false');
await page.locator('#routineList button[aria-label^="Edit"]').tap();
await page.locator('#repeatFrequency').selectOption('monthly');
await page.locator('#monthChoices [aria-pressed=true]').tap();
await page.locator('[data-month-day="last"]').tap();
await page.locator('#routineEnd').fill('2026-12-31');
await page.setViewportSize({width:320,height:844});
assert.equal(await page.locator('#taskEditor').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
await page.locator('#saveTask').tap();await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);
await page.locator('[data-date="2026-10-31"]').tap();
assert.match(await page.locator('#taskList').textContent(),/Read with the cat/);
await page.locator('#routineList button[aria-label^="Edit"]').tap();
assert.equal(await page.locator('#repeatFrequency').inputValue(),'monthly');
assert.equal(await page.locator('[data-month-day="last"]').getAttribute('aria-pressed'),'true');
for(const value of ['daily','biweekly','yearly','weekly']){await page.locator('#repeatFrequency').selectOption(value);assert.equal(await page.locator('#weekdayChoices').isVisible(),['weekly','biweekly'].includes(value));}
await page.locator('#saveTask').tap();await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);
await page.locator('[data-date="2026-10-19"]').tap();
for(const width of [320,375,390,430,768,1024,1440,1920]){await page.setViewportSize({width,height:844});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overflow '+width);const bad=await page.locator('#plannerGrid').evaluate(el=>[...el.children].filter(e=>e.scrollWidth>e.clientWidth+1).length);assert.equal(bad,0);
const alignment=await page.locator('#taskList .task-item').first().evaluate(el=>{const check=el.querySelector('.task-check').getBoundingClientRect(),title=el.querySelector('.task-title').getBoundingClientRect();return Math.abs(check.y+check.height/2-title.y-title.height/2)});assert.ok(alignment<1,name+' check/title centered '+width);
assert.equal(await page.getByText('Uncategorized',{exact:true}).count(),0);}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(os.tmpdir(),'planner-'+name+'.png'),fullPage:true});
await page.locator('#addTask').tap();await page.locator('#taskTitle').fill('Keep me on failure');await page.evaluate(()=>failWrites=true);await page.locator('#saveTask').tap();await page.waitForFunction(()=>document.querySelector('#editorError').textContent.includes('Could not save')).catch(async e=>{console.log(await page.locator('#taskForm').evaluate(f=>({valid:f.checkValidity(),inputs:[...f.elements].filter(x=>x.validity&&!x.validity.valid).map(x=>[x.id,x.value,x.validationMessage]),error:document.querySelector('#editorError').textContent})));throw e;});assert.equal(await page.locator('#taskTitle').inputValue(),'Keep me on failure');await page.locator('#closeEditor').tap();await page.evaluate(()=>failWrites=false);
await page.locator('#routineList button[aria-label^="Delete"]').tap();await page.waitForFunction(()=>document.querySelectorAll('#routineList .task-item').length===0);assert.equal(await page.locator('#taskList .task-item').count(),0);
await page.getByRole('button',{name:'Edit category Home & cats',exact:true}).tap();
assert.equal(await page.getByRole('radio',{name:'Lilac',exact:true}).isChecked(),true);
await page.setViewportSize({width:320,height:844});
assert.equal(await page.locator('#categoryEditor').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
await page.locator('#categoryName').fill('A very long category '+ 'longword'.repeat(4));
assert.equal(await page.getByRole('radio').count(),6);
await page.getByRole('radio',{name:'Black',exact:true}).check();
await page.locator('#saveCategory').tap();await page.waitForFunction(()=>!document.querySelector('#categoryEditor').open);
await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
assert.equal(await page.evaluate(()=>Object.values(store.personalCategories)[0].color),'#202127');
await page.locator('#categoryList button[aria-label^="Delete category"]').tap();
await page.locator('[data-date="2026-10-12"]').tap();
assert.match(await page.locator('.category-group').textContent(),/일상.*Updated task/s);
assert.equal(await page.evaluate(()=>Object.keys(store.personalTasks).length),1);
await page.locator('#taskList .task-open').tap();
assert.equal(await page.locator('#taskMenu').isVisible(),true);
assert.equal(await page.locator('#taskMenu').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
await page.locator('#menuTomorrow').tap();
await page.waitForFunction(()=>!document.querySelector('#taskMenu').open);
assert.equal(await page.evaluate(()=>Object.values(store.personalTasks)[0].date),await page.evaluate(()=>MobileModel.nextDay(MobileModel.dayKey(new Date()))));
await page.locator('#taskList .task-open').tap();await page.locator('#menuDate').tap();await page.locator('#moveDate').fill('2026-10-15');await page.locator('#saveMoveDate').tap();
await page.waitForFunction(()=>!document.querySelector('#taskMenu').open);
assert.equal(await page.evaluate(()=>Object.values(store.personalTasks)[0].date),'2026-10-15');
await page.locator('#taskList .task-open').tap();await page.locator('#menuRoutine').tap();
await page.locator('#closeEditor').tap();
assert.equal(await page.evaluate(()=>Object.keys(store.personalTasks).length),1);
await page.locator('#taskList .task-open').tap();await page.locator('#menuRoutine').tap();
await page.locator('#repeatFrequency').selectOption('daily');
await page.evaluate(()=>failWrites=true);await page.locator('#saveTask').tap();
await page.waitForFunction(()=>document.querySelector('#editorError').textContent.includes('Could not save'));
assert.equal(await page.evaluate(()=>Object.keys(store.personalTasks).length),1);
assert.equal(await page.evaluate(()=>Object.keys(store.personalRoutines).length),0);
await page.evaluate(()=>failWrites=false);await page.locator('#saveTask').tap();
await page.waitForFunction(()=>!document.querySelector('#taskEditor').open);
assert.equal(await page.evaluate(()=>Object.keys(store.personalTasks).length),0);
assert.equal(await page.evaluate(()=>Object.keys(store.personalRoutines).length),1);
assert.equal(await page.locator('#taskList .task-check').getAttribute('aria-pressed'),'true');
await page.locator('#taskList .task-open').tap();await page.locator('#menuDate').tap();await page.locator('#moveDate').fill('2026-10-16');await page.locator('#saveMoveDate').tap();
await page.waitForFunction(()=>!document.querySelector('#taskMenu').open);
assert.equal(await page.locator('#taskList .task-item').count(),2);
await page.locator('[data-date="2026-10-15"]').tap();assert.equal(await page.locator('#taskList .task-item').count(),0);
await page.locator('[data-date="2026-10-17"]').tap();assert.equal(await page.locator('#taskList .task-item').count(),1);
await page.locator('#taskList .task-open').tap();await page.locator('#menuDelete').tap();
await page.waitForFunction(()=>!document.querySelector('#taskMenu').open);
assert.equal(await page.locator('#taskList .task-item').count(),0);
await page.locator('#plannerSignOut').tap();assert.equal(await page.locator('#plannerLogin').isVisible(),true);assert.equal(await page.locator('#taskList .task-item').count(),0);assert.equal(await page.locator('#addTask').isDisabled(),true);
assert.deepEqual(errors,[]);console.log(name,'CRUD, date-specific routines, holidays, overflow, failure, account isolation PASS');await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const baseURL=process.env.MOBILE_TEST_URL || 'http://localhost:8000';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.gstatic.com/firebasejs/**',r=>r.fulfill({body:'window.firebase={auth(){},firestore(){}};'}));
 await page.route('**/auth.js',r=>r.fulfill({contentType:'application/javascript',body:`
 window.testFail=false;window.testUser={uid:'fixture'};window.callback=null;
 window.__ledgerAuth={auth:{onAuthStateChanged(cb){window.callback=cb;cb(null)},async signOut(){callback(null)}},
 async signInWithGoogle(){callback(testUser)},db:{collection(){return{doc(){return{collection(name){return{
 async get(){if(testFail)throw Error('offline'); const date=MobileModel.dayKey(new Date());return {docs:(name==='ledgerEntries'?[{date,type:'expense',amount:1505.32},{date,type:'income',amount:0}]:[{date,checkIn:'00:00',checkOut:'23:59'}]).map(data=>({data:()=>data}))}},
 doc(){return{async get(){return{data:()=>({hourlyRate:17})}}}}
 }}}}}}}};` }));
 await page.goto(baseURL + '/mobile/');await page.locator('#preview').click();
 await page.locator('#dashboard').waitFor({state:'visible'});
 assert.deepEqual(await page.locator('#dashboard > section').evaluateAll(nodes=>nodes.map(n=>n.querySelector('h2').textContent)),['Your shifts',"Today's tasks",'Monthly money','Earn it back']);
 assert.equal(await page.locator('#todayTaskList').textContent(),'○Pack lunch for work');
 assert.equal(await page.getByRole('link',{name:'Open todo calendar'}).getAttribute('href'),'planner.html');
 for(const width of [320,375,390,430,768,1440]){
 await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
 const bad=await page.evaluate(()=>[...document.querySelectorAll('.money-row strong,.clock-value,.job,.bottom-nav')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className));assert.deepEqual(bad,[],width+' overflow');
 if(width===390) await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(), 'pocket-paws-390.png'),fullPage:true});
 console.log(width,'responsive PASS');
 }
 await page.locator('#tomorrow').click();assert.match(await page.locator('#jobs').textContent(),/day off/);
 await page.locator('#signIn').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.startsWith('Updated'));
 assert.equal(await page.locator('#sampleBadge').isVisible(),false);
 assert.equal(await page.locator('#spent').textContent(),'$1,505.32');assert.equal(await page.locator('#earned').textContent(),'$0.00');
 await page.evaluate(()=>testFail=true);await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('Could not sync'));
 assert.equal(await page.locator('#spent').textContent(),'$1,505.32');
 await page.locator('#signOut').click();assert.equal(await page.locator('#dashboard').isVisible(),false);assert.equal(await page.locator('#spent').textContent(),'—');
 console.log('Sign-in, data, offline retention, sign-out PASS');
 await page.locator('#preview').click();await page.setViewportSize({width:320,height:900});
 await page.evaluate(()=>{document.querySelectorAll('.job h3').forEach(e=>e.textContent='Long Korean 한국어 이름 https://example.com/'+ 'unbrokentext'.repeat(10));document.querySelector('#spent').textContent='$999,999,999,999.99';document.querySelector('#tip').textContent='Long advice '+ 'averylongword'.repeat(20)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);console.log('Long names, URLs, amounts PASS');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.card').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);await context.close();
 const shell=await browser.newContext();const p=await shell.newPage();await p.route('https://www.gstatic.com/firebasejs/**',r=>r.fulfill({body:''}));await p.route('**/auth.js',r=>r.fulfill({body:''}));
 await p.goto(baseURL + '/mobile/');await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();
 assert.equal(await p.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/mobile/sw.js')),true);
 const manifest=await (await p.request.get(baseURL + '/mobile/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/mobile/');
 await shell.setOffline(true);await p.reload();await p.locator('#preview').click();assert.equal(await p.locator('#sampleBadge').isVisible(),true);
 const cache=await p.evaluate(async()=>{const c=await caches.open('pocket-paws-shell-v2');return(await c.keys()).map(r=>r.url)});assert.ok(cache.every(u=>!u.endsWith('/auth.js')&&!u.includes('firestore')));console.log('Manifest, scoped worker, offline shell, no private cache PASS');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('shared logout used by work, ledger and investments asks before signing out',async()=>{
 for(const page of ['index.html','ledger.html','investments.html']){
  const html=fs.readFileSync(page,'utf8');assert.match(html,/id="logoutBtn"/);assert.match(html,/auth.js/);
 }
 const source=fs.readFileSync('auth.js','utf8');
 for(const confirmed of [false,true]){
  let handler,calls=0,prompts=0;const location={href:'current.html'};
  const context={firebase:{apps:[{}],auth:()=>({signOut:async()=>{calls++;}}),firestore:()=>({})},document:{getElementById:()=>({addEventListener:(_,cb)=>handler=cb})},window:{location,confirm:message=>{prompts++;assert.equal(message,'로그아웃할까요?');return confirmed;}}};
  vm.runInNewContext(source,context);context.window.__ledgerAuth.attachLogoutButton();handler();await Promise.resolve();
  assert.equal(prompts,1);assert.equal(calls,confirmed?1:0);assert.equal(location.href,confirmed?'login.html':'current.html');
 }
});

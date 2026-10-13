const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const core=require('../scriptable/core.js'),pair=require('../scriptable/pairing.js'),encrypt=require('../widget-connection-crypto.js');
const work=require('../widget-data.js'),planner=require('../mobile/planner-model.js'),mobile=require('../mobile/model.js');
test('Scriptable encrypted connection decrypts only with matching key, rejects tampering',async()=>{
 const a=await pair('create'),b=await pair('create');
 const url=await encrypt(a.publicKey,'test-state',{uid:'fixture',refreshToken:'never-a-real-token'});
 const payload=Object.fromEntries(new URLSearchParams(url.split('#')[1]));
 assert.deepEqual(await pair('decrypt',{...payload,privateKey:a.privateKey}),{uid:'fixture',refreshToken:'never-a-real-token'});
 await assert.rejects(pair('decrypt',{...payload,privateKey:b.privateKey}));
 const bytes=Buffer.from(payload.data,'base64');bytes[0]^=1;
 await assert.rejects(pair('decrypt',{...payload,data:bytes.toString('base64'),privateKey:a.privateKey}));
 assert.ok(!url.includes('never-a-real-token'));
});
test('Firestore decode and pagination preserve IDs and detect repeated page tokens',async()=>{
 let n=0;const get=async()=>++n===1?{documents:[{name:'x/a',fields:{title:{stringValue:'Long name'},weekdays:{arrayValue:{values:[{integerValue:'1'}]}},completed:{booleanValue:false}}}],nextPageToken:'next'}:{documents:[{name:'x/b',fields:{amount:{doubleValue:17.5}}}]};
 const rows=await core.list(get,'https://example.test','tasks');assert.equal(rows.length,2);assert.deepEqual(rows[0].weekdays,[1]);assert.equal(rows[1].amount,17.5);
 await assert.rejects(core.list(async()=>({nextPageToken:'again'}),'base','tasks'));
});
test('today summary respects pay rates, task rules, moved occurrences and completion order',()=>{
 const date='2026-10-12';const jobs=core.today(work,planner,date,{iron:{shifts:[{date,checkIn:'11:00',checkOut:'13:00'}],settings:{hourlyRate:17}},booster:{shifts:[{date,checkIn:'14:15',checkOut:'21:15'}],settings:{hourlyRate:15}}},'work');
 assert.deepEqual(jobs.map(j=>j.amount),[34,97.5]);assert.equal(jobs[0].id,'iron');
 const tasks=core.today(work,planner,date,{tasks:[{title:'done',date,completed:true},{title:'tomorrow',date:'2026-10-13'}],routines:[{id:'r',title:'Monthly',frequency:'monthly',monthDays:[11],startDate:'2026-01-01'}],checks:[{routineId:'r',date:'2026-10-11',movedDate:date}]},'todo');
 assert.equal(tasks.length,2);assert.equal(tasks[0].title,'Monthly');
});
const source=fs.readFileSync(require.resolve('../scriptable/Pocket Paws.js'),'utf8');
async function harness(kind,cache=new Map(),failure=false,family='medium'){
 const labels=[],requests=[];let widget;
 class Stack{addText(v){labels.push(v);return{}}addStack(){return new Stack()}addSpacer(){}addImage(){return{}}setPadding(){}centerAlignContent(){}layoutVertically(){}}
 const today=mobile.dayKey(new Date());
 const doc=(id,fields)=>({name:'x/'+id,fields});
 class Request{constructor(url){this.url=url;requests.push(url)}async loadString(){
  if(failure)throw Error('offline');this.response={statusCode:200};
  if(this.url.includes('securetoken'))return JSON.stringify({user_id:'fixture',id_token:'id-token',refresh_token:'rotated'});
  if(this.url.includes('/weeklyWorkMeta/'))return JSON.stringify({fields:{hourlyRate:{integerValue:'15'}}});
  if(this.url.includes('/weeklyWorkShifts'))return JSON.stringify({documents:[doc('shift',{date:{stringValue:today},checkIn:{stringValue:'09:00'},checkOut:{stringValue:'17:00'}})]});
  if(this.url.includes('/personalTasks'))return JSON.stringify({documents:[doc('task',{date:{stringValue:today},title:{stringValue:'Today fixture task'},completed:{booleanValue:false}})]});
  return JSON.stringify({documents:[]});
 }}
 const sandbox={console,Intl,Date,URLSearchParams,TextEncoder,TextDecoder,Map,Set,Request,config:{runsInWidget:true,widgetFamily:family},args:{widgetParameter:kind,queryParameters:{}},
 Keychain:{contains:k=>cache.has(k),get:k=>cache.get(k),set:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)},ListWidget:Stack,Color:class{},Size:class{},LinearGradient:class{},Font:{systemFont(){},boldSystemFont(){}},SFSymbol:{named:()=>({image:{}})},URLScheme:{forRunningScript:()=> 'scriptable://run'},DateFormatter:class{string(){return '12:00 PM'}},Script:{setWidget:w=>widget=w,complete(){}}};
 await vm.runInNewContext('(async()=>{'+source+'})()',sandbox);
 return{labels,requests,widget,cache};
}
test('generated Scriptable entry renders both widgets, rotates tokens, uses same-day offline cache',async()=>{
 const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})]]);
 const w=await harness('work',cache);assert.ok(w.labels.includes('Iron Peak Auto Repair'));assert.ok(w.labels.includes('$112.50'));assert.equal(JSON.parse(cache.get('pocket-paws-v1-account')).refreshToken,'rotated');
 assert.equal(w.widget.url,'https://todo-ledger.web.app/index.html?date=today');
 const t=await harness('todo',cache);assert.ok(t.labels.includes('Today fixture task'));assert.ok(!t.requests.some(u=>u.includes('ledgerEntries')));
 assert.equal(t.widget.url,'https://todo-ledger.web.app/mobile/planner.html?date=today');
 for(const family of ['small','large']){
  assert.ok((await harness('work',cache,false,family)).labels.includes('$112.50'));
  assert.ok((await harness('todo',cache,false,family)).labels.includes('Today fixture task'));
 }
 const offline=await harness('todo',cache,true);assert.ok(offline.labels.some(t=>t.includes('Offline')));
 const stale=JSON.parse(cache.get('pocket-paws-cache-todo'));stale.day='2000-01-01';cache.set('pocket-paws-cache-todo',JSON.stringify(stale));
 assert.ok(!(await harness('todo',cache,true)).labels.includes('Today fixture task'));
 cache.delete('pocket-paws-v1-account');assert.ok((await harness('work',cache)).labels.includes('Connect your account'));
});

test('local WebView crypto bridge returns plain values and completes create/decrypt',async()=>{
 const runtime=fs.readFileSync(require.resolve('../scriptable/runtime.js'),'utf8').split('async function connect(){')[0];
 class WebView {
  async loadHTML(){}
  evaluateJavaScript(code,callback){
   if(!callback)return Promise.resolve(true);
   return new Promise((resolve,reject)=>{
    const result=vm.runInNewContext(code,{crypto:globalThis.crypto,atob,btoa,TextEncoder,TextDecoder,completion:value=>resolve(value)});
    if(result&&typeof result.then==='function')reject(Error('Unsupported WebView return type: Promise'));
   });
  }
 }
 const context=vm.createContext({WebView,pairCrypto:pair});
 vm.runInContext(runtime+'\nglobalThis.callCrypto=cryptoCall;',context);
 const keys=await context.callCrypto('create');
 const url=await encrypt(keys.publicKey,'fixture',{uid:'fixture',refreshToken:'fake-secret'});
 const params=Object.fromEntries(new URLSearchParams(url.split('#')[1]));
 const result=await context.callCrypto('decrypt',{...params,privateKey:keys.privateKey});
 assert.equal(result.uid,'fixture');assert.equal(result.refreshToken,'fake-secret');
 params.data=btoa('invalid');
 await assert.rejects(context.callCrypto('decrypt',{...params,privateKey:keys.privateKey}),/pairing/);
});

test('todo category colors match saved categories, default and legacy palette',()=>{
 const date='2026-10-12';
 const rows=core.today(work,planner,date,{tasks:[{title:'A',date,categoryId:'black'},{title:'B',date,categoryId:'old'},{title:'C',date,categoryId:'deleted'}],routines:[],checks:[],categories:[{id:'black',name:'Work',color:'#202127'},{id:'old',name:'Home',color:'#8050ad'},{id:'__daily__',name:'일상',color:'#53bca5'}]},'todo');
 assert.deepEqual(rows.map(r=>r.categoryColor),['#202127','#a18ae5','#53bca5']);
});
test('todo widgets show 4, 8 and 18 items with overflow count',async()=>{
 const rows=Array.from({length:22},(_,i)=>({title:'Long task 한국어 '+i,completed:false,categoryColor:'#202127'}));
 const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})],['pocket-paws-cache-todo',JSON.stringify({uid:'fixture',day:mobile.dayKey(new Date()),rows,total:22,updated:Date.now()})]]);
 for(const [size,count] of [['small',4],['medium',8],['large',18]]){
  const result=await harness('todo',cache,true,size);
  assert.equal(result.labels.filter(s=>s.startsWith('Long task')).length,count);
  assert.ok(result.labels.includes('+'+(22-count)+' more · Open planner'));
 }
});

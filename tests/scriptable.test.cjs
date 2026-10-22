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
async function harness(kind,cache=new Map(),failure=false,family='medium',now=null){
 const labels=[],requests=[],images=[];let widget;
 class Stack{addText(v){labels.push(v);return{}}addStack(){return new Stack()}addSpacer(){}addImage(){const image={applyFittingContentMode(){}};images.push(image);return image}setPadding(){}centerAlignContent(){}layoutVertically(){}}
 const Clock=now?class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return +new Date(now);}}:Date;
 const today=mobile.dayKey(new Clock());
 const doc=(id,fields)=>({name:'x/'+id,fields});
 class Request{constructor(url){this.url=url;requests.push(url)}async loadString(){
  if(failure)throw Error('offline');this.response={statusCode:200};
  if(this.url.includes('securetoken'))return JSON.stringify({user_id:'fixture',id_token:'id-token',refresh_token:'rotated'});
  if(this.url.includes('/weeklyWorkMeta/'))return JSON.stringify({fields:{hourlyRate:{integerValue:'15'}}});
  if(this.url.includes('/weeklyWorkShifts'))return JSON.stringify({documents:[doc('shift',{date:{stringValue:today},checkIn:{stringValue:'09:00'},checkOut:{stringValue:'17:00'}})]});
  if(this.url.includes('/personalTasks'))return JSON.stringify({documents:[doc('task',{date:{stringValue:today},title:{stringValue:'Today fixture task'},completed:{booleanValue:false}})]});
  return JSON.stringify({documents:[]});
 }}
 const sandbox={console,Intl,Date:Clock,URLSearchParams,TextEncoder,TextDecoder,Map,Set,Request,config:{runsInWidget:true,widgetFamily:family},args:{widgetParameter:kind,queryParameters:{}},
 Keychain:{contains:k=>cache.has(k),get:k=>cache.get(k),set:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)},ListWidget:Stack,DrawContext:class{setTextAlignedCenter(){}setTextAlignedLeft(){}setTextColor(){}setFont(){}drawTextInRect(v){labels.push(v)}setFillColor(){}fillRect(){}fillEllipse(){}getImage(){return{}}},Rect:class{},Color:class{},Size:class{constructor(width,height){Object.assign(this,{width,height})}},LinearGradient:class{},Font:{systemFont(){},boldSystemFont(){}},SFSymbol:{named:()=>({image:{}})},URLScheme:{forRunningScript:()=> 'scriptable://run'},DateFormatter:class{string(){return '12:00 PM'}},Script:{setWidget:w=>widget=w,complete(){}}};
 await vm.runInNewContext('(async()=>{'+source+'})()',sandbox);
 return{labels,requests,widget,cache,images};
}
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
test('monthly calendar covers leap years and Monday-first four/five/six week grids',()=>{
 const data={iron:{shifts:[],settings:{}},booster:{shifts:[],settings:{}},tasks:[],routines:[],checks:[]};
 for(const [date,count,weeks,offset] of [['2021-02-01',28,4,0],['2024-02-01',29,5,3],['2026-08-01',31,6,5],['2026-10-16',31,5,3]]){
  const calendar=core.month(work,planner,date,data);
  assert.equal(calendar.days.length,count);assert.equal(calendar.weeks,weeks);assert.equal(calendar.offset,offset);
 }
 data.iron.shifts=[{date:'2026-10-16',checkIn:'11:00',checkOut:'13:00'}];
 data.booster.shifts=[{date:'2026-10-16',checkIn:'14:15',checkOut:'21:15'}];
 data.tasks=Array.from({length:12},(_,i)=>({title:'Long 한국어 '+i,date:'2026-10-16',categoryId:'pink',completed:i===0}));
 data.categories=[{id:'pink',color:'#ee8194',name:'Personal'}];
 data.routines=[{id:'r',title:'Monthly last day',frequency:'monthly',lastDay:true,startDate:'2026-01-01'}];
 const calendar=core.month(work,planner,'2026-10-16',data),day=calendar.days[15];
 assert.equal(day.total,14);assert.equal(day.entries.length,8);
 assert.deepEqual(day.entries.slice(0,2).map(e=>e.title),['11a–1p','2:15–9:15p']);
 assert.equal(day.entries[2].color,'#ee8194');assert.equal(calendar.days[30].total,1);
});
test('separate calendars fetch only their own data and use isolated caches',async()=>{
 for(const kind of ['todo-month','work-week']){
  const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})]]);
  const family=kind.endsWith('week')?'medium':'large';
  const result=await harness(kind,cache,false,family);
  const isWork=kind.startsWith('work');
  assert.equal(result.requests.some(u=>u.includes('weeklyWorkShifts')),isWork);
  assert.equal(result.requests.some(u=>u.includes('personalTasks')),!isWork);
  const snapshot=JSON.parse(cache.get('pocket-paws-cache-'+kind));
  assert.ok(snapshot.calendar.days.every(d=>d.entries.every(e=>e.kind===(isWork?'work':'todo'))));
  if(kind.endsWith('week')){assert.equal(snapshot.calendar.days.length,7);assert.equal(snapshot.calendar.days[3].date,snapshot.day);}
  const offline=await harness(kind,cache,true,family);assert.ok(offline.widget);
  assert.equal(result.widget.url,'https://todo-ledger.web.app/'+(isWork?'index.html':'mobile/planner.html')+'?date=today');
 }
 const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})]]);
 await harness('month',cache,false,'large');assert.ok(cache.has('pocket-paws-cache-todo-month'));
});
test('weekly ranges cross month/year boundaries and preserve category colors',()=>{
 const data={tasks:[{date:'2026-12-31',title:'Long task 한국어',categoryId:'pink'}],routines:[],checks:[],categories:[{id:'pink',color:'#ee8194'}]};
 const calendar=core.month(work,planner,'2027-01-01',data,'todo','week');
 assert.equal(calendar.days[0].date,'2026-12-29');assert.equal(calendar.days[6].date,'2027-01-04');
 assert.equal(calendar.days[2].entries[0].color,'#ee8194');
});

test('reference calendars stay within canvas at compact and large iPhone sizes',()=>{
 const code=fs.readFileSync(require.resolve('../scriptable/calendar.js'),'utf8');
 for(const [kind,period,width,height] of [['todo','month',276,293],['todo','month',348,364],['work','week',276,128],['work','week',348,164],['todo','week',276,128],['todo','week',348,164]]){
  const rects=[],labels=[];
  class Rect{constructor(x,y,w,h){Object.assign(this,{x,y,w,h});}}
  class DrawContext{setTextAlignedCenter(){}setTextAlignedLeft(){}setTextColor(){}setFont(){}setFillColor(){}fillRect(r){rects.push(r)}fillEllipse(r){rects.push(r)}drawTextInRect(s,r){labels.push(s);rects.push(r)}getImage(){return{}}}
  const context={module:{exports:{}},DrawContext,Rect,Size:class{},Color:class{},Font:{boldSystemFont(){},systemFont(){}}};
  vm.runInNewContext(code,context);
  const count=period==='week'?7:31;
  const days=Array.from({length:count},(_,i)=>({date:'2026-08-'+String(i+1).padStart(2,'0'),total:8,entries:Array.from({length:8},()=>({title:kind==='work'?'2:15–9:15p':'아주 긴 할일 제목 LongTitleWithoutSpaces',kind,color:'#8052ae',completed:false}))}));
  context.module.exports({day:'2026-08-17',calendar:{kind,period,days,offset:5,weeks:6}},width,height);
  for(const r of rects){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=width+.01&&r.y+r.h<=height+.01,JSON.stringify({kind,period,r,width,height}));}
  if(period==='week'){assert.ok(labels.includes('8월 17일'));assert.ok(labels.includes('월'));}assert.ok(labels.some(s=>s.startsWith('+')));
  if(period==='week'&&kind==='work'){assert.ok(labels.includes('2:15p'));assert.ok(labels.includes('9:15p'));}
 }
});


test('monthly titles show at least five Korean characters at the same font size, centered even on narrow phones',()=>{
 const code=fs.readFileSync(require.resolve('../scriptable/calendar.js'),'utf8');
 for(const width of [276,288,325,334,360]){
  const labels=[];let alignment='left',size=0;
  class DrawContext{
   setTextAlignedCenter(){alignment='center'}setTextAlignedLeft(){alignment='left'}
   setFont(font){size=font}setTextColor(){}setFillColor(){}fillRect(){}fillEllipse(){}
   drawTextInRect(value,rect){labels.push({value,rect,size,alignment})}getImage(){return{}}
  }
  const context={module:{exports:{}},DrawContext,Rect:class{constructor(x,y,w,h){Object.assign(this,{x,y,w,h})}},Size:class{},Color:class{},Font:{boldSystemFont:size=>size,systemFont:size=>size}};
  vm.runInNewContext(code,context);
  const title='영양제챙겨먹기';
  context.module.exports({day:'2026-08-01',calendar:{period:'month',kind:'todo',offset:5,weeks:6,
   days:[{date:'2026-08-01',total:1,entries:[{title,kind:'todo',color:'#53bca5',completed:false}]}]}},width,293);
  const lines=labels.filter(label=>label.size===9),visible=lines.map(line=>line.value).join('');
  assert.ok(visible.length>=5&&title.startsWith(visible),JSON.stringify({width,visible}));
  assert.ok(labels.every(label=>label.alignment==='center'));
  for(const line of lines)assert.ok(line.value.length*9<=line.rect.w+.01,'characters fit without font scaling');
  if(width>=325)assert.equal(lines.length,1);
  else assert.equal(lines.length,2);
 }
});

test('monthly label clipping keeps emoji sequences intact, including on older Scriptable engines',()=>{
 const code=fs.readFileSync(require.resolve('../scriptable/calendar.js'),'utf8');
 const helper=code.slice(code.indexOf('    function titleChars('),code.indexOf('    function eventInk('));
 for(const intl of [Intl,{}]){
  const parts=vm.runInNewContext(helper+';titleChars(input)',{Intl:intl,input:'🧺👩🏽‍💻🇨🇦1️⃣'});
  assert.deepEqual(Array.from(parts),['🧺','👩🏽‍💻','🇨🇦','1️⃣']);
 }
});

test('only monthly todo and centered work week remain; removed modes do not fetch',async()=>{
 for(const kind of ['work','todo','work-month','todo-week','unknown','todo-month','work-week']){
  const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})]]);
  const family=kind==='todo-month'?'large':'medium';
  const result=await harness(kind,cache,false,family);
  if(!['todo-month','work-week'].includes(kind)){
   assert.ok(result.labels.includes('Widget removed'));assert.equal(result.requests.length,0);continue;
  }
  assert.equal(result.images.at(-1).imageSize.width,kind==='todo-month'?334:326);
  assert.equal(result.images.at(-1).imageSize.height,kind==='todo-month'?323:144);
  assert.ok(Math.abs(result.widget.refreshAfterDate-core.nextRefresh(mobile))<1000);
  const offline=await harness(kind,cache,true,family);assert.ok(offline.labels.some(t=>t.includes('Offline')));
  const wrong=await harness(kind,cache,false,'small');assert.ok(wrong.labels.includes('Widget size'));
 }
});
test('rolling work week puts today in the fourth column, advancing one day at a time',()=>{
 const data={iron:{shifts:[],settings:{}},booster:{shifts:[],settings:{}}};
 for(const date of ['2026-10-17','2026-10-18','2027-01-01','2028-03-01']){
  const result=core.month(work,planner,date,data,'work','week');
  assert.equal(result.days[3].date,date);
  for(let i=1;i<7;i++)assert.equal(new Date(result.days[i].date)-new Date(result.days[i-1].date),86400000);
 }
 const result=core.month(work,planner,'2026-10-17',data,'work','week');
 assert.deepEqual(result.days.map(d=>new Date(d.date+'T12:00:00Z').getUTCDay()),[3,4,5,6,0,1,2]);
});

test('refresh requests respect Edmonton midnight and summer/winter time',()=>{
 for(const [before,after] of [
  ['2026-10-18T05:59:50Z','2026-10-18T06:00:01Z'],
  ['2026-12-18T06:59:50Z','2026-12-18T07:00:01Z'],
  ['2026-03-09T05:59:50Z','2026-03-09T06:00:01Z'],
  ['2026-11-02T06:59:50Z','2026-11-02T07:00:01Z']
 ])assert.equal(core.nextRefresh(mobile,new Date(before)).toISOString(),new Date(after).toISOString());
 assert.equal(core.nextRefresh(mobile,new Date('2026-10-18T06:01:00Z')).toISOString(),'2026-10-18T06:06:00.000Z');
});
test('generated work widget changes the centered date after Edmonton midnight',async()=>{
 const cache=new Map([['pocket-paws-v1-account',JSON.stringify({uid:'fixture',refreshToken:'token',connectionID:'same'})]]);
 await harness('work-week',cache,false,'medium','2026-10-18T05:59:50Z');
 const previous=JSON.parse(cache.get('pocket-paws-cache-work-week'));
 assert.equal(previous.day,'2026-10-17');assert.equal(previous.calendar.days[3].date,'2026-10-17');
 const offline=await harness('work-week',cache,true,'medium','2026-10-18T06:00:10Z');
 assert.ok(offline.labels.includes('Unable to sync'));assert.ok(!offline.labels.includes('10월 17일'));
 const fresh=await harness('work-week',cache,false,'medium','2026-10-18T06:00:10Z');
 const next=JSON.parse(cache.get('pocket-paws-cache-work-week'));
 assert.equal(next.day,'2026-10-18');assert.equal(next.calendar.days[3].date,'2026-10-18');
 assert.ok(fresh.labels.includes('10월 18일'));
});

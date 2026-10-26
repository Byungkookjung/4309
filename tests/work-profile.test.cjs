const {test}=require('node:test'),assert=require('node:assert/strict');
const profile=require('../work-profile.js'),core=require('../scriptable/core.js'),work=require('../widget-data.js'),planner=require('../mobile/planner-model.js');
const custom=(id,name)=>({id:'job_'+id,suffix:'Job_'+id,name,tips:false,color:'#367aa0'});
function owner(records={},fail=false){return {collection(name){return {doc(id){return {async get(){if(fail)throw Error('offline');return {exists:Object.hasOwn(records,name+'/'+id),data:()=>records[name+'/'+id]};}}},limit(){return {async get(){if(fail)throw Error('offline');const docs=records[name]||[];return {empty:!docs.length,docs};}}}}}};}
test('new accounts require setup; existing settings, shifts or payouts preserve both legacy workplaces without writes',async()=>{
 assert.equal(await profile.load(owner()),null);
 for(const records of [{'weeklyWorkMeta/settings':{hourlyRate:22}},{weeklyWorkShiftsIronPeak:[{}]},{weeklyWorkPayouts:[{}]}]){
  assert.deepEqual((await profile.load(owner(records))).jobs,profile.legacy);
 }
 await assert.rejects(profile.load(owner({},true)),/offline/);
});
test('custom workplaces are validated, keep stable collection suffixes, and override legacy defaults',async()=>{
 const value={version:1,jobs:[custom('a','Cafe'),custom('b','Shop'),custom('c','Office')]};
 assert.deepEqual(await profile.load(owner({'weeklyWorkMeta/jobs':value})),value);
 for(const jobs of [[],[custom('a','')],[custom('a','Cafe'),custom('a','Other')],[{...custom('a','Cafe'),suffix:'IronPeak'}],[{...custom('a','Cafe'),id:'../a'}]])assert.throws(()=>profile.validate({version:1,jobs}));
});
test('configured workplace names, rates and colors flow into snapshots and rolling work calendars',()=>{
 const date='2026-10-25',defs=[custom('a','Cafe'),custom('b','Shop'),custom('c','Office')];
 const data={workDefinitions:defs,...Object.fromEntries(defs.map((def,i)=>[def.id,{settings:{hourlyRate:20+i},shifts:[{date,checkIn:'09:00',checkOut:'11:00'}]}]))};
 const rows=core.today(work,planner,date,data,'work');assert.deepEqual(rows.map(row=>row.name),['Cafe','Shop','Office']);assert.deepEqual(rows.map(row=>row.amount),[40,42,44]);
 const day=core.month(work,planner,date,data,'work','week').days.find(day=>day.date===date);assert.equal(day.total,3);assert.ok(day.entries.every(entry=>entry.color==='#367aa0'));
 assert.equal(work.buildSnapshot(data,new Date(date+'T12:00:00')).days[1].jobs.length,3);
});

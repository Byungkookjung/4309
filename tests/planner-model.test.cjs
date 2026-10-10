const {test}=require('node:test');const assert=require('node:assert/strict');const model=require('../mobile/planner-model.js');
test('Alberta holidays match official 2026-2028 dates and optional distinction',()=>{
 const dates={2026:['2026-02-16','2026-04-03','2026-05-18','2026-09-07','2026-10-12'],2027:['2027-02-15','2027-03-26','2027-05-24','2027-09-06','2027-10-11'],2028:['2028-02-21','2028-04-14','2028-05-22','2028-09-04','2028-10-09']};
 for(const [year,expected] of Object.entries(dates)){const rows=model.holidays(+year);assert.equal(rows.filter(r=>!r.optional).length,9);assert.equal(rows.filter(r=>r.optional).length,4);for(const date of expected)assert.ok(rows.some(r=>r.date===date&&!r.optional));assert.equal(rows.find(r=>r.name==='National Day for Truth and Reconciliation').optional,true);}
 assert.equal(model.holidays(2029).find(r=>r.name==='Canada Day').date,'2029-07-02');
 assert.equal(model.holidays(2027).find(r=>r.name==='Christmas Day').date,'2027-12-25');
});
test('routines repeat only from their start, by weekday, with date-specific completion',()=>{
 const routine={id:'r1',title:'Read',startDate:'2026-10-05',weekdays:[1,3]};
 assert.equal(model.occurs(routine,'2026-09-28'),false);assert.equal(model.occurs(routine,'2026-10-05'),true);assert.equal(model.occurs(routine,'2026-10-06'),false);
 const checks=[{routineId:'r1',date:'2026-10-05',completed:true}];
 assert.equal(model.dayItems([], [routine],checks,'2026-10-05')[0].completed,true);assert.equal(model.dayItems([], [routine],checks,'2026-10-07')[0].completed,false);
 assert.equal(model.dayItems([{id:'t',date:'2026-10-05',title:'Task'}],[],checks,'2026-10-05').length,1);
 assert.equal(model.validDate('2026-02-30'),false);assert.equal(model.validDate('2028-02-29'),true);
});

test('repeat periods support daily, two-week cycles, month end, leap years and inclusive end dates',()=>{
 const base={id:'r',startDate:'2026-10-09',weekdays:[5]};
 assert.equal(model.occurs({...base,frequency:'daily'},'2026-10-10'),true);
 assert.equal(model.occurs({...base,frequency:'daily'},'2026-10-08'),false);
 for(const [date,expected] of [['2026-10-09',true],['2026-10-16',false],['2026-10-23',true],['2026-11-06',true]])
  assert.equal(model.occurs({...base,frequency:'biweekly'},date),expected,date);
 const monthly={...base,frequency:'monthly',monthDays:[31]};
 assert.equal(model.occurs(monthly,'2026-10-31'),true);
 assert.equal(model.occurs(monthly,'2026-11-30'),false);
 assert.equal(model.occurs({...monthly,lastDay:true},'2026-11-30'),true);
 assert.equal(model.occurs({...monthly,lastDay:true},'2028-02-29'),true);
 assert.equal(model.occurs({...base,frequency:'daily',endDate:'2026-10-10'},'2026-10-10'),true);
 assert.equal(model.occurs({...base,frequency:'daily',endDate:'2026-10-10'},'2026-10-11'),false);
 const yearly={startDate:'2024-02-29',frequency:'yearly'};
 assert.equal(model.occurs(yearly,'2025-02-28'),false);
 assert.equal(model.occurs(yearly,'2028-02-29'),true);
});

test('moving a routine occurrence preserves its identity and other dates',()=>{
 const routine={id:'r',title:'Daily',startDate:'2026-10-01',frequency:'daily'};
 const checks=[{routineId:'r',date:'2026-10-09',movedDate:'2026-10-10',completed:true}];
 assert.equal(model.dayItems([], [routine],checks,'2026-10-09').length,0);
 const next=model.dayItems([], [routine],checks,'2026-10-10');
 assert.equal(next.length,2);
 assert.equal(next.find(t=>t.occurrenceDate==='2026-10-09').completed,true);
 assert.equal(model.dayItems([], [routine],checks,'2026-10-11').length,1);
});

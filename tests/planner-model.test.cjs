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

test('repeat edits preserve completed history and replace pending schedules from the edit day',()=>{
 const original={id:'r',title:'Laundry',startDate:'2026-10-01',frequency:'weekly',weekdays:[1]};
 const checks=[{routineId:'r',date:'2026-10-05',completed:true},{routineId:'r',date:'2026-10-12',completed:false},
 {routineId:'r',date:'2026-10-26',completed:true}];
 const edited=model.editRoutine(original,{...original,weekdays:[4]},'2026-10-19');
 assert.equal(edited.scheduleFrom,'2026-10-19');
 for(const date of ['2026-10-05','2026-10-26'])assert.equal(model.dayItems([], [edited],checks,date)[0].completed,true);
 for(const date of ['2026-10-08','2026-10-12','2026-10-15','2026-10-19'])assert.equal(model.dayItems([], [edited],checks,date).length,0,date);
 assert.equal(model.dayItems([], [edited],checks,'2026-10-22')[0].completed,false);
 const monthly=model.editRoutine(edited,{...edited,frequency:'monthly',monthDays:[31]},'2026-10-23');
 assert.equal(model.dayItems([], [monthly],checks,'2026-10-05')[0].completed,true);
 assert.equal(model.dayItems([], [monthly],checks,'2026-10-22').length,0);
 assert.equal(model.dayItems([], [monthly],checks,'2026-10-29').length,0);
 assert.equal(model.dayItems([], [monthly],checks,'2026-10-31').length,1);
});
test('moved completed history survives edits but obsolete pending moves do not',()=>{
 const old={id:'r',title:'Read',startDate:'2026-10-01',frequency:'daily'};
 const edited=model.editRoutine(old,{...old,frequency:'weekly',weekdays:[4]},'2026-10-19');
 const checks=[{routineId:'r',date:'2026-10-05',movedDate:'2026-10-06',completed:true},
 {routineId:'r',date:'2026-10-12',movedDate:'2026-10-20',completed:false}];
 assert.equal(model.dayItems([], [edited],checks,'2026-10-05').length,0);
 assert.equal(model.dayItems([], [edited],checks,'2026-10-06')[0].occurrenceDate,'2026-10-05');
 assert.equal(model.dayItems([], [edited],checks,'2026-10-20').length,0);
 checks.push({routineId:'r',date:'2026-10-22',movedDate:'2026-10-23',scheduleVersion:1,completed:false});
 assert.equal(model.dayItems([], [edited],checks,'2026-10-22').length,0);
 assert.equal(model.dayItems([], [edited],checks,'2026-10-23').length,1);
});
test('title-only edits retain schedule metadata; completion is not duplicated on matching dates',()=>{
 const old={id:'r',title:'Read',startDate:'2026-10-01',frequency:'weekly',weekdays:[1,4],scheduleFrom:'2026-10-12',scheduleVersion:2};
 const next=model.editRoutine(old,{...old,title:'Read more',weekdays:[4,1],monthDays:[31]},'2026-10-19');
 assert.equal(next.scheduleFrom,'2026-10-12');assert.equal(next.scheduleVersion,2);
 const checks=[{routineId:'r',date:'2026-10-19',completed:true}];
 assert.equal(model.dayItems([], [next],checks,'2026-10-19').length,1);
});

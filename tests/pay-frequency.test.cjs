const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
function schedule(raw,reference,offset=0){
 const Clock=class extends Date{constructor(...args){super(...(args.length?args:[reference+'T12:00:00']));}};
 const context=vm.createContext({Date:Clock,activeJobId:'job_custom',raw,offset});
 for(const name of ['normalizeSettings','parseISODate','getPayPeriodAnchor','getPayPeriodStart','getPayPeriodDates','getBlockPayoutDate','isoDate','addDays']){
  const start=source.indexOf(`function ${name}(`),end=source.indexOf('\n}\n',start)+2;vm.runInContext(source.slice(start,end),context);
 }
 return JSON.parse(vm.runInContext(`const settings=normalizeSettings(raw),dates=getPayPeriodDates(offset);JSON.stringify({count:dates.length,start:isoDate(dates[0]),end:isoDate(dates.at(-1)),payday:getBlockPayoutDate(dates),frequency:settings.payFrequency});`,context));
}
test('monthly periods include all days, with month-end and clamped numbered paydays',()=>{
 for(const [date,count,end] of [['2026-02-15',28,'2026-02-28'],['2028-02-29',29,'2028-02-29'],['2026-04-15',30,'2026-04-30'],['2026-10-25',31,'2026-10-31']]){
  for(const payday of ['last','31'])assert.deepEqual(schedule({payFrequency:'monthly',monthlyPayDay:payday},date),{count,start:date.slice(0,7)+'-01',end,payday:end,frequency:'monthly'});
 }
});
test('monthly numbered paydays and following-month paydays cross years and DST correctly',()=>{
 assert.equal(schedule({payFrequency:'monthly',monthlyPayDay:'15'},'2026-10-25').payday,'2026-10-15');
 assert.equal(schedule({payFrequency:'monthly',monthlyPayDay:'last',monthlyPayMonth:1},'2026-12-25').payday,'2027-01-31');
 assert.equal(schedule({payFrequency:'monthly',monthlyPayDay:'31',monthlyPayMonth:1},'2028-01-25').payday,'2028-02-29');
 assert.deepEqual(schedule({payFrequency:'monthly',monthlyPayDay:'last'},'2026-03-10',-1),{count:28,start:'2026-02-01',end:'2026-02-28',payday:'2026-02-28',frequency:'monthly'});
 assert.equal(schedule({payFrequency:'monthly',monthlyPayDay:'last'},'2026-12-25',1).end,'2027-01-31');
});
test('settings without a pay frequency retain the old biweekly schedule',()=>{
 assert.deepEqual(schedule({periodAnchor:'2026-10-05',payoutDelay:5},'2026-10-10'),{count:14,start:'2026-10-05',end:'2026-10-18',payday:'2026-10-23',frequency:'biweekly'});
});

const {test}=require('node:test'),assert=require('node:assert/strict'),model=require('../mobile/budget-summary.js');
const now=new Date('2026-11-06T18:00:00Z');
const entry=(sourceType,amount,rest={})=>({date:'2026-11-05',type:'expense',sourceType,amount,...rest});
test('monthly budget totals use active EE children, fixed plans, shared cents and uncategorized history once',()=>{
 const plans=[{type:'fixed',amount:900},{type:'expected',amount:999,subcategories:[{id:'a',label:'Food',amount:400},{id:'old',label:'Old',amount:80,archived:true},{id:'gone',label:'Deleted',amount:50,deleted:true}]},{type:'expected',amount:50},{type:'expected',amount:700,deleted:true},{type:'income',amount:5000}];
 const result=model.summarize(plans,[entry('fixed',900),entry('expected',100,{subcategoryId:'a'}),entry('expected',60,{isShared:true}),entry('expected',.03,{isShared:true}),entry('expected',10,{linkedPlanItemId:'deleted'}),entry('custom',100),entry('income',100,{type:'income'})],now);
 assert.equal(result.budget,1350);assert.equal(result.spent,1040.01);assert.equal(result.remaining,309.99);assert.equal(result.groups[1].budget,450);assert.equal(result.groups[1].spent,140.01);
});
test('selected month uses Edmonton date and excludes future days, other months, income and invalid amounts',()=>{
 const result=model.summarize([], [entry('expected',10),entry('fixed',20,{date:'2026-11-07'}),entry('fixed',20,{date:'2026-10-31'}),entry('fixed',20,{date:'2026-12-01'}),entry('fixed',20,{date:'2026-11-99'}),entry('fixed',NaN),entry('fixed',-1)],now);
 assert.equal(result.month,'2026-11');assert.equal(result.spent,10);assert.equal(result.remaining,-10);assert.equal(result.ratio,1);
 assert.equal(model.summarize([],[],new Date('2026-12-01T01:00:00Z')).month,'2026-11');
});
test('empty budgets, exact budget, and over budget have finite bounded progress',()=>{
 assert.equal(model.summarize([],[],now).ratio,0);
 for(const amount of [100,150]){const result=model.summarize([{type:'fixed',amount:100}],[entry('fixed',amount)],now);assert.equal(result.ratio,1);assert.equal(result.remaining,100-amount);}
 assert.throws(()=>model.summarize([{type:'fixed',amount:-1}],[],now),/Invalid budget/);
});

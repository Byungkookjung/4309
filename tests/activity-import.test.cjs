const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),EE=require('../ee-model.js');
const code=fs.readFileSync(require.resolve('../ledger.js'),'utf8');
function fixture(extra=[]){
 const plans=[{id:'g',type:'expected',label:'장보기',amount:500,subcategories:[{id:'food',label:'식료품·마트',amount:460},{id:'snack',label:'편의점·간식',amount:40},{id:'old',label:'삭제 분류',amount:10,deleted:true},{id:'archived',label:'이전 분류',amount:10,archived:true}]},
 {id:'shop',type:'expected',label:'개인쇼핑',amount:100,subcategories:[{id:'beauty',label:'뷰티·화장품',amount:100}]},
 {id:'space',type:'expected',label:'Food (weekly)',amount:20,subcategories:[{id:'multi',label:'Coffee & snacks',amount:20}]},
 {id:'deleted',type:'expected',label:'Deleted parent',amount:0,deleted:true},
 {id:'rent',type:'fixed',label:'Rent',amount:900},{id:'salary',type:'income',label:'Second job',amount:1000},...extra];
 const NativeDate=Date,FixedDate=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-06T18:00:00Z']));}static now(){return +new NativeDate('2026-11-06T18:00:00Z');}};
 const sandbox={Date:FixedDate,Math,ExpectedBudget:EE,PLAN_TYPES:{fixed:'fixed',expected:'expected',income:'income',unexpectedIncome:'unexpected_income'},getPlanItemsByType:type=>plans.filter(row=>row.type===type&&!row.deleted),isFutureLedgerDate:date=>date>'2026-11-06'};
 vm.runInNewContext(code.slice(code.indexOf('function parseActivityImportDateLine'),code.indexOf('function setActivityImportStatus')),sandbox);
 return text=>JSON.parse(JSON.stringify(sandbox.parseActivityImportText(text)));
}
test('explicit EE parent/child path saves IDs and canonical names, not merchant guesses',()=>{
 const parse=fixture(),[entry]=parse('11/5/2026\n- 25 EE 장보기 > 식료품·마트 | 우유, 계란');
 assert.deepEqual([entry.linkedPlanItemId,entry.linkedPlanItemLabel,entry.subcategoryId,entry.subcategoryLabel,entry.reason,entry.detail,entry.amount],['g','장보기','food','식료품·마트','장보기','우유, 계란',25]);
 assert.equal(entry.isShared,false);assert.equal(entry.date,'2026-11-05');
 const [legacy]=parse('11/5\n- 25 EE 장보기 식료품·마트 우유');assert.equal(legacy.subcategoryId,undefined);assert.equal(legacy.detail,'식료품·마트 우유');
});
test('new delimiters support optional spaces/detail, multiword labels, aliases and literal detail symbols',()=>{
 const parse=fixture();
 assert.equal(parse('11/5\n- 1 EE 장보기>편의점·간식')[0].detail,'');
 assert.equal(parse('11/5\n- 1 EE 쇼핑 > 뷰티·화장품 | cream')[0].linkedPlanItemId,'shop');
 const [entry]=parse('11/5\n- 1 EE Food (weekly) > coffee  & SNACKS | price > 2 | extra');
 assert.equal(entry.subcategoryId,'multi');assert.equal(entry.subcategoryLabel,'Coffee & snacks');assert.equal(entry.detail,'price > 2 | extra');
 assert.equal(parse('11/5\n- 1 EE 장보기 기타 > 비교 | 메모')[0].detail,'기타 > 비교 | 메모');
 assert.equal(parse('11/5\n- 1 EE 장보기 | 기타 구매')[0].subcategoryId,undefined);
});
test('FE/EI/UI/CE keep legacy syntax and allow explicit detail separators without inventing children',()=>{
 const entries=fixture()('11/5\n- 900 FE Rent | November\n+ 100 EI Second   job | bonus\n+ 50 UI Birthday gift | From family\n- 5 CE coffee shop | morning');
 assert.deepEqual(entries.map(row=>[row.sourceType,row.reason,row.detail]),[['fixed','Rent','November'],['income','Second job','bonus'],['unexpected_income','Birthday gift','From family'],['custom','coffee shop','morning']]);
 assert.ok(entries.every(row=>row.subcategoryId===undefined));
 assert.equal(fixture()('11/5\n+ 100 EI Second job bonus')[0].detail,'bonus');
});
test('unknown, wrong-parent, deleted and archived children fail with the exact line',()=>{
 for(const child of ['Unknown','뷰티·화장품','삭제 분류','이전 분류']){
  try{fixture()(`11/5\n- 1 EE 장보기 > ${child} | detail`);assert.fail('must reject');}
  catch(error){assert.match(error.message,/Line 2:.*하위 분류/);assert.equal(error.importLine.number,2);assert.ok(error.importLine.text.includes(child));}
 }
 assert.throws(()=>fixture()('11/5\n- 1 EE Deleted parent > x | text'),/does not match/);
});
test('ambiguous children and malformed paths fail closed instead of silently using unclassified',()=>{
 const parse=fixture([{id:'dup',type:'expected',label:'Duplicate',amount:3,subcategories:[{id:'a',label:'Two words',amount:1},{id:'b',label:'Two  words',amount:2}]}]);
 assert.throws(()=>parse('11/5\n- 1 EE Duplicate > two words | detail'),/중복/);
 for(const line of ['- 1 EE 장보기 > | detail','- 1 EE 장보기 > 식료품·마트 > other | detail','- 1 FE Rent > child | detail','+ 1 EI Second job > child | detail'])assert.throws(()=>parse('11/5\n'+line),/Line 2:/);
 assert.throws(()=>parse('11/5\n- 1 EE 장보기 > 식료품·마트 extra words'),/상세 내용 앞에는/);
});
test('existing date, sign and all-or-nothing validation still applies to subcategory TXT',()=>{
 const parse=fixture();assert.throws(()=>parse('11/7/2026\n- 1 EE 장보기 > 식료품·마트'),/future/);
 assert.throws(()=>parse('11/5\n+ 1 EE 장보기 > 식료품·마트'),/expense rows/);
 assert.throws(()=>parse('11/5\n- 1 EE 장보기 > 식료품·마트\n- 2 EE 장보기 > Unknown'),/Line 3:/);
});

const {test}=require('node:test'),assert=require('node:assert/strict'),EE=require('../ee-model.js'),Export=require('../ee-export.js');
const plans=()=>EE.applyTemplate([]);
const entry=(parent,amount,child='',extra={})=>({id:'e',date:'2026-11-01',type:'expense',sourceType:'expected',linkedPlanItemId:parent.id,reason:parent.label,amount,subcategoryId:child,...extra});
test('hierarchical EE parents cannot be deleted, including empty and archived-only children',()=>{
 const parent=plans()[0];
 for(const subcategories of [parent.subcategories,[],parent.subcategories.map(child=>({...child,archived:true}))]){
  assert.match(EE.deletionBlockReason({...parent,subcategories},[],[parent]),/cannot be deleted/);
 }
 const flat={id:'old',type:'expected',label:'쇼핑',amount:450};
 for(const record of [entry(flat,1),{type:'expense',sourceType:'expected',reason:'개인쇼핑',amount:1}])assert.match(EE.deletionBlockReason(flat,[record],[flat]),/historical/);
 assert.equal(EE.deletionBlockReason(flat,[],[flat]),'');
 for(const type of ['fixed','income','unexpected_income']){
  assert.match(EE.deletionBlockReason({...flat,type},[entry(flat,1)],[flat]),/historical/);
  assert.equal(EE.deletionBlockReason({...flat,type},[],[flat]),'');
 }
});
test('template has the exact six parents, eighteen defaults and CAD 2000, derived from children',()=>{
 const rows=plans();assert.deepEqual(rows.map(row=>row.amount),[420,500,120,450,230,280]);assert.equal(rows.reduce((sum,row)=>sum+row.amount,0),2000);
 assert.equal(rows.flatMap(row=>row.subcategories).length,18);
 for(const row of rows)assert.equal(row.amount,EE.budget(row));
 assert.deepEqual(rows[3].subcategories.map(child=>[child.label,child.amount]),[['의류·패션잡화',120],['뷰티·화장품',100],['취미·디지털',50],['반려동물·수족관',50],['일반쇼핑·기타',130]]);
});
test('template defaults to preserving every existing budget and ID; recommended values require a choice',()=>{
 const original=[{id:'old',type:'expected',label:'쇼핑',amount:600.01},{id:'fe',type:'fixed',label:'Rent',amount:900},{id:'ei',type:'income',label:'Pay',amount:1000}];
 const before=JSON.stringify(original),kept=EE.applyTemplate(original),shop=kept.find(row=>row.id==='old');
 assert.equal(shop.amount,600.01);assert.equal(EE.budget(shop),600.01);assert.equal(shop.label,'개인쇼핑');
 assert.equal(EE.applyTemplate(original,{ee_shopping:'recommended'}).find(row=>row.id==='old').amount,450);
 assert.equal(JSON.stringify(original),before);assert.ok(kept.every(row=>row.type==='expected'));
 assert.throws(()=>EE.applyTemplate([...original,{id:'dup',type:'expected',label:'개인쇼핑',amount:1}]),/ambiguous/);
 assert.throws(()=>EE.applyTemplate([{id:'ee_groceries',type:'fixed',label:'Rent',amount:900}]),/ID is already used/);
 const custom={...shop,subcategories:[{id:'custom',label:'Custom',amount:77}]};assert.equal(EE.applyTemplate([custom],{ee_shopping:'recommended'}).find(row=>row.id==='old').amount,77);
});
test('uncategorized is reserved and zero-budget parents remain valid',()=>{
 const parent=plans()[0];assert.throws(()=>EE.normalize({...parent,subcategories:[{id:'custom',label:'미분류',amount:100}]}),/reserved/);
 assert.equal(EE.normalize({...parent,subcategories:parent.subcategories.map(child=>({...child,amount:0}))}).amount,0);
});
test('parent spending equals categorized plus uncategorized spending and shared expenses are never double-counted',()=>{
 const rows=plans(),parent=rows[3],child=parent.subcategories[1];
 const entries=[entry(parent,80,child.id),entry(parent,100,'',{isShared:true}),entry(parent,.03,'',{isShared:true})];
 const result=EE.breakdown(parent,entries,rows),total=entries.reduce((sum,row)=>sum+EE.effective(row),0)/100;
 assert.equal(result.actual,total);assert.equal(result.children.find(row=>row.id===child.id).actual,80);
 assert.equal(result.children.find(row=>row.id==='__unclassified__').planned,null);
 assert.equal(Math.round(result.children.reduce((sum,row)=>sum+row.actual,0)*100),Math.round(total*100));
});
test('editing, moving and deleting transactions change only their respective contributions',()=>{
 const rows=plans(),parent=rows[0],[a,b]=parent.subcategories,initial=entry(parent,20,a.id);
 assert.equal(EE.breakdown(parent,[initial],rows).children[0].actual,20);
 const changed={...initial,amount:30,subcategoryId:b.id};const result=EE.breakdown(parent,[changed],rows);
 assert.equal(result.actual,30);assert.equal(result.children[0].actual,0);assert.equal(result.children[1].actual,30);
 assert.equal(EE.breakdown(parent,[],rows).actual,0);
});
test('historical aliases resolve only uniquely; linked IDs take precedence; unknown merchants are not guessed',()=>{
 const rows=plans(),shop=rows[3],old={type:'expense',sourceType:'expected',reason:'쇼핑',amount:40};
 assert.equal(EE.resolve(old,rows).id,shop.id);assert.equal(EE.subcategoryLabel(old,rows),'미분류');assert.equal(EE.breakdown(shop,[old],rows).actual,40);
 assert.equal(EE.resolve({...old,reason:'Sephora'},rows),null);
 assert.equal(EE.resolve(old,[...rows,{id:'duplicate',type:'expected',label:'쇼핑',amount:200}]),null);
 assert.equal(EE.resolve({...old,linkedPlanItemId:rows[0].id},rows).id,rows[0].id);
 assert.equal(EE.resolve({...old,type:'income'},rows),null);
});
test('archived categories retain historical labels and spending but do not allocate active budget',()=>{
 const rows=plans(),parent=rows[0],child=parent.subcategories[0],record=entry(parent,100,child.id);
 const updated=EE.normalize({...parent,subcategories:parent.subcategories.map(row=>row.id===child.id?{...row,archived:true}:row)});
 rows[0]=updated;const result=EE.breakdown(updated,[record],rows);
 assert.equal(result.planned,70);assert.equal(result.children[0].actual,100);assert.equal(result.children[0].planned,0);assert.match(EE.subcategoryLabel(record,rows),/보관됨/);
 assert.equal(EE.breakdown(updated,[{...record,subcategoryId:'missing'}],rows).children.at(-1).actual,100);
});
test('weekly/monthly/yearly windows reuse the same stored parent and child budgets without new scaling',()=>{
 const rows=plans(),parent=rows[0],entries=[entry(parent,10,parent.subcategories[0].id),entry(parent,20,'',{date:'2026-10-01'}),entry(parent,30,'',{date:'2025-11-01'})];
 for(const [filter,actual] of [[row=>row.date==='2026-11-01',10],[row=>row.date.startsWith('2026-11'),10],[row=>row.date.startsWith('2026-'),30]]){
  const result=EE.breakdown(parent,entries.filter(filter),rows);assert.equal(result.actual,actual);assert.equal(result.planned,420);assert.equal(result.children[0].planned,350);
 }
 const others=[{type:'expense',sourceType:'fixed',reason:'Rent',amount:900},{type:'income',sourceType:'income',amount:1000},{type:'income',sourceType:'unexpected_income',amount:5}];
 assert.equal(EE.breakdown(parent,others,rows).actual,0);assert.deepEqual(others.map(EE.effective),[90000,100000,500]);
});
test('Excel adapter preserves existing columns, money and period while adding safe subcategories and breakdowns',()=>{
 const rows=plans(),parent=rows[0],record=entry(parent,20,parent.subcategories[0].id,{isShared:true});
 const xml='<worksheet><dimension ref="A1:B2"/><sheetData><row r="1"><c r="A1"/><c r="B1"/></row><row r="2"><c r="A2"><v>46327</v></c><c r="B2" s="2"><v>10</v></c></row></sheetData><autoFilter ref="A1:B2"/></worksheet>';
 const result={filename:'ledger.xlsx',count:1,bytes:Export.pack({'xl/worksheets/sheet1.xml':xml,'xl/worksheets/sheet2.xml':xml})};
 const file=Export.enhance(result,[record,{...record,date:'2026-12-01'}],'2026-11-01','2026-12-01',rows),parts=Export.unpack(file.bytes);
 assert.equal(file.filename,result.filename);assert.equal(file.count,1);assert.match(parts['xl/worksheets/sheet1.xml'],/Subcategory/);assert.match(parts['xl/worksheets/sheet1.xml'],/식료품·마트/);assert.match(parts['xl/worksheets/sheet1.xml'],/<c r="B2" s="2"><v>10<\/v>/);
 assert.match(parts['xl/worksheets/sheet2.xml'],/미분류/);assert.match(parts['xl/worksheets/sheet2.xml'],/Selected-period spending/);
 assert.ok(!parts['xl/worksheets/sheet1.xml'].includes('<f>'));
});

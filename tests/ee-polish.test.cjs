const {test}=require('node:test'),assert=require('node:assert/strict'),EE=require('../ee-model.js'),M=require('../ledger-mutations.js'),Export=require('../ledger-export.js');
test('deleted child retains historical spending and labels without an active allocation',()=>{
 const original=EE.applyTemplate([])[3],child=original.subcategories[1];
 const parent=EE.normalize({...original,subcategories:original.subcategories.map(row=>row.id===child.id?{...row,deleted:true}:row)});
 const entry={id:'old',type:'expense',sourceType:'expected',linkedPlanItemId:parent.id,subcategoryId:child.id,amount:80,isShared:true};
 const before=JSON.stringify(entry),result=EE.breakdown(parent,[entry],[parent]);
 assert.equal(parent.amount,350);assert.equal(result.actual,40);assert.equal(result.children.find(row=>row.id===child.id).planned,0);
 assert.match(EE.subcategoryLabel(entry,[parent]),/삭제됨/);assert.equal(JSON.stringify(entry),before);
 assert.throws(()=>M.validateEntries([{...entry,id:'new'}],[],[parent]),/subcategory is unavailable/);
 assert.doesNotThrow(()=>M.validateEntries([entry],[entry],[parent],['old']));
});
test('parent cascade retains reference IDs and prevents a replacement category from stealing history',()=>{
 const parent=EE.applyTemplate([])[3],removed=EE.removeParent(parent),replacement={id:'new',type:'expected',label:parent.label,amount:500};
 const entry={id:'old',type:'expense',sourceType:'expected',linkedPlanItemId:parent.id,subcategoryId:parent.subcategories[0].id,amount:100};
 assert.ok(removed.subcategories.every(child=>child.deleted));assert.equal(EE.resolve(entry,[removed,replacement]).id,parent.id);
 assert.equal(EE.breakdown(removed,[entry],[removed,replacement]).actual,100);assert.equal(EE.breakdown(replacement,[entry],[removed,replacement]).actual,0);
 assert.throws(()=>M.validateEntries([{...entry,id:'new-entry'}],[],[removed,replacement]),/budget was deleted/);
});
test('portable short export names and Korean validation messages preserve period semantics',()=>{
 const entries=[{id:'a',date:'2026-10-15',reason:'Food',type:'expense',amount:10},{id:'end',date:'2026-11-02',reason:'Excluded',type:'expense',amount:20}];
 const result=Export.build(entries,'2026-10-15','2026-11-02');assert.equal(result.filename,'26.10.15-26.11.02.xlsx');assert.equal(result.count,1);
 assert.ok(!/[\\/:*?"<>|]/.test(result.filename));assert.throws(()=>Export.build(entries,'2026-11-02','2026-10-15'),/종료일은 시작일보다/);
});

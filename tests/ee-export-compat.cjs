// Opt-in integration with the user's separate, uncommitted Excel exporter. Read-only.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{execFileSync}=require('node:child_process');
const EE=require('../ee-model.js'),adapter=require('../ee-export.js');
if(!process.env.LEDGER_EXPORT_BASE)throw Error('Set LEDGER_EXPORT_BASE to the existing ledger-export.js. No source files are copied or modified.');
const exporter=require(path.resolve(process.env.LEDGER_EXPORT_BASE)),plans=EE.applyTemplate([]),parent=plans[3];
const entries=[{id:'a',date:'2026-11-01',type:'expense',sourceType:'expected',reason:'쇼핑',amount:80,isShared:true,subcategoryId:parent.subcategories[1].id,detail:'Sephora <original>',createdAt:'2026-11-01T00:00:00Z'},
 {id:'b',date:'2026-11-02',type:'expense',sourceType:'expected',reason:'쇼핑',amount:10,detail:'Historical'},
 {id:'c',date:'2026-12-01',type:'expense',sourceType:'expected',reason:'쇼핑',amount:999,detail:'Excluded end date'}];
const original=exporter.build(entries,'2026-11-01','2026-12-01',plans),originalParts=adapter.unpack(original.bytes);
global.LedgerExport={...exporter};assert.equal(adapter.install(),true);assert.equal(adapter.install(),false);
const result=global.LedgerExport.build(entries,'2026-11-01','2026-12-01',plans),parts=adapter.unpack(result.bytes);
assert.equal(result.count,2);assert.equal(result.filename,original.filename);
for(const [name,value] of Object.entries(originalParts)){
 if(!name.startsWith('xl/worksheets/'))assert.equal(parts[name],value,'preserve package and styles '+name);
 const originalCells=[...value.matchAll(/<c\b[^>]*>[\s\S]*?<\/c>/g)].map(match=>match[0]);
 for(const cell of originalCells)assert.ok(parts[name].includes(cell),'original Excel cells stay byte-identical');
}
assert.match(parts['xl/worksheets/sheet1.xml'],/Subcategory/);assert.match(parts['xl/worksheets/sheet1.xml'],/뷰티·화장품/);assert.match(parts['xl/worksheets/sheet1.xml'],/미분류/);
assert.ok(!parts['xl/worksheets/sheet1.xml'].includes('Excluded end date'));assert.match(parts['xl/worksheets/sheet2.xml'],/미분류/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ee-xlsx-'));
try{const file=path.join(temp,'ee.xlsx');fs.writeFileSync(file,result.bytes);assert.match(execFileSync('/usr/bin/unzip',['-t',file],{encoding:'utf8'}),/No errors detected/);}finally{fs.rmSync(temp,{recursive:true,force:true});}
delete global.LedgerExport;console.log('Existing uncommitted Excel exporter: every original cell/calculation preserved; EE column, summary and period boundary PASS');

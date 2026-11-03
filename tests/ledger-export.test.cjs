const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const exporter=require('../ledger-export.js');
const vm=require('node:vm');
const fixture=[
 {id:'before',date:'2026-10-31',amount:900,type:'expense',reason:'Outside'},
 {id:'a',date:'2026-11-01',amount:100.01,type:'expense',reason:'장보기 🐸',detail:'<milk> & "bread"\nsecond line',isShared:true,linkedPlanItemId:'food',sourceType:'expected'},
 {id:'b',date:'2026-11-30',amount:200,type:'income',reason:'=HYPERLINK("bad")',detail:'+cmd',sourceType:'income'},
 {id:'end',date:'2026-12-01',amount:999,type:'income',reason:'Outside'}
];
function files(bytes){const data=Buffer.from(bytes),result={};let at=0;while(data.readUInt32LE(at)===0x04034b50){const size=data.readUInt32LE(at+18),length=data.readUInt16LE(at+26),extra=data.readUInt16LE(at+28),name=data.subarray(at+30,at+30+length).toString();at+=30+length+extra;result[name]=data.subarray(at,at+size).toString();at+=size;}return result;}
test('export periods include the start, exclude the end, and reject invalid or empty periods',()=>{
 assert.deepEqual(exporter.select(fixture,'2026-11-01','2026-12-01').map(row=>row.id),['a','b']);
 for(const [start,end] of [['2026-11-02','2026-11-01'],['2026-11-01','2026-11-01'],['2026-02-30','2026-03-01'],['2026-13-01','2027-01-01'],['','2026-12-01']])assert.throws(()=>exporter.build(fixture,start,end),/날짜를 확인/);
 assert.throws(()=>exporter.build(fixture,'2027-01-01','2027-02-01'),/내역이 없습니다/);
 assert.equal(exporter.validDate('2028-02-29'),true);assert.equal(exporter.validDate('2026-02-29'),false);
});
test('xlsx contains dates, numeric money, Korean details, budget links, safe text and correct shared totals',()=>{
 const result=exporter.build(fixture,'2026-11-01','2026-12-01',[{id:'food',label:'식비'}]);
 assert.equal(result.count,2);assert.equal(result.filename,'26.11.01-26.12.01.xlsx');
 const parts=files(result.bytes),activity=parts['xl/worksheets/sheet1.xml'],summary=parts['xl/worksheets/sheet2.xml'];
 assert.equal(Object.keys(parts).length,7);assert.match(activity,/장보기 🐸/);assert.match(activity,/식비/);assert.match(activity,/&lt;milk&gt; &amp; &quot;bread&quot;\nsecond line/);
 assert.match(activity,/t="inlineStr"[^>]*><is><t xml:space="preserve">=HYPERLINK/);assert.ok(!activity.includes('<f>'));
 assert.match(activity,/<c r="C2" s="2"><v>100.01<\/v>/);assert.match(activity,/<c r="A2" s="1"><v>\d+<\/v>/);
 assert.ok(!activity.includes('Outside'));
 const half=Number((100.01/2).toFixed(2));assert.match(summary,new RegExp('<c r="B7" s="2"><v>'+half.toFixed(2).replace('.','\\.')+'<'));
 assert.match(summary,/<c r="B8" s="2"><v>200<\/v>/);assert.ok(summary.includes('<v>'+((20000-Math.round(half*100))/100)+'</v>'));
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ledger-export-'));
 try{const filename=path.join(directory,'ledger.xlsx');fs.writeFileSync(filename,result.bytes);assert.match(execFileSync('/usr/bin/unzip',['-t',filename],{encoding:'utf8'}),/No errors detected/);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('signed-in exports fetch all server entries and never fall back to stale local data on failure or account change',async()=>{
 const source=fs.readFileSync(require.resolve('../ledger.js'),'utf8');
 const code=source.slice(source.indexOf("const activityExportForm=document.getElementById('activityExportForm');"),source.indexOf('(function init() {'));
 for(const mode of ['success','offline','account-change','future']){
  let submit,downloads=0,requestOptions;
  const nodes={activityExportForm:{reportValidity:()=>true,addEventListener:(event,handler)=>submit=handler},activityExportStart:{},activityExportEnd:{},activityExportBtn:{},activityExportStatus:{dataset:{}}};
  const auth={currentUser:{uid:'owner'}};
  const sandbox={Date,Blob,LedgerExport:exporter,requireAuthRef:()=>{},currentUser:{uid:'owner'},authApi:{auth},planItems:[],activityEntries:[{...fixture[0],date:'2026-11-01'}],getTodayDateString:()=> '2026-12-01',isRemoteEnabled:()=>true,normalizeActivityEntries:rows=>rows,
   activityCollection:()=>({get:async options=>{requestOptions=options;if(mode==='offline')throw Object.assign(Error('offline'),{code:'unavailable'});if(mode==='account-change')auth.currentUser=null;return {docs:fixture.slice(1,3).map(entry=>({id:entry.id,data:()=>entry}))};}}),
   document:{getElementById:id=>nodes[id],body:{append(){}},createElement:()=>({click(){downloads++},remove(){}})},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){}
  };
  vm.runInNewContext(code,sandbox);nodes.activityExportStart.value='2026-11-01';nodes.activityExportEnd.value='2026-12-01';
  assert.equal(nodes.activityExportStart.max,'2026-12-01');assert.equal(nodes.activityExportEnd.max,'2026-12-01');
  if(mode==='future')nodes.activityExportEnd.value='2026-12-02';
  await submit({preventDefault(){}});
  if(mode==='future'){assert.equal(requestOptions,undefined);assert.equal(downloads,0);assert.match(nodes.activityExportStatus.textContent,/미래 날짜/);continue;}
  assert.equal(requestOptions.source,'server');assert.equal(nodes.activityExportBtn.disabled,false);
  assert.equal(downloads,mode==='success'?1:0);
  assert.match(nodes.activityExportStatus.textContent,mode==='success'?/2개 내역/:mode==='offline'?/내역을 불러오지/:/로그인 계정이 변경/);
 }
});

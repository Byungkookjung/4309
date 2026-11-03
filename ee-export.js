(function(root){
    const model=typeof module!=='undefined'?require('./ee-model.js'):root.ExpectedBudget;
    const escape=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    const col=index=>{let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name;};
    const cell=(value,row,column,money=false)=>money?`<c r="${col(column)}${row}" s="2"><v>${value}</v></c>`:`<c r="${col(column)}${row}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
    function unpack(bytes){
        const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder(),files={};let at=0;
        while(at+30<=bytes.length&&view.getUint32(at,true)===0x04034b50){
            if(view.getUint16(at+8,true)!==0||view.getUint16(at+6,true)&8)throw Error('Unsupported Excel archive.');
            const size=view.getUint32(at+18,true),nameSize=view.getUint16(at+26,true),extra=view.getUint16(at+28,true),name=decoder.decode(bytes.subarray(at+30,at+30+nameSize));
            at+=30+nameSize+extra;if(at+size>bytes.length)throw Error('Incomplete Excel archive.');files[name]=decoder.decode(bytes.subarray(at,at+size));at+=size;
        }
        return files;
    }
    function pack(files){
        const encoder=new TextEncoder(),locals=[],directory=[];let offset=0;
        const header=(size,fill)=>{const bytes=new Uint8Array(size);fill(new DataView(bytes.buffer));return bytes;};
        const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
        for(const [name,content] of Object.entries(files)){
            const path=encoder.encode(name),data=encoder.encode(content),sum=crc(data);
            const local=header(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,path.length,true);});
            const central=header(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,sum,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,path.length,true);v.setUint32(42,offset,true);});
            locals.push(local,path,data);directory.push(central,path);offset+=30+path.length+data.length;
        }
        const size=directory.reduce((sum,part)=>sum+part.length,0),count=Object.keys(files).length;
        const end=header(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);});
        const bytes=new Uint8Array(offset+size+22);let cursor=0;for(const part of [...locals,...directory,end]){bytes.set(part,cursor);cursor+=part.length;}return bytes;
    }
    function enhance(result,entries,start,end,plans=[]){
        const files=unpack(result.bytes),path='xl/worksheets/sheet1.xml',summaryPath='xl/worksheets/sheet2.xml';
        if(!files[path]||!files[summaryPath])throw Error('The Excel export format has changed. Review the EE adapter before exporting.');
        const selected=entries.filter(entry=>{
            const parsed=new Date(entry.date+'T12:00:00Z');
            return Number.isFinite(+parsed)&&parsed.toISOString().slice(0,10)===entry.date&&entry.date>=start&&entry.date<end;
        }).slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id)));
        if(result.count!==undefined&&result.count!==selected.length)throw Error('Export row counts differ. No file was generated.');
        let width=0;
        files[path]=files[path].replace(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g,(whole,n,body)=>{
            if(Number(n)===1)width=(body.match(/<c\b/g)||[]).length;
            const label=Number(n)===1?'Subcategory':model.subcategoryLabel(selected[Number(n)-2],plans);
            return whole.replace('</row>',cell(label,Number(n),width)+'</row>');
        }).replace(/(ref="A1:)[A-Z]+(\d+")/g,(_,prefix,suffix)=>prefix+col(width)+suffix);
        files[path]=files[path].replace('</cols>',`<col min="${width+1}" max="${width+1}" width="30" customWidth="1"/></cols>`);
        const summary=files[summaryPath],numbers=[...summary.matchAll(/<row r="(\d+)"/g)].map(match=>Number(match[1]));let number=Math.max(...numbers,0)+2;
        const rows=[['EE breakdown: parent rows are rollups; children are detail, not additional spending.','','','','',''],['EE category / subcategory','Monthly budget (CAD)','Selected-period spending (CAD)','Budget minus period spend (CAD)','Parent','Status']];
        for(const parent of plans.filter(plan=>plan.type==='expected')){
            const group=model.breakdown(parent,selected,plans);
            for(const item of [group,...group.children])rows.push([item.label,item.planned,item.actual,item.planned===null?null:Number((item.planned-item.actual).toFixed(2)),item===group?'':parent.label,item.archived?'보관됨':item.id==='__unclassified__'?'예산 없음':'']);
        }
        const review=selected.filter(entry=>entry.type==='expense'&&entry.sourceType==='expected'&&!model.resolve(entry,plans));
        if(review.length)rows.push(['확인 필요',null,review.reduce((sum,entry)=>sum+model.effective(entry),0)/100,null,'','연결 불명확']);
        const appended=rows.map(row=>{const n=number++;return `<row r="${n}">${row.map((value,index)=>value===null?'':cell(value,n,index,typeof value==='number')).join('')}</row>`;}).join('');
        files[summaryPath]=summary.replace('</sheetData>',appended+'</sheetData>').replace(/<dimension ref="[^"]*"\/>/,`<dimension ref="A1:F${number-1}"/>`).replace('</cols>','<col min="3" max="4" width="26" customWidth="1"/><col min="5" max="6" width="30" customWidth="1"/></cols>');
        return {...result,bytes:pack(files)};
    }
    function install(){
        if(!root.LedgerExport||root.LedgerExport.build.eeEnhanced)return false;
        const original=root.LedgerExport.build;
        const wrapped=(entries,start,end,plans=[])=>enhance(original(entries,start,end,plans),entries,start,end,plans);
        wrapped.eeEnhanced=true;root.LedgerExport.build=wrapped;return true;
    }
    const api={enhance,install,pack,unpack};
    if(typeof module!=='undefined')module.exports=api;else{root.EEExport=api;install();document.addEventListener('DOMContentLoaded',install,{once:true});}
})(globalThis);

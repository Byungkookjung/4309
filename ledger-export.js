(function(root){
    const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    function validDate(value){
        const parsed=new Date(value+'T12:00:00Z');
        return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&value>='1900-01-01'&&value<='9999-12-31'&&Number.isFinite(+parsed)&&parsed.toISOString().slice(0,10)===value;
    }
    function select(entries,start,end){
        if(!validDate(start)||!validDate(end)||start>=end)throw Error('날짜를 확인해 주세요. 종료일은 시작일보다 뒤여야 합니다.');
        return entries.filter(entry=>validDate(entry.date)&&entry.date>=start&&entry.date<end)
            .slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id)));
    }
    const text=value=>({value,type:'text'}),money=value=>({value,type:'money'}),date=value=>({value,type:'date'});
    function column(index){let value='';for(index++;index;index=Math.floor((index-1)/26))value=String.fromCharCode(65+(index-1)%26)+value;return value;}
    function sheet(rows,widths,filter=false){
        const cell=(item,r,c)=>{
            const value=item?.type?item:{value:item,type:'text'},ref=column(c)+(r+1);
            if(value.type==='money')return `<c r="${ref}" s="2"><v>${value.value}</v></c>`;
            if(value.type==='date')return `<c r="${ref}" s="1"><v>${Math.round((Date.parse(value.value+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000)-(value.value<'1900-03-01'?1:0)}</v></c>`;
            if(String(value.value??'').length>32767)throw Error('내용이 엑셀의 글자 수 제한을 초과했습니다. 내용을 줄여 주세요.');
            // Inline string cells keep =, +, -, @ and URLs as data, never spreadsheet formulas.
            return `<c r="${ref}" t="inlineStr" s="${r===0?3:0}"><is><t xml:space="preserve">${xml(value.value)}</t></is></c>`;
        };
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${column(rows[0].length-1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((item,c)=>cell(item,r,c)).join('')}</row>`).join('')}</sheetData>${filter?`<autoFilter ref="A1:${column(rows[0].length-1)}${rows.length}"/>`:''}</worksheet>`;
    }
    function zip(files){
        const encoder=new TextEncoder(),local=[],central=[];let offset=0;
        const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
        const header=(size,fill)=>{const bytes=new Uint8Array(size);fill(new DataView(bytes.buffer));return bytes;};
        for(const [name,content] of Object.entries(files)){
            const path=encoder.encode(name),data=encoder.encode(content),checksum=crc(data);
            const entry=header(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,path.length,true);});
            const index=header(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,checksum,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,path.length,true);v.setUint32(42,offset,true);});
            local.push(entry,path,data);central.push(index,path);offset+=entry.length+path.length+data.length;
        }
        const count=Object.keys(files).length,centralSize=central.reduce((sum,item)=>sum+item.length,0);
        const end=header(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);});
        const result=new Uint8Array(offset+centralSize+end.length);let cursor=0;
        for(const part of [...local,...central,end]){result.set(part,cursor);cursor+=part.length;}return result;
    }
    function build(entries,start,end,plans=[]){
        const selected=select(entries,start,end);
        if(!selected.length)throw Error('선택한 기간에 가계부 내역이 없습니다.');
        if(selected.length>1048575)throw Error('내역이 너무 많습니다. 더 짧은 기간을 선택해 주세요.');
        let spent=0,income=0,grossExpenses=0;
        const labels={fixed:'Fixed expense',expected:'Expected expense',income:'Expected income',unexpected_income:'Unexpected income',custom:'Custom expense'};
        const rows=[['Date','Type','Amount (CAD)','My amount (CAD)','Expense (CAD)','Income (CAD)','Shared expense','Linked budget type','Budget item','Reason','Detail','Created at','Updated at','Entry ID','Budget item ID']];
        for(const entry of selected){
            const amount=Number(entry.amount),effective=entry.isShared?Number((amount/2).toFixed(2)):amount;
            if(!Number.isFinite(amount)||amount<=0)throw Error('금액이 올바르지 않은 내역이 있습니다. 금액을 수정해 주세요.');
            const isIncome=entry.type==='income',cents=Math.round(effective*100);
            if(isIncome)income+=cents;else{spent+=cents;grossExpenses+=Math.round(amount*100);}
            const budgetType=!entry.sourceType||entry.sourceType==='custom'?(isIncome?'Custom income':'Custom expense'):labels[entry.sourceType]||String(entry.sourceType);
            rows.push([date(entry.date),isIncome?'Income':'Expense',money(amount),money(effective),money(isIncome?0:effective),money(isIncome?effective:0),entry.isShared?'Yes':'No',budgetType,entry.linkedPlanItemLabel||plans.find(plan=>plan.id===entry.linkedPlanItemId)?.label||'',text(entry.reason),text(entry.detail),text(entry.createdAt),text(entry.updatedAt),text(entry.id),text(entry.linkedPlanItemId)]);
        }
        const summary=[['Period summary','Value'],['Start date (included)',date(start)],['End date (not included)',date(end)],['Currency','CAD'],['Entry count',String(selected.length)],['Expense before sharing',money(grossExpenses/100)],['My expenses',money(spent/100)],['Income',money(income/100)],['Net income minus my expenses',money((income-spent)/100)],['Shared expense rule','My amount is half of the original amount, rounded to cents.'],['Period rule','Start date is included; end date is not included.']];
        const files={
            '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Activity" sheetId="1" r:id="rId1"/><sheet name="Summary" sheetId="2" r:id="rId2"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
            'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="#,##0.00;[Red]-#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
            'xl/worksheets/sheet1.xml':sheet(rows,[14,12,19,19,19,19,18,23,26,30,55,27,27,25,25],true),
            'xl/worksheets/sheet2.xml':sheet(summary,[36,72])
        };
        const short=value=>value.slice(2).replace(/-/g,'.');
        return {bytes:zip(files),filename:`${short(start)}-${short(end)}.xlsx`,count:selected.length,mime};
    }
    const api={build,select,validDate};if(typeof module!=='undefined')module.exports=api;else root.LedgerExport=api;
})(globalThis);

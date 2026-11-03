(function(root){
    const definitions=[
        ['groceries','장보기',[],[['식료품·마트',350],['편의점·간식',30],['커피캡슐·음료재료',40]]],
        ['dining','외식,카페,배달',['외식'],[['외식·식당',360],['카페·디저트',80],['배달',60]]],
        ['household','생활용품',[],[['생필품·소모품',70],['주방·집안용품',50]]],
        ['shopping','개인쇼핑',['쇼핑'],[['의류·패션잡화',120],['뷰티·화장품',100],['취미·디지털',50],['반려동물·수족관',50],['일반쇼핑·기타',130]]],
        ['transport','택시,기타',['택시'],[['Uber·Lyft',200],['교통 외 기타',30]]],
        ['special','여행·특별지출',[],[['여행·숙박·관광',150],['가구·고가 구매',100],['행정·일회성 비용',30]]]
    ];
    const key=value=>String(value||'').trim().toLocaleLowerCase();
    const cents=value=>Math.round(Number(value)*100);
    const template=definitions.map(([id,label,aliases,children])=>({id:'ee_'+id,label,aliases,amount:children.reduce((sum,row)=>sum+row[1],0),subcategories:children.map(([label,amount],i)=>({id:'ee_'+id+'_'+i,label,amount,archived:false}))}));
    function canonical(label){const match=template.find(item=>[item.label,...item.aliases].some(name=>key(name)===key(label)));return key(match?.label||label);}
    const hierarchical=plan=>plan.type==='expected'&&Array.isArray(plan.subcategories);
    function children(plan){
        const seen=new Set(),names=new Set();
        if(plan.subcategories&&(!Array.isArray(plan.subcategories)||plan.subcategories.length>100))throw Error('Use at most 100 subcategories per parent.');
        return (plan.subcategories||[]).map(child=>{
            if(!child||typeof child.id!=='string'||!child.id||child.id.length>120||seen.has(child.id)||typeof child.label!=='string'||!child.label.trim()||child.label.trim().length>80||!Number.isFinite(Number(child.amount))||Number(child.amount)<0||!Number.isSafeInteger(cents(child.amount)))throw Error('Invalid EE subcategory. Reload or review the budget data.');
            if(!child.archived&&names.has(key(child.label)))throw Error('Active subcategory names must be unique within their parent.');
            if(child.id==='__unclassified__'||key(child.label)==='미분류')throw Error('미분류 is reserved for unassigned transactions and has no budget.');
            if(!child.archived)names.add(key(child.label));
            seen.add(child.id);return {id:child.id,label:child.label.trim(),amount:cents(child.amount)/100,archived:child.archived===true};
        });
    }
    function budget(plan){return hierarchical(plan)?children(plan).filter(child=>!child.archived).reduce((sum,child)=>sum+cents(child.amount),0)/100:Number(plan.amount||0);}
    function normalize(plan){return hierarchical(plan)?{...plan,subcategories:children(plan),amount:budget(plan)}:{...plan};}
    function resolve(entry,plans){
        if(entry.type!=='expense'||entry.sourceType!=='expected')return null;
        const direct=plans.find(plan=>String(plan.id)===String(entry.linkedPlanItemId));
        if(direct)return direct.type==='expected'?direct:null;
        const label=entry.linkedPlanItemLabel||entry.reason;
        const matches=plans.filter(plan=>plan.type==='expected'&&canonical(plan.label)===canonical(label));
        return matches.length===1?matches[0]:null;
    }
    function effective(entry){return cents(entry.isShared?Number((Number(entry.amount)/2).toFixed(2)):Number(entry.amount));}
    function breakdown(plan,entries,plans){
        const rows=children(plan).map(child=>({...child,planned:child.archived?0:child.amount,actual:0}));
        const unclassified={id:'__unclassified__',label:'미분류',planned:null,actual:0};let total=0;
        for(const entry of entries){
            if(resolve(entry,plans)?.id!==plan.id)continue;
            const value=effective(entry);total+=value;
            const row=rows.find(child=>child.id===entry.subcategoryId)||unclassified;row.actual+=value;
        }
        return {id:plan.id,label:plan.label,planned:budget(plan),actual:total/100,children:[...rows,unclassified].map(row=>({...row,actual:row.actual/100}))};
    }
    function subcategoryLabel(entry,plans){
        if(entry.type!=='expense'||entry.sourceType!=='expected')return '';
        const parent=resolve(entry,plans),child=parent&&children(parent).find(child=>child.id===entry.subcategoryId);
        if(child)return child.label+(child.archived?' (보관됨)':'');
        return entry.subcategoryId&&entry.subcategoryLabel?entry.subcategoryLabel+' (확인 필요)':'미분류';
    }
    function deletionBlockReason(plan,entries,plans){
        if(plan?.type!=='expected')return '';
        if(hierarchical(plan))return 'EE parents with subcategories cannot be deleted. Archive subcategories instead to preserve historical relationships.';
        const referenced=entries.some(entry=>entry.type==='expense'&&entry.sourceType==='expected'&&(
            String(entry.linkedPlanItemId||'')===String(plan.id)||resolve(entry,plans)?.id===plan.id||canonical(entry.linkedPlanItemLabel||entry.reason)===canonical(plan.label)));
        return referenced?'This EE parent is referenced by historical transactions and cannot be deleted.':'';
    }
    function allocate(children,total){
        const target=cents(total),weight=children.reduce((sum,child)=>sum+cents(child.amount),0);
        const parts=children.map((child,index)=>({index,value:Math.floor(target*cents(child.amount)/weight),remainder:(target*cents(child.amount))%weight}));
        let left=target-parts.reduce((sum,part)=>sum+part.value,0);
        for(const part of [...parts].sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(left-->0)part.value++;}
        return children.map((child,index)=>({...child,amount:parts[index].value/100}));
    }
    function preview(plans){return template.map(item=>{
        const matches=plans.filter(plan=>plan.type==='expected'&&canonical(plan.label)===canonical(item.label));
        return {template:item,existing:matches.length===1?matches[0]:null,conflict:matches.length>1};
    });}
    function applyTemplate(plans,choices={}){
        const previewRows=preview(plans);if(previewRows.some(row=>row.conflict))throw Error('Duplicate or ambiguous EE parents. Review them before applying the template.');
        return previewRows.map(({template:item,existing})=>{
            if(!existing&&plans.some(plan=>String(plan.id)===item.id))throw Error('A template ID is already used by another budget. Review it first.');
            if(existing&&hierarchical(existing))return normalize(existing);
            const keep=existing&&choices[item.id]!=='recommended';
            const subcategories=allocate(item.subcategories,keep?existing.amount:item.amount);
            return normalize({...existing,id:existing?.id||item.id,type:'expected',label:item.label,subcategories});
        });
    }
    const api={template,canonical,hierarchical,children,budget,normalize,resolve,effective,breakdown,subcategoryLabel,deletionBlockReason,preview,applyTemplate};
    if(typeof module!=='undefined')module.exports=api;else root.ExpectedBudget=api;
})(globalThis);

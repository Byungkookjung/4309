(function(root){
    function decode(value){
        if(!value)return null;
        if('stringValue' in value)return value.stringValue;
        if('booleanValue' in value)return value.booleanValue;
        if('integerValue' in value)return Number(value.integerValue);
        if('doubleValue' in value)return Number(value.doubleValue);
        if('arrayValue' in value)return (value.arrayValue.values||[]).map(decode);
        if('mapValue' in value)return fields(value.mapValue.fields);
        return null;
    }
    function fields(value={}){return Object.fromEntries(Object.entries(value).map(([key,value])=>[key,decode(value)]));}
    async function list(get,base,collection){
        let token='',rows=[];const seen=new Set();
        do{
            const page=await get(`${base}/${collection}?pageSize=300${token?'&pageToken='+encodeURIComponent(token):''}`);
            for(const doc of page.documents||[])rows.push({...fields(doc.fields),id:decodeURIComponent(doc.name.split('/').pop())});
            token=page.nextPageToken||'';
            if(token&&seen.has(token)||rows.length>30000)throw Error('data');
            seen.add(token);
        }while(token);
        return rows;
    }
    function today(work,planner,date,data,kind){
        if(kind==='work')return ['iron','booster'].map(id=>{
            const def=work.definitions.find(d=>d.id===id),record=data[id];
            if(!record)throw Error('data');
            return work.summarize(def,record.shifts.find(s=>s.date===date),record.settings);
        });
        const categories=data.categories||[];
        const daily=categories.find(c=>c.id==='__daily__'||c.name==='일상');
        const legacy={'#367aa0':'#479ee8','#8050ad':'#a18ae5','#28745c':'#53bca5','#ae485b':'#ee8194','#946319':'#efa36f','#b46842':'#efa36f','#637649':'#53bca5','#5867a6':'#a18ae5'};
        return planner.dayItems(data.tasks,data.routines,data.checks,date).map(item=>{
            const category=categories.find(c=>c.id===item.categoryId)||daily;
            const raw=category?.color;
            const color=legacy[raw]||(/^#[0-9a-f]{6}$/i.test(raw||'')?raw:'#479ee8');
            return {...item,categoryName:category?.name||'일상',categoryColor:color};
        })
            .sort((a,b)=>Number(!!a.completed)-Number(!!b.completed)||a.title.localeCompare(b.title));
    }
    const api={decode,fields,list,today};if(typeof module!=='undefined')module.exports=api;else root.ScriptableCore=api;
})(globalThis);

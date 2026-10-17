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
    function compactTime(time){
        const [hour,minute]=time.split(':').map(Number);
        return String(hour%12||12)+(minute?':'+String(minute).padStart(2,'0'):'')+(hour<12?'a':'p');
    }
    function month(work,planner,date,data,kind="both",period="month"){
        const key=date.slice(0,7),[year,m]=key.split('-').map(Number);
        const offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
        const count=new Date(Date.UTC(year,m,0)).getUTCDate();
        const anchor=new Date(date+'T12:00:00Z');
        anchor.setUTCDate(anchor.getUTCDate()-3);
        const days=Array.from({length:period==='week'?7:count},(_,i)=>{
            const cursor=new Date(anchor);cursor.setUTCDate(cursor.getUTCDate()+i);
            const day=period==='week'?cursor.toISOString().slice(0,10):key+'-'+String(i+1).padStart(2,'0');
            const shifts=kind==='todo'?[]:today(work,planner,day,data,'work').filter(job=>job.status!=='off').map(job=>({
                title:job.status==='incomplete'?'Time missing':(compactTime(job.checkIn).slice(-1)===compactTime(job.checkOut).slice(-1)?compactTime(job.checkIn).slice(0,-1):compactTime(job.checkIn))+'–'+compactTime(job.checkOut),
                color:job.id==='iron'?'#27744f':'#8052ae',kind:'work',completed:false
            }));
            const tasks=kind==='work'?[]:today(work,planner,day,data,'todo').map(item=>({title:item.title,color:item.categoryColor,kind:'todo',completed:!!item.completed}));
            const entries=[...shifts,...tasks];
            return {date:day,entries:entries.slice(0,8),total:entries.length};
        });
        return {month:key,period,kind,offset:period==='week'?0:offset,weeks:period==='week'?1:Math.ceil((offset+count)/7),days};
    }
    function nextRefresh(model,now=new Date()){
        const midnight=model.instant(model.nextDay(model.dayKey(now)));
        return new Date(Math.min(+now+5*60000,midnight+1000));
    }
    const api={decode,fields,list,today,month,nextRefresh};if(typeof module!=='undefined')module.exports=api;else root.ScriptableCore=api;
})(globalThis);

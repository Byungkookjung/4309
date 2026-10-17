// Pocket Paws: install this ONE file in Scriptable.
// Widget parameter: todo-month (Large) or work-week (Medium). Run inside the app to connect.
const WorkWidgetData=(()=>{const module={exports:{}};
(function (root) {
    const definitions = [
        { id: 'booster', name: 'Booster Juice', suffix: '' },
        { id: 'iron', name: 'Iron Peak Auto Repair', suffix: 'IronPeak' }
    ];
    function minutes(value) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return null;
        return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    }
    function summarize(definition, shift, settings = {}) {
        const base = { id: definition.id, name: definition.name, checkIn: shift?.checkIn || '', checkOut: shift?.checkOut || '', hours: 0, amount: 0, status: 'off' };
        if (!shift || (!base.checkIn && !base.checkOut)) return base;
        const start = minutes(base.checkIn), end = minutes(base.checkOut);
        if (start === null || end === null) return { ...base, status: 'incomplete' };
        const duration = Number((((end - start + 1440) % 1440) / 60).toFixed(2));
        const hours = Math.max(0, Number((duration - (duration >= 5.5 ? 0.5 : 0)).toFixed(2)));
        const rate = Number(settings.hourlyRate ?? 15);
        const multiplier = shift.isHoliday ? Number(settings.holidayMultiplier ?? 1.5) : 1;
        if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(multiplier) || multiplier < 1) throw Error('Invalid pay settings. Check both jobs before exporting.');
        return { ...base, hours, amount: Number((hours * rate * multiplier).toFixed(2)), status: 'scheduled' };
    }
    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function buildSnapshot(records, now = new Date()) {
        const days = Array.from({ length: 32 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index - 1);
            const key = dateKey(date);
            return { date: key, jobs: definitions.map(def => {
                const data = records[def.id];
                if (!data) throw Error(`Missing ${def.name} data. Please retry.`);
                return summarize(def, data.shifts.find(shift => shift.date === key), data.settings);
            }) };
        });
        return { version: 1, isSample: false, generatedAt: now.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, days };
    }
    function displayTime(time) {
        const value = minutes(time);
        if (value === null) return time;
        const hour = Math.floor(value / 60);
        return `${hour % 12 || 12}:${String(value % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
    }
    const api = { definitions, summarize, buildSnapshot, dateKey, displayTime };
    if (typeof module !== 'undefined') module.exports = api;
    else root.WorkWidgetData = api;
})(globalThis);

return module.exports;})();
const PlannerModel=(()=>{const module={exports:{}};
(function(root){
    const dateKey = date => date.toISOString().slice(0,10);
    const make = (year,month,day) => new Date(Date.UTC(year,month-1,day,12));
    const shift = (date,days) => new Date(+date+days*86400000);
    const monday = (year,month,n) => { const d=make(year,month,1);return shift(d,(8-d.getUTCDay())%7+7*(n-1)); };
    function easter(year){
        const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
        const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
        const n=h+l-7*m+114;return make(year,Math.floor(n/31),n%31+1);
    }
    // Alberta Employment Standards general holidays, not federal/public-service substitutes.
    function holidays(year){
        const rows=[];const add=(date,name,optional=false)=>rows.push({date:dateKey(date),name,optional});
        add(make(year,1,1),"New Year's Day");add(monday(year,2,3),'Alberta Family Day');
        const spring=easter(year);add(shift(spring,-2),'Good Friday');
        const may=make(year,5,24);add(shift(may,-((may.getUTCDay()+6)%7)),'Victoria Day');
        const canada=make(year,7,1);add(shift(canada,canada.getUTCDay()===0?1:0),'Canada Day');
        add(monday(year,9,1),'Labour Day');add(monday(year,10,2),'Thanksgiving Day');
        add(make(year,11,11),'Remembrance Day');add(make(year,12,25),'Christmas Day');
        add(shift(spring,1),'Easter Monday',true);add(monday(year,8,1),'Heritage Day',true);
        add(make(year,9,30),'National Day for Truth and Reconciliation',true);add(make(year,12,26),'Boxing Day',true);
        return rows.sort((a,b)=>a.date.localeCompare(b.date));
    }
    function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'') && !isNaN(Date.parse(value)) && dateKey(new Date(value+'T12:00:00Z'))===value;}
    function occurs(routine,date){
        if(!validDate(date)||!validDate(routine.startDate)||date<routine.startDate)return false;
        if(routine.endDate&&(!validDate(routine.endDate)||date>routine.endDate))return false;
        const day=new Date(date+'T12:00:00Z'),start=new Date(routine.startDate+'T12:00:00Z');
        const frequency=routine.frequency||'weekly';
        if(frequency==='daily')return true;
        if(frequency==='yearly')return date.slice(5)===routine.startDate.slice(5);
        if(frequency==='monthly'){
            const last=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate();
            return (routine.monthDays||[]).includes(day.getUTCDate()) || (routine.lastDay===true&&day.getUTCDate()===last);
        }
        if(!['weekly','biweekly'].includes(frequency)||!Array.isArray(routine.weekdays)||!routine.weekdays.includes(day.getUTCDay()))return false;
        // Two-week cycles start on the saved start date, using date-only UTC math across DST.
        return frequency==='weekly'||Math.floor((day-start)/86400000/7)%2===0;
    }
    function repeatLabel(routine){
        const frequency=routine.frequency||'weekly',names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        if(frequency==='daily')return 'Every day';
        if(frequency==='yearly')return 'Every year · '+routine.startDate.slice(5);
        if(frequency==='monthly')return 'Every month · '+[...(routine.monthDays||[]),...(routine.lastDay?['Last day']:[])].join(', ');
        return (frequency==='biweekly'?'Every 2 weeks':'Every week')+' · '+(routine.weekdays||[]).map(day=>names[day]).join(', ');
    }
    function dayItems(tasks,routines,checks,date){
        const result=tasks.filter(t=>t.date===date).map(t=>({...t,kind:'task'}));
        for(const routine of routines){
            const overrides=checks.filter(c=>c.routineId===routine.id);
            const current=overrides.find(c=>c.date===date);
            if(occurs(routine,date)&&(!current?.movedDate||current.movedDate===date))result.push({...routine,kind:'routine',date,occurrenceDate:date,completed:current?.completed===true});
            for(const override of overrides.filter(c=>c.movedDate===date&&c.date!==date))result.push({...routine,kind:'routine',date,occurrenceDate:override.date,completed:override.completed===true});
        }
        return result;
    }
    const api={holidays,validDate,occurs,dayItems,repeatLabel};if(typeof module!=='undefined')module.exports=api;else root.PlannerModel=api;
})(globalThis);

return module.exports;})();
const MobileModel=(()=>{const module={exports:{}};
(function (root) {
    const zone = 'America/Edmonton';
    const instants = new Map();
    function dayKey(date) {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
        const get = key => parts.find(p => p.type === key).value;
        return `${get('year')}-${get('month')}-${get('day')}`;
    }
    function nextDay(key, offset = 1) {
        const date = new Date(key + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset);
        return date.toISOString().slice(0, 10);
    }
    function instant(key, time = '00:00') {
        const cacheKey = key + ' ' + time;
        if (instants.has(cacheKey)) return instants.get(cacheKey);
        const target = Date.parse(`${key}T${time}:00Z`);
        let value = target;
        for (let i = 0; i < 3; i++) {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value);
            const get = key => parts.find(p => p.type === key).value;
            const represented = Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
            value += target - represented;
        }
        if (instants.size >= 4096) instants.clear();
        instants.set(cacheKey, value);
        return value;
    }
    function summarize(data, now = new Date()) {
        const today = dayKey(now), month = today.slice(0, 7);
        let spent = 0, earned = 0;
        for (const row of data.entries) {
            if (!row.date?.startsWith(month + '-') || row.date.length !== 10 || !Number.isFinite(row.amount) || row.amount <= 0) continue;
            if (row.type === 'income') earned += Math.round(row.amount * 100);
            else spent += Math.round(row.amount / (row.isShared ? 2 : 1) * 100);
        }
        const monthStart = instant(month + '-01');
        const monthEndDate = new Date(month + '-01T12:00:00Z'); monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
        const monthEnd = instant(monthEndDate.toISOString().slice(0, 10));
        const spans = [];
        for (const record of Object.values(data.jobs)) {
            for (const row of record.shifts) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.checkIn || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.checkOut || '')) continue;
                let start = instant(row.date, row.checkIn);
                let end = instant(row.checkOut < row.checkIn ? nextDay(row.date) : row.date, row.checkOut);
                if (end - start >= 5.5 * 3600000) end -= 1800000;
                start = Math.max(start, monthStart); end = Math.min(end, monthEnd);
                if (end > start) spans.push([start, end]);
            }
        }
        spans.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const span of spans) {
            const last = merged.at(-1);
            if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
            else merged.push([...span]);
        }
        const worked = merged.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(+now, end) - start) / 1000, 0);
        const required = Math.max(0, spent - earned) / 100 / 15 * 3600;
        return { today, month, spent: spent / 100, earned: earned / 100, worked, required,
            remaining: Math.max(0, required - worked), fraction: required ? Math.min(1, worked / required) : 1,
            active: merged.some(([start, end]) => start <= +now && +now < end) };
    }
    function duration(seconds) {
        const total = Math.max(0, Math.ceil(seconds));
        return `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    const api = { zone, dayKey, nextDay, instant, summarize, duration };
    if (typeof module !== 'undefined') module.exports = api; else root.MobileModel = api;
})(globalThis);

return module.exports;})();
const Core=(()=>{const module={exports:{}};
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

return module.exports;})();
const pairCrypto=(()=>{const module={exports:{}};
// Runs in a local WebView only, never in the widget's network context.
async function pocketPairing(action,input){
    const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    const to64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
    if(action==='create'){
        const key=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
        return {privateKey:await crypto.subtle.exportKey('jwk',key.privateKey),publicKey:to64(await crypto.subtle.exportKey('raw',key.publicKey))};
    }
    const key=await crypto.subtle.importKey('jwk',input.privateKey,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
    const peer=await crypto.subtle.importKey('raw',from64(input.key),{name:'ECDH',namedCurve:'P-256'},false,[]);
    const secret=await crypto.subtle.deriveBits({name:'ECDH',public:peer},key,256);
    const hash=await crypto.subtle.digest('SHA-256',secret);
    const aes=await crypto.subtle.importKey('raw',hash,'AES-GCM',false,['decrypt']);
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(input.nonce)},aes,from64(input.data));
    const result=JSON.parse(new TextDecoder().decode(clear));
    if(typeof result.uid!=='string'||!result.uid||result.uid.length>128||typeof result.refreshToken!=='string'||!result.refreshToken)throw Error('credentials');
    return result;
}
if(typeof module!=='undefined')module.exports=pocketPairing;

return module.exports;})();
const drawMonthCalendar=(()=>{const module={exports:{}};
// Draw fixed calendar cells so long titles never resize adjacent dates.
function drawMonthCalendar(snapshot,width=330,canvasHeight=320){
    const ctx=new DrawContext();ctx.size=new Size(width,canvasHeight);ctx.opaque=false;ctx.respectScreenScale=true;
    const {days,offset,weeks}=snapshot.calendar;
    const cell=width/7,top=20,height=(canvasHeight-top)/weeks;
    function ink(value,x,y,width,size,color,bold=false){
        ctx.setTextColor(new Color(color));ctx.setFont(bold?Font.boldSystemFont(size):Font.systemFont(size));
        ctx.drawTextInRect(value,new Rect(x,y,width,size+4));
    }
    function shorten(value,width,size){
        let used=0,out='';const chars=Array.from(String(value));
        if(chars.reduce((sum,c)=>sum+(c.codePointAt(0)>255?1:.58)*size,0)<=width)return String(value);
        const max=width-size;
        for(const c of chars){const step=(c.codePointAt(0)>255?1:.58)*size;if(used+step>max)return out+'…';used+=step;out+=c;}
        return out;
    }
    const reference=snapshot.calendar.period==='week';
    if(reference){
        const weekly=snapshot.calendar.period==='week';
        const heading=30,weekdaysY=heading+2,gridTop=heading+21;
        const rowHeight=(canvasHeight-gridTop)/(weekly?1:weeks);
        function pill(x,y,w,h,color){
            const r=Math.min(4,h/2);ctx.setFillColor(new Color(color));
            ctx.fillRect(new Rect(x+r,y,w-2*r,h));ctx.fillRect(new Rect(x,y+r,w,h-2*r));
            for(const [cx,cy] of [[x,y],[x+w-2*r,y],[x,y+h-2*r],[x+w-2*r,y+h-2*r]])ctx.fillEllipse(new Rect(cx,cy,2*r,2*r));
        }
        function centered(value,x,y,w,size,color,bold=true){
            ctx.setTextAlignedCenter();ink(value,x,y,w,size,color,bold);ctx.setTextAlignedLeft();
        }
        const monthLabel=Number(snapshot.day.slice(5,7))+'월 '+Number(snapshot.day.slice(-2))+'일';
        centered(monthLabel,0,0,width,19,'#304b32');
        // A small pond-green mark keeps the calendar tied to the frog theme.
        pill(3,5,14,12,'#b5ce82');ctx.setFillColor(new Color('#b5ce82'));
        ctx.fillEllipse(new Rect(3,2,6,6));ctx.fillEllipse(new Rect(11,2,6,6));
        ctx.setFillColor(new Color('#172019'));ctx.fillEllipse(new Rect(5,4,2,2));ctx.fillEllipse(new Rect(13,4,2,2));
        const weekday=day=>new Date(day.date+'T12:00:00Z').getUTCDay();
        const dayColor=day=>weekday(day)===6?'#368ac5':weekday(day)===0?'#c5596b':'#526a49';
        days.forEach((day,col)=>centered(['일','월','화','수','목','금','토'][weekday(day)],col*cell,weekdaysY,cell,10,dayColor(day)));
        days.forEach((day,index)=>{
            const position=weekly?index:index+offset,col=position%7,row=weekly?0:Math.floor(position/7),x=col*cell,y=gridTop+row*rowHeight;
            const active=day.date===snapshot.day;
            if(active)pill(x+1,y-2,cell-2,rowHeight+1,'#dae8bc');
            if(active)pill(x+2,y,cell-4,15,'#5d7d3e');
            centered(String(Number(day.date.slice(-2))),x,y,cell,12,active?'#ffffff':dayColor(day));
            const entryHeight=snapshot.calendar.kind==='work'?27:12,entryGap=2,start=y+18;
            const slots=Math.max(1,Math.floor((rowHeight-18+entryGap)/(entryHeight+entryGap)));
            const shown=day.entries.slice(0,day.total>slots?Math.max(0,slots-1):slots);
            shown.forEach((entry,n)=>{
                const ey=start+n*(entryHeight+entryGap),color=entry.completed?'#55575b':entry.color;
                pill(x+1,ey,cell-2,entryHeight,color);
                const hex=color.replace('#',''),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
                const foreground=entry.completed?'#c8c8cc':(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>155?'#18221b':'#ffffff');
                if(entry.kind==='work'){
                    const times=entry.title.split('–');
                    // Repeat the suffix so each time is readable on its own line.
                    if(times.length===2&&!/[ap]$/.test(times[0]))times[0]+=times[1].slice(-1);
                    times.slice(0,2).forEach((time,i)=>centered(shorten(time,cell-5,10),x+2,ey+i*12,cell-4,10,foreground));
                }else ink(shorten(entry.title,cell-6,9),x+3,ey,cell-6,9,foreground,true);
            });
            if(day.total>shown.length)ink('+'+(day.total-shown.length),x+3,start+shown.length*(entryHeight+entryGap),cell-5,9,'#69765c');
        });
        return ctx.getImage();
    }
    ['M','T','W','T','F','S','S'].forEach((day,col)=>ink(day,col*cell+4,0,cell-6,11,col===5?'#368ac5':col===6?'#c5596b':'#69765c',true));
    for(let index=0;index<days.length;index++){
        const day=days[index],position=index+offset,col=position%7,row=Math.floor(position/7),x=col*cell,y=top+row*height;
        const isToday=day.date===snapshot.day;
        if(isToday){ctx.setFillColor(new Color('#e7edcb'));ctx.fillRect(new Rect(x,y,cell-2,height-2));}
        ink(String(Number(day.date.slice(-2))),x+3,y,cell-6,11,col===5?'#368ac5':col===6?'#c5596b':'#30422a',true);
        const slots=Math.max(1,Math.floor((height-17)/11));
        const shown=day.entries.slice(0,day.total>slots?slots-1:slots);
        shown.forEach((entry,n)=>{
            const ey=y+15+n*11;
            ctx.setFillColor(new Color(entry.color,entry.completed?.06:.15));ctx.fillRect(new Rect(x+1,ey,cell-3,10));
            ctx.setFillColor(new Color(entry.color));ctx.fillRect(new Rect(x+1,ey,2,10));
            const size=entry.kind==='work'?7.5:9;
            ink(entry.kind==='work'?entry.title:shorten(entry.title,cell-8,size),x+4,ey-1,cell-6,size,entry.completed?'#7b8790':entry.color);
            if(entry.completed){ctx.setFillColor(new Color('#7b8790',.5));ctx.fillRect(new Rect(x+5,ey+5,cell-11,.5));}
        });
        if(day.total>shown.length)ink('+'+(day.total-shown.length),x+4,y+15+shown.length*11,cell-8,9,'#69765c');
    }
    return ctx.getImage();
}
if(typeof module!=='undefined')module.exports=drawMonthCalendar;

return module.exports;})();
const frogStamp=(()=>{const module={exports:{}};
// Small vector stamp based on the wide-smiling green frog mascot.
function frogStamp(tint='#a8c66a'){
    const c=new DrawContext();c.size=new Size(40,36);c.opaque=false;c.respectScreenScale=true;
    c.setFillColor(new Color(tint));
    c.fillEllipse(new Rect(2,9,36,26));c.fillEllipse(new Rect(3,1,12,17));c.fillEllipse(new Rect(25,1,12,17));
    c.setFillColor(new Color('#293721'));
    c.fillEllipse(new Rect(7,6,4,5));c.fillEllipse(new Rect(29,6,4,5));
    c.fillEllipse(new Rect(16,16,2.5,2.5));c.fillEllipse(new Rect(22,16,2.5,2.5));
    for(let i=0;i<=24;i++){const x=7+i,y=20+7*Math.sin(i/24*Math.PI);c.fillEllipse(new Rect(x,y,2,2));}
    return c.getImage();
}
if(typeof module!=='undefined')module.exports=frogStamp;

return module.exports;})();
const BASE='https://todo-ledger.web.app';
const API_KEY='AIzaSyC4i32hyIRXhib_keTTr9zSj3AOolasYLc';
const CREDENTIALS='pocket-paws-v1-account',PENDING='pocket-paws-v1-pairing';
const MODES=['todo-month','work-week'];
const isCalendar=kind=>kind.includes('-');
const allowedSizes=kind=>kind.endsWith('-month')?['large']:kind.endsWith('-week')?['medium']:['small','medium'];
const contentKind=kind=>kind.split('-')[0];
function clearCaches(){for(const kind of [...MODES,'month','work','todo','work-month','todo-week'])forget('pocket-paws-cache-'+kind);}
function widgetDimensions(family){
    const width=typeof Device!=='undefined'?Device.screenSize().width:390;
    const sizes=width>=430?[364,382,170]:width>=414?[360,379,169]:width>=390?[338,354,158]:width>=375?[329,345,155]:[292,311,141];
    return {width:family==='small'?sizes[2]:sizes[0],height:family==='large'?sizes[1]:sizes[2]};
}
let stage='startup';
const read=key=>Keychain.contains(key)?JSON.parse(Keychain.get(key)):null;
const save=(key,value)=>Keychain.set(key,JSON.stringify(value));
const forget=key=>{if(Keychain.contains(key))Keychain.remove(key);};
async function cryptoCall(action,input={}){
    stage='crypto-'+action+'-load';
    const view=new WebView();
    await view.loadHTML('<!doctype html><meta charset="utf-8"><title>Local secure connection</title>','https://localhost/');
    // No website or third-party scripts ever receive the private key.
    view.shouldAllowRequest=()=>false;
    stage='crypto-'+action+'-support';
    const supported=await view.evaluateJavaScript('typeof crypto !== "undefined" && !!crypto.subtle',false);
    if(!supported)throw Error('WebCrypto unavailable');
    stage='crypto-'+action+'-evaluate';
    // WKWebView cannot bridge a Promise as the immediate evaluation result.
    // Send only JSON through completion and leave a plain null result behind.
    const result=await view.evaluateJavaScript(`(${pairCrypto.toString()})(${JSON.stringify(action)},${JSON.stringify(input)}).then(value=>completion(JSON.stringify({value})),error=>completion(JSON.stringify({error:['NotSupportedError','OperationError','SecurityError','DataError','TypeError','ReferenceError'].includes(error.name)?error.name:'CryptoError'}))); null;`,true);
    stage='crypto-'+action+'-decode';
    const answer=JSON.parse(result);
    if(answer.error){stage='crypto-'+action+'-'+answer.error;throw Error('pairing');}
    return answer.value;
}
async function connect(){
    const pair=await cryptoCall('create'),state=UUID.string();
    stage='save-pairing';
    save(PENDING,{...pair,state,created:Date.now()});
    const fragment='mode=scriptable&script='+encodeURIComponent(Script.name())+'&state='+encodeURIComponent(state)+'&key='+encodeURIComponent(pair.publicKey);
    stage='open-browser';
    await Safari.open(BASE+'/widget-connect.html#'+fragment);
}
async function acceptConnection(){
    stage='validate-callback';
    const pending=read(PENDING),q=args.queryParameters||{};
    if(!pending||q.state!==pending.state||Date.now()-pending.created>600000)throw Error('pairing');
    const account=await cryptoCall('decrypt',{privateKey:pending.privateKey,key:q.key,nonce:q.nonce,data:q.data});
    forget(PENDING);clearCaches();
    save(CREDENTIALS,{...account,connectionID:UUID.string()});
}
async function requestJSON(url,token,body){
    const request=new Request(url);request.timeoutInterval=12;
    request.headers=token?{Authorization:'Bearer '+token}:{};
    if(body){request.method='POST';request.headers['Content-Type']='application/x-www-form-urlencoded';request.body=body;}
    const text=await request.loadString(),status=request.response.statusCode;
    if(status<200||status>=300)throw Error(status===401||status===403||status===400?'auth':'network');
    return JSON.parse(text);
}
async function sync(kind){
    const account=read(CREDENTIALS);if(!account)throw Error('auth');
    const token=await requestJSON('https://securetoken.googleapis.com/v1/token?key='+API_KEY,null,'grant_type=refresh_token&refresh_token='+encodeURIComponent(account.refreshToken));
    if(token.user_id!==account.uid||!token.id_token||!token.refresh_token||read(CREDENTIALS)?.connectionID!==account.connectionID)throw Error('auth');
    save(CREDENTIALS,{...account,refreshToken:token.refresh_token});
    const base='https://firestore.googleapis.com/v1/projects/todo-ledger/databases/(default)/documents/users/'+encodeURIComponent(account.uid);
    const get=url=>requestJSON(url,token.id_token);
    let data={};
    if(contentKind(kind)==='work'){
        for(const def of WorkWidgetData.definitions){
            const shifts=await Core.list(get,base,'weeklyWorkShifts'+def.suffix);
            // A missing settings document is a valid new-account default; other errors must surface.
            const request=new Request(base+'/weeklyWorkMeta/settings'+def.suffix);request.timeoutInterval=12;request.headers={Authorization:'Bearer '+token.id_token};
            const text=await request.loadString();let settings={};
            if(request.response.statusCode===200)settings=Core.fields(JSON.parse(text).fields);
            else if(request.response.statusCode!==404)throw Error([401,403].includes(request.response.statusCode)?'auth':'network');
            data[def.id]={shifts,settings};
        }
    }
    if(contentKind(kind)==='todo'){
        [data.tasks,data.routines,data.checks,data.categories]=await Promise.all(
            ['personalTasks','personalRoutines','personalRoutineChecks','personalCategories'].map(name=>Core.list(get,base,name))
        );
    }
    if(read(CREDENTIALS)?.connectionID!==account.connectionID)throw Error('auth');
    const day=MobileModel.dayKey(new Date()),rows=isCalendar(kind)?[]:Core.today(WorkWidgetData,PlannerModel,day,data,kind);
    const snapshot={layoutVersion:2,uid:account.uid,day,rows:rows.slice(0,50),total:rows.length,updated:Date.now(),...(isCalendar(kind)?{calendar:Core.month(WorkWidgetData,PlannerModel,day,data,contentKind(kind),kind.split('-')[1])}:{})};
    save('pocket-paws-cache-'+kind,snapshot);return snapshot;
}
function text(parent,value,size=14,color='#30422a',bold=false){
    const label=parent.addText(String(value));label.font=bold?Font.boldSystemFont(size):Font.systemFont(size);label.textColor=new Color(color);label.lineLimit=1;label.minimumScaleFactor=.85;return label;
}
function widget(kind,snapshot,error,family=config.widgetFamily||'medium'){
    const small=family==='small',large=family==='large';
    const dimensions=widgetDimensions(family),contentWidth=dimensions.width-(small?20:28);
    const w=new ListWidget();w.setPadding(small?10:14,small?10:14,small?8:12,small?10:14);
    const gradient=new LinearGradient();gradient.colors=[new Color('#fffef6'),new Color('#edf1d9')];gradient.locations=[0,1];w.backgroundGradient=gradient;
    w.url=BASE+(contentKind(kind)==='work'?'/index.html':'/mobile/planner.html')+'?date=today';
    // Request a refresh just after Edmonton midnight even if the normal interval crosses it.
    w.refreshAfterDate=Core.nextRefresh(MobileModel);
    if(!MODES.includes(kind)){text(w,'Widget removed',16,'#30422a',true);w.addSpacer(8);text(w,'Use todo-month (Large) or work-week (Medium).',13,'#69765c').lineLimit=3;return w;}
    if(!allowedSizes(kind).includes(family)){
        text(w,'Widget size',16,'#30422a',true);w.addSpacer(8);
        text(w,'Choose '+allowedSizes(kind).join(' or ')+'.',14,'#69765c').lineLimit=3;
        return w;
    }
    if(isCalendar(kind)&&snapshot){
        const weekly=kind.endsWith('-week');
        if(weekly){gradient.colors=[new Color('#fffef2'),new Color('#eaf2da')];}
        w.setPadding(8,6,6,6);
        const width=dimensions.width-12;
        let headerHeight=0;
        if(!weekly){
            const header=w.addStack();header.centerAlignContent();
            text(header,snapshot.calendar.month+' · '+(contentKind(kind)==='work'?'WORK':'TO DO'),13,'#587b38',true);
            header.addSpacer();const mark=header.addImage(frogStamp());mark.imageSize=new Size(16,16);
            w.addSpacer(4);headerHeight=20;
        }
        const height=dimensions.height-14-headerHeight-(error?14:0);
        const image=w.addImage(drawMonthCalendar(snapshot,width,height));
        image.imageSize=new Size(width,height);image.resizable=true;image.applyFittingContentMode();
        if(error)text(w,'Offline · Open to sync',10,'#69765c');
        return w;
    }
    const title=w.addStack();title.centerAlignContent();text(title,isCalendar(kind)?((kind.endsWith('week')?'WEEK':snapshot?.calendar?.month||'MONTH')+' · '+(contentKind(kind)==='work'?'WORK':'TO DO')):kind==='work'?'TODAY · WORK':'TODAY · TO DO',12,'#69765c',true);title.addSpacer();
    const paw=title.addImage(frogStamp());paw.imageSize=new Size(17,17);paw.tintColor=new Color('#789847');
    w.addSpacer(8);
    if(!snapshot){
        text(w,error==='auth'?'Connect your account':'Unable to sync',16,'#30422a',true).lineLimit=2;
        w.addSpacer(6);text(w,'Run Pocket Paws in Scriptable.',12,'#69765c').lineLimit=2;
        w.url=URLScheme.forRunningScript();return w;
    }
    return w;
}
async function run(){
    let family=config.widgetFamily||'medium';
    let kind=String(args.widgetParameter||'todo-month').trim().toLowerCase();if(kind==='month')kind='todo-month';
    if(!config.runsInWidget){
        if(args.queryParameters?.state){await acceptConnection();}
        stage='menu';
        const menu=new Alert();menu.title='Pocket Pond';menu.message='Refresh data and preview';
        menu.addAction('Refresh monthly to do');menu.addAction('Refresh work week');menu.addAction('Connect / switch account');menu.addDestructiveAction('Disconnect');menu.addCancelAction('Cancel');
        const choice=await menu.presentSheet();
        if(choice<0)return;
        if(choice===2){await connect();return;}
        if(choice===3){forget(CREDENTIALS);forget(PENDING);clearCaches();return;}
        kind=MODES[choice];family=allowedSizes(kind)[0];
    }
    if(!MODES.includes(kind)){Script.setWidget(widget(kind,null,null,family));return;}
    let snapshot,error;
    try{snapshot=await sync(kind);}catch(e){
        error=e.message==='auth'?'auth':'network';const cached=read('pocket-paws-cache-'+kind),account=read(CREDENTIALS);
        if(error!=='auth'&&cached?.layoutVersion===2&&cached?.uid===account?.uid&&cached?.day===MobileModel.dayKey(new Date()))snapshot=cached;
    }
    stage='render-'+kind;
    const w=widget(kind,snapshot,error,family);Script.setWidget(w);
    if(!config.runsInWidget){
        if(family==='small')await w.presentSmall();
        else if(family==='large')await w.presentLarge();
        else await w.presentMedium();
    }
}
try{await run();}catch(e){
    // Never show raw exception messages: they can contain URLs or account credentials.
    const type=['TypeError','ReferenceError','SyntaxError','Error'].includes(e?.name)?e.name:'Error';
    const hint=e?.message==='WebCrypto unavailable'?'Local WebCrypto is unavailable.':'Please share this error code, not your account credentials.';
    if(!config.runsInWidget){const alert=new Alert();alert.title='Pocket Pond could not finish';alert.message='Build 3 · '+stage+' · '+type+'\n'+hint;alert.addAction('OK');await alert.presentAlert();}
    else Script.setWidget(widget('todo-month',null,'auth'));
}
Script.complete();

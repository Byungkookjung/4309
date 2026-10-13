// Pocket Paws: install this ONE file in Scriptable.
// Widget parameter: work or todo. Run inside the app to connect.
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
    const api={decode,fields,list,today};if(typeof module!=='undefined')module.exports=api;else root.ScriptableCore=api;
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
const BASE='https://todo-ledger.web.app';
const API_KEY='AIzaSyC4i32hyIRXhib_keTTr9zSj3AOolasYLc';
const CREDENTIALS='pocket-paws-v1-account',PENDING='pocket-paws-v1-pairing';
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
    forget(PENDING);forget('pocket-paws-cache-work');forget('pocket-paws-cache-todo');
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
    if(kind==='work'){
        for(const def of WorkWidgetData.definitions){
            const shifts=await Core.list(get,base,'weeklyWorkShifts'+def.suffix);
            // A missing settings document is a valid new-account default; other errors must surface.
            const request=new Request(base+'/weeklyWorkMeta/settings'+def.suffix);request.timeoutInterval=12;request.headers={Authorization:'Bearer '+token.id_token};
            const text=await request.loadString();let settings={};
            if(request.response.statusCode===200)settings=Core.fields(JSON.parse(text).fields);
            else if(request.response.statusCode!==404)throw Error([401,403].includes(request.response.statusCode)?'auth':'network');
            data[def.id]={shifts,settings};
        }
    }else{
        data.tasks=await Core.list(get,base,'personalTasks');
        data.routines=await Core.list(get,base,'personalRoutines');
        data.checks=await Core.list(get,base,'personalRoutineChecks');
        data.categories=await Core.list(get,base,'personalCategories');
    }
    if(read(CREDENTIALS)?.connectionID!==account.connectionID)throw Error('auth');
    const day=MobileModel.dayKey(new Date()),rows=Core.today(WorkWidgetData,PlannerModel,day,data,kind);
    const snapshot={uid:account.uid,day,rows:rows.slice(0,50),total:rows.length,updated:Date.now()};
    save('pocket-paws-cache-'+kind,snapshot);return snapshot;
}
function text(parent,value,size=14,color='#25475d',bold=false){
    const label=parent.addText(String(value));label.font=bold?Font.boldSystemFont(size):Font.systemFont(size);label.textColor=new Color(color);label.lineLimit=1;label.minimumScaleFactor=.85;return label;
}
function widget(kind,snapshot,error,family=config.widgetFamily||'medium'){
    const small=family==='small',large=family==='large';
    const w=new ListWidget();w.setPadding(small?10:14,small?10:14,small?8:12,small?10:14);
    const gradient=new LinearGradient();gradient.colors=[new Color('#f3fbff'),new Color('#e4f2fc')];gradient.locations=[0,1];w.backgroundGradient=gradient;
    w.url=BASE+(kind==='todo'?'/mobile/planner.html':'/index.html')+'?date=today';
    w.refreshAfterDate=new Date(Date.now()+15*60000);
    const title=w.addStack();title.centerAlignContent();text(title,kind==='work'?'TODAY · WORK':'TODAY · TO DO',12,'#527c97',true);title.addSpacer();
    const paw=title.addImage(SFSymbol.named('pawprint.fill').image);paw.imageSize=new Size(17,17);paw.tintColor=new Color('#559fcb');
    w.addSpacer(8);
    if(!snapshot){
        text(w,error==='auth'?'Connect your account':'Unable to sync',16,'#25475d',true).lineLimit=2;
        w.addSpacer(6);text(w,'Run Pocket Paws in Scriptable.',12,'#61798a').lineLimit=2;
        w.url=URLScheme.forRunningScript();return w;
    }
    if(kind==='work'){
        for(const job of snapshot.rows){
            const row=w.addStack();row.layoutVertically();row.setPadding(large?16:small?5:7,9,large?16:small?5:7,9);row.cornerRadius=12;
            row.backgroundColor=new Color(job.id==='iron'?'#e7f5ed':'#f0e8fb');
            const heading=row.addStack();heading.centerAlignContent();
            text(heading,small?(job.id==='iron'?'Iron Peak':'Booster'):job.name,small?11:13,job.id==='iron'?'#27744f':'#8052ae',true);
            heading.addSpacer();text(heading,job.status==='incomplete'?'—':'$'+job.amount.toFixed(2),small?11:large?20:14,'#25475d',true);
            text(row,job.status==='off'?'Day off':job.status==='incomplete'?'Check shift times':WorkWidgetData.displayTime(job.checkIn)+' – '+WorkWidgetData.displayTime(job.checkOut),small?12:large?22:16,'#25475d',true);
            w.addSpacer(6);
        }
    }else{
        const columns=small?1:2,limit=small?4:large?18:8,visible=snapshot.rows.slice(0,limit);
        if(!visible.length){text(w,'A clear little day',17,'#25475d',true);text(w,'No tasks for today.',13,'#61798a');}
        for(let index=0;index<visible.length;index+=columns){
            const line=w.addStack();line.centerAlignContent();
            for(const item of visible.slice(index,index+columns)){
                if(item!==visible[index])line.addSpacer(8);
                const color=item.categoryColor||'#479ee8';
                const row=line.addStack();row.centerAlignContent();row.setPadding(2,4,2,4);row.cornerRadius=5;row.backgroundColor=new Color(color,.10);
                const icon=row.addImage(SFSymbol.named(item.completed?'pawprint.fill':'circle').image);icon.imageSize=new Size(14,14);icon.tintColor=new Color(color);row.addSpacer(5);
                const label=text(row,item.title,14,item.completed?'#61798a':'#25475d',!item.completed);
                label.minimumScaleFactor=1;
                row.addSpacer();
            }
            w.addSpacer(3);
        }
        if(snapshot.total>limit)text(w,'+'+(snapshot.total-limit)+' more · Open planner',11,'#61798a');
    }
    w.addSpacer();
    const updated=new Date(snapshot.updated);const formatter=new DateFormatter();formatter.dateFormat='h:mm a';formatter.timeZone='America/Edmonton';
    text(w,(error?'Offline · ':'')+formatter.string(updated)+(kind==='work'&&!small?' · Estimated CAD':''),10,'#61798a');
    return w;
}
async function run(){
    let family=config.widgetFamily||'medium';
    let kind=String(args.widgetParameter||'work').trim().toLowerCase();if(!['work','todo'].includes(kind))kind='work';
    if(!config.runsInWidget){
        if(args.queryParameters?.state){await acceptConnection();}
        stage='menu';
        const menu=new Alert();menu.title='Pocket Paws';menu.message='Work & today’s tasks';
        menu.addAction('Preview work');menu.addAction('Preview to do');menu.addAction('Connect / switch account');menu.addDestructiveAction('Disconnect');menu.addCancelAction('Cancel');
        const choice=await menu.presentSheet();
        if(choice<0)return;
        if(choice===2){await connect();return;}
        if(choice===3){forget(CREDENTIALS);forget(PENDING);forget('pocket-paws-cache-work');forget('pocket-paws-cache-todo');return;}
        kind=choice===1?'todo':'work';
        const sizeMenu=new Alert();sizeMenu.title='Preview size';
        sizeMenu.addAction('Small');sizeMenu.addAction('Medium');sizeMenu.addAction('Large');sizeMenu.addCancelAction('Cancel');
        const sizeChoice=await sizeMenu.presentSheet();if(sizeChoice<0)return;
        family=['small','medium','large'][sizeChoice];
    }
    let snapshot,error;
    try{snapshot=await sync(kind);}catch(e){
        error=e.message==='auth'?'auth':'network';const cached=read('pocket-paws-cache-'+kind),account=read(CREDENTIALS);
        if(error!=='auth'&&cached?.uid===account?.uid&&cached?.day===MobileModel.dayKey(new Date()))snapshot=cached;
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
    if(!config.runsInWidget){const alert=new Alert();alert.title='Pocket Paws could not finish';alert.message='Build 3 · '+stage+' · '+type+'\n'+hint;alert.addAction('OK');await alert.presentAlert();}
    else Script.setWidget(widget('work',null,'auth'));
}
Script.complete();

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

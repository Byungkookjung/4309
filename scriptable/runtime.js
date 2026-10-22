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
        w.setPadding(weekly?8:6,weekly?6:2,weekly?6:5,weekly?6:2);
        const width=dimensions.width-(weekly?12:4);
        let headerHeight=0;
        if(!weekly){
            const header=w.addStack();header.centerAlignContent();
            header.addSpacer(16);header.addSpacer();
            text(header,snapshot.calendar.month+' · '+(contentKind(kind)==='work'?'WORK':'TO DO'),13,'#587b38',true);
            header.addSpacer();const mark=header.addImage(frogStamp());mark.imageSize=new Size(16,16);
            w.addSpacer(4);headerHeight=20;
        }
        const height=dimensions.height-(weekly?14:11)-headerHeight-(error?14:0);
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

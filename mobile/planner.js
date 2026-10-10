(async () => {
    const $ = id => document.getElementById(id), model = PlannerModel;
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let selected = MobileModel.dayKey(new Date()), month = selected.slice(0,7);
    let user = null, owner = null, tasks = [], routines = [], checks = [], unsub = [];
    let ready = false, busy = false, epoch = 0, editing = null;
    const dialog = $('taskEditor');
    let categories = [], categoryEditing = null;
    const categoryDialog = $('categoryEditor');
    const taskMenu=$('taskMenu');let menuItem=null;
    function openTaskMenu(item){
        if(!ready||busy)return;
        menuItem={...item};$('taskMenuTitle').textContent=item.title;
        $('taskMenuHint').textContent=item.kind==='routine'?'Date moves affect this occurrence only. Edit and delete affect the whole routine.':'';
        $('menuRoutine').hidden=item.kind==='routine';$('moveDateForm').hidden=true;$('taskMenuError').textContent='';taskMenu.showModal();
    }
    $('closeTaskMenu').onclick=()=>{if(!busy)taskMenu.close();};
    taskMenu.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('menuEdit').onclick=()=>{if(busy||!menuItem)return;taskMenu.close();openEditor(menuItem.kind,menuItem);};
    $('menuDelete').onclick=async()=>{if(!menuItem||busy)return;const request=epoch;if(await remove(menuItem.kind,menuItem)&&request===epoch)taskMenu.close();};
    async function moveItem(date){
        if(!menuItem||busy||!model.validDate(date)||date<'1900-01-01'||date>'2199-12-31')return;
        const item=menuItem,request=epoch;
        const saved=await write(ref=>{
            if(item.kind==='task')return ref.collection('personalTasks').doc(item.id).update({date});
            const original=item.occurrenceDate||item.date;
            return ref.collection('personalRoutineChecks').doc(item.id+'_'+original).set({routineId:item.id,date:original,movedDate:date,completed:!!item.completed});
        });
        if(saved&&request===epoch){taskMenu.close();selected=date;month=date.slice(0,7);render();}
    }
    $('menuTomorrow').onclick=()=>moveItem(MobileModel.nextDay(MobileModel.dayKey(new Date())));
    $('menuDate').onclick=()=>{if(busy)return;$('moveDate').value=menuItem.date||selected;$('moveDateForm').hidden=false;$('moveDate').focus();};
    $('moveDateForm').onsubmit=event=>{event.preventDefault();moveItem($('moveDate').value);};
    $('menuRoutine').onclick=()=>{
        if(!menuItem||busy||menuItem.kind==='routine')return;
        const item=menuItem;taskMenu.close();openEditor('routine',{title:item.title,startDate:item.date,categoryId:item.categoryId});
        editing.sourceTask={...item};$('editorTitle').textContent='Create routine';
    };
    const colors = ['#479ee8','#a18ae5','#53bca5','#ee8194','#efa36f','#202127'];
    const legacyColors = {'#367aa0':colors[0],'#8050ad':colors[1],'#28745c':colors[2],'#ae485b':colors[3],'#946319':colors[4],'#b46842':colors[4],'#637649':colors[2],'#5867a6':colors[1]};
    const categoryColor = category => colors.includes(category?.color) ? category.color : legacyColors[category?.color]||colors[0];
    const defaultCategory = () => ({id:'__daily__',name:'일상',color:colors[0],...categories.find(c=>c.id==='__daily__'||c.name==='일상'),name:'일상'});
    const categoryOptions = () => [...categories.filter(c=>c.id!==defaultCategory().id),defaultCategory()];
    const resolvedCategory = id => categoryOptions().some(c=>c.id===id)?id:defaultCategory().id;
    let drag = null;
    function stopDrag() {
        if(!drag)return;
        cancelAnimationFrame(drag.frame);drag.ghost?.remove();drag.row.classList.remove('dragging');
        document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
        drag=null;
    }
    function trackDrag() {
        if(!drag?.active)return;
        const {x,y}=drag;
        const edge=90, bottom=innerHeight-90;
        if(y<edge)window.scrollBy(0,-10);else if(y>bottom)window.scrollBy(0,10);
        drag.ghost.style.left=Math.max(8,Math.min(x+12,innerWidth-drag.ghost.offsetWidth-8))+'px';
        drag.ghost.style.top=Math.max(8,Math.min(y+16,innerHeight-drag.ghost.offsetHeight-8))+'px';
        const target=document.elementFromPoint(x,y)?.closest('.category-group');
        document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
        if(target)target.classList.add('drop-target');
        drag.target=target;drag.frame=requestAnimationFrame(trackDrag);
    }
    function dragHandle(item,row) {
        let moved=false;
        const handle=mutateButton('⠿','Move '+item.title,event=>{
            if(event.detail&&moved){event.preventDefault();return;}
            openEditor(item.kind,item);
        });
        handle.className='task-drag';handle.title='Drag to a category, or tap to choose one';
        handle.onpointerdown=event=>{
            if(!ready||busy||event.button!==0||drag)return;
            moved=false;
            handle.setPointerCapture(event.pointerId);
            drag={item,row,handle,id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,active:false};
        };
        handle.onpointermove=event=>{
            if(!drag||drag.id!==event.pointerId)return;
            drag.x=event.clientX;drag.y=event.clientY;
            if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>8){
                drag.active=true;moved=true;row.classList.add('dragging');
                drag.ghost=document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.textContent=item.title;drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost);trackDrag();
            }
        };
        handle.onpointerup=event=>{
            if(!drag||drag.id!==event.pointerId)return;
            const active=drag.active,target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.category-group'),categoryId=target?.dataset.categoryId;
            stopDrag();
            if(!active)return;
            if(target&&categoryId!==resolvedCategory(item.categoryId)){
                write(ref=>ref.collection(item.kind==='routine'?'personalRoutines':'personalTasks').doc(item.id).update({categoryId}));
            }
        };
        handle.onpointercancel=handle.onlostpointercapture=()=>stopDrag();
        return handle;
    }
    document.addEventListener('keydown',event=>{if(event.key==='Escape')stopDrag();});
    window.addEventListener('blur',stopDrag);
    function renderCategories() {
        $('categoryList').replaceChildren();
        for (const category of categoryOptions()) {
            const row=document.createElement('li');row.className='category-row';
            const name=document.createElement('strong');name.textContent=category.name;name.style.color=`color-mix(in srgb, ${categoryColor(category)} 65%, #172c3b)`;
            const actions=document.createElement('div');actions.className='task-actions';
            actions.append(mutateButton('✏️','Edit category '+category.name,()=>openCategory(category)));
            if(category.id!==defaultCategory().id)actions.append(mutateButton('🗑️','Delete category '+category.name,()=>{
                if(confirm('Delete this category? Tasks and routines will stay under 일상.')) write(ref=>ref.collection('personalCategories').doc(category.id).delete());
            }));
            row.append(name,actions);$('categoryList').append(row);
        }

        $('addCategory').disabled=!ready||busy;
    }
    function openCategory(category=null) {
        if(!ready||busy)return;
        categoryEditing=category?.id||null;$('categoryHeading').textContent=category?'Edit category':'New category';
        $('categoryName').value=category?.name||'';$('categoryName').disabled=category?.id===defaultCategory().id;
        document.querySelectorAll('[name="categoryColor"]').forEach(input=>{input.checked=input.value===categoryColor(category);});
        $('categoryError').textContent='';categoryDialog.showModal();
    }
    $('addCategory').onclick=()=>openCategory();
    $('closeCategory').onclick=()=>{if(!busy)categoryDialog.close();};
    categoryDialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('categoryForm').onsubmit=async event=>{
        event.preventDefault();if(busy)return;
        const name=$('categoryName').value.trim(),color=document.querySelector('[name="categoryColor"]:checked')?.value||colors[0];
        if(!name||name.length>60){$('categoryError').textContent='Enter a category name (up to 60 characters).';return;}
        if(categoryOptions().some(c=>c.id!==categoryEditing&&c.name.toLowerCase()===name.toLowerCase())){$('categoryError').textContent='This category name already exists.';return;}
        const id=categoryEditing,request=epoch;
        const saved=await write(ref=>{const collection=ref.collection('personalCategories');return(id?collection.doc(id):collection.doc()).set({name,color});});
        if(saved&&request===epoch)categoryDialog.close();
    };
    function button(text, label, action) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
        b.setAttribute('aria-label', label); b.onclick = action; return b;
    }
    function mutateButton(text, label, action) {
        const b = button(text,label,action);b.dataset.mutation='true';b.disabled=!ready||busy;
        const path = text==='✏️'?'M15 4l5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16z':text==='🗑️'?'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5':null;
        if(path){
            b.textContent='';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
            svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
            const shape=document.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d',path);svg.append(shape);b.append(svg);
        }
        return b;
    }
    function items(date) { return model.dayItems(tasks,routines,checks,date); }
    function render() {
        stopDrag();
        renderCategories();
        const year=Number(month.slice(0,4)), m=Number(month.slice(5)), first=new Date(`${month}-01T12:00:00Z`);
        const holidays=model.holidays(year), today=MobileModel.dayKey(new Date());
        $('plannerMonth').textContent=first.toLocaleDateString('en-CA',{month:'long',year:'numeric',timeZone:'UTC'});
        $('plannerGrid').replaceChildren();
        for(const name of [...names.slice(1),names[0]]){const label=document.createElement('span');label.className='weekday';label.textContent=name;$('plannerGrid').append(label);}
        for(let i=0;i<(first.getUTCDay()+6)%7;i++){$('plannerGrid').append(document.createElement('span'));}
        const count=new Date(Date.UTC(year,m,0)).getUTCDate();
        for(let n=1;n<=count;n++){
            const date=`${month}-${String(n).padStart(2,'0')}`, holiday=holidays.find(h=>h.date===date), day=new Date(date+'T12:00:00Z').getUTCDay();
            const entries=items(date), b=button(String(n),`${date}${holiday?', '+holiday.name+(holiday.optional?', optional holiday':''):''}, ${entries.length} tasks`,()=>{selected=date;render();});
            b.dataset.date=date;b.setAttribute('aria-pressed',String(date===selected));
            if(date===today)b.setAttribute('aria-current','date');
            if(day===0||day===6)b.classList.add('weekend');if(holiday)b.classList.add(holiday.optional?'optional':'holiday');if(entries.length)b.classList.add('has-tasks');
            $('plannerGrid').append(b);
        }
        $('selectedWeekday').textContent=new Date(selected+'T12:00:00Z').toLocaleDateString('en-CA',{weekday:'long',timeZone:'UTC'});
        $('selectedDate').textContent=new Date(selected+'T12:00:00Z').toLocaleDateString('en-CA',{month:'long',day:'numeric',timeZone:'UTC'});
        $('holidayNames').replaceChildren();
        for(const holiday of model.holidays(Number(selected.slice(0,4))).filter(h=>h.date===selected)){
            const p=document.createElement('p');p.className='holiday-name '+(holiday.optional?'optional':'holiday');p.textContent=holiday.name+(holiday.optional?' · Optional':' · Alberta');$('holidayNames').append(p);
        }
        const entries=items(selected);$('taskProgress').textContent=ready?`${entries.filter(t=>t.completed).length} of ${entries.length} done`:'Sign in to save your plans';
        $('taskList').replaceChildren();
        if(!entries.length)empty($('taskList'),ready?'A clear little day. Add something?':'Your plans stay in your account.');
        const groups = new Map();
        for(const category of categoryOptions()) {
            const group=document.createElement('li');group.className='category-group';group.dataset.categoryId=category.id;group.style.setProperty('--category-color',categoryColor(category));
            const head=document.createElement('div');head.className='category-heading';
            const label=document.createElement('h3');label.textContent=category.name;
            head.append(label,mutateButton('＋','Add task to '+category.name,()=>openEditor('task',null,category.id)));
            const list=document.createElement('ul');list.className='task-list';group.append(head,list);groups.set(category.id,list);
            $('taskList').append(group);
        }
        for(const item of entries){
            const li=document.createElement('li');li.className='task-item'+(item.completed?' done':'');
            const check=mutateButton(item.completed?'🐾':'○',(item.completed?'Mark incomplete: ':'Complete: ')+item.title,()=>toggle(item));check.textContent='';check.className='task-check';check.setAttribute('aria-pressed',String(!!item.completed));
            const title=mutateButton(item.title,'Task options: '+item.title,()=>openTaskMenu(item));title.className='task-title task-open';
            if(item.kind==='routine'){const tag=document.createElement('span');tag.className='task-kind';tag.textContent='Repeating routine';title.append(tag);}
            const actions=document.createElement('div');actions.className='task-actions';
            actions.prepend(dragHandle(item,li));
            li.onclick=event=>{if(!event.target.closest('button'))openTaskMenu(item);};
            li.append(check,title,actions);groups.get(resolvedCategory(item.categoryId)).append(li);
        }
        $('routineList').replaceChildren();if(!routines.length)empty($('routineList'),'Small habits, at your pace.');
        for(const routine of [...routines].sort((a,b)=>{const options=categoryOptions();return options.findIndex(c=>c.id===resolvedCategory(a.categoryId))-options.findIndex(c=>c.id===resolvedCategory(b.categoryId))||a.title.localeCompare(b.title);})){
            const li=document.createElement('li');li.className='task-item routine-item';
            const title=document.createElement('div');title.className='task-title';title.textContent=routine.title;
            const days=document.createElement('span');days.className='task-kind';days.textContent=categoryOptions().find(c=>c.id===resolvedCategory(routine.categoryId)).name+' · '+model.repeatLabel(routine);title.append(days);
            const actions=document.createElement('div');actions.className='task-actions';actions.append(mutateButton('✏️','Edit routine '+routine.title,()=>openEditor('routine',routine)),mutateButton('🗑️','Delete routine '+routine.title,()=>remove('routine',routine)));
            li.append(title,actions);$('routineList').append(li);
        }
        $('addTask').disabled=$('addRoutine').disabled=!ready||busy;
    }
    function empty(list,text){const li=document.createElement('li');li.className='empty-plan';li.textContent=text;list.append(li);}
    async function write(action){
        if(!ready||busy||!owner)return false;
        const request=epoch;busy=true;render();$('saveTask').disabled=$('saveCategory').disabled=true;
        taskMenu.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{await action(owner);if(request!==epoch)return false;$('plannerStatus').textContent='Saved to your account';return true;}
        catch(_){if(request===epoch){$('plannerStatus').textContent='Could not save. Please retry.';$('taskMenuError').textContent=$('editorError').textContent=$('categoryError').textContent='Could not save. Your changes are still here.';}return false;}
        finally{if(request===epoch){busy=false;$('saveTask').disabled=$('saveCategory').disabled=false;taskMenu.querySelectorAll('button').forEach(b=>b.disabled=false);render();}}
    }
    function toggle(item){
        const date=item.occurrenceDate||selected;
        write(ref=>item.kind==='routine'?ref.collection('personalRoutineChecks').doc(item.id+'_'+date).set({routineId:item.id,date,...(item.date!==date?{movedDate:item.date}:{}),completed:!item.completed}):ref.collection('personalTasks').doc(item.id).update({completed:!item.completed}));
    }
    function remove(kind,item){
        if(!confirm(kind==='routine'?'Delete this repeating routine?':'Delete this task?'))return;
        return write(ref=>ref.collection(kind==='routine'?'personalRoutines':'personalTasks').doc(item.id).delete());
    }
    function openEditor(kind,item=null,categoryId=''){
        if(!ready||busy)return;editing={kind,id:item?.id||null};$('editorTitle').textContent=(item?'Edit ':'New ')+(kind==='routine'?'routine':'task');
        $('taskTitle').value=item?.title||'';$('taskDate').value=(kind==='routine'?item?.startDate:item?.date)||selected;
        $('taskCategory').replaceChildren();
        for(const category of categoryOptions()){const option=document.createElement('option');option.value=category.id;option.textContent=category.name;$('taskCategory').append(option);}
        const chosen=item?.categoryId||categoryId;$('taskCategory').value=resolvedCategory(chosen);
        $('dateFieldLabel').textContent=kind==='routine'?'Starts on':'Date';$('repeatFields').hidden=kind!=='routine';$('repeatFields').disabled=kind!=='routine';$('editorError').textContent='';
        $('weekdayChoices').replaceChildren();
        names.forEach((name,index)=>{const b=button(name,name,()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true')));b.dataset.weekday=String(index);b.setAttribute('aria-pressed',String((item?.weekdays||[1,2,3,4,5]).includes(index)));$('weekdayChoices').append(b);});
        $('repeatFrequency').value=item?.frequency||'weekly';$('routineEnd').value=item?.endDate||'';
        $('monthChoices').replaceChildren();
        for(const value of [...Array.from({length:31},(_,i)=>i+1),'last']){
            const b=button(value==='last'?'Last day':String(value),value==='last'?'Last day of month':'Day '+value,()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true')));
            b.dataset.monthDay=String(value);b.setAttribute('aria-pressed',String(value==='last'?item?.lastDay===true:(item?.monthDays||[Number($('taskDate').value.slice(8))]).includes(value)));$('monthChoices').append(b);
        }
        updateRepeatFields();
        dialog.showModal();
    }
    function updateRepeatFields(){
        const frequency=$('repeatFrequency').value;
        $('weekdayChoices').hidden=!['weekly','biweekly'].includes(frequency);$('monthChoices').hidden=frequency!=='monthly';
        $('repeatHint').textContent=frequency==='monthly'?'Dates missing from a month are skipped. Choose Last day for every month.':frequency==='biweekly'?'Two-week cycles are counted from the start date.':frequency==='yearly'?'Repeats on the start date each year. February 29 repeats only in leap years.':'';
    }
    $('repeatFrequency').onchange=updateRepeatFields;
    $('taskForm').onsubmit=async event=>{
        event.preventDefault();if(!editing||busy)return;
        const title=$('taskTitle').value.trim(),date=$('taskDate').value;
        const weekdays=[...$('weekdayChoices').querySelectorAll('[aria-pressed=true]')].map(b=>Number(b.dataset.weekday));
        const frequency=$('repeatFrequency').value,endDate=$('routineEnd').value;
        const monthly=[...$('monthChoices').querySelectorAll('[aria-pressed=true]')].map(b=>b.dataset.monthDay);
        if(!title||title.length>200||!model.validDate(date)){$('editorError').textContent='Enter a title and a valid date.';return;}
        if(editing.kind==='routine'&&((['weekly','biweekly'].includes(frequency)&&!weekdays.length)||(frequency==='monthly'&&!monthly.length)||(endDate&&(!model.validDate(endDate)||endDate<date)))){$('editorError').textContent='Choose repeat days and an end date on or after the start date.';return;}
        const {kind,id,sourceTask}=editing, request=epoch;
        const payload=kind==='routine'?{title,startDate:date,weekdays}:{title,date,completed:tasks.find(t=>t.id===id)?.completed===true};
        if(kind==='routine')Object.assign(payload,{frequency,endDate,monthDays:monthly.filter(day=>day!=='last').map(Number),lastDay:monthly.includes('last')});
        payload.categoryId=$('taskCategory').value;
        const saved=await write(ref=>{
            const collection=ref.collection(kind==='routine'?'personalRoutines':'personalTasks');
            if(sourceTask){
                const routineRef=collection.doc(),batch=window.__ledgerAuth.db.batch();
                batch.set(routineRef,payload);batch.delete(ref.collection('personalTasks').doc(sourceTask.id));
                if(sourceTask.completed&&model.occurs(payload,sourceTask.date))batch.set(ref.collection('personalRoutineChecks').doc(routineRef.id+'_'+sourceTask.date),{routineId:routineRef.id,date:sourceTask.date,completed:true});
                return batch.commit();
            }
            return(id?collection.doc(id):collection.doc()).set(payload);
        });
        if(saved&&request===epoch){dialog.close();selected=date;month=date.slice(0,7);render();}
    };
    $('closeEditor').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('addTask').onclick=()=>openEditor('task');$('addRoutine').onclick=()=>openEditor('routine');
    function move(offset){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);if(d.getUTCFullYear()<1900||d.getUTCFullYear()>2199)return;month=d.toISOString().slice(0,7);selected=month+'-01';render();}
    $('previousMonth').onclick=()=>move(-1);$('nextMonth').onclick=()=>move(1);$('jumpToday').onclick=()=>{selected=MobileModel.dayKey(new Date());month=selected.slice(0,7);render();};render();
    await window.mobileAuthReady;const auth=window.__ledgerAuth;
    if(!auth?.auth){$('plannerSignIn').disabled=true;$('plannerStatus').textContent='Connect to the internet to sign in.';return;}
    $('plannerSignIn').onclick=async()=>{try{await auth.signInWithGoogle();}catch(_){$('plannerStatus').textContent='Sign-in did not finish. Please retry.';}};
    $('plannerSignOut').onclick=async()=>{try{await auth.auth.signOut();}catch(_){$('plannerStatus').textContent='Sign-out failed. Please retry.';}};
    auth.auth.onAuthStateChanged(account=>{
        taskMenu.close();menuItem=null;taskMenu.querySelectorAll('button').forEach(b=>b.disabled=false);
        ++epoch;const request=epoch;unsub.forEach(stop=>stop());unsub=[];user=account;owner=null;tasks=[];routines=[];checks=[];categories=[];ready=false;busy=false;editing=null;dialog.close();categoryDialog.close();$('saveTask').disabled=$('saveCategory').disabled=false;
        $('plannerLogin').hidden=!!account;$('plannerSignOut').hidden=!account;$('plannerStatus').textContent=account?'Loading your plans...':'Only you can see your plans.';render();if(!account)return;
        owner=auth.db.collection('users').doc(account.uid);const loaded=new Set(),failed=new Set();
        for(const name of ['personalTasks','personalRoutines','personalRoutineChecks','personalCategories']){
            unsub.push(owner.collection(name).onSnapshot(snapshot=>{
                if(request!==epoch)return;
                const rows=snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
                if(name==='personalTasks')tasks=rows;else if(name==='personalRoutines')routines=rows;else if(name==='personalCategories')categories=rows;else checks=rows;
                loaded.add(name);failed.delete(name);ready=loaded.size===4&&!failed.size;$('plannerStatus').textContent=failed.size?'Could not load plans. Reopen online to retry.':ready?'Your plans · Private':'Loading your plans...';render();
            },()=>{if(request===epoch){failed.add(name);ready=false;$('plannerStatus').textContent='Could not load plans. Reopen online to retry.';render();}}));
        }
    });
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
})();

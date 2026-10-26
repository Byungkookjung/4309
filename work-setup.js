(async()=>{
    const auth=window.__ledgerAuth||{};
    const shell=document.querySelector('.sheet-container');
    shell.hidden=true;
    const section=document.createElement('section');section.className='work-setup';section.hidden=true;
    const heading=document.createElement('h1');heading.textContent='Workplace settings';
    const status=document.createElement('p');status.setAttribute('role','status');
    section.append(heading,status);document.body.prepend(section);
    let user=null,owner=null,profile=null;
    function start(){
        window.__workJobs=profile.jobs;window.__workUser=user;
        section.hidden=true;shell.hidden=false;
        const script=document.createElement('script');script.src='app.js?v=20261025-workplaces';document.body.append(script);
        const time=document.createElement('script');time.src='mobile-time.js?v=20260911a';script.onload=()=>document.body.append(time);
    }
    try{
        if(auth.requireAuth){user=await auth.requireAuth();owner=auth.db.collection('users').doc(user.uid);profile=await WorkProfile.load(owner);}
        else{
            const saved=localStorage.getItem('weeklyWorkProfile');
            profile=saved?WorkProfile.validate(JSON.parse(saved)):WorkProfile.legacy.some(job=>['Shifts','Payouts','Settings'].some(type=>localStorage.getItem('weeklySheet'+type+job.suffix)))?{version:1,jobs:WorkProfile.legacy}:null;
        }
    }catch(error){section.hidden=false;status.textContent='Could not load workplace settings. Reload to retry. Your records have not been changed.';return;}
    if(user&&auth.auth?.currentUser?.uid!==user.uid){section.hidden=false;status.textContent='Account changed. Reload to load the current account.';return;}
    const manage=new URLSearchParams(location.search).get('setup')==='jobs';
    if(profile&&!manage){start();return;}
    section.hidden=false;
    status.textContent=profile?'Your saved shifts, payouts and pay settings will be kept.':'Set up your workplaces to start tracking shifts and pay.';
    const form=document.createElement('form');
    const list=document.createElement('div');
    const countLabel=document.createElement('label');countLabel.textContent='Number of workplaces';
    const count=document.createElement('input');count.type='number';count.min=String(profile?.jobs.length||1);count.max='10';count.value=String(profile?.jobs.length||1);count.required=true;countLabel.append(count);
    const drafts=[];
    function field(row,label,type,value,options={}){
        const wrap=document.createElement('label');wrap.textContent=label;
        const input=document.createElement('input');input.type=type;if(type==='checkbox')input.checked=value;else input.value=value;
        Object.assign(input,options);wrap.append(input);row.append(wrap);return input;
    }
    function addRow(index){
        const job=profile?.jobs[index],row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Workplace '+(index+1);row.append(legend);
        const name=field(row,'Name','text',job?.name||'',{required:true,maxLength:80});
        const tips=field(row,'Include tips','checkbox',job?.tips??false);
        const draft={row,job,name,tips};
        if(!job){
            draft.rate=field(row,'Hourly rate (CAD)','number','15',{required:true,min:'0',max:'100000',step:'0.01'});
            draft.holiday=field(row,'Holiday multiplier','number','1.5',{required:true,min:'1',max:'10',step:'0.1'});
            draft.anchor=field(row,'2-week period start','date',new Intl.DateTimeFormat('en-CA',{timeZone:'America/Edmonton',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),{required:true});
            draft.delay=field(row,'Payday: days after period ends','number','7',{required:true,min:'0',max:'60',step:'1'});
            function select(label,choices){
                const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('select');
                for(const [value,text] of choices){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}
                wrap.append(input);row.append(wrap);return input;
            }
            draft.frequency=select('Pay frequency',[['biweekly','Every 2 weeks'],['monthly','Monthly']]);
            draft.payday=select('Monthly payday',[['last','Last day of month'],...Array.from({length:31},(_,i)=>[String(i+1),'Day '+(i+1)])]);
            draft.payMonth=select('Pay month',[['0','Same month as work'],['1','Following month']]);
            row.insertBefore(draft.frequency.parentElement,draft.anchor.parentElement);
            const update=()=>{
                const monthly=draft.frequency.value==='monthly';
                for(const input of [draft.anchor,draft.delay]){input.disabled=monthly;input.parentElement.hidden=monthly;}
                for(const input of [draft.payday,draft.payMonth]){input.disabled=!monthly;input.parentElement.hidden=!monthly;}
            };
            draft.frequency.addEventListener('change',update);update();
        }else{const note=document.createElement('p');note.textContent='Existing pay settings are preserved. Change the hourly rate under Pay Settings on the work sheet.';row.append(note);}
        drafts.push(draft);list.append(row);
    }
    function resize(){
        const size=Number(count.value);if(!Number.isInteger(size)||size<Number(count.min)||size>10)return;
        while(drafts.length<size)addRow(drafts.length);
        drafts.forEach((draft,index)=>{draft.row.hidden=index>=size;draft.row.disabled=index>=size;});
    }
    count.addEventListener('input',resize);resize();
    const save=document.createElement('button');save.type='submit';save.className='primary-btn';save.textContent='Save workplaces';
    form.append(countLabel,list,save);
    if(profile){const cancel=document.createElement('button');cancel.type='button';cancel.className='ghost-btn';cancel.textContent='Cancel';cancel.onclick=()=>{const url=new URL(location.href);url.searchParams.delete('setup');location.assign(url.href);};form.append(cancel);}
    section.append(form);
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(!form.reportValidity())return;
        save.disabled=true;status.textContent='Saving workplaces...';
        try{
            const settings=[];
            const jobs=drafts.slice(0,Number(count.value)).map((draft,index)=>{
                if(draft.job)return {...draft.job,name:draft.name.value,tips:draft.tips.checked};
                const id='job_'+crypto.randomUUID().replaceAll('-','');
                const job={id,suffix:'Job_'+id.slice(4),name:draft.name.value,tips:draft.tips.checked,color:WorkProfile.colors[index%WorkProfile.colors.length]};
                settings.push({job,value:{hourlyRate:Number(draft.rate.value),holidayMultiplier:Number(draft.holiday.value),periodAnchor:draft.anchor.value,payoutDelay:Number(draft.delay.value),payrollScheduleVersion:1,
                    payFrequency:draft.frequency.value,monthlyPayDay:draft.payday.value,monthlyPayMonth:Number(draft.payMonth.value)}});
                return job;
            });
            const next=WorkProfile.validate({version:1,jobs});
            if(owner){
                if(auth.auth?.currentUser?.uid!==user.uid)throw Error('Account changed');
                const ref=owner.collection('weeklyWorkMeta').doc('jobs');
                await auth.db.runTransaction(async transaction=>{
                    const current=await transaction.get(ref);
                    if(current.exists&&JSON.stringify(WorkProfile.validate(current.data()))!==JSON.stringify(profile))throw Error('Workplaces changed in another tab. Reload before saving.');
                    if(!current.exists&&profile&&!profile.jobs.every(job=>WorkProfile.legacy.some(old=>old.id===job.id)))throw Error('Reload before saving.');
                    transaction.set(ref,next);
                    for(const item of settings)transaction.set(owner.collection('weeklyWorkMeta').doc('settings'+item.job.suffix),item.value);
                });
            }else{
                for(const item of settings)localStorage.setItem('weeklySheetSettings'+item.job.suffix,JSON.stringify(item.value));
                localStorage.setItem('weeklyWorkProfile',JSON.stringify(next));
            }
            profile=next;const url=new URL(location.href);url.searchParams.delete('setup');url.searchParams.set('job',next.jobs[0].id);location.assign(url.href);
        }catch(error){status.textContent=error.code?'Could not save. Check your connection and retry.':error.message;save.disabled=false;}
    });
})();

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

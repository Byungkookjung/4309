(function(root){
    const ee=typeof module!=='undefined'?require('../ee-model.js'):root.ExpectedBudget;
    const model=typeof module!=='undefined'?require('./model.js'):root.MobileModel;
    function summarize(plans,entries,now=new Date()){
        const today=model.dayKey(now),month=today.slice(0,7);
        const groups=['fixed','expected'].map(type=>({type,budget:0,spent:0}));
        for(const plan of plans){
            if(plan.deleted)continue;
            const group=groups.find(group=>group.type===(plan.type||'expected'));
            if(!group)continue;
            const amount=ee.budget({...plan,type:plan.type||'expected'});
            if(!Number.isFinite(amount)||amount<0)throw Error('Invalid budget');
            group.budget+=Math.round(amount*100);
        }
        for(const entry of entries){
            if(entry.type!=='expense'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date||'')||!entry.date.startsWith(month+'-')||entry.date>today)continue;
            const instant=Date.parse(entry.date+'T12:00:00Z');
            if(!Number.isFinite(instant)||new Date(instant).toISOString().slice(0,10)!==entry.date)continue;
            if(!Number.isFinite(entry.amount)||entry.amount<=0)continue;
            const group=groups.find(group=>group.type===(entry.sourceType||'expected'));
            // Count each transaction once, including unclassified and historical categories.
            if(group)group.spent+=ee.effective(entry);
        }
        const finish=group=>({...group,budget:group.budget/100,spent:group.spent/100,remaining:(group.budget-group.spent)/100,ratio:group.budget?Math.min(1,group.spent/group.budget):group.spent?1:0});
        return {month,groups:groups.map(finish),...finish(groups.reduce((total,group)=>({budget:total.budget+group.budget,spent:total.spent+group.spent}),{budget:0,spent:0}))};
    }
    const api={summarize};if(typeof module!=='undefined')module.exports=api;else root.MobileBudget=api;
})(globalThis);

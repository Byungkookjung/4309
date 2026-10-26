(function(root){
    const legacy = [
        {id:'booster',name:'Booster Juice',tips:true,suffix:'',color:'#8052ae'},
        {id:'iron',name:'Iron peak Auto Repair',tips:false,suffix:'IronPeak',color:'#27744f'}
    ];
    const colors=['#27744f','#8052ae','#367aa0','#ae485b','#946319'];
    function validate(profile){
        if(profile?.version!==1||!Array.isArray(profile.jobs)||profile.jobs.length<1||profile.jobs.length>10)throw Error('Invalid workplace profile.');
        const ids=new Set(),suffixes=new Set();
        const jobs=profile.jobs.map((job,index)=>{
            const builtIn=legacy.find(item=>item.id===job.id);
            if(typeof job.id!=='string'||!/^job_[a-z0-9]+$/.test(job.id)&&!builtIn||ids.has(job.id)
                ||job.suffix!==(builtIn?builtIn.suffix:'Job_'+job.id.slice(4))||suffixes.has(job.suffix)
                ||typeof job.name!=='string'||!job.name.trim()||job.name.trim().length>80||typeof job.tips!=='boolean')throw Error('Invalid workplace.');
            ids.add(job.id);suffixes.add(job.suffix);
            return {id:job.id,name:job.name.trim(),tips:job.tips,suffix:job.suffix,color:/^#[0-9a-f]{6}$/i.test(job.color||'')?job.color:colors[index%colors.length]};
        });
        return {version:1,jobs};
    }
    async function load(owner){
        const doc=await owner.collection('weeklyWorkMeta').doc('jobs').get({source:'server'});
        if(doc.exists)return validate(doc.data());
        // Only remote evidence counts for a signed-in account; never import another user's local cache.
        for(const job of legacy){
            const settings=await owner.collection('weeklyWorkMeta').doc('settings'+job.suffix).get({source:'server'});
            if(settings.exists)return {version:1,jobs:legacy.map(job=>({...job}))};
            for(const name of ['weeklyWorkShifts','weeklyWorkPayouts']){
                const rows=await owner.collection(name+job.suffix).limit(1).get({source:'server'});
                if(!rows.empty&&rows.docs.length)return {version:1,jobs:legacy.map(job=>({...job}))};
            }
        }
        return null;
    }
    const api={legacy,colors,validate,load};
    if(typeof module!=='undefined')module.exports=api;else root.WorkProfile=api;
})(globalThis);

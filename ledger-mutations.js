(function(root){
    const model=typeof module!=='undefined'?require('./ee-model.js'):root.ExpectedBudget;
    const sameLink=(a,b)=>a&&b&&a.sourceType===b.sourceType&&String(a.linkedPlanItemId||'')===String(b.linkedPlanItemId||'');
    function validateEntries(entries,previous,plans,editingIds=[]){
        if(new Set(entries.map(entry=>String(entry.id))).size!==entries.length)throw Error('Duplicate transaction IDs. Nothing was saved.');
        for(const entry of entries){
            const old=previous.find(row=>String(row.id)===String(entry.id));
            const editing=editingIds.includes(String(entry.id));
            if(editing&&!old)throw Error('This transaction was deleted. Reload before saving.');
            if(!editing&&old)throw Error('Transaction ID already exists. Reload and try again.');
            const linked=String(entry.linkedPlanItemId||'');
            if(!linked){
                const preserved=editing&&sameLink(old,entry)&&old.reason===entry.reason&&String(old.subcategoryId||'')===String(entry.subcategoryId||'');
                if(['expected','fixed','income'].includes(entry.sourceType)&&!preserved)throw Error('Choose an existing budget before saving.');
                continue;
            }
            const parent=plans.find(row=>String(row.id)===linked);
            if(!parent||parent.deleted){
                // A previously orphaned historical record can retain its saved link, never create a new one.
                if(editing&&sameLink(old,entry)&&String(old.subcategoryId||'')===String(entry.subcategoryId||''))continue;
                throw Error('The selected budget was deleted. Reload and choose an existing budget.');
            }
            if(parent.type!==entry.sourceType)throw Error('The selected budget type changed. Reload before saving.');
            if(entry.sourceType==='expected'&&entry.subcategoryId){
                const child=model.children(parent).find(row=>row.id===entry.subcategoryId);
                if(!child||child.archived||child.deleted){
                    if(editing&&sameLink(old,entry)&&old.subcategoryId===entry.subcategoryId)continue;
                    throw Error('The selected subcategory is unavailable. Reload before saving.');
                }
            }
        }
    }
    function checkDeletion(ids,plans,history){
        for(const id of ids){
            const parent=plans.find(row=>String(row.id)===id);
            if(!parent||parent.deleted)throw Error('A budget changed. Reload before deleting.');
            const reason=model.deletionBlockReason(parent,history,plans);if(reason)throw Error(reason);
        }
    }
    const version=doc=>Number(doc.data()?.version||0);
    async function saveRemote(store,entries,editingIds=[]){
        if(entries.length>450)throw Error('Import at most 450 entries at once. Nothing was saved.');
        await store.transaction(async tx=>{
            store.assertAccount();
            const revision=await tx.get(store.revision),previous=[],plans=[];
            for(const entry of entries){const doc=await tx.get(store.entry(String(entry.id)));if(doc.exists)previous.push({...doc.data(),id:doc.id});}
            for(const id of new Set(entries.map(entry=>String(entry.linkedPlanItemId||'')).filter(Boolean))){
                const doc=await tx.get(store.plan(id));if(doc.exists)plans.push({...doc.data(),id:doc.id});
            }
            validateEntries(entries,previous,plans,editingIds);store.assertAccount();
            for(const entry of entries)tx.set(store.entry(String(entry.id)),entry);
            tx.set(store.revision,{version:version(revision)+1});
        });
    }
    async function deleteRemote(store,ids){
        store.assertAccount();
        // Read revision BEFORE the history query; every app entry save participates in this fence.
        const initial=await store.revision.get({source:'server'});
        const plans=await store.listPlans(),history=await store.listEntries();
        checkDeletion(ids,plans,history);
        await store.transaction(async tx=>{
            store.assertAccount();const revision=await tx.get(store.revision);
            if(version(revision)!==version(initial))throw Error('Transactions or budgets changed while deleting. Reload and review; nothing was deleted.');
            const current=[];
            for(const id of ids){const doc=await tx.get(store.plan(id));if(doc.exists)current.push({...doc.data(),id:doc.id});}
            checkDeletion(ids,current,history);store.assertAccount();
            const normalize=store.normalizePlan||model.normalize;
            for(const parent of current){
                if(JSON.stringify(normalize(parent))!==JSON.stringify(normalize(plans.find(row=>String(row.id)===String(parent.id)))))throw Error('A budget changed while deleting. Reload and review it.');
            }
            for(const parent of current){
                if(parent.type==='expected')tx.set(store.plan(String(parent.id)),model.removeParent(parent));
                else tx.delete(store.plan(String(parent.id)));
            }
            tx.set(store.revision,{version:version(revision)+1});
        });
    }
    async function withLocalLock(callback){
        if(!root.navigator?.locks?.request)throw Error('Safe local saving requires a browser with Web Locks support. Use a current browser or sign in.');
        return root.navigator.locks.request('ledger-budget-activity-write',callback);
    }
    const api={validateEntries,checkDeletion,saveRemote,deleteRemote,withLocalLock};
    if(typeof module!=='undefined')module.exports=api;else root.LedgerMutations=api;
})(globalThis);

(function(root){
    const model=root.ExpectedBudget;
    const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
    const openEditors=new Set(),openProgress=new Set();let busy=false;
    function notify(error){alert(error.code?'Could not save EE settings. Check your connection and reload.':error.message);}
    async function save(changes){
        if(!eePlansReady||requireAuthRef&&!currentUser)throw Error('Wait for your account budgets to finish loading.');
        if(busy)throw Error('An EE save is already in progress.');busy=true;
        const user=currentUser,previous=planItems.map(item=>structuredClone(item));
        const signature=items=>JSON.stringify(items.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));
        try{
            if(changes.some(item=>item.type!=='expected')||new Set(changes.map(item=>item.id)).size!==changes.length)throw Error('Only unique EE parents can be saved here.');
            if(isRemoteEnabled()){
                if(authApi.auth?.currentUser?.uid!==user.uid)throw Error('Account changed. Reload before saving.');
                const revision=dbRef.collection('users').doc(user.uid).collection('ledgerSettings').doc('eeRevision');
                const initialRevision=await revision.get({source:'server'});
                const latest=await planCollection(user).get({source:'server'});
                if(signature(normalizePlanItems(latest.docs.map(doc=>({id:doc.id,...doc.data()}))))!==signature(previous))throw Error('This budget changed in another tab. Reload before saving.');
                await dbRef.runTransaction(async transaction=>{
                    if(authApi.auth?.currentUser?.uid!==user.uid)throw Error('Account changed. Reload before saving.');
                    const revisionDoc=await transaction.get(revision);
                    if(Number(revisionDoc.data()?.version||0)!==Number(initialRevision.data()?.version||0))throw Error('EE budgets changed while saving. Review and try again.');
                    const docs=[];for(const item of changes)docs.push(await transaction.get(planCollection(user).doc(String(item.id))));
                    changes.forEach((item,index)=>{
                        const old=previous.find(plan=>plan.id===item.id),doc=docs[index];
                        if(Boolean(old)!==doc.exists||old&&JSON.stringify(normalizePlanItem({id:doc.id,...doc.data()}))!==JSON.stringify(old))throw Error('This budget changed in another tab. Reload before saving.');
                    });
                    changes.forEach(item=>transaction.set(planCollection(user).doc(String(item.id)),model.normalize(item),{merge:true}));
                    transaction.set(revision,{version:Number(revisionDoc.data()?.version||0)+1});
                });
            }else{
                const stored=JSON.parse(localStorage.getItem(STORAGE_PLAN_ITEMS)||'[]');
                if(signature(normalizePlanItems(stored))!==signature(previous))throw Error('This budget changed in another tab. Reload before saving.');
                // Merge into raw local records so untouched FE/EI and custom metadata stay byte-equivalent as objects.
                const updated=stored.map(item=>{const change=changes.find(change=>change.id===String(item.id));return change?{...item,...change}:item;});
                for(const item of changes)if(!updated.some(plan=>String(plan.id)===item.id))updated.push(item);
                localStorage.setItem(STORAGE_PLAN_ITEMS,JSON.stringify(updated));planItems=normalizePlanItems(updated);
                renderPlan();renderDashboard();renderActivity();updateActivitySourceControls();
            }
        }finally{busy=false;}
    }
    function remember(details,set,id){details.open=set.has(id);details.addEventListener('toggle',()=>{if(details.isConnected){if(details.open)set.add(id);else set.delete(id);}});}
    function addEditor(li,item){
        if(item.type!=='expected')return;
        const details=el('details',undefined,'ee-editor');remember(details,openEditors,item.id);
        details.append(el('summary',`하위 분류 · ${formatCurrency(model.budget(item))}`));
        const form=el('form'),list=el('div',undefined,'ee-editor-list'),message=el('p',undefined,'ee-help');
        message.textContent='부모 예산은 활성 하위 예산의 합계입니다. 보관된 분류의 과거 지출은 유지됩니다. 기존 거래는 자동 분류하지 않습니다.';
        const draft=model.children(item).map(child=>({...child}));
        function render(){
            list.replaceChildren();
            draft.forEach(child=>{
                const row=el('div',undefined,'ee-edit-row');row.dataset.subcategoryId=child.id;
                const name=el('input');name.value=child.label;name.required=true;name.maxLength=80;name.setAttribute('aria-label','Subcategory name');
                const amount=el('input');amount.type='number';amount.min='0';amount.max='1000000';amount.step='.01';amount.required=true;amount.value=child.amount;amount.setAttribute('aria-label','Subcategory monthly budget');
                name.disabled=amount.disabled=child.archived;
                name.oninput=()=>child.label=name.value;amount.oninput=()=>child.amount=amount.value;
                const archive=el('button',child.draft?'Remove draft':child.archived?'Restore':'Archive','ghost-btn');archive.type='button';
                archive.onclick=()=>{if(child.draft)draft.splice(draft.indexOf(child),1);else child.archived=!child.archived;render();};
                row.append(name,amount,archive);if(child.archived)row.append(el('small','보관됨 · 월예산 합계에서 제외'));list.append(row);
            });
        }
        render();
        const add=el('button','Add subcategory','ghost-btn');add.type='button';
        add.onclick=()=>{draft.push({id:'sub_'+crypto.randomUUID(),label:'',amount:draft.length?0:item.amount,archived:false,draft:true});render();};
        const submit=el('button','Save subcategories','primary-btn');submit.type='submit';
        form.append(message,list,add,submit);
        form.onsubmit=async event=>{
            event.preventDefault();if(!form.reportValidity())return;
            submit.disabled=true;
            try{
                const next=model.normalize({...item,subcategories:draft});
                if(next.amount!==item.amount&&!confirm(`부모 월예산: ${formatCurrency(item.amount)} → ${formatCurrency(next.amount)}. 저장할까요?`))return;
                await save([next]);
            }catch(error){notify(error);}finally{submit.disabled=false;}
        };
        details.append(form);li.append(details);
    }
    function updateSelect(savedEntry=null,reset=false){
        const field=document.getElementById('activitySubcategoryField'),select=document.getElementById('activitySubcategory');
        const enabled=activitySourceTypeSelect.value==='expected';field.hidden=!enabled;select.disabled=!enabled;
        const parent=planItems.find(item=>item.id===activityLinkedItemSelect.value&&item.type==='expected');
        const oldId=savedEntry?.subcategoryId||(!reset&&select.dataset.parent===parent?.id?select.value:'');
        select.replaceChildren();const empty=el('option','미분류');empty.value='';select.append(empty);
        const child=model.children(parent||{}).find(child=>child.id===oldId);
        for(const entry of model.children(parent||{}).filter(child=>!child.archived)){
            const option=el('option',`${entry.label} (${formatCurrency(entry.amount)})`);option.value=entry.id;select.append(option);
        }
        const editing=editingActivityId&&activityEntries.find(entry=>String(entry.id)===String(editingActivityId));
        if(oldId&&(child?.archived||!child)&&editing?.subcategoryId===oldId){const option=el('option',model.subcategoryLabel(editing,planItems));option.value=oldId;select.append(option);}
        select.value=oldId||'';if(select.selectedIndex<0)select.value='';select.dataset.parent=parent?.id||'';
    }
    function assignment(parent,editing){
        const id=document.getElementById('activitySubcategory').value;
        if(!parent||parent.type!=='expected')return {subcategoryId:id&&editing?.subcategoryId===id?id:'',subcategoryLabel:id&&editing?.subcategoryId===id?editing.subcategoryLabel||'':''};
        const child=model.children(parent).find(child=>child.id===id);
        if(id&&(!child||child.archived)&&!(editing?.subcategoryId===id&&model.resolve(editing,planItems)?.id===parent.id))throw Error('Choose an active subcategory.');
        return {subcategoryId:id,subcategoryLabel:child?.label||(id?editing?.subcategoryLabel:'')||''};
    }
    function metric(row){
        const box=el('div',undefined,'ee-metric'),planned=row.planned,actual=row.actual;
        const ratio=planned>0?actual/planned:null,over=planned!==null&&actual>planned;
        box.classList.toggle('ee-over',over);box.classList.toggle('ee-warning',!over&&ratio>=.8);
        box.append(el('strong',row.label+(row.archived?' (보관됨)':'')));
        box.append(el('span',`월예산 ${planned===null?'없음':formatCurrency(planned)} · 사용 ${formatCurrency(actual)} · ${planned===null?'예산 미지정':over?`${formatCurrency(actual-planned)} 초과`:`${!over&&ratio>=.8?'주의 · ':''}${formatCurrency(planned-actual)} 남음`} · ${ratio!==null?(ratio*100).toFixed(1)+'%':planned===0&&actual>0?'예산 없이 지출':'—'}`));
        if(planned!==null){const bar=el('progress');bar.max=Math.max(planned,actual,1);bar.value=actual;bar.setAttribute('aria-label',row.label+' spending');box.append(bar);}
        return box;
    }
    function renderProgress(container,entries){
        container.replaceChildren();
        for(const parent of planItems.filter(item=>item.type==='expected')){
            const row=model.breakdown(parent,entries,planItems),details=el('details',undefined,'ee-progress-parent');remember(details,openProgress,parent.id);
            const summary=el('summary');summary.append(metric(row));details.append(summary);
            for(const child of row.children)details.append(metric(child));container.append(details);
        }
        const review=entries.filter(entry=>entry.type==='expense'&&entry.sourceType==='expected'&&!model.resolve(entry,planItems));
        if(review.length){container.append(metric({label:'확인 필요 · 연결되지 않은 EE',planned:null,actual:review.reduce((sum,entry)=>sum+model.effective(entry),0)/100}));}
    }
    function init(){
        document.getElementById('eeTemplatePreviewBtn').onclick=()=>{
            if(!eePlansReady){alert('Wait for your budgets to finish loading.');return;}
            const original=JSON.stringify(planItems);
            const panel=document.getElementById('eeTemplatePreview');panel.replaceChildren();
            const rows=model.preview(planItems),choices={};let invalid=false;
            for(const row of rows){
                const box=el('label',undefined,'ee-template-row');
                box.append(el('span',`${row.template.label}: ${row.existing?formatCurrency(row.existing.amount):'새 항목'} → 권장 ${formatCurrency(row.template.amount)}`));
                if(row.conflict){box.append(el('strong','중복 부모가 있습니다. 먼저 확인하세요.'));invalid=true;}
                else if(row.existing&&model.hierarchical(row.existing))box.append(el('span','이미 설정된 하위 분류 유지'));
                else if(row.existing){const select=el('select');for(const [value,label] of [['keep','기존 부모 예산 유지 (하위에 비례 배분)'],['recommended','권장 예산 적용']]){const option=el('option',label);option.value=value;select.append(option);}select.onchange=()=>choices[row.template.id]=select.value;box.append(select);}
                else box.append(el('span','권장 기본값으로 추가'));
                panel.append(box);
            }
            panel.append(el('p','기존 부모 ID는 유지됩니다. 기존 거래는 변경되지 않습니다. 기타 사용자 EE 항목도 그대로 유지됩니다.','ee-help'));
            const apply=el('button','Apply reviewed template','primary-btn');apply.type='button';apply.disabled=invalid;
            apply.onclick=async()=>{if(JSON.stringify(planItems)!==original){alert('Budgets changed. Review the template again before applying.');return;}if(!confirm('검토한 EE 예산 템플릿만 적용할까요? 거래·고정지출·수입·은행 잔액은 변경하지 않습니다.'))return;apply.disabled=true;try{await save(model.applyTemplate(planItems,choices));panel.replaceChildren();}catch(error){notify(error);}finally{apply.disabled=invalid;}};
            panel.append(apply);
        };
    }
    root.EELedger={addEditor,updateSelect,assignment,renderProgress,init,save};
})(globalThis);

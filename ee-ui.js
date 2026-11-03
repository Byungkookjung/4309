(function(root){
    const model=root.ExpectedBudget;
    const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
    let busy=false;
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
                await LedgerMutations.withLocalLock(()=>{
                    const stored=JSON.parse(localStorage.getItem(STORAGE_PLAN_ITEMS)||'[]');
                    if(signature(normalizePlanItems(stored))!==signature(previous))throw Error('This budget changed in another tab. Reload before saving.');
                    // Merge into raw local records so untouched FE/EI and custom metadata stay byte-equivalent as objects.
                    const updated=stored.map(item=>{const change=changes.find(change=>change.id===String(item.id));return change?{...item,...change}:item;});
                    for(const item of changes)if(!updated.some(plan=>String(plan.id)===item.id))updated.push(item);
                    localStorage.setItem(STORAGE_PLAN_ITEMS,JSON.stringify(updated));planItems=normalizePlanItems(updated);
                    renderPlan();renderDashboard();renderActivity();updateActivitySourceControls();
                });
            }
        }finally{busy=false;}
    }
    const collapsedEditors=new Set(),collapsedProgress=new Set();
    function remember(details,set,id){details.open=!set.has(id);details.addEventListener('toggle',()=>{if(details.isConnected){if(details.open)set.delete(id);else set.add(id);}});}
    const paths={edit:'M16 3l5 5-12 12H4v-5L16 3z M13 6l5 5',delete:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',plus:'M12 5v14 M5 12h14',close:'M6 6l12 12 M18 6L6 18',check:'M5 12l4 4L19 6',chevron:'M6 9l6 6 6-6'};
    function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]);svg.append(path);return svg;}
    function button(name,label,handler){const node=el('button',undefined,'ee-icon-button'+(name==='delete'?' ee-delete':''));node.type='button';node.title=label;node.setAttribute('aria-label',label);node.append(icon(name));node.onclick=handler;return node;}
    function addEditor(li,item){
        if(item.type!=='expected'||item.deleted)return;
        const details=el('details',undefined,'ee-editor');remember(details,collapsedEditors,item.id);
        const children=model.children(item).filter(child=>!child.archived&&!child.deleted),summary=el('summary');
        summary.setAttribute('aria-label',item.label+' 하위 항목 접기/펼치기');
        summary.append(icon('chevron'));details.append(summary);
        const list=el('div',undefined,'ee-edit-list');
        async function commit(next){
            const changed=model.normalize({...item,subcategories:next});
            await save([changed]);
        }
        function edit(child=null,row=null){
            const form=el('form',undefined,'ee-inline-form');
            const name=el('input');name.value=child?.label||'';name.required=true;name.maxLength=80;name.placeholder='분류 이름';name.setAttribute('aria-label','하위 분류 이름');
            const amount=el('input');amount.type='number';amount.min='0';amount.step='.01';amount.required=true;amount.value=child?.amount??(model.children(item).length?0:item.amount);amount.setAttribute('aria-label','하위 분류 월예산');
            const actions=el('div',undefined,'ee-row-actions');
            const submit=button('check','저장',()=>form.requestSubmit());
            const cancel=button('close','취소',()=>{if(row)form.replaceWith(row);else form.remove();});actions.append(submit,cancel);form.append(name,amount,actions);
            form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;
                try{const next={id:child?.id||'sub_'+crypto.randomUUID(),label:name.value,amount:Number(amount.value),archived:false};
                    await commit(child?model.children(item).map(value=>value.id===child.id?next:value):[...model.children(item),next]);
                }catch(error){notify(error);submit.disabled=false;}
            };
            if(row)row.replaceWith(form);else list.append(form);name.focus();
        }
        for(const child of children){
            const row=el('div',undefined,'ee-child-row');row.dataset.subcategoryId=child.id;
            const info=el('div',undefined,'ee-child-name');info.append(el('span',child.label),el('small','월예산'));
            const amount=el('strong',formatCurrency(child.amount),'ee-child-amount'),actions=el('div',undefined,'ee-row-actions');
            actions.append(button('edit',child.label+' 수정',()=>edit(child,row)),button('delete',child.label+' 삭제',async()=>{
                if(!confirm(`「${child.label}」 하위 분류를 삭제할까요? 기존 거래 내역은 유지됩니다.`))return;
                try{await commit(model.children(item).map(value=>value.id===child.id?{...value,deleted:true}:value));}catch(error){notify(error);}
            }));row.append(info,amount,actions);list.append(row);
        }
        if(!children.length)list.append(el('p','아직 하위 분류가 없어요. 필요한 항목만 추가하세요.','ee-empty'));
        const add=el('button',undefined,'ee-add');add.type='button';add.append(icon('plus'),el('span','하위 분류 추가'));add.onclick=()=>{if(!list.querySelector('.ee-inline-form'))edit();};
        details.append(list,add);li.append(details);
    }
    function updateSelect(savedEntry=null,reset=false){
        const field=document.getElementById('activitySubcategoryField'),select=document.getElementById('activitySubcategory');
        const enabled=activitySourceTypeSelect.value==='expected';field.hidden=!enabled;select.disabled=!enabled;
        const parent=planItems.find(item=>item.id===activityLinkedItemSelect.value&&item.type==='expected'&&!item.deleted);
        const oldId=savedEntry?.subcategoryId||(!reset&&select.dataset.parent===parent?.id?select.value:'');
        select.replaceChildren();const empty=el('option','미분류');empty.value='';select.append(empty);
        const child=model.children(parent||{}).find(child=>child.id===oldId);
        for(const entry of model.children(parent||{}).filter(child=>!child.archived&&!child.deleted)){
            const option=el('option',`${entry.label} (${formatCurrency(entry.amount)})`);option.value=entry.id;select.append(option);
        }
        const editing=editingActivityId&&activityEntries.find(entry=>String(entry.id)===String(editingActivityId));
        if(oldId&&(child?.archived||child?.deleted||!child)&&editing?.subcategoryId===oldId){const option=el('option',model.subcategoryLabel(editing,planItems));option.value=oldId;select.append(option);}
        select.value=oldId||'';if(select.selectedIndex<0)select.value='';select.dataset.parent=parent?.id||'';
    }
    function assignment(parent,editing){
        const id=document.getElementById('activitySubcategory').value;
        if(!parent||parent.type!=='expected')return {subcategoryId:id&&editing?.subcategoryId===id?id:'',subcategoryLabel:id&&editing?.subcategoryId===id?editing.subcategoryLabel||'':''};
        const child=model.children(parent).find(child=>child.id===id);
        if(id&&(!child||child.archived||child.deleted)&&!(editing?.subcategoryId===id&&model.resolve(editing,planItems)?.id===parent.id))throw Error('사용 가능한 하위 분류를 선택해 주세요.');
        return {subcategoryId:id,subcategoryLabel:child?.label||(id?editing?.subcategoryLabel:'')||''};
    }
    function metric(row,parent=false,income=false){
        const box=el('div',undefined,'ee-metric'+(parent?' ee-parent-metric':'')),planned=row.planned,actual=row.actual,ratio=planned>0?actual/planned:null,over=planned!==null&&actual>planned;
        box.classList.toggle('ee-over',!income&&over);box.classList.toggle('ee-warning',!income&&!over&&ratio>=.8);
        const name=el('div',undefined,'ee-metric-name');name.append(el('strong',row.label+(row.deleted?' · 삭제됨':row.archived?' · 이전 분류':'')));
        const delta=income?(planned===null?'입금 합계':over?'예상보다 '+formatCurrency(actual-planned)+' 더 입금':formatCurrency(planned-actual)+' 입금 예정'):planned===null?'예산 미지정':over?formatCurrency(actual-planned)+' 초과':formatCurrency(planned-actual)+' 남음';if(!parent)name.append(el('small',delta,'ee-delta'));
        const amount=el('div',undefined,'ee-metric-amount');amount.append(el('strong',formatCurrency(actual)),el('small',planned===null?(income?'비정기 수입':'예산 없음'):'/ '+formatCurrency(planned)+(income?' 예상 수입':' 월예산')));
        box.append(name,amount);
        if(planned!==null&&parent){const bar=el('progress');bar.max=Math.max(planned,actual,1);bar.value=actual;bar.setAttribute('aria-label',row.label+(income?' 수입 달성률':' 예산 사용률'));box.append(bar,el('small',delta+' · '+(ratio===null?'—':(ratio*100).toFixed(0)+'%'),'ee-percent'));}
        return box;
    }
    function renderProgress(container,entries){
        container.replaceChildren();
        for(const parent of planItems.filter(item=>item.type==='expected')){
            const row=model.breakdown(parent,entries,planItems);
            if(parent.deleted&&!row.actual)continue;
            const details=el('details',undefined,'ee-progress-parent');remember(details,collapsedProgress,parent.id);
            const summary=el('summary');summary.append(metric({...row,planned:parent.deleted?null:row.planned,deleted:parent.deleted},true),icon('chevron'));details.append(summary);
            const children=el('div',undefined,'ee-progress-children');
            for(const child of row.children){if((child.deleted||child.archived||child.id==='__unclassified__')&&!child.actual)continue;children.append(metric({...child,planned:parent.deleted||child.deleted?null:child.planned}));}
            if(!children.childElementCount)children.append(el('p','이번 기간의 사용 내역이 없어요.','ee-empty'));
            details.append(children);container.append(details);
        }
        const review=entries.filter(entry=>entry.type==='expense'&&entry.sourceType==='expected'&&!model.resolve(entry,planItems));
        if(review.length)container.append(metric({label:'확인 필요',planned:null,actual:review.reduce((sum,entry)=>sum+model.effective(entry),0)/100}));
        if(!container.childElementCount)container.append(el('p','예상 지출을 추가하면 여기에서 사용 내역을 볼 수 있어요.','ee-empty'));
    }
    function renderSimpleProgress(container,rows,type){
        container.replaceChildren();
        for(const row of rows){
            const card=el('div',undefined,'ee-progress-parent ee-simple-progress');
            card.append(metric(row,true,['income','unexpected_income'].includes(type)));container.append(card);
        }
        if(!rows.length)container.append(el('p','이번 기간에 표시할 내역이 없어요.','ee-empty'));
    }
    root.EELedger={addEditor,updateSelect,assignment,renderProgress,renderSimpleProgress,save,parentEditButton:(item,handler)=>button('edit',item.label+' 상위 분류 수정',handler)};
})(globalThis);

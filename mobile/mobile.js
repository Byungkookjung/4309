(async () => {
    const $ = id => document.getElementById(id);
    const model = MobileModel;
    const money = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
    let user = null, data = null, sample = false, busy = false, version = 0;
    let installPrompt = null;
    function renderBudget() {
        const state=MobileBudget.summarize(data.budgets,data.entries);
        $('budgetMonth').textContent=state.month+' / CAD';
        $('budgetRemainingLabel').textContent=state.remaining<0?'이번 달 초과 지출':'이번 달 남은 예산';
        $('budgetRemaining').textContent=money(Math.abs(state.remaining));
        $('budgetRemaining').classList.toggle('over-budget',state.remaining<0);
        $('budgetTotal').textContent='사용 '+money(state.spent)+' / 월예산 '+money(state.budget);
        $('budgetGroups').replaceChildren();
        for(const group of state.groups){
            const row=document.createElement('article');row.className='budget-group';
            const heading=document.createElement('div');heading.className='budget-group-heading';
            const title=document.createElement('h3');title.textContent=group.type==='fixed'?'고정 지출':'예상 지출';
            const remaining=document.createElement('span');remaining.textContent=money(Math.abs(group.remaining))+(group.remaining<0?' 초과':' 남음');remaining.classList.toggle('over-budget',group.remaining<0);
            heading.append(title,remaining);
            const values=document.createElement('p');values.className='budget-group-values';
            const used=document.createElement('strong');used.textContent=money(group.spent);
            const budget=document.createElement('span');budget.textContent='사용 / '+money(group.budget)+' 월예산';values.append(used,budget);
            const progress=document.createElement('progress');progress.max=1;progress.value=group.ratio;progress.setAttribute('aria-label',title.textContent+' 예산 사용률');progress.classList.toggle('over-budget',group.remaining<0);
            row.append(heading,values,progress);$('budgetGroups').append(row);
        }
    }
    function render() {
        if (!data) return;
        const now = new Date(), today = model.dayKey(now);
        if (today.slice(0, 7) !== data.month) { $('dashboard').hidden = true; return; }
        $('dashboard').hidden = false;
        const state = model.summarize(data, now);
        $('monthLabel').textContent = state.month + ' / CAD';
        $('spent').textContent = money(state.spent); $('earned').textContent = money(state.earned);
        $('mood').textContent = ''; $('mood').dataset.over = String(state.spent > state.earned);
        $('mood').setAttribute('aria-label', state.spent > state.earned ? 'Spending exceeds income' : 'Income covers spending');
        renderBudget();
    }
    async function sync() {
        if (!user || busy) return;
        const request = ++version, owner = window.__ledgerAuth.db.collection('users').doc(user.uid);
        busy = true; $('refresh').disabled = true; $('syncStatus').textContent = 'Gathering your day...';
        try {
            const [entries,budgets]=await Promise.all(['ledgerEntries','ledgerPlanItems'].map(name=>owner.collection(name).get({source:'server'})));
            if (request !== version) return;
            const next = {jobs:{}, entries:entries.docs.map(doc=>({...doc.data(),id:doc.id})),budgets:budgets.docs.map(doc=>({...doc.data(),id:doc.id})),month:model.dayKey(new Date()).slice(0,7)};
            model.summarize(next);MobileBudget.summarize(next.budgets,next.entries);
            data = next; render();
            $('syncStatus').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (_) {
            if (request === version) $('syncStatus').textContent = data ? 'Could not sync · Showing last update' : 'Could not load your data. Tap Sync to retry.';
        } finally {
            if (request === version) { busy = false; $('refresh').disabled = false; }
        }
    }
    function clear() {
        ++version; busy = false; data = null; sample = false; document.body.dataset.sample = 'false';
        $('dashboard').hidden = true; $('sampleBadge').hidden = true;
        ['spent','earned','budgetRemaining'].forEach(id=>$(id).textContent='—');
        $('budgetGroups').replaceChildren();$('budgetTotal').textContent='';
    }
    $('refresh').onclick = () => { if (sample) render(); else sync(); };
    $('preview').onclick = () => {
        clear(); sample = true; document.body.dataset.sample = 'true';
        const today = model.dayKey(new Date());
        data = {month:today.slice(0,7),jobs:{},budgets:[{id:'rent',type:'fixed',label:'월세',amount:1000},{id:'groceries',type:'expected',label:'장보기',amount:500}],entries:[
            {date:today,type:'expense',sourceType:'fixed',amount:1000},
            {date:today,type:'expense',sourceType:'expected',amount:280},
            {date:today,type:'expense',sourceType:'custom',amount:225.32},
            {date:today,type:'income',amount:400}
        ]};
        $('sampleBadge').hidden = false; $('syncStatus').textContent = 'Sample preview · Sign in above for your data'; render();
    };
    await window.mobileAuthReady;
    const auth = window.__ledgerAuth;
    if (auth?.auth) {
        auth.auth.onAuthStateChanged(account => {
            if (!account && sample) return;
            clear(); user = account; $('welcome').hidden = !!account; $('signOut').hidden = !account;
            $('refresh').disabled = !account;
            if (account) sync(); else $('syncStatus').textContent = 'Sign in to see your day';
        });
        $('signIn').onclick = async () => {
            $('signIn').disabled = true;
            try { await auth.signInWithGoogle(); }
            catch (_) { $('syncStatus').textContent = 'Sign-in did not finish. Please try again.'; }
            finally { $('signIn').disabled = false; }
        };
        $('signOut').onclick = async () => {
            if (!window.confirm('로그아웃할까요?')) return;
            try { await auth.auth.signOut(); } catch (_) { $('syncStatus').textContent = 'Sign-out failed. Please retry.'; }
        };
    } else { $('signIn').disabled = true; $('syncStatus').textContent = 'Connection unavailable. Reopen online to sign in.'; }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (sample) render(); else sync(); } });
    window.addEventListener('online', sync);
    window.addEventListener('offline', () => { $('syncStatus').textContent = data ? 'Offline · Showing last update' : 'Offline · Connect to load your data'; });
    setInterval(() => { if (!document.hidden) { if (sample) render(); else sync(); } }, 60000);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('installButton').hidden = false; });
    $('installButton').onclick = async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; $('installButton').hidden = true; } };
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
})();

(async () => {
    const $ = id => document.getElementById(id);
    const model = MobileModel, api = WorkWidgetData;
    const money = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
    let user = null, data = null, sample = false, selectedDay = 0, busy = false, version = 0;
    let installPrompt = null;
    let plans = null;
    function renderTasks() {
        $('todayTaskList').replaceChildren();
        if (!plans) return;
        const items = PlannerModel.dayItems(plans.tasks, plans.routines, plans.checks, model.dayKey(new Date()));
        $('todayTaskStatus').textContent = items.length ? `${items.filter(item => item.completed).length} of ${items.length} complete` : 'A clear day. Take a little breath.';
        for (const item of items) {
            const row = document.createElement('li');
            row.className = item.completed ? 'completed' : '';
            const mark = document.createElement('span');
            mark.textContent = item.completed ? '✓' : '○';
            mark.setAttribute('aria-label', item.completed ? 'Completed' : 'Not completed');
            const title = document.createElement('span'); title.textContent = item.title;
            row.append(mark, title); $('todayTaskList').append(row);
        }
    }
    async function syncTasks(owner, request) {
        try {
            const next = {};
            for (const [key, collection] of [['tasks', 'personalTasks'], ['routines', 'personalRoutines'], ['checks', 'personalRoutineChecks']]) {
                const snapshot = await owner.collection(collection).get({ source: 'server' });
                next[key] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            }
            if (request !== version) return;
            plans = next; renderTasks();
        } catch (_) {
            if (request === version) $('todayTaskStatus').textContent = 'Tasks could not sync. Tap Sync to retry.';
        }
    }
    const tips = [
        'Small steps today. More breathing room tomorrow.', 'Give each dollar a little job.',
        'A homemade coffee can be a tiny win.', 'Bring a list. Let the extras wait.',
        'Progress counts, even when it is small.', 'Slow and steady is still moving forward.',
        'Check one receipt. Learn one thing.', 'Pick one small saving goal this week.',
        'Tomorrow’s packed lunch is a gift to future you.', 'Little amounts deserve attention too.',
        'Write it down before you check out.', 'Let a small saving become a habit.',
        'A pause before buying can be powerful.', 'Your future self appreciates the little wins.',
        'One mindful choice is enough to start.', 'Needs first. Treats with a plan.',
        'Make room for what matters to you.', 'Saving slowly is still saving.',
        'A short walk can be a free reset.', 'Use what you already have.',
        'Keep a little cushion for unexpected days.', 'Review gently. Choose one next step.',
        'Celebrate a small saving.', 'Rest is part of a sustainable plan.'
    ];
    function render() {
        if (!data) return;
        const now = new Date(), today = model.dayKey(now);
        if (today.slice(0, 7) !== data.month) { $('dashboard').hidden = true; return; }
        $('dashboard').hidden = false;
        renderTasks();
        const key = model.nextDay(today, selectedDay);
        $('dayLabel').textContent = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: model.zone }).format(new Date(key + 'T18:00:00Z'));
        $('jobs').replaceChildren();
        for (const id of ['iron', 'booster']) {
            const def = api.definitions.find(item => item.id === id), record = data.jobs[id];
            const job = api.summarize(def, record.shifts.find(row => row.date === key), record.settings);
            const card = document.createElement('article'); card.className = `job ${id}`;
            const name = document.createElement('h3'); name.textContent = job.name;
            const time = document.createElement('span'); time.className = 'time';
            time.textContent = job.status === 'off' ? 'A little day off' : job.status === 'incomplete' ? 'Complete your shift times' : `${api.displayTime(job.checkIn)} – ${api.displayTime(job.checkOut)}`;
            const pay = document.createElement('strong'); pay.textContent = job.status === 'incomplete' ? '—' : money(job.amount);
            card.append(name, time, pay); $('jobs').append(card);
        }
        const state = model.summarize(data, now);
        $('monthLabel').textContent = state.month + ' / CAD';
        $('spent').textContent = money(state.spent); $('earned').textContent = money(state.earned);
        $('mood').textContent = state.spent > state.earned ? '😾' : '😸';
        $('mood').setAttribute('aria-label', state.spent > state.earned ? 'Spending exceeds income' : 'Income covers spending');
        tick(state);
        const ordinal = Math.floor(Date.parse(today + 'T12:00:00Z') / 86400000);
        $('tip').textContent = '🐾 ' + tips[ordinal % tips.length];
    }
    function tick(state) {
        if (!data) return;
        if (data.month !== model.dayKey(new Date()).slice(0, 7)) { $('dashboard').hidden = true; return; }
        state ||= model.summarize(data);
        $('timer').textContent = model.duration(state.remaining);
        $('workStatus').textContent = state.remaining <= 0 ? 'Covered. Nice work!' : state.active ? 'Working now' : 'Resting paws';
        $('progressLabel').textContent = `${Math.round(state.fraction * 100)}% earned back`;
        $('progress').style.strokeDasharray = `${state.fraction * 100} 100`;
    }
    async function sync() {
        if (!user || busy) return;
        const request = ++version, owner = window.__ledgerAuth.db.collection('users').doc(user.uid);
        busy = true; $('refresh').disabled = true; $('syncStatus').textContent = 'Gathering your day...';
        try {
            const jobs = {};
            for (const def of api.definitions) {
                const shifts = await owner.collection('weeklyWorkShifts' + def.suffix).get({ source: 'server' });
                const settings = await owner.collection('weeklyWorkMeta').doc('settings' + def.suffix).get({ source: 'server' });
                jobs[def.id] = { shifts: shifts.docs.map(doc => doc.data()), settings: settings.data() || {} };
            }
            const entries = await owner.collection('ledgerEntries').get({ source: 'server' });
            if (request !== version) return;
            const next = { jobs, entries: entries.docs.map(doc => doc.data()), month: model.dayKey(new Date()).slice(0, 7) };
            // Validate before replacing the last successful in-memory snapshot.
            for (const def of api.definitions) api.summarize(def, { checkIn: '09:00', checkOut: '10:00' }, jobs[def.id].settings);
            model.summarize(next);
            data = next; render();
            $('syncStatus').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            await syncTasks(owner, request);
        } catch (_) {
            if (request === version) $('syncStatus').textContent = data ? 'Could not sync · Showing last update' : 'Could not load your data. Tap Sync to retry.';
        } finally {
            if (request === version) { busy = false; $('refresh').disabled = false; }
        }
    }
    function clear() {
        ++version; busy = false; data = null; sample = false; document.body.dataset.sample = 'false';
        $('dashboard').hidden = true; $('sampleBadge').hidden = true;
        $('jobs').replaceChildren(); ['spent', 'earned', 'timer'].forEach(id => $(id).textContent = '—');
        plans = null; $('todayTaskList').replaceChildren(); $('todayTaskStatus').textContent = 'Loading today’s tasks...';
    }
    $('refresh').onclick = () => { if (sample) render(); else sync(); };
    for (const [id, offset] of [['today', 0], ['tomorrow', 1]]) $(id).onclick = () => {
        selectedDay = offset; $('today').setAttribute('aria-pressed', String(!offset)); $('tomorrow').setAttribute('aria-pressed', String(!!offset)); render();
    };
    $('preview').onclick = () => {
        clear(); sample = true; document.body.dataset.sample = 'true';
        const today = model.dayKey(new Date());
        plans = { tasks: [{ id: 'sample', date: today, title: 'Pack lunch for work', completed: false }], routines: [], checks: [] };
        data = { month: today.slice(0, 7), entries: [{ date: today, type: 'expense', amount: 1505.32 }, { date: today, type: 'income', amount: 400 }], jobs: {
            iron: { settings: { hourlyRate: 17 }, shifts: [{ date: today, checkIn: '08:00', checkOut: '13:00' }] },
            booster: { settings: { hourlyRate: 15 }, shifts: [{ date: today, checkIn: '14:15', checkOut: '21:15' }, { date: model.nextDay(today), checkIn: '14:15', checkOut: '21:15' }] }
        } };
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
            try { await auth.auth.signOut(); } catch (_) { $('syncStatus').textContent = 'Sign-out failed. Please retry.'; }
        };
    } else { $('signIn').disabled = true; $('syncStatus').textContent = 'Connection unavailable. Reopen online to sign in.'; }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (sample) render(); else sync(); } });
    window.addEventListener('online', sync);
    window.addEventListener('offline', () => { $('syncStatus').textContent = data ? 'Offline · Showing last update' : 'Offline · Connect to load your data'; });
    setInterval(() => { if (!document.hidden && data) tick(); }, 1000);
    setInterval(() => { if (!document.hidden) { if (sample) render(); else sync(); } }, 60000);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('installButton').hidden = false; });
    $('installButton').onclick = async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; $('installButton').hidden = true; } };
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
})();

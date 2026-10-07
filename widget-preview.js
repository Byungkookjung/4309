(() => {
    const api = WorkWidgetData;
    let snapshot;
    let sample = true;
    const status = document.getElementById('widgetStatus');
    const buttons = [...document.querySelectorAll('.widget-controls button')];
    function render() {
        const today = snapshot.days.find(day => day.date === api.dateKey(new Date()));
        document.getElementById('widgetDate').textContent = today.date;
        const container = document.getElementById('widgetJobs');
        container.replaceChildren();
        [...today.jobs].sort((a, b) => b.id.localeCompare(a.id)).forEach(job => {
            const card = document.createElement('article');
            card.className = `widget-job ${job.id}`;
            const name = document.createElement('h2'); name.textContent = job.name;
            const time = document.createElement('span'); time.className = 'widget-time';
            time.textContent = job.status === 'off' ? 'No shift today' : job.status === 'incomplete' ? 'Complete shift times' : `${api.displayTime(job.checkIn)} - ${api.displayTime(job.checkOut)}`;
            const amount = document.createElement('strong');
            amount.textContent = job.status === 'incomplete' ? '--' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(job.amount);
            card.append(name, time, amount); container.append(card);
        });
        document.getElementById('widgetFooter').textContent = `${sample ? 'SAMPLE / ' : ''}Estimated CAD / Before tips & deductions`;
    }
    function demo() {
        const date = api.dateKey(new Date());
        snapshot = api.buildSnapshot({
            booster: { shifts: [{ date, checkIn: '14:15', checkOut: '21:15' }], settings: { hourlyRate: 15 } },
            iron: { shifts: [{ date, checkIn: '08:00', checkOut: '13:00' }], settings: { hourlyRate: 20 } }
        });
        snapshot.isSample = true;
        sample = true;
        status.textContent = 'Sample data only. Your saved schedules are unchanged.';
        render();
    }
    document.getElementById('sampleWidget').addEventListener('click', demo);
    document.getElementById('loadWidget').addEventListener('click', async () => {
        buttons.forEach(button => { button.disabled = true; });
        try {
            const auth = window.__ledgerAuth;
            const user = auth?.requireAuth ? await auth.requireAuth() : null;
            const records = {};
            for (const def of api.definitions) {
                if (user && auth.db) {
                    const owner = auth.db.collection('users').doc(user.uid);
                    const [shifts, settings] = await Promise.all([
                        owner.collection(`weeklyWorkShifts${def.suffix}`).get({ source: 'server' }),
                        owner.collection('weeklyWorkMeta').doc(`settings${def.suffix}`).get({ source: 'server' })
                    ]);
                    records[def.id] = { shifts: shifts.docs.map(doc => doc.data()), settings: settings.data() || {} };
                } else {
                    records[def.id] = {
                        shifts: JSON.parse(localStorage.getItem(`weeklySheetShifts${def.suffix}`) || '[]'),
                        settings: JSON.parse(localStorage.getItem(`weeklySheetSettings${def.suffix}`) || '{}')
                    };
                }
            }
            snapshot = api.buildSnapshot(records); sample = false; render();
            status.textContent = 'Both schedules loaded. Download and import in Work Today to update your widget.';
        } catch (error) {
            status.textContent = `Schedules could not be loaded. ${sample ? 'Still showing sample data.' : 'Previous snapshot is still shown.'} Please retry.`;
        } finally { buttons.forEach(button => { button.disabled = false; }); }
    });
    document.getElementById('exportWidget').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url;
        link.download = sample ? 'work-today-sample.json' : 'work-today.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    demo();
})();

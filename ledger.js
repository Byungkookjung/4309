// Ledger + Plan Calculator (stores: 'ledgerEntries', 'ledgerInitialBalance', 'planItems')

/* ---------- DOM refs (ledger) ---------- */
const entryType = document.getElementById('entryType');
const entryAmount = document.getElementById('entryAmount');
const entryDate = document.getElementById('entryDate');
const entryDesc = document.getElementById('entryDesc');
const addEntryBtn = document.getElementById('addEntryBtn');
const ledgerList = document.getElementById('ledgerList');
const monthPicker = document.getElementById('monthPicker');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netAmountEl = document.getElementById('netAmount');

const initialBalanceInput = document.getElementById('initialBalance');
const accountBalanceEl = document.getElementById('accountBalance');
const upcomingTotalEl = document.getElementById('upcomingTotal');
const upcomingListEl = document.getElementById('upcomingList');

/* ---------- DOM refs (plan) ---------- */
const planToggleBtn = document.getElementById('planToggleBtn');
const planSection = document.getElementById('planSection');
const planLabelInput = document.getElementById('planLabel');
const planUnitInput = document.getElementById('planUnit');
const planQtyInput = document.getElementById('planQty');
const planTypeInput = document.getElementById('planType');
const planRepeatInput = document.getElementById('planRepeat');
const planDayInput = document.getElementById('planDay');
const planStartMonthInput = document.getElementById('planStartMonth');
const addPlanBtn = document.getElementById('addPlanBtn');
const planListEl = document.getElementById('planList');
const planTotalEl = document.getElementById('planTotal');
const clearPlanBtn = document.getElementById('clearPlanBtn');

/* ---------- State ---------- */
let ledgerEntries = [];
let initialBalance = 0;
let planItems = [];

/* ---------- Helpers: storage (use storage.get/set) ---------- */
function loadEntries() {
    ledgerEntries = storage.get('ledgerEntries') || [];
}
function saveEntries() {
    storage.set('ledgerEntries', ledgerEntries);
}
function loadInitialBalance() {
    initialBalance = Number(storage.get('ledgerInitialBalance') || 0);
    if (initialBalanceInput) initialBalanceInput.value = initialBalance ? Number(initialBalance).toFixed(2) : '';
}
function saveInitialBalance() {
    storage.set('ledgerInitialBalance', Number(initialBalance || 0));
}
function loadPlanItems() {
    const raw = storage.get('planItems') || [];
    planItems = (Array.isArray(raw) ? raw : []).map(normalizePlanItem);
}
function savePlanItems() {
    storage.set('planItems', planItems);
}

/* ---------- Plan normalization ---------- */
function normalizePlanItem(p) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    return {
        id: p.id || Date.now().toString(36) + Math.random().toString(36).slice(2,8),
        label: p.label || '',
        unit: p.unit !== undefined ? Number(p.unit) : (p.amount !== undefined ? Number(p.amount) : 0),
        qty: p.qty !== undefined ? Number(p.qty) : 1,
        type: p.type || 'expense', // expense | income
        repeat: !!p.repeat,
        freq: p.freq || 'monthly',
        dayOfMonth: Number(p.dayOfMonth || p.planDay || 1),
        startMonth: p.startMonth || p.planStartMonth || defaultMonth,
        suppressed: Array.isArray(p.suppressed) ? p.suppressed.slice() : []
    };
}

/* ---------- Date helpers (local) ---------- */
function parseMonthKey(monthKey) {
    // monthKey 'YYYY-MM' -> { year, monthIndex }
    if (!monthKey) return null;
    const m = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    return { year: Number(m[1]), monthIndex: Number(m[2]) - 1 };
}
function formatMonthKeyFromDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function clampDayToMonth(year, monthIndex, day) {
    const last = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(Math.max(1, Number(day)), last);
}
function addMonthsToMonthKey(monthKey, add) {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return null;
    const date = new Date(parsed.year, parsed.monthIndex + add, 1);
    return formatMonthKeyFromDate(date);
}

/* ---------- Recurring generation ---------- */
const MAX_BACKFILL_MONTHS = 24;
function generateRecurringEntries() {
    if (!Array.isArray(planItems) || planItems.length === 0) return;

    // Use ledgerEntries loaded in memory
    const now = new Date();
    const currentMonthKey = formatMonthKeyFromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const targetMonthKey = addMonthsToMonthKey(currentMonthKey, 1); // next month included

    planItems.forEach(plan => {
        if (!plan.repeat || plan.freq !== 'monthly') return;

        // compute start month
        const start = plan.startMonth || currentMonthKey;
        // ensure not creating too many past months
        const startParsed = parseMonthKey(start);
        if (!startParsed) return;

        // compute number of months between start and target
        const startDate = new Date(startParsed.year, startParsed.monthIndex, 1);
        const targetParsed = parseMonthKey(targetMonthKey);
        const targetDate = new Date(targetParsed.year, targetParsed.monthIndex, 1);
        let monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
        if (monthsDiff < 0) return; // start in future beyond target

        // apply backfill cap
        const maxMonths = Math.min(monthsDiff, MAX_BACKFILL_MONTHS + monthsDiff); // allow up to MAX_BACKFILL into past
        // iterate from start month up to target month (inclusive)
        for (let m = 0; m <= monthsDiff; m++) {
            const monthKey = addMonthsToMonthKey(start, m);
            // skip suppressed months
            if (Array.isArray(plan.suppressed) && plan.suppressed.includes(monthKey)) continue;

            // duplication check: ledgerEntries already contains recurringPlanId + recurringMonth
            const exists = ledgerEntries.some(e => e.source === 'recurring' && e.recurringPlanId === plan.id && e.recurringMonth === monthKey);
            if (exists) continue;

            // create entry for this month
            const parsed = parseMonthKey(monthKey);
            if (!parsed) continue;
            const year = parsed.year;
            const monthIndex = parsed.monthIndex;
            const day = clampDayToMonth(year, monthIndex, plan.dayOfMonth || 1);
            const dateStr = `${year}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const amount = Number((Number(plan.unit || 0) * Number(plan.qty || 1)).toFixed(2));

            const entry = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
                type: plan.type || 'expense',
                amount: amount,
                date: dateStr,
                description: plan.label || '',
                createdAt: new Date().toISOString(),
                source: "recurring",
                recurringPlanId: plan.id,
                recurringMonth: monthKey
            };

            ledgerEntries.push(entry);
        }
    });

    // persist if we added any entries
    saveEntries();
}

/* ---------- Render plan list (show recurring badge/details) ---------- */
function renderPlan() {
    planListEl.innerHTML = '';
    planItems.forEach(plan => {
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.dataset.id = plan.id;

        const meta = document.createElement('div');
        meta.className = 'meta';
        const title = document.createElement('div');
        title.textContent = plan.label || '';
        const small = document.createElement('div');
        small.style.fontSize = '0.85em';
        small.style.color = '#666';
        const descParts = [];
        descParts.push(plan.type === 'income' ? 'Income' : 'Expense');
        if (plan.repeat) descParts.push(`Recurring · day ${plan.dayOfMonth} · start ${plan.startMonth}`);
        else descParts.push(`One-time`);
        small.textContent = descParts.join(' · ');
        meta.appendChild(title);
        meta.appendChild(small);

        const amount = document.createElement('div');
        amount.className = 'amount';
        amount.textContent = formatCurrency(Number(plan.unit || 0) * Number(plan.qty || 1));

        const actions = document.createElement('div');
        actions.className = 'actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'ledger-action-btn edit';
        editBtn.textContent = 'Edit';
        // (editing not implemented here)
        const delBtn = document.createElement('button');
        delBtn.className = 'ledger-action-btn delete';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
            if (!confirm('Delete this plan?')) return;
            planItems = planItems.filter(p => p.id !== plan.id);
            savePlanItems();
            renderPlan();
            updateView();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(meta);
        li.appendChild(amount);
        li.appendChild(actions);
        planListEl.appendChild(li);
    });

    const total = planItems.reduce((s,p) => s + (Number(p.unit||0) * Number(p.qty||1)), 0);
    if (planTotalEl) planTotalEl.textContent = formatCurrency(total);
}

/* ---------- Add plan item (store extended fields) ---------- */
function addPlanItem() {
    // Read extended UI inputs
    const label = (planLabelInput.value || '').trim();
    const unit = parseFloat(planUnitInput.value);
    const qty = parseInt(planQtyInput.value, 10);
    const type = planTypeInput ? String(planTypeInput.value) : 'expense';
    const repeat = planRepeatInput ? !!planRepeatInput.checked : false;
    const dayOfMonth = planDayInput ? Math.min(31, Math.max(1, Number(planDayInput.value || 1))) : 1;
    const startMonth = planStartMonthInput && planStartMonthInput.value ? planStartMonthInput.value : formatMonthKeyFromDate(new Date());

    if (!label || isNaN(unit) || isNaN(qty) || qty <= 0 || unit < 0) {
        alert('Please enter valid label, unit amount and quantity.');
        return;
    }

    const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
        label,
        unit: Number(unit.toFixed(2)),
        qty: qty,
        type: type === 'income' ? 'income' : 'expense',
        repeat: !!repeat,
        freq: 'monthly',
        dayOfMonth,
        startMonth,
        suppressed: []
    };
    planItems.push(item);
    savePlanItems();

    // clear inputs (existing UI clear)
    planLabelInput.value = '';
    planUnitInput.value = '';
    planQtyInput.value = '';
    if (planRepeatInput) planRepeatInput.checked = false;
    planDayInput.value = 1;
    planStartMonthInput.value = formatMonthKeyFromDate(new Date());

    // If repeating, materialize entries (generateRecurringEntries will dedupe)
    if (item.repeat) {
        generateRecurringEntries();
    }

    renderPlan();
    updateView();
}

/* ---------- Deletion: if deleting a recurring entry, suppress that month on the plan ---------- */
function setupDeleteButtonForEntry(deleteBtn, entryId) {
    deleteBtn.addEventListener('click', () => {
        const entry = ledgerEntries.find(e => e.id === entryId);
        if (!entry) return;
        if (!confirm('Delete this entry?')) return;

        // If this was auto-generated from a recurring plan, add suppressed month to plan then delete entry
        if (entry.source === 'recurring' && entry.recurringPlanId && entry.recurringMonth) {
            const plan = planItems.find(p => p.id === entry.recurringPlanId);
            if (plan) {
                plan.suppressed = plan.suppressed || [];
                if (!plan.suppressed.includes(entry.recurringMonth)) {
                    plan.suppressed.push(entry.recurringMonth);
                    savePlanItems();
                }
            }
            ledgerEntries = ledgerEntries.filter(e => e.id !== entryId);
            saveEntries();
            updateView();
            return;
        }

        // Normal deletion
        ledgerEntries = ledgerEntries.filter(e => e.id !== entryId);
        saveEntries();
        updateView();
    });
}

/* ---------- Upcoming: exclude repeating plans from merged plan list to avoid duplicate display ---------- */
function renderUpcomingExpenses() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const futureExpenses = ledgerEntries
        .filter(e => {
            const d = parseDateLocal(e.date);
            return e.type === 'expense' && d && d.getTime() > today.getTime();
        })
        .sort((a,b) => {
            const da = parseDateLocal(a.date);
            const db = parseDateLocal(b.date);
            return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
        });

    const futureExpensesTotal = futureExpenses.reduce((s,e) => s + Number(e.amount), 0);

    const plannedTotal = planItems.reduce((s, p) => s + (Number(p.unit || 0) * Number(p.qty || 0)), 0);

    const totalUpcoming = futureExpensesTotal + plannedTotal;
    if (upcomingTotalEl) upcomingTotalEl.textContent = formatCurrency(totalUpcoming);

    if (upcomingListEl) {
        upcomingListEl.innerHTML = '';
        const merged = [];

        futureExpenses.forEach(e => merged.push({
            type: 'ledger',
            label: e.description || '',
            date: formatDateLocal(e.date),
            amount: Number(e.amount)
        }));

        planItems.forEach(p => merged.push({
            type: 'plan',
            label: p.label || '',
            date: null,
            amount: Number(p.unit || 0) * Number(p.qty || 0)
        }));

        if (merged.length === 0) {
            const none = document.createElement('div');
            none.style.color = '#666';
            none.style.padding = '8px';
            none.textContent = 'No upcoming expenses.';
            upcomingListEl.appendChild(none);
        } else {
            merged.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.className = 'ledger-item expense';
                const meta = document.createElement('div');
                meta.className = 'meta';
                const labelDiv = document.createElement('div');
                labelDiv.textContent = item.label;
                const dateDiv = document.createElement('div');
                dateDiv.style.fontSize = '0.85em';
                dateDiv.style.color = '#666';
                dateDiv.textContent = item.date ? item.date : 'Planned';
                meta.appendChild(labelDiv);
                meta.appendChild(dateDiv);

                const amount = document.createElement('div');
                amount.className = 'amount';
                amount.textContent = '-' + formatCurrency(item.amount);

                const actions = document.createElement('div');
                actions.className = 'actions';

                li.appendChild(meta);
                li.appendChild(amount);
                li.appendChild(actions);
                upcomingListEl.appendChild(li);
            });
        }
    }
}

/* ---------- Modify renderList to wire delete using setupDeleteButtonForEntry ---------- */
// Render list: ensure sorting uses parseDateLocal and display uses formatDateLocal
function renderList(filterMonthKey) {
    ledgerList.innerHTML = '';
    const entries = ledgerEntries
        .slice()
        .sort((a,b) => {
            const da = parseDateLocal(a.date) || parseDateLocal(a.createdAt) || new Date(a.createdAt || 0);
            const db = parseDateLocal(b.date) || parseDateLocal(b.createdAt) || new Date(b.createdAt || 0);
            return db.getTime() - da.getTime();
        });

    entries.forEach(entry => {
        if (filterMonthKey && getMonthKeyFromDateObj(parseDateLocal(entry.date)) !== filterMonthKey) return;

        const li = document.createElement('li');
        li.className = `ledger-item ${entry.type}`;
        li.dataset.id = entry.id;

        const meta = document.createElement('div');
        meta.className = 'meta';
        const descDiv = document.createElement('div');
        descDiv.textContent = entry.description || '';
        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = '0.85em';
        dateDiv.style.color = '#666';
        // display date as local YYYY-MM-DD
        dateDiv.textContent = formatDateLocal(entry.date) || '';

        meta.appendChild(descDiv);
        meta.appendChild(dateDiv);

        const amount = document.createElement('div');
        amount.className = 'amount';
        amount.textContent = (entry.type === 'income' ? '' : '-') + formatCurrency(entry.amount);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'ledger-action-btn edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editEntry(entry.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'ledger-action-btn delete';
        delBtn.textContent = 'Delete';
        // replace existing delete handler with:
        setupDeleteButtonForEntry(delBtn, entry.id);

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(meta);
        li.appendChild(amount);
        li.appendChild(actions);

        ledgerList.appendChild(li);
    });
}

function calculateTotals(filterMonthKey) {
    let income = 0;
    let expense = 0;
    ledgerEntries.forEach(e => {
        if (filterMonthKey) {
            const d = parseDateLocal(e.date) || parseDateLocal(e.createdAt);
            if (!d) return;
            const key = getMonthKeyFromDateObj(d);
            if (key !== filterMonthKey) return;
        }
        if (e.type === 'income') income += Number(e.amount || 0);
        else expense += Number(e.amount || 0);
    });
    return { income, expense, net: income - expense };
}

function updateTotalsUI(totals) {
    totalIncomeEl.textContent = formatCurrency(totals.income);
    totalExpenseEl.textContent = formatCurrency(totals.expense);
    netAmountEl.textContent = formatCurrency(totals.net);
    netAmountEl.classList.toggle('negative', totals.net < 0);
    netAmountEl.classList.toggle('positive', totals.net >= 0);
}

/* ---------- Account balance & upcoming expenses ---------- */

// Calculate account balance up to today (inclusive) using parseDateLocal
function calculateAccountBalance() {
    const today = new Date();
    today.setHours(0,0,0,0);
    let income = 0, expense = 0;
    ledgerEntries.forEach(e => {
        const d = parseDateLocal(e.date);
        if (d && d.setHours) {
            const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            if (dMid.getTime() <= today.getTime()) {
                if (e.type === 'income') income += Number(e.amount);
                else expense += Number(e.amount);
            }
        } else {
            // if no valid date treat based on createdAt
            const ca = parseDateLocal(e.createdAt) || new Date(e.createdAt || 0);
            if (ca.getTime() <= today.getTime()) {
                if (e.type === 'income') income += Number(e.amount);
                else expense += Number(e.amount);
            }
        }
    });
    return (Number(initialBalance || 0) + income - expense);
}

// Render upcoming expenses (ledger future expenses + planned items) using parseDateLocal
function renderUpcomingExpenses() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const futureExpenses = ledgerEntries
        .filter(e => {
            const d = parseDateLocal(e.date);
            return e.type === 'expense' && d && d.getTime() > today.getTime();
        })
        .sort((a,b) => {
            const da = parseDateLocal(a.date);
            const db = parseDateLocal(b.date);
            return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
        });

    const futureExpensesTotal = futureExpenses.reduce((s,e) => s + Number(e.amount), 0);

    const plannedTotal = planItems.reduce((s, p) => s + (Number(p.unit || 0) * Number(p.qty || 0)), 0);

    const totalUpcoming = futureExpensesTotal + plannedTotal;
    if (upcomingTotalEl) upcomingTotalEl.textContent = formatCurrency(totalUpcoming);

    if (upcomingListEl) {
        upcomingListEl.innerHTML = '';
        const merged = [];

        futureExpenses.forEach(e => merged.push({
            type: 'ledger',
            label: e.description || '',
            date: formatDateLocal(e.date),
            amount: Number(e.amount)
        }));

        planItems.forEach(p => merged.push({
            type: 'plan',
            label: p.label || '',
            date: null,
            amount: Number(p.unit || 0) * Number(p.qty || 0)
        }));

        if (merged.length === 0) {
            const none = document.createElement('div');
            none.style.color = '#666';
            none.style.padding = '8px';
            none.textContent = 'No upcoming expenses.';
            upcomingListEl.appendChild(none);
        } else {
            merged.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.className = 'ledger-item expense';
                const meta = document.createElement('div');
                meta.className = 'meta';
                const labelDiv = document.createElement('div');
                labelDiv.textContent = item.label;
                const dateDiv = document.createElement('div');
                dateDiv.style.fontSize = '0.85em';
                dateDiv.style.color = '#666';
                dateDiv.textContent = item.date ? item.date : 'Planned';
                meta.appendChild(labelDiv);
                meta.appendChild(dateDiv);

                const amount = document.createElement('div');
                amount.className = 'amount';
                amount.textContent = '-' + formatCurrency(item.amount);

                const actions = document.createElement('div');
                actions.className = 'actions';

                li.appendChild(meta);
                li.appendChild(amount);
                li.appendChild(actions);
                upcomingListEl.appendChild(li);
            });
        }
    }
}

/* ---------- Ledger actions ---------- */
function addEntry() {
    const type = entryType.value;
    const amount = parseFloat(entryAmount.value);
    const date = entryDate.value;
    const desc = entryDesc.value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
    }
    if (!date) {
        alert('Please select a date.');
        return;
    }

    const entry = { id: Date.now(), type, amount: Number(amount.toFixed(2)), date, description: desc, createdAt: new Date().toISOString() };
    ledgerEntries.push(entry);
    saveEntries();

    entryAmount.value = '';
    entryDesc.value = '';
    entryDate.value = todayAsInputValue();

    updateView();
}

function editEntry(id) {
    const entry = ledgerEntries.find(e => e.id === id);
    if (!entry) return;
    const newDesc = prompt('Edit description', entry.description || '') ?? entry.description;
    const newAmountRaw = prompt('Edit amount (numeric)', String(entry.amount)) ?? String(entry.amount);
    const newDate = prompt('Edit date (YYYY-MM-DD)', entry.date) ?? entry.date;

    const newAmount = parseFloat(newAmountRaw);
    if (isNaN(newAmount) || newAmount <= 0) {
        alert('Invalid amount. Edit cancelled.');
        return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Invalid date format. Use YYYY-MM-DD. Edit cancelled.');
        return;
    }

    entry.description = newDesc.trim();
    entry.amount = Number(newAmount.toFixed(2));
    entry.date = newDate;
    saveEntries();
    updateView();
}

/* ---------- Update view ---------- */
function updateView() {
    const monthVal = monthPicker.value;
    const filterMonthKey = monthVal ? monthVal : null;
    renderList(filterMonthKey);
    const totals = calculateTotals(filterMonthKey);
    updateTotalsUI(totals);

    const account = calculateAccountBalance();
    if (accountBalanceEl) accountBalanceEl.textContent = formatCurrency(account);
    if (accountBalanceEl) {
        accountBalanceEl.classList.toggle('negative', account < 0);
        accountBalanceEl.classList.toggle('positive', account >= 0);
    }
    renderUpcomingExpenses();
    renderPlan();
}

/* ---------- Event wiring ---------- */
if (addEntryBtn) addEntryBtn.addEventListener('click', addEntry);
if (monthPicker) monthPicker.addEventListener('change', updateView);

if (initialBalanceInput) {
    initialBalanceInput.addEventListener('change', () => {
        const v = parseFloat(initialBalanceInput.value);
        initialBalance = isNaN(v) ? 0 : Number(v.toFixed(2));
        saveInitialBalance();
        updateView();
    });
}

/* ---------- Init: generate recurring entries after loading plans/entries/balance ---------- */
(function init() {
    // storage.load() already migrates legacy keys inside storage.js
    loadEntries();
    loadInitialBalance();
    loadPlanItems();

    // set default UI values
    entryDate.value = todayAsInputValue();
    const now = new Date();
    if (monthPicker) monthPicker.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if (planStartMonthInput) planStartMonthInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    // Generate recurring ledger entries (materialize) BEFORE initial rendering
    generateRecurringEntries();

    updateView();

    // wire event listeners for addPlan / clearPlan
    if (addPlanBtn) addPlanBtn.addEventListener('click', addPlanItem);
    if (clearPlanBtn) clearPlanBtn.addEventListener('click', () => {
        if (!confirm('Clear all plan items?')) return;
        planItems = [];
        savePlanItems();
        renderPlan();
        updateView();
    });
})();

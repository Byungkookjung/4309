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
const addPlanBtn = document.getElementById('addPlanBtn');
const planListEl = document.getElementById('planList');
const planTotalEl = document.getElementById('planTotal');
const clearPlanBtn = document.getElementById('clearPlanBtn');

/* ---------- State ---------- */
let ledgerEntries = [];
let initialBalance = 0;
let planItems = [];

/* ---------- Helpers: storage ---------- */
function loadEntries() {
    const raw = localStorage.getItem('ledgerEntries');
    ledgerEntries = raw ? JSON.parse(raw) : [];
}
function saveEntries() {
    localStorage.setItem('ledgerEntries', JSON.stringify(ledgerEntries));
}
function loadInitialBalance() {
    const raw = localStorage.getItem('ledgerInitialBalance');
    initialBalance = raw ? parseFloat(raw) : 0;
    if (initialBalanceInput) initialBalanceInput.value = initialBalance ? Number(initialBalance).toFixed(2) : '';
}
function saveInitialBalance() {
    localStorage.setItem('ledgerInitialBalance', String(initialBalance || 0));
}
function loadPlanItems() {
    const raw = localStorage.getItem('planItems');
    planItems = raw ? JSON.parse(raw) : [];
}
function savePlanItems() {
    localStorage.setItem('planItems', JSON.stringify(planItems));
}

/* ---------- Utils ---------- */
function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}
function getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function todayAsInputValue() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ---------- Ledger rendering & logic ---------- */
function renderList(filterMonthKey) {
    ledgerList.innerHTML = '';
    const entries = ledgerEntries
        .slice()
        .sort((a,b) => new Date(b.date) - new Date(a.date));
    entries.forEach(entry => {
        if (filterMonthKey && getMonthKey(entry.date) !== filterMonthKey) return;
        const li = document.createElement('li');
        li.className = `ledger-item ${entry.type}`;
        li.dataset.id = entry.id;

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<div>${escapeHtml(entry.description || '')}</div><div style="font-size:0.85em;color:#666">${entry.date}</div>`;

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
        delBtn.addEventListener('click', () => {
            if (confirm('Delete this entry?')) {
                ledgerEntries = ledgerEntries.filter(e => e.id !== entry.id);
                saveEntries();
                updateView();
            }
        });

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
        if (filterMonthKey && getMonthKey(e.date) !== filterMonthKey) return;
        if (e.type === 'income') income += Number(e.amount);
        else expense += Number(e.amount);
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
function calculateAccountBalance() {
    const today = new Date();
    today.setHours(0,0,0,0);
    let income = 0, expense = 0;
    ledgerEntries.forEach(e => {
        const d = new Date(e.date);
        d.setHours(0,0,0,0);
        if (d <= today) {
            if (e.type === 'income') income += Number(e.amount);
            else expense += Number(e.amount);
        }
    });
    return (Number(initialBalance || 0) + income - expense);
}

// Render upcoming expenses (ledger future expenses + planned items)
function renderUpcomingExpenses() {
    const today = new Date(); today.setHours(0,0,0,0);

    // ledger future expenses
    const futureExpenses = ledgerEntries
        .filter(e => e.type === 'expense' && (new Date(e.date).setHours(0,0,0,0)) > today)
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    const futureExpensesTotal = futureExpenses.reduce((s,e) => s + Number(e.amount), 0);

    // planned items (no date) -> treat as upcoming planned expense
    const plannedTotal = planItems.reduce((s, p) => s + (Number(p.unit || 0) * Number(p.qty || 0)), 0);

    const totalUpcoming = futureExpensesTotal + plannedTotal;
    if (upcomingTotalEl) upcomingTotalEl.textContent = formatCurrency(totalUpcoming);

    // render merged list: ledger future expenses first, then planned items (max 5 shown)
    if (upcomingListEl) {
        upcomingListEl.innerHTML = '';
        const merged = [];

        futureExpenses.forEach(e => merged.push({
            type: 'ledger',
            label: e.description || '',
            date: e.date,
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
                li.className = 'ledger-item ' + (item.type === 'plan' ? 'expense' : 'expense');
                const dateHtml = item.date ? `<div style="font-size:0.85em;color:#666">${item.date}</div>` : `<div style="font-size:0.85em;color:#666">Planned</div>`;
                li.innerHTML = `<div class="meta"><div>${escapeHtml(item.label)}</div>${dateHtml}</div><div class="amount">-${formatCurrency(item.amount)}</div><div class="actions"></div>`;
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

/* ---------- Plan Calculator logic ---------- */
function calculatePlanTotal() {
    return planItems.reduce((sum, it) => sum + (Number(it.unit || 0) * Number(it.qty || 0)), 0);
}

function renderPlan() {
    if (!planListEl) return;
    planListEl.innerHTML = '';
    planItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.dataset.id = item.id;
        const meta = document.createElement('div'); meta.className = 'meta';
        meta.textContent = `${item.label || ''} — ${item.qty} × ${formatCurrency(item.unit)}`;
        const amount = document.createElement('div'); amount.className = 'amount';
        const total = Number(item.unit) * Number(item.qty);
        amount.textContent = formatCurrency(total);
        const actions = document.createElement('div'); actions.className = 'actions';
        const delBtn = document.createElement('button'); delBtn.className = 'delete-btn'; delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
            planItems = planItems.filter(p => p.id !== item.id);
            savePlanItems();
            renderPlan();
        });
        actions.appendChild(delBtn);
        li.appendChild(meta); li.appendChild(amount); li.appendChild(actions);
        planListEl.appendChild(li);
    });
    if (planTotalEl) planTotalEl.textContent = formatCurrency(calculatePlanTotal());
}

function addPlanItem() {
    const label = (planLabelInput.value || '').trim();
    const unit = parseFloat(planUnitInput.value);
    const qty = parseInt(planQtyInput.value, 10);

    if (!label || isNaN(unit) || isNaN(qty) || qty <= 0 || unit < 0) {
        alert('Please enter valid label, unit amount and quantity.');
        return;
    }

    const item = {
        id: Date.now(),
        label,
        unit: Number(unit.toFixed(2)),
        qty: qty
    };
    planItems.push(item);
    savePlanItems();
    planLabelInput.value = '';
    planUnitInput.value = '';
    planQtyInput.value = '';

    // immediately update UI including Upcoming
    renderPlan();
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

if (addPlanBtn) addPlanBtn.addEventListener('click', addPlanItem);
if (clearPlanBtn) clearPlanBtn.addEventListener('click', () => {
    if (!confirm('Clear all plan items?')) return;
    planItems = [];
    savePlanItems();
    renderPlan();
    updateView();
});
if (planToggleBtn && planSection) {
    planToggleBtn.addEventListener('click', () => {
        const visible = planSection.style.display !== 'none';
        planSection.style.display = visible ? 'none' : 'block';
    });
}

/* ---------- Init ---------- */
(function init() {
    loadEntries();
    loadInitialBalance();
    loadPlanItems();
    entryDate.value = todayAsInputValue();
    const now = new Date();
    if (monthPicker) monthPicker.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    updateView();
})();

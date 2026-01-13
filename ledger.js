// Expense Ledger (balances + spending plan)

const setupSection = document.getElementById('setupSection');
const dashboardSection = document.getElementById('dashboardSection');
const planSection = document.getElementById('planSection');

const savingInput = document.getElementById('savingBalance');
const checkingInput = document.getElementById('checkingBalance');
const etcInput = document.getElementById('etcBalance');
const saveBalancesBtn = document.getElementById('saveBalancesBtn');
const editBalancesBtn = document.getElementById('editBalancesBtn');

const savingDisplay = document.getElementById('savingDisplay');
const checkingDisplay = document.getElementById('checkingDisplay');
const etcDisplay = document.getElementById('etcDisplay');
const totalBalanceEl = document.getElementById('totalBalance');
const plannedTotalEl = document.getElementById('plannedTotal');
const remainingTotalEl = document.getElementById('remainingTotal');

const openPlanBtn = document.getElementById('openPlanBtn');
const closePlanBtn = document.getElementById('closePlanBtn');
const planItemInput = document.getElementById('planItem');
const planAmountInput = document.getElementById('planAmount');
const addPlanItemBtn = document.getElementById('addPlanItemBtn');
const removePlanItemBtn = document.getElementById('removePlanItemBtn');
const planList = document.getElementById('planList');
const planTotalEl = document.getElementById('planTotal');
const planRemainingEl = document.getElementById('planRemaining');
const clearPlanBtn = document.getElementById('clearPlanBtn');

const activitySection = document.getElementById('activitySection');
const activityDateInput = document.getElementById('activityDate');
const activityTypeSelect = document.getElementById('activityType');
const activityAmountInput = document.getElementById('activityAmount');
const activityReasonInput = document.getElementById('activityReason');
const addActivityBtn = document.getElementById('addActivityBtn');
const activityList = document.getElementById('activityList');
const activitySummarySection = document.getElementById('activitySummarySection');
const activityTotalIncomeEl = document.getElementById('activityTotalIncome');
const activityTotalExpenseEl = document.getElementById('activityTotalExpense');
const activityNetEl = document.getElementById('activityNet');
const activitySummaryRange = document.getElementById('activitySummaryRange');
const reasonChart = document.getElementById('reasonChart');
const reasonLegend = document.getElementById('reasonLegend');
const activityReasonList = document.getElementById('activityReasonList');
const summaryChart = document.getElementById('summaryChart');
const activitySummaryEmpty = document.getElementById('activitySummaryEmpty');
const summaryChartBody = document.querySelector('#summaryChart .summary-chart-body');

const authApi = window.__ledgerAuth || {};
const requireAuthRef = authApi.requireAuth;
const dbRef = authApi.db;
let currentUser = null;
let balancesUnsub = null;
let planUnsub = null;
let activityUnsub = null;

function isRemoteEnabled() {
    return !!(currentUser && dbRef);
}

function balancesDoc(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerBalances').doc('main');
}

function planCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerPlanItems');
}

function activityCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerEntries');
}

function startLedgerSync(user) {
    if (!dbRef) return;
    if (balancesUnsub) balancesUnsub();
    if (planUnsub) planUnsub();
    if (activityUnsub) activityUnsub();

    balancesUnsub = balancesDoc(user).onSnapshot(doc => {
        balances = doc.exists ? doc.data() : null;
        if (hasBalances()) {
            showDashboard();
        } else {
            showSetup();
        }
    });

    planUnsub = planCollection(user).onSnapshot(snapshot => {
        planItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPlan();
        renderDashboard();
    });

    activityUnsub = activityCollection(user).onSnapshot(snapshot => {
        activityEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderActivity();
    });
}

const STORAGE_BALANCES = 'ledgerBalances';
const STORAGE_PLAN_ITEMS = 'ledgerPlanItems';
const STORAGE_ACTIVITY = 'ledgerActivity';

let balances = null;
let planItems = [];
let editingPlanId = null;
let activityEntries = [];

function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function loadBalances() {
    const raw = localStorage.getItem(STORAGE_BALANCES);
    balances = raw ? JSON.parse(raw) : null;
}

function saveBalances() {
    localStorage.setItem(STORAGE_BALANCES, JSON.stringify(balances));
}

function loadPlanItems() {
    const raw = localStorage.getItem(STORAGE_PLAN_ITEMS);
    planItems = raw ? JSON.parse(raw) : [];
}

function savePlanItems() {
    localStorage.setItem(STORAGE_PLAN_ITEMS, JSON.stringify(planItems));
}

function loadActivityEntries() {
    const raw = localStorage.getItem(STORAGE_ACTIVITY);
    activityEntries = raw ? JSON.parse(raw) : [];
}

function saveActivityEntries() {
    localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(activityEntries));
}

function hasBalances() {
    return balances && typeof balances === 'object';
}

function getTotalBalance() {
    if (!hasBalances()) return 0;
    return Number(balances.saving || 0) + Number(balances.checking || 0) + Number(balances.etc || 0);
}

function getPlannedTotal() {
    return planItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function setRemainingStyles(el, value) {
    if (!el) return;
    el.classList.toggle('negative', value < 0);
    el.classList.toggle('positive', value >= 0);
}

function renderDashboard() {
    if (!hasBalances()) return;
    savingDisplay.textContent = formatCurrency(balances.saving);
    checkingDisplay.textContent = formatCurrency(balances.checking);
    etcDisplay.textContent = formatCurrency(balances.etc);

    const total = getTotalBalance();
    const planned = getPlannedTotal();
    const remaining = total - planned;

    totalBalanceEl.textContent = formatCurrency(total);
    plannedTotalEl.textContent = formatCurrency(planned);
    remainingTotalEl.textContent = formatCurrency(remaining);
    setRemainingStyles(remainingTotalEl, remaining);
}

function renderPlan() {
    planList.innerHTML = '';

    if (planItems.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ledger-plan-item empty';
        empty.textContent = '\u2728 No planned items yet.';
        planList.appendChild(empty);
    } else {
        planItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'ledger-plan-item';
            li.dataset.id = item.id;

            const label = document.createElement('div');
            label.className = 'plan-label';
            label.textContent = item.label;

            const amount = document.createElement('div');
            amount.className = 'plan-amount';
            amount.textContent = '-' + formatCurrency(item.amount);

            const editBtn = document.createElement('button');
            editBtn.className = 'ghost-btn';
            editBtn.type = 'button';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => enterEditMode(item.id));

            li.appendChild(label);
            li.appendChild(amount);
            li.appendChild(editBtn);
            planList.appendChild(li);
        });
    }

    const total = getTotalBalance();
    const planned = getPlannedTotal();
    const remaining = total - planned;

    planTotalEl.textContent = formatCurrency(planned);
    planRemainingEl.textContent = formatCurrency(remaining);
    setRemainingStyles(planRemainingEl, remaining);
}

function renderActivity() {
    if (!activityList) return;
    activityList.innerHTML = '';

    if (activityEntries.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ledger-activity-item empty';
        empty.textContent = '\u{1F9FE} No activity entries yet.';
        activityList.appendChild(empty);
        renderReasonOptions();
        return;
    }

    const range = activitySummaryRange ? activitySummaryRange.value : 'all';
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    activityEntries
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(entry => {
            const li = document.createElement('li');
            li.className = `ledger-activity-item ${entry.type}`;
            li.dataset.id = entry.id;

            const meta = document.createElement('div');
            meta.className = 'activity-meta';
            meta.innerHTML = `<div class="activity-title">${entry.reason}</div><div class="activity-sub">${entry.date}</div>`;

            const amount = document.createElement('div');
            amount.className = 'activity-amount';
            amount.textContent = (entry.type === 'income' ? '+' : '-') + formatCurrency(entry.amount);

            const actions = document.createElement('div');
            actions.className = 'activity-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'ghost-btn';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => editActivityEntry(entry.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'danger-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteActivityEntry(entry.id));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(meta);
            li.appendChild(amount);
            li.appendChild(actions);
            activityList.appendChild(li);
        });

    renderReasonOptions();

    const entriesInRange = activityEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        if (range === 'year' && entryDate.getFullYear() !== now.getFullYear()) return false;
        if (range === 'month' && (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth())) return false;
        if (range === 'week' && entryDate < startOfWeek) return false;
        return true;
    });

    const totals = entriesInRange.reduce(
        (acc, entry) => {
            if (entry.type === 'income') acc.income += Number(entry.amount || 0);
            else acc.expense += Number(entry.amount || 0);
            return acc;
        },
        { income: 0, expense: 0 }
    );
    const net = totals.income - totals.expense;

    if (activityTotalIncomeEl) activityTotalIncomeEl.textContent = formatCurrency(totals.income);
    if (activityTotalExpenseEl) activityTotalExpenseEl.textContent = formatCurrency(totals.expense);
    if (activityNetEl) {
        activityNetEl.textContent = formatCurrency(net);
        setRemainingStyles(activityNetEl, net);
    }

    const isSummaryEmpty = entriesInRange.length === 0;
    if (activitySummaryEmpty) activitySummaryEmpty.classList.toggle('hidden', !isSummaryEmpty);
    if (summaryChartBody) summaryChartBody.classList.toggle('hidden', isSummaryEmpty);
    if (summaryChart) summaryChart.classList.toggle('is-empty', isSummaryEmpty);

    if (isSummaryEmpty) {
        if (reasonLegend) reasonLegend.innerHTML = '';
        if (reasonChart) {
            const ctx = reasonChart.getContext('2d');
            ctx.clearRect(0, 0, reasonChart.width, reasonChart.height);
        }
        return;
    }

    renderReasonChart(range, now, startOfWeek);
}

function showSetup() {
    setupSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.add('hidden');

    if (hasBalances()) {
        savingInput.value = Number(balances.saving || 0).toFixed(2);
        checkingInput.value = Number(balances.checking || 0).toFixed(2);
        etcInput.value = Number(balances.etc || 0).toFixed(2);
    } else {
        savingInput.value = '';
        checkingInput.value = '';
        etcInput.value = '';
    }
}

function showDashboard() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    if (activitySection) activitySection.classList.remove('hidden');
    if (activitySummarySection) activitySummarySection.classList.remove('hidden');
    planSection.classList.add('hidden');
    exitEditMode();
    renderDashboard();
    renderActivity();
}

function showPlan() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.remove('hidden');
    renderPlan();
}

async function saveBalancesFromInputs() {
    const saving = parseFloat(savingInput.value);
    const checking = parseFloat(checkingInput.value);
    const etc = parseFloat(etcInput.value);

    const parsed = {
        saving: isNaN(saving) ? 0 : Number(saving.toFixed(2)),
        checking: isNaN(checking) ? 0 : Number(checking.toFixed(2)),
        etc: isNaN(etc) ? 0 : Number(etc.toFixed(2))
    };

    if (parsed.saving === 0 && parsed.checking === 0 && parsed.etc === 0) {
        if (!confirm('All balances are zero. Continue?')) return;
    }

    balances = parsed;
    if (isRemoteEnabled()) {
        await balancesDoc(currentUser).set(balances);
        return;
    }
    saveBalances();
    showDashboard();
}

function enterEditMode(id) {
    const item = planItems.find(entry => entry.id === id);
    if (!item) return;
    editingPlanId = id;
    planItemInput.value = item.label;
    planAmountInput.value = Number(item.amount || 0).toFixed(2);
    addPlanItemBtn.textContent = 'Update item';
    if (removePlanItemBtn) {
        removePlanItemBtn.classList.remove('hidden');
        removePlanItemBtn.disabled = false;
    }
}

function exitEditMode() {
    editingPlanId = null;
    planItemInput.value = '';
    planAmountInput.value = '';
    addPlanItemBtn.textContent = 'Add item';
    if (removePlanItemBtn) {
        removePlanItemBtn.disabled = true;
        removePlanItemBtn.classList.add('hidden');
    }
}

async function addPlanItem() {
    const label = planItemInput.value.trim();
    const amount = parseFloat(planAmountInput.value);

    if (!label) {
        alert('Please enter an item name.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
    }

    const payload = {
        label,
        amount: Number(amount.toFixed(2))
    };

    if (isRemoteEnabled()) {
        const id = editingPlanId ? String(editingPlanId) : Date.now().toString();
        await planCollection(currentUser).doc(id).set({ id, ...payload });
        exitEditMode();
        return;
    }

    if (editingPlanId) {
        planItems = planItems.map(item => {
            if (item.id === editingPlanId) {
                return { ...item, ...payload };
            }
            return item;
        });
    } else {
        planItems.push({
            id: Date.now(),
            ...payload
        });
    }
    savePlanItems();
    exitEditMode();
    renderPlan();
    renderDashboard();
}

async function removeEditingPlanItem() {
    if (!editingPlanId) return;
    if (isRemoteEnabled()) {
        await planCollection(currentUser).doc(String(editingPlanId)).delete();
        exitEditMode();
        return;
    }
    planItems = planItems.filter(item => item.id !== editingPlanId);
    savePlanItems();
    exitEditMode();
    renderPlan();
    renderDashboard();
}

async function clearPlan() {
    if (!confirm('Clear all planned items?')) return;
    if (isRemoteEnabled()) {
        const batch = dbRef.batch();
        planItems.forEach(item => {
            const ref = planCollection(currentUser).doc(String(item.id));
            batch.delete(ref);
        });
        await batch.commit();
        return;
    }
    planItems = [];
    savePlanItems();
    renderPlan();
    renderDashboard();
}

async function addActivityEntry() {
    const date = activityDateInput.value;
    const type = activityTypeSelect.value;
    const amount = parseFloat(activityAmountInput.value);
    const reason = activityReasonInput.value.trim();

    if (!date) {
        alert('Please select a date.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
    }
    if (!reason) {
        alert('Please enter a reason.');
        return;
    }

    const entry = {
        id: Date.now().toString(),
        date,
        type,
        amount: Number(amount.toFixed(2)),
        reason
    };

    activityDateInput.value = '';
    activityAmountInput.value = '';
    activityReasonInput.value = '';

    if (isRemoteEnabled()) {
        await activityCollection(currentUser).doc(entry.id).set(entry);
        return;
    }

    activityEntries.push(entry);
    saveActivityEntries();
    renderActivity();
}

async function editActivityEntry(id) {
    const entry = activityEntries.find(item => item.id === id);
    if (!entry) return;

    const newDate = prompt('Edit date (YYYY-MM-DD)', entry.date) || entry.date;
    const newReason = prompt('Edit reason', entry.reason) || entry.reason;
    const newAmountRaw = prompt('Edit amount', String(entry.amount)) || String(entry.amount);
    const newType = prompt('Edit type (income/expense)', entry.type) || entry.type;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Invalid date format. Use YYYY-MM-DD.');
        return;
    }
    const newAmount = parseFloat(newAmountRaw);
    if (isNaN(newAmount) || newAmount <= 0) {
        alert('Invalid amount.');
        return;
    }
    const normalizedType = newType === 'income' ? 'income' : 'expense';

    const updated = {
        date: newDate,
        reason: newReason.trim() || entry.reason,
        amount: Number(newAmount.toFixed(2)),
        type: normalizedType
    };

    if (isRemoteEnabled()) {
        await activityCollection(currentUser).doc(String(id)).update(updated);
        return;
    }

    entry.date = updated.date;
    entry.reason = updated.reason;
    entry.amount = updated.amount;
    entry.type = updated.type;
    saveActivityEntries();
    renderActivity();
}

async function deleteActivityEntry(id) {
    if (!confirm('Delete this entry?')) return;
    if (isRemoteEnabled()) {
        await activityCollection(currentUser).doc(String(id)).delete();
        return;
    }
    activityEntries = activityEntries.filter(item => item.id !== id);
    saveActivityEntries();
    renderActivity();
}

function renderReasonOptions() {
    if (!activityReasonList) return;
    const reasons = new Set();
    activityEntries.forEach(entry => {
        if (entry.reason) reasons.add(entry.reason.trim());
    });
    activityReasonList.innerHTML = '';
    Array.from(reasons)
        .sort((a, b) => a.localeCompare(b))
        .forEach(reason => {
            const option = document.createElement('option');
            option.value = reason;
            activityReasonList.appendChild(option);
        });
}

function renderReasonChart(range, now, startOfWeek) {
    if (!reasonChart || !reasonLegend) return;
    const ctx = reasonChart.getContext('2d');
    const size = reasonChart.width;
    const center = size / 2;
    const radius = size / 2 - 8;

    const expenses = activityEntries.filter(entry => {
        if (entry.type !== 'expense') return false;
        const entryDate = new Date(entry.date);
        if (range === 'year' && entryDate.getFullYear() !== now.getFullYear()) return false;
        if (range === 'month' && (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth())) return false;
        if (range === 'week' && entryDate < startOfWeek) return false;
        return true;
    });

    const totalsByReason = {};
    expenses.forEach(entry => {
        const key = (entry.reason || 'Uncategorized').trim();
        totalsByReason[key] = (totalsByReason[key] || 0) + Number(entry.amount || 0);
    });

    const items = Object.keys(totalsByReason).map(key => ({
        label: key,
        value: totalsByReason[key]
    }));

    const total = items.reduce((sum, item) => sum + item.value, 0);
    reasonLegend.innerHTML = '';

    ctx.clearRect(0, 0, size, size);

    if (!total) {
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#eef1f7';
        ctx.fill();
        ctx.fillStyle = '#778';
        ctx.font = '12px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F4CA} No expense data', center, center);
        return;
    }

    const palette = ['#ff6b6b', '#f7b32b', '#4ecdc4', '#5c7cfa', '#6c5ce7', '#20c997', '#f06595', '#ffa94d'];
    let startAngle = -Math.PI / 2;

    items.forEach((item, index) => {
        const slice = (item.value / total) * Math.PI * 2;
        const color = palette[index % palette.length];
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        const percent = Math.round((item.value / total) * 100);
        const legendItem = document.createElement('li');
        legendItem.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span class="legend-label">${item.label}</span><span class="legend-value">${percent}%</span>`;
        reasonLegend.appendChild(legendItem);

        startAngle += slice;
    });
}

if (saveBalancesBtn) saveBalancesBtn.addEventListener('click', saveBalancesFromInputs);
if (editBalancesBtn) editBalancesBtn.addEventListener('click', showSetup);
if (openPlanBtn) openPlanBtn.addEventListener('click', showPlan);
if (closePlanBtn) closePlanBtn.addEventListener('click', showDashboard);
if (addPlanItemBtn) addPlanItemBtn.addEventListener('click', addPlanItem);
if (removePlanItemBtn) removePlanItemBtn.addEventListener('click', removeEditingPlanItem);
if (clearPlanBtn) clearPlanBtn.addEventListener('click', clearPlan);
if (addActivityBtn) addActivityBtn.addEventListener('click', addActivityEntry);
if (activitySummaryRange) activitySummaryRange.addEventListener('change', renderActivity);

(function init() {
    if (requireAuthRef) {
        requireAuthRef().then(user => {
            currentUser = user;
            startLedgerSync(user);
        });
        return;
    }

    loadBalances();
    loadPlanItems();
    loadActivityEntries();

    if (hasBalances()) {
        showDashboard();
    } else {
        showSetup();
    }
})();

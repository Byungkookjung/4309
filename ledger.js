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
const chartWrap = document.querySelector('#summaryChart .chart-wrap');
const chartTooltip = document.getElementById('chartTooltip');
const summaryRangeLabel = document.getElementById('summaryRangeLabel');
const selectedReasonEl = document.getElementById('selectedReason');
const legendSortSelect = document.getElementById('legendSort');
const legendToggleBtn = document.getElementById('legendToggleBtn');

let chartSlices = [];
let selectedReasonLabel = null;
let lastChartContext = null;
let isLegendExpanded = false;
const SUMMARY_LEGEND_LIMIT = 10;
const COLOR_PALETTE = [];
const reasonColorMap = new Map();
const toastEl = document.getElementById('toast');

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
let selectedActivityId = null;
let toastTimer = null;
let toastHideTimer = null;

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

function formatOrdinal(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    const mod100 = number % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
    switch (number % 10) {
        case 1:
            return `${number}st`;
        case 2:
            return `${number}nd`;
        case 3:
            return `${number}rd`;
        default:
            return `${number}th`;
    }
}

function getMondayStart(date) {
    const start = new Date(date);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    return start;
}

function getWeekOfMonth(date) {
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstWeekStart = getMondayStart(firstOfMonth);
    const currentWeekStart = getMondayStart(date);
    const diffMs = currentWeekStart - firstWeekStart;
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function getRangeWindow() {
    const now = new Date();
    const startOfWeek = getMondayStart(now);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return { now, startOfWeek, endOfWeek };
}

function buildColorPalette(count) {
    const colors = [];
    const goldenAngle = 137.508;
    const lightnessSteps = [54, 64, 74];
    const saturationSteps = [70, 82, 92];
    for (let i = 0; i < count; i += 1) {
        const hue = (i * goldenAngle) % 360;
        const lightness = lightnessSteps[i % lightnessSteps.length];
        const saturation = saturationSteps[Math.floor(i / lightnessSteps.length) % saturationSteps.length];
        const hueOffset = (i % 3) * 8;
        colors.push(`hsl(${(hue + hueOffset) % 360}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}

function ensureColorPalette() {
    if (COLOR_PALETTE.length) return;
    buildColorPalette(100).forEach(color => COLOR_PALETTE.push(color));
}

function hashLabel(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i += 1) {
        hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function assignColorForLabel(label, usedColors) {
    ensureColorPalette();
    if (reasonColorMap.has(label)) {
        const existing = reasonColorMap.get(label);
        if (!usedColors.has(existing)) {
            usedColors.add(existing);
            return existing;
        }
    }
    const baseIndex = hashLabel(label) % COLOR_PALETTE.length;
    for (let i = 0; i < COLOR_PALETTE.length; i += 1) {
        const idx = (baseIndex + i) % COLOR_PALETTE.length;
        const candidate = COLOR_PALETTE[idx];
        if (!usedColors.has(candidate)) {
            usedColors.add(candidate);
            reasonColorMap.set(label, candidate);
            return candidate;
        }
    }
    const fallback = COLOR_PALETTE[baseIndex];
    reasonColorMap.set(label, fallback);
    return fallback;
}

function updateActivitySelectionUI() {
    if (!activityList) return;
    const items = activityList.querySelectorAll('.ledger-activity-item');
    items.forEach(item => {
        const isSelected = selectedActivityId && item.dataset.id === String(selectedActivityId);
        item.classList.toggle('selected', isSelected);
    });
}

function selectActivityEntry(entry, range, now, startOfWeek, endOfWeek) {
    selectedActivityId = entry.id;
    if (entry.type !== 'expense') {
        selectedReasonLabel = null;
    } else {
        const label = (entry.reason || 'Uncategorized').trim() || 'Uncategorized';
        selectedReasonLabel = label;
    }
    updateActivitySelectionUI();
    renderReasonChart(range, now, startOfWeek, endOfWeek);
}

function updateActivitySummaryRangeLabels() {
    if (!activitySummaryRange) return;
    const now = new Date();
    const monthOption = activitySummaryRange.querySelector('option[value="month"]');
    const weekOption = activitySummaryRange.querySelector('option[value="week"]');
    const yearOption = activitySummaryRange.querySelector('option[value="year"]');

    if (yearOption) {
        yearOption.textContent = 'This year';
    }
    if (monthOption) {
        monthOption.textContent = 'This month';
    }
    if (weekOption) {
        weekOption.textContent = 'This week';
    }

    if (summaryRangeLabel) {
        const yearText = String(now.getFullYear());
        const monthText = `${yearText}, ${MONTH_NAMES[now.getMonth()]}`;
        const weekText = `${monthText} - ${formatOrdinal(getWeekOfMonth(now))} week (Mon-Sun)`;
        const selectedRange = activitySummaryRange.value;

        if (selectedRange === 'year') {
            summaryRangeLabel.textContent = yearText;
        } else if (selectedRange === 'month') {
            summaryRangeLabel.textContent = monthText;
        } else {
            summaryRangeLabel.textContent = weekText;
        }
    }
}

function showToast(message) {
    if (!toastEl) return;
    if (toastTimer) clearTimeout(toastTimer);
    if (toastHideTimer) clearTimeout(toastHideTimer);

    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    requestAnimationFrame(() => toastEl.classList.add('show'));

    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        toastHideTimer = setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, 3200);
}

function scheduleMidnightRefresh() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const delay = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
        const refreshedAt = new Date();
        updateActivitySummaryRangeLabels();
        renderActivity();
        showToast(
            `Summary refreshed: ${MONTH_NAMES[refreshedAt.getMonth()]} ${formatOrdinal(getWeekOfMonth(refreshedAt))} week.`
        );
        scheduleMidnightRefresh();
    }, delay);
}

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

    updateActivitySummaryRangeLabels();

    const range = activitySummaryRange ? activitySummaryRange.value : 'year';
    const { now, startOfWeek, endOfWeek } = getRangeWindow();

    const entriesInRange = activityEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        if (range === 'year' && entryDate.getFullYear() !== now.getFullYear()) return false;
        if (range === 'month' && (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth())) return false;
        if (range === 'week' && (entryDate < startOfWeek || entryDate >= endOfWeek)) return false;
        return true;
    });

    if (entriesInRange.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ledger-activity-item empty';
        empty.textContent = '\u{1F9FE} No activity entries in this range.';
        activityList.appendChild(empty);
        renderReasonOptions();
        updateLegendToggle(0);
        return;
    }

    entriesInRange
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
            editBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                editActivityEntry(entry.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'danger-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteActivityEntry(entry.id);
            });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            if (selectedActivityId === entry.id) {
                li.classList.add('selected');
            }

            li.appendChild(meta);
            li.appendChild(amount);
            li.appendChild(actions);
            activityList.appendChild(li);
        });

    renderReasonOptions();

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
        hideChartTooltip();
        return;
    }

    renderReasonChart(range, now, startOfWeek, endOfWeek);
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

function updateLegendToggle(totalCount) {
    if (!legendToggleBtn) return;
    if (totalCount <= SUMMARY_LEGEND_LIMIT) {
        legendToggleBtn.classList.add('hidden');
        legendToggleBtn.setAttribute('aria-expanded', 'false');
        return;
    }
    legendToggleBtn.classList.remove('hidden');
    legendToggleBtn.textContent = isLegendExpanded ? 'Show less' : `Show all (${totalCount})`;
    legendToggleBtn.setAttribute('aria-expanded', isLegendExpanded ? 'true' : 'false');
}

function getVisibleLegendItems(items) {
    if (isLegendExpanded || items.length <= SUMMARY_LEGEND_LIMIT) {
        return items;
    }
    const visible = items.slice(0, SUMMARY_LEGEND_LIMIT);
    if (selectedReasonLabel) {
        const alreadyVisible = visible.some(item => item.label === selectedReasonLabel);
        if (!alreadyVisible) {
            const selectedItem = items.find(item => item.label === selectedReasonLabel);
            if (selectedItem) {
                visible[visible.length - 1] = selectedItem;
            }
        }
    }
    return visible;
}

function normalizeAngle(angle) {
    const fullCircle = Math.PI * 2;
    return (angle % fullCircle + fullCircle) % fullCircle;
}

function hideChartTooltip() {
    if (!chartTooltip) return;
    chartTooltip.classList.add('hidden');
}

function getSliceAtPosition(x, y) {
    if (!reasonChart || chartSlices.length === 0) return null;
    const center = reasonChart.width / 2;
    const radius = reasonChart.width / 2 - 8;
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) return null;

    const angle = Math.atan2(dy, dx);
    const normalized = normalizeAngle(angle);
    return chartSlices.find(item => {
        if (item.full) return true;
        return item.wrap
            ? (normalized >= item.start || normalized <= item.end)
            : (normalized >= item.start && normalized <= item.end);
    }) || null;
}

function handleChartClick(event) {
    if (!reasonChart || chartSlices.length === 0) return;
    const targetRect = (chartWrap || reasonChart).getBoundingClientRect();
    const scaleX = reasonChart.width / targetRect.width;
    const scaleY = reasonChart.height / targetRect.height;
    const x = (event.clientX - targetRect.left) * scaleX;
    const y = (event.clientY - targetRect.top) * scaleY;
    const slice = getSliceAtPosition(x, y);

    if (!slice) {
        selectedReasonLabel = null;
    } else {
        selectedReasonLabel = selectedReasonLabel === slice.label ? null : slice.label;
    }

    if (lastChartContext) {
        renderReasonChart(
            lastChartContext.range,
            lastChartContext.now,
            lastChartContext.startOfWeek,
            lastChartContext.endOfWeek
        );
    } else {
        renderActivity();
    }
}

function handleLegendClick(event) {
    const item = event.target.closest('li');
    if (!item) return;
    const label = item.dataset.label;
    if (!label) return;
    selectedReasonLabel = selectedReasonLabel === label ? null : label;
    if (lastChartContext) {
        renderReasonChart(
            lastChartContext.range,
            lastChartContext.now,
            lastChartContext.startOfWeek,
            lastChartContext.endOfWeek
        );
    } else {
        renderActivity();
    }
}

function renderReasonChart(range, now, startOfWeek, endOfWeek) {
    if (!reasonChart || !reasonLegend) return;
    lastChartContext = { range, now, startOfWeek, endOfWeek };
    const ctx = reasonChart.getContext('2d');
    const size = reasonChart.width;
    const center = size / 2;
    const radius = size / 2 - 8;
    chartSlices = [];

    const usedColors = new Set();

    const expenses = activityEntries.filter(entry => {
        if (entry.type !== 'expense') return false;
        const entryDate = new Date(entry.date);
        if (range === 'year' && entryDate.getFullYear() !== now.getFullYear()) return false;
        if (range === 'month' && (entryDate.getFullYear() !== now.getFullYear() || entryDate.getMonth() !== now.getMonth())) return false;
        if (range === 'week' && (entryDate < startOfWeek || entryDate >= endOfWeek)) return false;
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

    const sortOrder = legendSortSelect ? legendSortSelect.value : 'desc';
    items.sort((a, b) => {
        return sortOrder === 'asc' ? a.value - b.value : b.value - a.value;
    });

    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (reasonLegend) reasonLegend.innerHTML = '';

    ctx.clearRect(0, 0, size, size);

    if (!total) {
        updateLegendToggle(0);
        selectedReasonLabel = null;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#eef1f7';
        ctx.fill();
        ctx.fillStyle = '#778';
        ctx.font = '12px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F4CA} No expense data', center, center);
        if (selectedReasonEl) selectedReasonEl.classList.add('hidden');
        return;
    }

    updateLegendToggle(items.length);

    const fullCircle = Math.PI * 2;
    let startAngle = -Math.PI / 2;
    const legendColors = new Map();

    items.forEach(item => {
        const slice = (item.value / total) * Math.PI * 2;
        const color = assignColorForLabel(item.label, usedColors);
        legendColors.set(item.label, color);
        const isSelected = selectedReasonLabel === item.label;
        if (isSelected) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius + 10, startAngle, startAngle + slice);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.restore();
        }
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        const percentRaw = (item.value / total) * 100;
        const percent = Math.max(0.01, Number(percentRaw.toFixed(2)));
        const startNormalized = normalizeAngle(startAngle);
        const endNormalized = normalizeAngle(startAngle + slice);
        const isFull = slice >= fullCircle - 0.0001;
        chartSlices.push({
            label: item.label,
            value: item.value,
            percent,
            color,
            start: isFull ? 0 : startNormalized,
            end: isFull ? fullCircle : endNormalized,
            wrap: !isFull && endNormalized < startNormalized,
            full: isFull
        });
        startAngle += slice;
    });

    const visibleLegendItems = getVisibleLegendItems(items);
    if (reasonLegend) {
        visibleLegendItems.forEach(item => {
            const color = legendColors.get(item.label) || assignColorForLabel(item.label, usedColors);
            const isSelected = selectedReasonLabel === item.label;
            const percentRaw = (item.value / total) * 100;
            const percent = Math.max(0.01, Number(percentRaw.toFixed(2)));
            const legendItem = document.createElement('li');
            legendItem.dataset.label = item.label;
            if (isSelected) legendItem.classList.add('selected');
            legendItem.title = `${item.label}: ${percent.toFixed(2)}% (${formatCurrency(item.value)})`;
            legendItem.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span class="legend-label">${item.label}</span><span class="legend-value">${percent.toFixed(2)}%</span>`;
            reasonLegend.appendChild(legendItem);
        });
    }

    if (selectedReasonEl) {
        if (selectedReasonLabel) {
            const selectedSlice = chartSlices.find(slice => slice.label === selectedReasonLabel);
            if (!selectedSlice) {
                selectedReasonLabel = null;
                selectedReasonEl.classList.add('hidden');
            } else {
                const amountText = formatCurrency(selectedSlice.value);
                selectedReasonEl.textContent = `Selected: ${selectedReasonLabel} (${amountText})`;
                selectedReasonEl.classList.remove('hidden');
            }
        } else {
            selectedReasonEl.classList.add('hidden');
        }
    }

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
if (legendSortSelect) legendSortSelect.addEventListener('change', renderActivity);
if (legendToggleBtn) {
    legendToggleBtn.addEventListener('click', () => {
        isLegendExpanded = !isLegendExpanded;
        if (lastChartContext) {
            renderReasonChart(
                lastChartContext.range,
                lastChartContext.now,
                lastChartContext.startOfWeek,
                lastChartContext.endOfWeek
            );
        } else {
            renderActivity();
        }
    });
}
if (chartWrap) {
    chartWrap.addEventListener('click', handleChartClick);
} else if (reasonChart) {
    reasonChart.addEventListener('click', handleChartClick);
}
if (summaryChartBody) {
    summaryChartBody.addEventListener('click', handleChartClick);
}
if (summaryChart) {
    summaryChart.addEventListener('click', handleChartClick, true);
}
if (reasonLegend) {
    reasonLegend.addEventListener('click', handleLegendClick);
}
if (activityList) {
    activityList.addEventListener('click', (event) => {
        const item = event.target.closest('.ledger-activity-item');
        if (!item || item.classList.contains('empty')) return;
        const id = item.dataset.id;
        const entry = activityEntries.find(record => String(record.id) === String(id));
        if (!entry) return;
        const range = activitySummaryRange ? activitySummaryRange.value : 'year';
        const { now, startOfWeek, endOfWeek } = getRangeWindow();
        selectActivityEntry(entry, range, now, startOfWeek, endOfWeek);
    });
}

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

    updateActivitySummaryRangeLabels();
    scheduleMidnightRefresh();
})();

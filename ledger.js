// Expense Ledger (balances + spending plan)

const setupSection = document.getElementById('setupSection');
const dashboardSection = document.getElementById('dashboardSection');
const spendingSummarySection = document.getElementById('spendingSummarySection');
const planSection = document.getElementById('planSection');
const balanceHistorySection = document.getElementById('balanceHistorySection');

const savingInput = document.getElementById('savingBalance');
const checkingInput = document.getElementById('checkingBalance');
const etcInput = document.getElementById('etcBalance');
const saveBalancesBtn = document.getElementById('saveBalancesBtn');
const setupBackBtn = document.getElementById('setupBackBtn');
const editBalancesBtn = document.getElementById('editBalancesBtn');
const toggleBalancesBtn = document.getElementById('toggleBalancesBtn');
const balancePanel = document.querySelector('#dashboardSection .balance-panel');
const balancePanelContent = document.getElementById('balancePanelContent');

const savingDisplay = document.getElementById('savingDisplay');
const checkingDisplay = document.getElementById('checkingDisplay');
const etcDisplay = document.getElementById('etcDisplay');
const totalBalanceEl = document.getElementById('totalBalance');
const incomeTotalEl = document.getElementById('incomeTotal');
const fixedTotalEl = document.getElementById('fixedTotal');
const plannedTotalEl = document.getElementById('plannedTotal');
const remainingTotalEl = document.getElementById('remainingTotal');
const balanceHistoryList = document.getElementById('balanceHistoryList');
const openBalanceHistoryBtn = document.getElementById('openBalanceHistoryBtn');
const closeBalanceHistoryBtn = document.getElementById('closeBalanceHistoryBtn');
const clearBalanceHistoryBtn = document.getElementById('clearBalanceHistoryBtn');

const openPlanBtn = document.getElementById('openPlanBtn');
const closePlanBtn = document.getElementById('closePlanBtn');
const planForm = document.getElementById('planForm');
const planTypeSelect = document.getElementById('planType');
const planItemInput = document.getElementById('planItem');
const planAmountInput = document.getElementById('planAmount');
const addPlanItemBtn = document.getElementById('addPlanItemBtn');
const removePlanItemBtn = document.getElementById('removePlanItemBtn');
const fixedPlanList = document.getElementById('fixedPlanList');
const expectedPlanList = document.getElementById('expectedPlanList');
const incomePlanList = document.getElementById('incomePlanList');
const fixedPlanTotalEl = document.getElementById('fixedPlanTotal');
const expectedPlanTotalEl = document.getElementById('expectedPlanTotal');
const incomePlanTotalEl = document.getElementById('incomePlanTotal');
const planTotalEl = document.getElementById('planTotal');
const planRemainingEl = document.getElementById('planRemaining');
const planIncomeEl = document.getElementById('planIncome');
const planFixedTotalEl = document.getElementById('planFixedTotal');
const clearPlanBtn = document.getElementById('clearPlanBtn');

const activitySection = document.getElementById('activitySection');
const activityDateInput = document.getElementById('activityDate');
const activityTypeSelect = document.getElementById('activityType');
const activityAmountInput = document.getElementById('activityAmount');
const activitySourceTypeSelect = document.getElementById('activitySourceType');
const activityLinkedItemField = document.getElementById('activityLinkedItemField');
const activityLinkedItemSelect = document.getElementById('activityLinkedItem');
const activityReasonInput = document.getElementById('activityReason');
const activityForm = document.getElementById('activityForm');
const activityList = document.getElementById('activityList');
const activityFilterGroup = document.getElementById('activityFilterGroup');
const activityFilterButtons = document.querySelectorAll('.activity-filter-btn');
const activitySummarySection = document.getElementById('activitySummarySection');
const activityTotalIncomeEl = document.getElementById('activityTotalIncome');
const activityTotalExpenseEl = document.getElementById('activityTotalExpense');
const activityNetEl = document.getElementById('activityNet');
const activityMonthPicker = document.getElementById('activityMonthPicker');
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
let balanceHistoryUnsub = null;
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

function balanceHistoryCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerBalanceHistory');
}

function activityCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerEntries');
}

function startLedgerSync(user) {
    if (!dbRef) return;
    if (balancesUnsub) balancesUnsub();
    if (balanceHistoryUnsub) balanceHistoryUnsub();
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

    balanceHistoryUnsub = balanceHistoryCollection(user)
        .orderBy('savedAt', 'desc')
        .limit(30)
        .onSnapshot(snapshot => {
            balanceHistoryEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderBalanceHistory();
        });

    planUnsub = planCollection(user).onSnapshot(snapshot => {
        planItems = normalizePlanItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        renderPlan();
        renderDashboard();
        updateActivitySourceControls();
    });

    activityUnsub = activityCollection(user).onSnapshot(snapshot => {
        activityEntries = normalizeActivityEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        renderActivity();
    });
}

const STORAGE_BALANCES = 'ledgerBalances';
const STORAGE_BALANCE_HISTORY = 'ledgerBalanceHistory';
const STORAGE_PLAN_ITEMS = 'ledgerPlanItems';
const STORAGE_ACTIVITY = 'ledgerActivity';

let balances = null;
let balanceHistoryEntries = [];
let planItems = [];
let editingPlanId = null;
let activityEntries = [];
let activityTypeFilter = 'all';
let selectedActivityId = null;
let toastTimer = null;
let toastHideTimer = null;
let selectedSummaryRange = 'month';
let selectedSummaryMonth = new Date().getMonth() + 1;
let balancesCollapsed = false;

const PLAN_TYPES = {
    fixed: 'fixed',
    expected: 'expected',
    income: 'income'
};

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

function parseLedgerDate(value) {
    if (typeof value !== 'string') return new Date(value);
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date(value);
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
}

function getLedgerDateParts(value) {
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
            return {
                year: Number(match[1]),
                month: Number(match[2]),
                day: Number(match[3])
            };
        }
    }

    const fallback = parseLedgerDate(value);
    return {
        year: fallback.getFullYear(),
        month: fallback.getMonth() + 1,
        day: fallback.getDate()
    };
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isFutureLedgerDate(value) {
    if (!value) return false;
    const inputDate = parseLedgerDate(value);
    const today = parseLedgerDate(getTodayDateString());
    return inputDate.getTime() > today.getTime();
}

function isEntryInRange(entryDateValue, range, now, startOfWeek, endOfWeek, selectedMonth = now.getMonth() + 1) {
    const parts = getLedgerDateParts(entryDateValue);

    if (range === 'year') {
        return parts.year === now.getFullYear();
    }

    if (range === 'month') {
        return parts.year === now.getFullYear() && parts.month === selectedMonth;
    }

    const entryDate = new Date(parts.year, parts.month - 1, parts.day);
    return entryDate >= startOfWeek && entryDate < endOfWeek;
}

function renderActivityMonthPicker() {
    if (!activityMonthPicker) return;
    activityMonthPicker.innerHTML = '';
    const currentMonth = new Date().getMonth() + 1;

    const rangeButtons = [
        { label: 'Year', value: 'year' },
        { label: 'Week', value: 'week' }
    ];

    rangeButtons.forEach(({ label, value }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'activity-month-btn activity-range-btn';
        button.dataset.range = value;
        button.textContent = label;
        const isSelected = selectedSummaryRange === value;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        activityMonthPicker.appendChild(button);
    });

    MONTH_NAMES.forEach((monthName, index) => {
        const monthNumber = index + 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'activity-month-btn';
        button.dataset.month = String(monthNumber);
        button.textContent = monthName.slice(0, 3);

        const isDisabled = monthNumber > currentMonth;
        const isSelected = selectedSummaryRange === 'month' && selectedSummaryMonth === monthNumber;
        button.classList.toggle('active', isSelected);
        button.classList.toggle('disabled', isDisabled);
        button.disabled = isDisabled;
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

        activityMonthPicker.appendChild(button);
    });
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
    const now = new Date();

    if (summaryRangeLabel) {
        const yearText = String(now.getFullYear());
        const monthText = `${yearText}, ${MONTH_NAMES[selectedSummaryMonth - 1]}`;
        const currentMonthText = `${yearText}, ${MONTH_NAMES[now.getMonth()]}`;
        const weekText = `${currentMonthText} - ${formatOrdinal(getWeekOfMonth(now))} week (Mon-Sun)`;
        if (selectedSummaryRange === 'year') {
            summaryRangeLabel.textContent = yearText;
        } else if (selectedSummaryRange === 'month') {
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
        window.location.reload();
    }, delay);
}

function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatHistoryDateTime(value) {
    if (!value && value !== 0) return 'Unknown time';
    let date = value;
    if (value && typeof value.toDate === 'function') {
        date = value.toDate();
    } else if (value && typeof value.seconds === 'number') {
        date = new Date(value.seconds * 1000);
    } else if (!(value instanceof Date)) {
        date = new Date(value);
    }

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 'Unknown time';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function normalizePlanType(value) {
    return value === PLAN_TYPES.fixed || value === PLAN_TYPES.income ? value : PLAN_TYPES.expected;
}

function normalizeActivitySourceType(value) {
    if (value === 'custom') return 'custom';
    return normalizePlanType(value);
}

function normalizePlanItem(item) {
    return {
        id: String(item.id || Date.now()),
        type: normalizePlanType(item.type),
        label: String(item.label || '').trim(),
        amount: Number(Number(item.amount || 0).toFixed(2))
    };
}

function normalizePlanItems(items) {
    return (items || [])
        .map(normalizePlanItem)
        .filter(item => item.label && item.amount > 0);
}

function normalizeActivityEntry(entry) {
    return {
        ...entry,
        id: String(entry.id || Date.now()),
        type: entry.type === 'income' ? 'income' : 'expense',
        amount: Number(Number(entry.amount || 0).toFixed(2)),
        reason: String(entry.reason || '').trim(),
        sourceType: entry.sourceType ? normalizeActivitySourceType(entry.sourceType) : 'custom',
        linkedPlanItemId: entry.linkedPlanItemId ? String(entry.linkedPlanItemId) : '',
        linkedPlanItemLabel: entry.linkedPlanItemLabel ? String(entry.linkedPlanItemLabel) : ''
    };
}

function normalizeActivityEntries(entries) {
    return (entries || []).map(normalizeActivityEntry).filter(entry => entry.reason && entry.amount > 0);
}

function getPlanItemsByType(type) {
    return planItems.filter(item => item.type === type);
}

function getPlanTotalByType(type) {
    return getPlanItemsByType(type).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getExpenseTotal() {
    return getPlanTotalByType(PLAN_TYPES.fixed) + getPlanTotalByType(PLAN_TYPES.expected);
}

function getIncomeTotal() {
    return getPlanTotalByType(PLAN_TYPES.income);
}

function getEstimatedSavings() {
    return getIncomeTotal() - getExpenseTotal();
}

function loadBalances() {
    const raw = localStorage.getItem(STORAGE_BALANCES);
    balances = raw ? JSON.parse(raw) : null;
}

function saveBalances() {
    localStorage.setItem(STORAGE_BALANCES, JSON.stringify(balances));
}

function loadBalanceHistory() {
    const raw = localStorage.getItem(STORAGE_BALANCE_HISTORY);
    balanceHistoryEntries = raw ? JSON.parse(raw) : [];
}

function saveBalanceHistory() {
    localStorage.setItem(STORAGE_BALANCE_HISTORY, JSON.stringify(balanceHistoryEntries));
}

function areBalancesEqual(left, right) {
    if (!left || !right) return false;
    return Number(left.checking || 0) === Number(right.checking || 0)
        && Number(left.saving || 0) === Number(right.saving || 0)
        && Number(left.etc || 0) === Number(right.etc || 0);
}

function buildBalanceHistoryEntry(nextBalances) {
    const savedAt = new Date().toISOString();
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt,
        checking: Number(nextBalances.checking || 0),
        saving: Number(nextBalances.saving || 0),
        etc: Number(nextBalances.etc || 0),
        total: Number(nextBalances.checking || 0) + Number(nextBalances.saving || 0) + Number(nextBalances.etc || 0)
    };
}

function renderBalanceHistory() {
    if (!balanceHistoryList) return;
    balanceHistoryList.innerHTML = '';

    if (!balanceHistoryEntries.length) {
        const empty = document.createElement('li');
        empty.className = 'ledger-history-item empty';
        empty.textContent = '\u2728 No saved balance history yet.';
        balanceHistoryList.appendChild(empty);
        return;
    }

    balanceHistoryEntries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'ledger-history-item';
        item.dataset.id = String(entry.id);

        const meta = document.createElement('div');
        meta.className = 'history-meta';

        const title = document.createElement('div');
        title.className = 'history-title';
        title.textContent = formatHistoryDateTime(entry.savedAt);

        const sub = document.createElement('div');
        sub.className = 'history-sub';
        sub.textContent = 'Saved balance snapshot';

        const values = document.createElement('div');
        values.className = 'history-values';
        values.innerHTML = `
            <span class="history-chip">Checking ${formatCurrency(entry.checking)}</span>
            <span class="history-chip">Saving ${formatCurrency(entry.saving)}</span>
            <span class="history-chip">Etc ${formatCurrency(entry.etc)}</span>
        `;

        const total = document.createElement('div');
        total.className = 'history-total';
        total.textContent = formatCurrency(entry.total);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn history-delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.dataset.action = 'delete-history';
        deleteBtn.setAttribute('aria-label', 'Delete balance history entry');
        deleteBtn.setAttribute('title', 'Delete balance history entry');
        deleteBtn.textContent = '🗑';

        const actions = document.createElement('div');
        actions.className = 'history-actions';
        actions.appendChild(total);
        actions.appendChild(deleteBtn);

        meta.appendChild(title);
        meta.appendChild(sub);
        meta.appendChild(values);
        item.appendChild(meta);
        item.appendChild(actions);
        balanceHistoryList.appendChild(item);
    });
}

async function recordBalanceHistory(nextBalances) {
    const entry = buildBalanceHistoryEntry(nextBalances);

    if (isRemoteEnabled()) {
        await balanceHistoryCollection(currentUser).doc(entry.id).set(entry);
        return;
    }

    balanceHistoryEntries = [entry, ...balanceHistoryEntries].slice(0, 30);
    saveBalanceHistory();
    renderBalanceHistory();
}

async function deleteBalanceHistoryEntry(id) {
    if (!confirm('Delete this balance history entry?')) return;
    if (isRemoteEnabled()) {
        await balanceHistoryCollection(currentUser).doc(String(id)).delete();
        return;
    }
    balanceHistoryEntries = balanceHistoryEntries.filter(entry => String(entry.id) !== String(id));
    saveBalanceHistory();
    renderBalanceHistory();
}

async function clearBalanceHistory() {
    if (!confirm('Clear all balance history?')) return;
    if (isRemoteEnabled()) {
        const batch = dbRef.batch();
        balanceHistoryEntries.forEach(entry => {
            const ref = balanceHistoryCollection(currentUser).doc(String(entry.id));
            batch.delete(ref);
        });
        await batch.commit();
        return;
    }
    balanceHistoryEntries = [];
    saveBalanceHistory();
    renderBalanceHistory();
}

function loadPlanItems() {
    const raw = localStorage.getItem(STORAGE_PLAN_ITEMS);
    planItems = normalizePlanItems(raw ? JSON.parse(raw) : []);
}

function savePlanItems() {
    localStorage.setItem(STORAGE_PLAN_ITEMS, JSON.stringify(planItems));
}

function loadActivityEntries() {
    const raw = localStorage.getItem(STORAGE_ACTIVITY);
    activityEntries = normalizeActivityEntries(raw ? JSON.parse(raw) : []);
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
    return getPlanTotalByType(PLAN_TYPES.expected);
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

    const income = getIncomeTotal();
    const fixed = getPlanTotalByType(PLAN_TYPES.fixed);
    const expected = getPlanTotalByType(PLAN_TYPES.expected);
    const savings = getEstimatedSavings();

    if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(getTotalBalance());
    if (incomeTotalEl) incomeTotalEl.textContent = formatCurrency(income);
    if (fixedTotalEl) fixedTotalEl.textContent = formatCurrency(fixed);
    plannedTotalEl.textContent = formatCurrency(expected);
    remainingTotalEl.textContent = formatCurrency(savings);
    setRemainingStyles(remainingTotalEl, savings);
}

function setBalancesCollapsed(collapsed) {
    balancesCollapsed = Boolean(collapsed);
    if (balancePanel) {
        balancePanel.classList.toggle('collapsed', balancesCollapsed);
    }
    if (toggleBalancesBtn) {
        toggleBalancesBtn.setAttribute('aria-expanded', balancesCollapsed ? 'false' : 'true');
    }
    if (balancePanelContent) {
        balancePanelContent.setAttribute('aria-hidden', balancesCollapsed ? 'true' : 'false');
    }
}

function toggleBalancesPanel() {
    setBalancesCollapsed(!balancesCollapsed);
}

function getPlanTypeLabel(type) {
    if (type === PLAN_TYPES.fixed) return '고정지출';
    if (type === PLAN_TYPES.income) return '예상 수입';
    return '예상 지출';
}

function renderPlanBucket(listEl, items, amountClass = 'plan-amount') {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (items.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ledger-plan-item empty';
        empty.textContent = '\u2728 No items yet.';
        listEl.appendChild(empty);
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'ledger-plan-item';
        li.dataset.id = item.id;

        const label = document.createElement('div');
        label.className = 'plan-label';
        label.textContent = item.label;

        const amount = document.createElement('div');
        amount.className = amountClass;
        amount.textContent = formatCurrency(item.amount);

        const editBtn = document.createElement('button');
        editBtn.className = 'ghost-btn';
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => enterEditMode(item.id));

        li.appendChild(label);
        li.appendChild(amount);
        li.appendChild(editBtn);
        listEl.appendChild(li);
    });
}

function renderPlan() {
    const fixedItems = getPlanItemsByType(PLAN_TYPES.fixed);
    const expectedItems = getPlanItemsByType(PLAN_TYPES.expected);
    const incomeItems = getPlanItemsByType(PLAN_TYPES.income);

    renderPlanBucket(fixedPlanList, fixedItems, 'plan-amount');
    renderPlanBucket(expectedPlanList, expectedItems, 'plan-amount');
    renderPlanBucket(incomePlanList, incomeItems, 'plan-income-amount');

    const fixedTotal = getPlanTotalByType(PLAN_TYPES.fixed);
    const expectedTotal = getPlanTotalByType(PLAN_TYPES.expected);
    const incomeTotal = getPlanTotalByType(PLAN_TYPES.income);
    const savings = getEstimatedSavings();

    if (fixedPlanTotalEl) fixedPlanTotalEl.textContent = formatCurrency(fixedTotal);
    if (expectedPlanTotalEl) expectedPlanTotalEl.textContent = formatCurrency(expectedTotal);
    if (incomePlanTotalEl) incomePlanTotalEl.textContent = formatCurrency(incomeTotal);
    if (planIncomeEl) planIncomeEl.textContent = formatCurrency(incomeTotal);
    if (planFixedTotalEl) planFixedTotalEl.textContent = formatCurrency(fixedTotal);
    planTotalEl.textContent = formatCurrency(expectedTotal);
    planRemainingEl.textContent = formatCurrency(savings);
    setRemainingStyles(planRemainingEl, savings);
}

function populateActivityLinkedItems() {
    if (!activityLinkedItemSelect) return;
    const sourceType = activitySourceTypeSelect ? activitySourceTypeSelect.value : 'custom';
    const items = sourceType === 'custom' ? [] : getPlanItemsByType(normalizePlanType(sourceType));

    activityLinkedItemSelect.innerHTML = '';
    if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No items available';
        activityLinkedItemSelect.appendChild(option);
        return;
    }

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.label} (${formatCurrency(item.amount)})`;
        activityLinkedItemSelect.appendChild(option);
    });
}

function updateActivitySourceControls() {
    if (!activitySourceTypeSelect || !activityLinkedItemField || !activityReasonInput) return;
    const sourceType = activitySourceTypeSelect.value;
    const usingLinkedItem = sourceType !== 'custom';

    activityLinkedItemField.classList.toggle('hidden', !usingLinkedItem);
    activityReasonInput.disabled = usingLinkedItem;
    activityReasonInput.placeholder = usingLinkedItem ? 'Reason is taken from the selected budget item' : 'Food, paycheck, rent...';

    populateActivityLinkedItems();

    if (usingLinkedItem) {
        const selectedItem = planItems.find(item => item.id === activityLinkedItemSelect.value) || getPlanItemsByType(normalizePlanType(sourceType))[0];
        activityReasonInput.value = selectedItem ? selectedItem.label : '';
    } else if (!activityReasonInput.value) {
        activityReasonInput.value = '';
    }
}

function syncActivitySourceWithType() {
    if (!activityTypeSelect || !activitySourceTypeSelect) return;
    if (activityTypeSelect.value === 'income') {
        if (activitySourceTypeSelect.value === PLAN_TYPES.fixed || activitySourceTypeSelect.value === PLAN_TYPES.expected) {
            activitySourceTypeSelect.value = PLAN_TYPES.income;
        }
    } else if (activitySourceTypeSelect.value === PLAN_TYPES.income) {
        activitySourceTypeSelect.value = PLAN_TYPES.expected;
    }
    updateActivitySourceControls();
}

function renderActivity() {
    if (!activityList) return;
    activityList.innerHTML = '';
    renderActivityMonthPicker();

    updateActivitySummaryRangeLabels();

    const range = selectedSummaryRange;
    const { now, startOfWeek, endOfWeek } = getRangeWindow();

    const entriesInRange = activityEntries.filter(entry => {
        return isEntryInRange(entry.date, range, now, startOfWeek, endOfWeek, selectedSummaryMonth);
    });

    const filteredEntries = entriesInRange.filter(entry => {
        if (activityTypeFilter === 'all') return true;
        return entry.type === activityTypeFilter;
    });

    if (filteredEntries.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'ledger-activity-item empty';
        if (entriesInRange.length === 0) {
            empty.textContent = '\u{1F9FE} No activity entries in this range.';
        } else if (activityTypeFilter === 'income') {
            empty.textContent = '\u{1F4B8} No income entries in this range.';
        } else if (activityTypeFilter === 'expense') {
            empty.textContent = '\u{1F4B3} No expense entries in this range.';
        } else {
            empty.textContent = '\u{1F9FE} No activity entries in this range.';
        }
        activityList.appendChild(empty);
    } else {
        filteredEntries
        .slice()
        .sort((a, b) => parseLedgerDate(b.date) - parseLedgerDate(a.date))
        .forEach(entry => {
            const li = document.createElement('li');
            li.className = `ledger-activity-item ${entry.type}`;
            li.dataset.id = entry.id;

            const meta = document.createElement('div');
            meta.className = 'activity-meta';
            const budgetTypeLabel = entry.sourceType && entry.sourceType !== 'custom' ? getPlanTypeLabel(entry.sourceType) : '';
            meta.innerHTML = `<div class="activity-title">${entry.reason}</div><div class="activity-sub">${entry.date}${budgetTypeLabel ? ` · ${budgetTypeLabel}` : ''}</div>`;

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
    }

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

function setActivityTypeFilter(filter) {
    const nextFilter = filter === 'income' || filter === 'expense' ? filter : 'all';
    activityTypeFilter = nextFilter;
    activityFilterButtons.forEach(button => {
        const isActive = button.dataset.filter === nextFilter;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    renderActivity();
}

function showSetup() {
    setupSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
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

function handleSetupBack() {
    if (hasBalances()) {
        showDashboard();
        return;
    }
    window.location.href = 'index.html';
}

function showDashboard() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.remove('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (activitySection) activitySection.classList.remove('hidden');
    if (activitySummarySection) activitySummarySection.classList.remove('hidden');
    planSection.classList.add('hidden');
    exitEditMode();
    renderDashboard();
    renderBalanceHistory();
    setBalancesCollapsed(balancesCollapsed);
    renderActivity();
}

function showPlan() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.remove('hidden');
    renderPlan();
}

function showBalanceHistory() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.remove('hidden');
    renderBalanceHistory();
}

async function saveBalancesFromInputs() {
    const saving = parseFloat(savingInput.value);
    const checking = parseFloat(checkingInput.value);
    const etc = parseFloat(etcInput.value);
    const previousBalances = balances;

    const parsed = {
        saving: isNaN(saving) ? 0 : Number(saving.toFixed(2)),
        checking: isNaN(checking) ? 0 : Number(checking.toFixed(2)),
        etc: isNaN(etc) ? 0 : Number(etc.toFixed(2))
    };

    if (parsed.saving === 0 && parsed.checking === 0 && parsed.etc === 0) {
        if (!confirm('All balances are zero. Continue?')) return;
    }

    if (!confirm('Save these balance changes?')) return;

    balances = parsed;
    try {
        const shouldRecordHistory = !areBalancesEqual(parsed, previousBalances);
        if (isRemoteEnabled()) {
            await balancesDoc(currentUser).set(balances);
            if (shouldRecordHistory) {
                await recordBalanceHistory(parsed);
            }
            showDashboard();
            return;
        }
        saveBalances();
        if (shouldRecordHistory) {
            await recordBalanceHistory(parsed);
        }
        showDashboard();
    } catch (error) {
        balances = previousBalances;
        alert(error && error.message ? error.message : 'Failed to save balances.');
    }
}

function enterEditMode(id) {
    const item = planItems.find(entry => entry.id === id);
    if (!item) return;
    editingPlanId = id;
    if (planTypeSelect) planTypeSelect.value = item.type;
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
    if (planTypeSelect) planTypeSelect.value = PLAN_TYPES.fixed;
    planItemInput.value = '';
    planAmountInput.value = '';
    addPlanItemBtn.textContent = 'Add item';
    if (removePlanItemBtn) {
        removePlanItemBtn.disabled = true;
        removePlanItemBtn.classList.add('hidden');
    }
}

async function addPlanItem() {
    const type = planTypeSelect ? normalizePlanType(planTypeSelect.value) : PLAN_TYPES.expected;
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
        type,
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
            id: Date.now().toString(),
            ...payload
        });
    }
    savePlanItems();
    exitEditMode();
    renderPlan();
    renderDashboard();
    updateActivitySourceControls();
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
    updateActivitySourceControls();
}

async function clearPlan() {
    if (!confirm('Clear all budget items?')) return;
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
    updateActivitySourceControls();
}

async function addActivityEntry() {
    const date = activityDateInput.value;
    const type = activityTypeSelect.value;
    const amount = parseFloat(activityAmountInput.value);
    const sourceType = activitySourceTypeSelect ? activitySourceTypeSelect.value : 'custom';
    const linkedItemId = activityLinkedItemSelect ? activityLinkedItemSelect.value : '';
    const linkedItem = sourceType === 'custom' ? null : planItems.find(item => item.id === linkedItemId);
    const reason = linkedItem ? linkedItem.label : activityReasonInput.value.trim();

    if (!date) {
        alert('Please select a date.');
        return;
    }
    if (isFutureLedgerDate(date)) {
        alert('Future dates are not allowed.');
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
        reason,
        sourceType,
        linkedPlanItemId: linkedItem ? linkedItem.id : '',
        linkedPlanItemLabel: linkedItem ? linkedItem.label : ''
    };

    activityDateInput.value = '';
    activityAmountInput.value = '';
    activityReasonInput.value = '';
    if (activitySourceTypeSelect) {
        activitySourceTypeSelect.value = 'custom';
    }
    if (activityLinkedItemSelect) {
        activityLinkedItemSelect.innerHTML = '';
    }
    updateActivitySourceControls();

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
    if (isFutureLedgerDate(newDate)) {
        alert('Future dates are not allowed.');
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
        type: normalizedType,
        sourceType: normalizedType === 'income' && entry.sourceType === PLAN_TYPES.income ? PLAN_TYPES.income : entry.sourceType,
        linkedPlanItemId: entry.linkedPlanItemId || '',
        linkedPlanItemLabel: entry.linkedPlanItemLabel || ''
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
    planItems.forEach(item => {
        if (item.label) reasons.add(item.label.trim());
    });
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
        return isEntryInRange(entry.date, range, now, startOfWeek, endOfWeek, selectedSummaryMonth);
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
if (setupBackBtn) setupBackBtn.addEventListener('click', handleSetupBack);
if (editBalancesBtn) editBalancesBtn.addEventListener('click', showSetup);
if (toggleBalancesBtn) toggleBalancesBtn.addEventListener('click', toggleBalancesPanel);
if (openBalanceHistoryBtn) openBalanceHistoryBtn.addEventListener('click', showBalanceHistory);
if (closeBalanceHistoryBtn) closeBalanceHistoryBtn.addEventListener('click', showDashboard);
if (clearBalanceHistoryBtn) clearBalanceHistoryBtn.addEventListener('click', clearBalanceHistory);
if (openPlanBtn) openPlanBtn.addEventListener('click', showPlan);
if (closePlanBtn) closePlanBtn.addEventListener('click', showDashboard);
if (addPlanItemBtn) addPlanItemBtn.addEventListener('click', addPlanItem);
if (planForm) {
    planForm.addEventListener('submit', event => {
        event.preventDefault();
        addPlanItem();
    });
}
if (removePlanItemBtn) removePlanItemBtn.addEventListener('click', removeEditingPlanItem);
if (clearPlanBtn) clearPlanBtn.addEventListener('click', clearPlan);
if (activityForm) {
    activityForm.addEventListener('submit', event => {
        event.preventDefault();
        addActivityEntry();
    });
}
if (activityTypeSelect) {
    activityTypeSelect.addEventListener('change', syncActivitySourceWithType);
}
if (activitySourceTypeSelect) {
    activitySourceTypeSelect.addEventListener('change', updateActivitySourceControls);
}
if (activityLinkedItemSelect) {
    activityLinkedItemSelect.addEventListener('change', () => {
        const linkedItem = planItems.find(item => item.id === activityLinkedItemSelect.value);
        if (linkedItem && activityReasonInput) {
            activityReasonInput.value = linkedItem.label;
        }
    });
}
if (activityFilterGroup) {
    activityFilterGroup.addEventListener('click', event => {
        const button = event.target.closest('.activity-filter-btn');
        if (!button) return;
        setActivityTypeFilter(button.dataset.filter);
    });
}
if (activityMonthPicker) {
    activityMonthPicker.addEventListener('click', event => {
        const button = event.target.closest('.activity-month-btn');
        if (!button) return;
        const range = button.dataset.range;
        if (range === 'year' || range === 'week') {
            selectedSummaryRange = range;
            renderActivity();
            return;
        }
        const month = Number(button.dataset.month);
        if (!Number.isInteger(month) || month < 1 || month > 12) return;
        selectedSummaryMonth = month;
        selectedSummaryRange = 'month';
        renderActivity();
    });
}
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
        const range = selectedSummaryRange;
        const { now, startOfWeek, endOfWeek } = getRangeWindow();
        selectActivityEntry(entry, range, now, startOfWeek, endOfWeek);
    });
}
if (balanceHistoryList) {
    balanceHistoryList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="delete-history"]');
        if (!button) return;
        const item = button.closest('.ledger-history-item');
        if (!item || item.classList.contains('empty')) return;
        deleteBalanceHistoryEntry(item.dataset.id);
    });
}

(function init() {
    setActivityTypeFilter('all');
    exitEditMode();
    syncActivitySourceWithType();
    if (activityDateInput) {
        activityDateInput.max = getTodayDateString();
    }

    if (requireAuthRef) {
        requireAuthRef().then(user => {
            currentUser = user;
            startLedgerSync(user);
        });
        return;
    }

    loadBalances();
    loadBalanceHistory();
    loadPlanItems();
    loadActivityEntries();
    updateActivitySourceControls();

    if (hasBalances()) {
        showDashboard();
    } else {
        showSetup();
    }

    updateActivitySummaryRangeLabels();
    scheduleMidnightRefresh();
})();

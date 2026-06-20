// Expense Ledger (balances + spending plan)

const setupSection = document.getElementById('setupSection');
const dashboardSection = document.getElementById('dashboardSection');
const investmentHubSection = document.getElementById('investmentHubSection');
const exchangeSection = document.getElementById('exchangeSection');
const spendingSummarySection = document.getElementById('spendingSummarySection');
const planSection = document.getElementById('planSection');
const balanceHistorySection = document.getElementById('balanceHistorySection');
const exchangeHistorySection = document.getElementById('exchangeHistorySection');
const ledgerCanadaInvestmentReturnEl = document.getElementById('ledgerCanadaInvestmentReturn');
const ledgerKoreaInvestmentReturnEl = document.getElementById('ledgerKoreaInvestmentReturn');

const savingInput = document.getElementById('savingBalance');
const checkingInput = document.getElementById('checkingBalance');
const etcInput = document.getElementById('etcBalance');
const saveBalancesBtn = document.getElementById('saveBalancesBtn');
const setupBackBtn = document.getElementById('setupBackBtn');
const editBalancesBtn = document.getElementById('editBalancesBtn');
const toggleBalancesBtn = document.getElementById('toggleBalancesBtn');
const balancePanel = document.querySelector('#dashboardSection .balance-panel');
const balancePanelContent = document.getElementById('balancePanelContent');
const toggleExchangeBtn = document.getElementById('toggleExchangeBtn');
const exchangePanel = document.querySelector('#exchangeSection .exchange-panel');
const exchangePanelHeader = document.querySelector('#exchangeSection .exchange-panel-header');
const exchangePanelContent = document.getElementById('exchangePanelContent');

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
const exchangeHistoryList = document.getElementById('exchangeHistoryList');
const openExchangeHistoryBtn = document.getElementById('openExchangeHistoryBtn');
const closeExchangeHistoryBtn = document.getElementById('closeExchangeHistoryBtn');
const clearExchangeHistoryBtn = document.getElementById('clearExchangeHistoryBtn');
const saveExchangeSnapshotBtn = document.getElementById('saveExchangeSnapshotBtn');
const exchangeUpdatedAtEl = document.getElementById('exchangeUpdatedAt');
const exchangeSourceTextEl = document.getElementById('exchangeSourceText');
const usdCadRateLabelEl = document.getElementById('usdCadRateLabel');
const cadKrwRateLabelEl = document.getElementById('cadKrwRateLabel');
const usdCadFromAmountInput = document.getElementById('usdCadFromAmount');
const usdCadFromCurrencySelect = document.getElementById('usdCadFromCurrency');
const usdCadToAmountInput = document.getElementById('usdCadToAmount');
const usdCadToCurrencySelect = document.getElementById('usdCadToCurrency');
const cadKrwFromAmountInput = document.getElementById('cadKrwFromAmount');
const cadKrwFromCurrencySelect = document.getElementById('cadKrwFromCurrency');
const cadKrwToAmountInput = document.getElementById('cadKrwToAmount');
const cadKrwToCurrencySelect = document.getElementById('cadKrwToCurrency');

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
const planDetailCard = document.getElementById('planDetailCard');
const planDetailTitle = document.getElementById('planDetailTitle');
const planDetailRangeLabel = document.getElementById('planDetailRangeLabel');
const planDetailTable = document.getElementById('planDetailTable');
const planDetailRows = document.getElementById('planDetailRows');
const clearPlanBtn = document.getElementById('clearPlanBtn');

const activitySection = document.getElementById('activitySection');
const activityDateInput = document.getElementById('activityDate');
const activityAmountInput = document.getElementById('activityAmount');
const activitySourceTypeSelect = document.getElementById('activitySourceType');
const activityLinkedItemField = document.getElementById('activityLinkedItemField');
const activityLinkedItemSelect = document.getElementById('activityLinkedItem');
const activityReasonInput = document.getElementById('activityReason');
const activityDetailField = document.getElementById('activityDetailField');
const activityDetailInput = document.getElementById('activityDetail');
const activitySharedInput = document.getElementById('activityShared');
const activityForm = document.getElementById('activityForm');
const addActivityBtn = document.getElementById('addActivityBtn');
const addActivityBtnIcon = document.getElementById('addActivityBtnIcon');
const addActivityBtnText = document.getElementById('addActivityBtnText');
const cancelActivityEditBtn = document.getElementById('cancelActivityEditBtn');
const activityList = document.getElementById('activityList');
const activityListSizeGroup = document.getElementById('activityListSizeGroup');
const activityListSizeButtons = document.querySelectorAll('.activity-list-size-btn');
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
const rentToggleBtn = document.getElementById('rentToggleBtn');
const budgetProgressRows = document.getElementById('budgetProgressRows');

let chartSlices = [];
let selectedReasonLabel = null;
let lastChartContext = null;
let isLegendExpanded = false;
let hideRentInChart = false;
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
let exchangeHistoryUnsub = null;
let planUnsub = null;
let activityUnsub = null;
let investmentCurrentUnsub = null;
let ledgerInvestmentSnapshot = null;

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

function exchangeHistoryCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerExchangeHistory');
}

function activityCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('ledgerEntries');
}

function investmentCurrentDoc(user) {
    return dbRef.collection('users').doc(user.uid).collection('investmentSnapshots').doc('main');
}

function startLedgerSync(user) {
    if (!dbRef) return;
    if (balancesUnsub) balancesUnsub();
    if (balanceHistoryUnsub) balanceHistoryUnsub();
    if (exchangeHistoryUnsub) exchangeHistoryUnsub();
    if (planUnsub) planUnsub();
    if (activityUnsub) activityUnsub();
    if (investmentCurrentUnsub) investmentCurrentUnsub();

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

    exchangeHistoryUnsub = exchangeHistoryCollection(user)
        .orderBy('savedAt', 'desc')
        .limit(30)
        .onSnapshot(snapshot => {
            exchangeHistoryEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderExchangeHistory();
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

    investmentCurrentUnsub = investmentCurrentDoc(user).onSnapshot(doc => {
        ledgerInvestmentSnapshot = doc.exists ? normalizeInvestmentSnapshot({ id: doc.id, ...doc.data() }) : null;
        renderInvestmentHubOverview();
    });
}

const STORAGE_BALANCES = 'ledgerBalances';
const STORAGE_BALANCE_HISTORY = 'ledgerBalanceHistory';
const STORAGE_EXCHANGE_HISTORY = 'ledgerExchangeHistory';
const STORAGE_PLAN_ITEMS = 'ledgerPlanItems';
const STORAGE_ACTIVITY = 'ledgerActivity';
const STORAGE_ACTIVITY_LIST_SIZE = 'ledgerActivityListSize';
const STORAGE_INVESTMENT_CURRENT = 'investmentCurrentSnapshot';
const STORAGE_EXCHANGE_RATES = 'ledgerExchangeRates';

let balances = null;
let balanceHistoryEntries = [];
let exchangeHistoryEntries = [];
let planItems = [];
let editingPlanId = null;
let activityEntries = [];
let editingActivityId = null;
let activityTypeFilter = 'all';
let selectedActivityId = null;
let toastTimer = null;
let toastHideTimer = null;
let selectedSummaryRange = 'month';
let selectedSummaryMonth = new Date().getMonth() + 1;
let balancesCollapsed = false;
let exchangeCollapsed = false;
let activityListSize = 'medium';
let selectedPlanDetailType = null;
let exchangeRates = null;

const EXCHANGE_SOURCE_URL = 'https://frankfurter.dev/';

const PLAN_TYPES = {
    fixed: 'fixed',
    expected: 'expected',
    income: 'income',
    unexpectedIncome: 'unexpected_income'
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
    const vividBaseColors = [
        '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa', '#00acc1', '#f4511e', '#7cb342',
        '#7cb342', '#d81b60', '#00897b', '#5e35b1', '#c0ca33', '#6d4c41', '#039be5', '#ef6c00',
        '#546e7a', '#fdd835', '#8d6e63', '#00c853', '#ff4081', '#00b8d4', '#ff6d00', '#aa00ff',
        '#304ffe', '#00bfa5', '#aeea00', '#ff1744', '#00e5ff', '#ff9100', '#651fff', '#64dd17',
        '#c51162', '#0091ea', '#ffd600', '#6200ea', '#00e676', '#ff3d00', '#2962ff', '#ffab00',
        '#d500f9', '#00c853', '#ff5252', '#18ffff', '#76ff03', '#ff6e40', '#3d5afe', '#ffea00',
        '#ec407a', '#26c6da', '#9ccc65', '#ffa726', '#ab47bc', '#5c6bc0', '#26a69a', '#ef5350',
        '#42a5f5', '#66bb6a', '#ffee58', '#8d6e63', '#78909c', '#ec407a', '#29b6f6', '#9ccc65'
    ];
    const colors = [...vividBaseColors];
    if (count <= colors.length) {
        return colors.slice(0, count);
    }

    const hueSteps = [0, 180, 90, 270, 45, 225, 135, 315, 20, 200, 110, 290, 65, 245, 155, 335];
    const lightnessSteps = [46, 60, 38, 68];
    const saturationSteps = [92, 84, 76];

    let index = 0;
    while (colors.length < count) {
        const hue = hueSteps[index % hueSteps.length] + Math.floor(index / hueSteps.length) * 11;
        const lightness = lightnessSteps[Math.floor(index / hueSteps.length) % lightnessSteps.length];
        const saturation = saturationSteps[Math.floor(index / (hueSteps.length * lightnessSteps.length)) % saturationSteps.length];
        colors.push(`hsl(${hue % 360}, ${saturation}%, ${lightness}%)`);
        index += 1;
    }

    return colors.slice(0, count);
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

function isRentReason(label) {
    const normalized = String(label || '').trim().toLowerCase();
    return normalized.includes('rent');
}

function updateRentToggleUI() {
    if (!rentToggleBtn) return;
    rentToggleBtn.textContent = hideRentInChart ? 'Show rent' : 'Hide rent';
    rentToggleBtn.setAttribute('aria-pressed', hideRentInChart ? 'true' : 'false');
    rentToggleBtn.classList.toggle('active', hideRentInChart);
}

function getSelectedRangeContext() {
    const range = selectedSummaryRange;
    const { now, startOfWeek, endOfWeek } = getRangeWindow();
    return { range, now, startOfWeek, endOfWeek };
}

function getEntriesInSelectedRange() {
    const { range, now, startOfWeek, endOfWeek } = getSelectedRangeContext();
    return activityEntries.filter(entry => isEntryInRange(entry.date, range, now, startOfWeek, endOfWeek, selectedSummaryMonth));
}

function formatProgressPercent(actual, planned) {
    if (planned <= 0) {
        return actual > 0 ? '100%+' : '0%';
    }
    return `${((actual / planned) * 100).toFixed(2)}%`;
}

function isIncomePlanType(type) {
    const normalizedType = normalizePlanType(type);
    return normalizedType === PLAN_TYPES.income || normalizedType === PLAN_TYPES.unexpectedIncome;
}

function getEntryEffectiveAmount(entry) {
    const amount = Number(entry.amount || 0);
    if (entry.isShared) {
        return Number((amount / 2).toFixed(2));
    }
    return amount;
}

function getActivityFormType(sourceType, fallbackType = 'expense') {
    return isIncomePlanType(sourceType)
        ? 'income'
        : (fallbackType === 'income' ? 'income' : 'expense');
}

function syncActivitySharedControls() {
    if (!activitySharedInput) return;
    const editingEntry = editingActivityId
        ? activityEntries.find(item => String(item.id) === String(editingActivityId))
        : null;
    const sourceType = activitySourceTypeSelect ? activitySourceTypeSelect.value : 'custom';
    const formType = getActivityFormType(sourceType, editingEntry ? editingEntry.type : 'expense');
    const canShare = formType === 'expense';
    if (!canShare) {
        activitySharedInput.checked = false;
    }
    activitySharedInput.disabled = !canShare;
}

function resetActivityForm() {
    editingActivityId = null;
    if (activityDateInput) activityDateInput.value = '';
    if (activityAmountInput) activityAmountInput.value = '';
    if (activityReasonInput) activityReasonInput.value = '';
    if (activityDetailInput) activityDetailInput.value = '';
    if (activitySharedInput) activitySharedInput.checked = false;
    if (activitySourceTypeSelect) activitySourceTypeSelect.value = 'custom';
    if (activityLinkedItemSelect) activityLinkedItemSelect.innerHTML = '';
    if (addActivityBtnText) addActivityBtnText.textContent = 'Add entry';
    if (addActivityBtnIcon) addActivityBtnIcon.textContent = '+';
    if (cancelActivityEditBtn) cancelActivityEditBtn.classList.add('hidden');
    updateActivitySourceControls();
    syncActivitySharedControls();
}

function enterActivityEditMode(id) {
    const entry = activityEntries.find(item => String(item.id) === String(id));
    if (!entry) return;
    editingActivityId = String(id);
    if (activityDateInput) activityDateInput.value = entry.date || '';
    if (activityAmountInput) activityAmountInput.value = Number(entry.amount || 0).toFixed(2);
    if (activitySourceTypeSelect) activitySourceTypeSelect.value = entry.sourceType || 'custom';
    updateActivitySourceControls();
    if (activityLinkedItemSelect && entry.linkedPlanItemId) {
        activityLinkedItemSelect.value = String(entry.linkedPlanItemId);
    }
    if (activityReasonInput) activityReasonInput.value = entry.reason || '';
    if (activityDetailInput) activityDetailInput.value = entry.detail || '';
    if (activitySharedInput) activitySharedInput.checked = Boolean(entry.isShared);
    if (addActivityBtnText) addActivityBtnText.textContent = 'Update entry';
    if (addActivityBtnIcon) addActivityBtnIcon.textContent = '\u270E';
    if (cancelActivityEditBtn) cancelActivityEditBtn.classList.remove('hidden');
    syncActivitySharedControls();
    if (activityForm && typeof activityForm.scrollIntoView === 'function') {
        activityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function getCurrentSummaryRangeText() {
    const now = new Date();
    const yearText = String(now.getFullYear());
    const monthText = `${yearText}, ${MONTH_NAMES[selectedSummaryMonth - 1]}`;
    const currentMonthText = `${yearText}, ${MONTH_NAMES[now.getMonth()]}`;
    const weekText = `${currentMonthText} - ${formatOrdinal(getWeekOfMonth(now))} week`;
    if (selectedSummaryRange === 'year') return yearText;
    if (selectedSummaryRange === 'month') return monthText;
    return weekText;
}

function buildBudgetProgressRows() {
    const entriesInRange = getEntriesInSelectedRange();
    const actualByType = entriesInRange.reduce((acc, entry) => {
        if (entry.sourceType === PLAN_TYPES.fixed && entry.type === 'expense') {
            acc.fixed += getEntryEffectiveAmount(entry);
        } else if (entry.sourceType === PLAN_TYPES.expected && entry.type === 'expense') {
            acc.expected += getEntryEffectiveAmount(entry);
        } else if (entry.sourceType === PLAN_TYPES.income && entry.type === 'income') {
            acc.income += getEntryEffectiveAmount(entry);
        } else if (entry.sourceType === PLAN_TYPES.unexpectedIncome && entry.type === 'income') {
            acc.unexpectedIncome += getEntryEffectiveAmount(entry);
        }
        return acc;
    }, { fixed: 0, expected: 0, income: 0, unexpectedIncome: 0 });

    return [
        {
            key: PLAN_TYPES.fixed,
            label: '고정지출',
            planned: getPlanTotalByType(PLAN_TYPES.fixed),
            actual: actualByType.fixed,
            kind: 'expense'
        },
        {
            key: PLAN_TYPES.expected,
            label: '예상 지출',
            planned: getPlanTotalByType(PLAN_TYPES.expected),
            actual: actualByType.expected,
            kind: 'expense'
        },
        {
            key: PLAN_TYPES.income,
            label: '예상 수입',
            planned: getPlanTotalByType(PLAN_TYPES.income),
            actual: actualByType.income,
            kind: 'income'
        },
        {
            key: PLAN_TYPES.unexpectedIncome,
            label: '예상 외 수입',
            planned: null,
            actual: actualByType.unexpectedIncome,
            kind: 'income',
            nonPlanned: true
        }
    ].map(row => {
        if (row.nonPlanned) {
            return {
                ...row,
                difference: null,
                progressText: '✕',
                statusText: row.actual > 0 ? `${formatCurrency(row.actual)} 입금` : '미입금',
                statusClass: row.actual > 0 ? 'positive' : 'idle',
                progressClass: '',
                isExpandable: true
            };
        }
        const difference = Number((row.actual - row.planned).toFixed(2));
        const progressText = formatProgressPercent(row.actual, row.planned);
        let statusText = '대기';
        let statusClass = 'idle';

        if (row.kind === 'expense') {
            if (row.actual === 0) {
                statusText = '미사용';
            } else if (difference > 0) {
                statusText = `${formatCurrency(Math.abs(difference))} 초과`;
                statusClass = 'over';
            } else if (difference === 0) {
                statusText = '정확히 사용';
                statusClass = 'matched';
            } else {
                statusText = `${formatCurrency(Math.abs(difference))} 남음`;
                statusClass = 'under';
            }
        } else {
            if (row.actual === 0) {
                statusText = '미입금';
            } else if (difference > 0) {
                statusText = `${formatCurrency(Math.abs(difference))} 초과`;
                statusClass = 'positive';
            } else if (difference === 0) {
                statusText = '목표 달성';
                statusClass = 'matched';
            } else {
                statusText = `${formatCurrency(Math.abs(difference))} 부족`;
                statusClass = 'under';
            }
        }

        return {
            ...row,
            difference,
            progressText,
            statusText,
            statusClass,
            progressClass: row.kind === 'expense' && row.planned > 0 && row.actual > row.planned ? 'over' : '',
            isExpandable: true
        };
    });
}

function renderBudgetProgressTable() {
    if (!budgetProgressRows) return;
    const rows = buildBudgetProgressRows();
    budgetProgressRows.innerHTML = '';

    rows.forEach(row => {
        const isSelected = row.isExpandable && selectedPlanDetailType === row.key;
        const rowEl = document.createElement('div');
        rowEl.className = `summary-progress-row summary-progress-${row.key} summary-progress-${row.statusClass}`;
        if (isSelected) rowEl.classList.add('selected');
        rowEl.setAttribute('role', 'row');
        rowEl.dataset.planType = row.key;
        rowEl.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
        rowEl.innerHTML = `
            <span role="cell" class="summary-progress-label"><span>${row.label}</span><span class="summary-progress-chevron" aria-hidden="true">${row.isExpandable ? (isSelected ? '▾' : '▸') : ''}</span></span>
            <span role="cell">${row.planned === null ? '✕' : formatCurrency(row.planned)}</span>
            <span role="cell">${formatCurrency(row.actual)}</span>
            <span role="cell" class="summary-progress-metric ${row.progressClass}">${row.progressText}</span>
            <span role="cell" class="summary-progress-status ${row.statusClass}">${row.statusText}</span>
        `;
        budgetProgressRows.appendChild(rowEl);

        if (isSelected && planDetailCard) {
            const detailRow = document.createElement('div');
            detailRow.className = 'summary-progress-detail-row';
            detailRow.setAttribute('role', 'row');
            detailRow.appendChild(planDetailCard);
            budgetProgressRows.appendChild(detailRow);
        }
    });
}

function getActivityAmountForPlanItem(item) {
    const targetType = isIncomePlanType(item.type) ? 'income' : 'expense';
    return getEntriesInSelectedRange().reduce((sum, entry) => {
        if (entry.type !== targetType) return sum;
        if (entry.sourceType !== item.type) return sum;
        const isLinkedMatch = entry.linkedPlanItemId && String(entry.linkedPlanItemId) === String(item.id);
        const isLabelMatch = !entry.linkedPlanItemId && (
            String(entry.linkedPlanItemLabel || '').trim() === item.label ||
            String(entry.reason || '').trim() === item.label
        );
        if (!isLinkedMatch && !isLabelMatch) return sum;
        return sum + getEntryEffectiveAmount(entry);
    }, 0);
}

function buildPlanDetailRows(type) {
    if (type === PLAN_TYPES.unexpectedIncome) {
        const grouped = getEntriesInSelectedRange()
            .filter(entry => entry.type === 'income' && entry.sourceType === PLAN_TYPES.unexpectedIncome)
            .reduce((acc, entry) => {
                const label = String(entry.reason || 'Unexpected income').trim() || 'Unexpected income';
                acc[label] = (acc[label] || 0) + getEntryEffectiveAmount(entry);
                return acc;
            }, {});

        return Object.entries(grouped).map(([label, actual]) => ({
            id: label,
            label,
            type,
            planned: null,
            actual: Number(actual.toFixed(2)),
            remaining: null,
            statusClass: 'positive'
        }));
    }

    return getPlanItemsByType(type).map(item => {
        const actual = Number(getActivityAmountForPlanItem(item).toFixed(2));
        const planned = Number(item.amount || 0);
        const remaining = Number((planned - actual).toFixed(2));
        return {
            id: item.id,
            label: item.label,
            type,
            planned,
            actual,
            remaining,
            statusClass: isIncomePlanType(type)
                ? (remaining < 0 ? 'positive' : remaining === 0 ? 'matched' : 'under')
                : (remaining < 0 ? 'over' : remaining === 0 ? 'matched' : 'under')
        };
    });
}

function renderPlanDetail() {
    if (!planDetailCard || !planDetailRows || !planDetailTable) return;

    if (!selectedPlanDetailType) {
        if (planDetailTitle) planDetailTitle.textContent = '항목별 남은 금액';
        if (planDetailRangeLabel) planDetailRangeLabel.textContent = getCurrentSummaryRangeText();
        planDetailCard.classList.remove('plan-detail-inline');
        planDetailCard.classList.add('hidden');
        planDetailRows.innerHTML = '';
        return;
    }

    const rows = buildPlanDetailRows(selectedPlanDetailType);
    if (planDetailTitle) {
        planDetailTitle.textContent = `${getPlanTypeLabel(selectedPlanDetailType)} 상세`;
    }
    if (planDetailRangeLabel) {
        planDetailRangeLabel.textContent = getCurrentSummaryRangeText();
    }
    planDetailCard.classList.add('plan-detail-inline');
    planDetailCard.classList.remove('hidden');
    planDetailRows.innerHTML = '';

    if (rows.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'plan-detail-empty';
        empty.textContent = '표시할 항목이 없습니다.';
        planDetailRows.appendChild(empty);
        return;
    }

    rows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = `plan-detail-row plan-detail-${row.type} plan-detail-${row.statusClass}`;
        let remainingText = row.remaining === null ? '✕' : formatCurrency(row.remaining);
        if (row.remaining !== null && row.remaining < 0) {
            remainingText = isIncomePlanType(row.type)
                ? `+${formatCurrency(Math.abs(row.remaining))}`
                : `-${formatCurrency(Math.abs(row.remaining))}`;
        }
        rowEl.innerHTML = `
            <span class="plan-detail-label" role="cell">${row.label}</span>
            <span role="cell">${row.planned === null ? '✕' : formatCurrency(row.planned)}</span>
            <span role="cell">${formatCurrency(row.actual)}</span>
            <span role="cell" class="plan-detail-remaining ${row.statusClass}">${remainingText}</span>
        `;
        planDetailRows.appendChild(rowEl);
    });
}

function togglePlanDetailType(type) {
    selectedPlanDetailType = selectedPlanDetailType === type ? null : type;
    renderPlanDetail();
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

function formatWon(num) {
    return '₩' + Math.round(Number(num || 0)).toLocaleString('ko-KR');
}

function formatPercent(value) {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)}%`;
}

function formatExchangeValue(currency, value) {
    return currency === 'KRW' ? formatWon(value) : formatCurrency(value);
}

function normalizeExchangeRates(data) {
    if (!data) return null;
    const usdCad = Number(data.usdCad || 0);
    const cadKrw = Number(data.cadKrw || 0);
    if (!(usdCad > 0) || !(cadKrw > 0)) return null;
    return {
        date: String(data.date || ''),
        usdCad: Number(usdCad.toFixed(6)),
        cadUsd: Number((1 / usdCad).toFixed(6)),
        cadKrw: Number(cadKrw.toFixed(6)),
        krwCad: Number((1 / cadKrw).toFixed(8)),
        fetchedAt: data.fetchedAt || new Date().toISOString()
    };
}

function loadExchangeRates() {
    const raw = localStorage.getItem(STORAGE_EXCHANGE_RATES);
    exchangeRates = raw ? normalizeExchangeRates(JSON.parse(raw)) : null;
}

function saveExchangeRates() {
    if (!exchangeRates) {
        localStorage.removeItem(STORAGE_EXCHANGE_RATES);
        return;
    }
    localStorage.setItem(STORAGE_EXCHANGE_RATES, JSON.stringify(exchangeRates));
}

function loadExchangeHistory() {
    const raw = localStorage.getItem(STORAGE_EXCHANGE_HISTORY);
    exchangeHistoryEntries = raw ? JSON.parse(raw) : [];
}

function saveExchangeHistory() {
    localStorage.setItem(STORAGE_EXCHANGE_HISTORY, JSON.stringify(exchangeHistoryEntries));
}

function computeExchangeResult(pairKey, amount, fromCurrency) {
    if (!exchangeRates || !(amount >= 0)) return { currency: '', value: 0 };
    if (pairKey === 'usd-cad') {
        if (fromCurrency === 'USD') {
            return { currency: 'CAD', value: Number((amount * exchangeRates.usdCad).toFixed(2)) };
        }
        return { currency: 'USD', value: Number((amount * exchangeRates.cadUsd).toFixed(2)) };
    }

    if (fromCurrency === 'CAD') {
        return { currency: 'KRW', value: Math.round(amount * exchangeRates.cadKrw) };
    }
    return { currency: 'CAD', value: Number((amount * exchangeRates.krwCad).toFixed(2)) };
}

function updateExchangePairUI(pairKey) {
    if (pairKey === 'usd-cad') {
        const fromCurrency = usdCadFromCurrencySelect ? usdCadFromCurrencySelect.value : 'USD';
        const amount = Number(usdCadFromAmountInput ? usdCadFromAmountInput.value : 0);
        const result = computeExchangeResult(pairKey, amount, fromCurrency);
        if (usdCadToCurrencySelect) usdCadToCurrencySelect.value = result.currency || (fromCurrency === 'USD' ? 'CAD' : 'USD');
        if (usdCadToAmountInput) {
            usdCadToAmountInput.value = exchangeRates ? Number(result.value || 0).toFixed(2) : '';
        }
        return;
    }

    const fromCurrency = cadKrwFromCurrencySelect ? cadKrwFromCurrencySelect.value : 'CAD';
    const amount = Number(cadKrwFromAmountInput ? cadKrwFromAmountInput.value : 0);
    const result = computeExchangeResult(pairKey, amount, fromCurrency);
    if (cadKrwToCurrencySelect) cadKrwToCurrencySelect.value = result.currency || (fromCurrency === 'CAD' ? 'KRW' : 'CAD');
    if (cadKrwToAmountInput) {
        cadKrwToAmountInput.value = exchangeRates
            ? (result.currency === 'KRW' ? String(Math.round(result.value || 0)) : Number(result.value || 0).toFixed(2))
            : '';
    }
}

function renderExchangeSection() {
    if (exchangeUpdatedAtEl) {
        exchangeUpdatedAtEl.textContent = exchangeRates
            ? `Rates: ${exchangeRates.date || 'latest'}`
            : 'Rates unavailable';
    }
    if (exchangeSourceTextEl) {
        exchangeSourceTextEl.textContent = `Source: Frankfurter`;
    }
    if (usdCadRateLabelEl) {
        usdCadRateLabelEl.textContent = exchangeRates
            ? `1 USD = ${exchangeRates.usdCad.toFixed(4)} CAD`
            : '1 USD = -- CAD';
    }
    if (cadKrwRateLabelEl) {
        cadKrwRateLabelEl.textContent = exchangeRates
            ? `1 CAD = ${exchangeRates.cadKrw.toFixed(2)} KRW`
            : '1 CAD = -- KRW';
    }
    updateExchangePairUI('usd-cad');
    updateExchangePairUI('cad-krw');
}

async function fetchExchangeRates() {
    if (exchangeUpdatedAtEl) exchangeUpdatedAtEl.textContent = 'Loading rates...';
    try {
        const [usdCadResponse, cadKrwResponse] = await Promise.all([
            fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD'),
            fetch('https://api.frankfurter.dev/v1/latest?base=CAD&symbols=KRW')
        ]);

        if (!usdCadResponse.ok || !cadKrwResponse.ok) {
            throw new Error('Failed to fetch exchange rates.');
        }

        const usdCadData = await usdCadResponse.json();
        const cadKrwData = await cadKrwResponse.json();
        exchangeRates = normalizeExchangeRates({
            date: cadKrwData.date || usdCadData.date || '',
            usdCad: usdCadData && usdCadData.rates ? usdCadData.rates.CAD : 0,
            cadKrw: cadKrwData && cadKrwData.rates ? cadKrwData.rates.KRW : 0,
            fetchedAt: new Date().toISOString()
        });
        saveExchangeRates();
        renderExchangeSection();
    } catch (error) {
        renderExchangeSection();
        showToast('Could not refresh exchange rates.');
    }
}

function buildExchangeHistoryEntry() {
    const usdAmount = Number(usdCadFromAmountInput ? usdCadFromAmountInput.value || 0 : 0);
    const cadAmount = Number(cadKrwFromAmountInput ? cadKrwFromAmountInput.value || 0 : 0);
    const usdFrom = usdCadFromCurrencySelect ? usdCadFromCurrencySelect.value : 'USD';
    const cadFrom = cadKrwFromCurrencySelect ? cadKrwFromCurrencySelect.value : 'CAD';
    const usdResult = computeExchangeResult('usd-cad', usdAmount, usdFrom);
    const cadResult = computeExchangeResult('cad-krw', cadAmount, cadFrom);

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        rateDate: exchangeRates ? exchangeRates.date : '',
        usdCad: exchangeRates ? exchangeRates.usdCad : 0,
        cadKrw: exchangeRates ? exchangeRates.cadKrw : 0,
        usdCadInput: {
            amount: usdAmount,
            from: usdFrom,
            result: usdResult.value,
            to: usdResult.currency
        },
        cadKrwInput: {
            amount: cadAmount,
            from: cadFrom,
            result: cadResult.value,
            to: cadResult.currency
        }
    };
}

function renderExchangeHistory() {
    if (!exchangeHistoryList) return;
    exchangeHistoryList.innerHTML = '';

    if (!exchangeHistoryEntries.length) {
        const empty = document.createElement('li');
        empty.className = 'ledger-history-item empty';
        empty.textContent = '✨ No saved exchange history yet.';
        exchangeHistoryList.appendChild(empty);
        return;
    }

    exchangeHistoryEntries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'ledger-history-item exchange-history-item';
        item.dataset.id = String(entry.id);
        item.innerHTML = `
            <div class="history-meta">
                <div class="history-title">${formatHistoryDateTime(entry.savedAt)}</div>
                <div class="history-sub">Rate date ${entry.rateDate || 'latest'} · USD/CAD ${Number(entry.usdCad || 0).toFixed(4)} · CAD/KRW ${Number(entry.cadKrw || 0).toFixed(2)}</div>
                <div class="investment-history-breakdown">
                    <span class="investment-history-line">${Number(entry.usdCadInput.amount || 0).toFixed(2)} ${entry.usdCadInput.from} → ${formatExchangeValue(entry.usdCadInput.to, entry.usdCadInput.result)} ${entry.usdCadInput.to}</span>
                    <span class="investment-history-line">${Number(entry.cadKrwInput.amount || 0).toFixed(2)} ${entry.cadKrwInput.from} → ${formatExchangeValue(entry.cadKrwInput.to, entry.cadKrwInput.result)} ${entry.cadKrwInput.to}</span>
                </div>
            </div>
            <div class="history-actions">
                <button type="button" class="icon-btn activity-icon-btn activity-delete-btn" data-action="delete-exchange-history" aria-label="Delete exchange history entry" title="Delete exchange history entry">🗑</button>
            </div>
        `;
        exchangeHistoryList.appendChild(item);
    });
}

async function saveExchangeSnapshot() {
    if (!exchangeRates) {
        showToast('Refresh exchange rates first.');
        return;
    }
    const entry = buildExchangeHistoryEntry();
    if (isRemoteEnabled()) {
        await exchangeHistoryCollection(currentUser).doc(entry.id).set(entry);
        return;
    }
    exchangeHistoryEntries = [entry, ...exchangeHistoryEntries].slice(0, 30);
    saveExchangeHistory();
    renderExchangeHistory();
    showToast('Exchange snapshot saved.');
}

async function deleteExchangeHistoryEntry(id) {
    if (!confirm('Delete this exchange history entry?')) return;
    if (isRemoteEnabled()) {
        await exchangeHistoryCollection(currentUser).doc(String(id)).delete();
        return;
    }
    exchangeHistoryEntries = exchangeHistoryEntries.filter(entry => String(entry.id) !== String(id));
    saveExchangeHistory();
    renderExchangeHistory();
}

async function clearExchangeHistory() {
    if (!confirm('Clear all exchange history?')) return;
    if (!confirm('This will permanently delete every exchange history entry. Continue?')) return;
    if (isRemoteEnabled()) {
        const batch = dbRef.batch();
        exchangeHistoryEntries.forEach(entry => {
            batch.delete(exchangeHistoryCollection(currentUser).doc(String(entry.id)));
        });
        await batch.commit();
        return;
    }
    exchangeHistoryEntries = [];
    saveExchangeHistory();
    renderExchangeHistory();
}

function swapExchangePair(pairKey) {
    if (pairKey === 'usd-cad') {
        const nextFrom = usdCadFromCurrencySelect && usdCadFromCurrencySelect.value === 'USD' ? 'CAD' : 'USD';
        if (usdCadFromCurrencySelect) usdCadFromCurrencySelect.value = nextFrom;
        if (usdCadToCurrencySelect) usdCadToCurrencySelect.value = nextFrom === 'USD' ? 'CAD' : 'USD';
        updateExchangePairUI('usd-cad');
        return;
    }

    const nextFrom = cadKrwFromCurrencySelect && cadKrwFromCurrencySelect.value === 'CAD' ? 'KRW' : 'CAD';
    if (cadKrwFromCurrencySelect) cadKrwFromCurrencySelect.value = nextFrom;
    if (cadKrwToCurrencySelect) cadKrwToCurrencySelect.value = nextFrom === 'CAD' ? 'KRW' : 'CAD';
    updateExchangePairUI('cad-krw');
}

function parseInvestmentAmount(value) {
    const normalized = String(value || '').replace(/,/g, '').trim();
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) return 0;
    return Number(parsed.toFixed(2));
}

function buildEmptyInvestmentAccounts() {
    return {
        tfsa: { invested: 0, current: 0 },
        rrsp: { invested: 0, current: 0 },
        korea: { invested: 0, current: 0 }
    };
}

function normalizeInvestmentSnapshot(data) {
    const accounts = buildEmptyInvestmentAccounts();
    const source = data && data.accounts ? data.accounts : {};
    ['tfsa', 'rrsp', 'korea'].forEach(key => {
        const entry = source[key] || {};
        accounts[key] = {
            invested: parseInvestmentAmount(entry.invested),
            current: parseInvestmentAmount(entry.current)
        };
    });

    return {
        id: data && data.id ? String(data.id) : '',
        snapshotDate: data && typeof data.snapshotDate === 'string' ? data.snapshotDate : '',
        updatedAt: data && data.updatedAt ? data.updatedAt : null,
        savedAt: data && data.savedAt ? data.savedAt : null,
        accounts
    };
}

function computeLedgerInvestmentSummary(snapshot) {
    const normalized = normalizeInvestmentSnapshot(snapshot || {});
    const tfsaInvested = parseInvestmentAmount(normalized.accounts.tfsa.invested);
    const tfsaCurrent = parseInvestmentAmount(normalized.accounts.tfsa.current);
    const rrspInvested = parseInvestmentAmount(normalized.accounts.rrsp.invested);
    const rrspCurrent = parseInvestmentAmount(normalized.accounts.rrsp.current);
    const koreaInvested = parseInvestmentAmount(normalized.accounts.korea.invested);
    const koreaCurrent = parseInvestmentAmount(normalized.accounts.korea.current);

    const canadaInvested = Number((tfsaInvested + rrspInvested).toFixed(2));
    const canadaCurrent = Number((tfsaCurrent + rrspCurrent).toFixed(2));
    const canadaReturnRate = canadaInvested > 0
        ? Number((((canadaCurrent - canadaInvested) / canadaInvested) * 100).toFixed(2))
        : 0;
    const koreaReturnRate = koreaInvested > 0
        ? Number((((koreaCurrent - koreaInvested) / koreaInvested) * 100).toFixed(2))
        : 0;

    return {
        canadaReturnRate,
        koreaReturnRate
    };
}

function renderInvestmentHubOverview() {
    const summary = computeLedgerInvestmentSummary(ledgerInvestmentSnapshot);
    if (ledgerCanadaInvestmentReturnEl) {
        ledgerCanadaInvestmentReturnEl.textContent = formatPercent(summary.canadaReturnRate);
        ledgerCanadaInvestmentReturnEl.classList.toggle('negative', summary.canadaReturnRate < 0);
        ledgerCanadaInvestmentReturnEl.classList.toggle('positive', summary.canadaReturnRate > 0);
    }
    if (ledgerKoreaInvestmentReturnEl) {
        ledgerKoreaInvestmentReturnEl.textContent = formatPercent(summary.koreaReturnRate);
        ledgerKoreaInvestmentReturnEl.classList.toggle('negative', summary.koreaReturnRate < 0);
        ledgerKoreaInvestmentReturnEl.classList.toggle('positive', summary.koreaReturnRate > 0);
    }
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
    return value === PLAN_TYPES.fixed
        || value === PLAN_TYPES.income
        || value === PLAN_TYPES.unexpectedIncome
        ? value
        : PLAN_TYPES.expected;
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
    const fallbackTimestamp = Number(String(entry.id || '').replace(/\D/g, '')) || Date.now();
    return {
        ...entry,
        id: String(entry.id || Date.now()),
        type: entry.type === 'income' ? 'income' : 'expense',
        amount: Number(Number(entry.amount || 0).toFixed(2)),
        reason: String(entry.reason || '').trim(),
        detail: String(entry.detail || '').trim(),
        isShared: Boolean(entry.isShared),
        sourceType: entry.sourceType ? normalizeActivitySourceType(entry.sourceType) : 'custom',
        linkedPlanItemId: entry.linkedPlanItemId ? String(entry.linkedPlanItemId) : '',
        linkedPlanItemLabel: entry.linkedPlanItemLabel ? String(entry.linkedPlanItemLabel) : '',
        createdAt: entry.createdAt ? String(entry.createdAt) : new Date(fallbackTimestamp).toISOString(),
        updatedAt: entry.updatedAt ? String(entry.updatedAt) : null
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

function getActivitySortValue(entry) {
    const createdAt = entry && entry.createdAt ? Date.parse(entry.createdAt) : NaN;
    if (!Number.isNaN(createdAt)) return createdAt;
    const numericId = Number(String(entry && entry.id ? entry.id : '').replace(/\D/g, ''));
    if (!Number.isNaN(numericId) && numericId > 0) return numericId;
    return parseLedgerDate(entry && entry.date ? entry.date : '');
}

function loadActivityListSize() {
    const raw = localStorage.getItem(STORAGE_ACTIVITY_LIST_SIZE);
    activityListSize = raw === 'compact' || raw === 'expanded' ? raw : 'medium';
}

function applyActivityListSize() {
    if (activityList) {
        activityList.dataset.size = activityListSize;
    }
    activityListSizeButtons.forEach(button => {
        const active = button.dataset.size === activityListSize;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function setActivityListSize(nextSize) {
    if (!['compact', 'medium', 'expanded'].includes(nextSize)) return;
    activityListSize = nextSize;
    localStorage.setItem(STORAGE_ACTIVITY_LIST_SIZE, activityListSize);
    applyActivityListSize();
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
    if (!confirm('This will permanently delete every balance history entry. Continue?')) return;
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

function loadInvestmentSnapshot() {
    const raw = localStorage.getItem(STORAGE_INVESTMENT_CURRENT);
    ledgerInvestmentSnapshot = raw ? normalizeInvestmentSnapshot(JSON.parse(raw)) : null;
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

function setExchangeCollapsed(collapsed) {
    exchangeCollapsed = Boolean(collapsed);
    if (exchangePanel) {
        exchangePanel.classList.toggle('collapsed', exchangeCollapsed);
    }
    if (toggleExchangeBtn) {
        toggleExchangeBtn.setAttribute('aria-expanded', exchangeCollapsed ? 'false' : 'true');
    }
    if (exchangePanelContent) {
        exchangePanelContent.setAttribute('aria-hidden', exchangeCollapsed ? 'true' : 'false');
    }
}

function toggleExchangePanel() {
    setExchangeCollapsed(!exchangeCollapsed);
}

function getPlanTypeLabel(type) {
    if (type === PLAN_TYPES.fixed) return '고정지출';
    if (type === PLAN_TYPES.income) return '예상 수입';
    if (type === PLAN_TYPES.unexpectedIncome) return '예상 외 수입';
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
    renderPlanDetail();
}

function populateActivityLinkedItems() {
    if (!activityLinkedItemSelect) return;
    const sourceType = activitySourceTypeSelect ? activitySourceTypeSelect.value : 'custom';
    const usesLinkedItem = sourceType !== 'custom' && sourceType !== PLAN_TYPES.unexpectedIncome;
    const items = usesLinkedItem ? getPlanItemsByType(normalizePlanType(sourceType)) : [];

    activityLinkedItemSelect.innerHTML = '';
    if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = usesLinkedItem ? 'No items available' : 'Not used for this type';
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
    const usingLinkedItem = sourceType !== 'custom' && sourceType !== PLAN_TYPES.unexpectedIncome;
    const canUseDetail = normalizePlanType(sourceType) === PLAN_TYPES.expected;
    const canWriteReason = !usingLinkedItem;

    activityLinkedItemField.classList.remove('hidden');
    activityLinkedItemField.classList.toggle('is-disabled', !usingLinkedItem);
    if (activityLinkedItemSelect) activityLinkedItemSelect.disabled = !usingLinkedItem;
    if (activityDetailField) {
        activityDetailField.classList.remove('hidden');
        activityDetailField.classList.toggle('is-disabled', !canUseDetail);
    }
    if (activityDetailInput) {
        activityDetailInput.disabled = !canUseDetail;
        activityDetailInput.placeholder = canUseDetail ? 'Chipotle, Costco, brunch with friends...' : 'Only used for expected expense';
        if (!canUseDetail) {
            activityDetailInput.value = '';
        }
    }
    activityReasonInput.disabled = !canWriteReason;
    activityReasonInput.placeholder = canWriteReason ? 'Food, paycheck, rent...' : 'Reason comes from the selected budget item';
    activityReasonInput.parentElement?.classList.toggle('is-disabled', !canWriteReason);

    populateActivityLinkedItems();

    if (usingLinkedItem) {
        const selectedItem = planItems.find(item => item.id === activityLinkedItemSelect.value) || getPlanItemsByType(normalizePlanType(sourceType))[0];
        activityReasonInput.value = selectedItem ? selectedItem.label : '';
    } else if (!activityReasonInput.value) {
        activityReasonInput.value = '';
    }
}

function syncActivitySourceWithType() {
    if (!activitySourceTypeSelect) return;
    updateActivitySourceControls();
    syncActivitySharedControls();
}

function renderActivity() {
    if (!activityList) return;
    activityList.innerHTML = '';
    applyActivityListSize();
    renderActivityMonthPicker();

    updateActivitySummaryRangeLabels();
    renderBudgetProgressTable();
    renderPlanDetail();

    const { range, now, startOfWeek, endOfWeek } = getSelectedRangeContext();
    const entriesInRange = getEntriesInSelectedRange();

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
        .sort((a, b) => getActivitySortValue(b) - getActivitySortValue(a))
        .forEach(entry => {
            const li = document.createElement('li');
            li.className = `ledger-activity-item ${entry.type}`;
            li.dataset.id = entry.id;

            const meta = document.createElement('div');
            meta.className = 'activity-meta';
            const budgetTypeLabel = entry.sourceType && entry.sourceType !== 'custom' ? getPlanTypeLabel(entry.sourceType) : '';
            meta.innerHTML = `<div class="activity-title">${entry.reason}</div><div class="activity-sub">${entry.date}${budgetTypeLabel ? ` · ${budgetTypeLabel}` : ''}</div>`;

            if (entry.detail) {
                const detail = document.createElement('div');
                detail.className = 'activity-detail';
                detail.textContent = entry.detail;
                meta.insertBefore(detail, meta.lastElementChild);
            }

            if (entry.isShared) {
                const share = document.createElement('div');
                share.className = 'activity-share-note';
                share.textContent = `Paid ${formatCurrency(entry.amount)} · My share ${formatCurrency(getEntryEffectiveAmount(entry))}`;
                meta.insertBefore(share, meta.lastElementChild);
            }

            const amount = document.createElement('div');
            amount.className = 'activity-amount';
            amount.textContent = (entry.type === 'income' ? '+' : '-') + formatCurrency(getEntryEffectiveAmount(entry));

            const actions = document.createElement('div');
            actions.className = 'activity-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'icon-btn activity-icon-btn';
            editBtn.setAttribute('aria-label', 'Edit activity entry');
            editBtn.setAttribute('title', 'Edit activity entry');
            editBtn.textContent = '\u270F\uFE0F';
            editBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                enterActivityEditMode(entry.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'icon-btn activity-icon-btn activity-delete-btn';
            deleteBtn.setAttribute('aria-label', 'Delete activity entry');
            deleteBtn.setAttribute('title', 'Delete activity entry');
            deleteBtn.textContent = '\u{1F5D1}';
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
            if (entry.type === 'income') acc.income += getEntryEffectiveAmount(entry);
            else if (!(hideRentInChart && isRentReason(entry.reason))) acc.expense += getEntryEffectiveAmount(entry);
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
    if (investmentHubSection) investmentHubSection.classList.add('hidden');
    if (exchangeSection) exchangeSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (exchangeHistorySection) exchangeHistorySection.classList.add('hidden');
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
    if (investmentHubSection) investmentHubSection.classList.remove('hidden');
    if (exchangeSection) exchangeSection.classList.remove('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.remove('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (exchangeHistorySection) exchangeHistorySection.classList.add('hidden');
    if (activitySection) activitySection.classList.remove('hidden');
    if (activitySummarySection) activitySummarySection.classList.remove('hidden');
    planSection.classList.add('hidden');
    exitEditMode();
    renderDashboard();
    renderBalanceHistory();
    renderExchangeHistory();
    renderExchangeSection();
    setBalancesCollapsed(balancesCollapsed);
    setExchangeCollapsed(exchangeCollapsed);
    renderActivity();
}

function showPlan() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (investmentHubSection) investmentHubSection.classList.add('hidden');
    if (exchangeSection) exchangeSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (exchangeHistorySection) exchangeHistorySection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.remove('hidden');
    renderPlan();
}

function showBalanceHistory() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (investmentHubSection) investmentHubSection.classList.add('hidden');
    if (exchangeSection) exchangeSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.remove('hidden');
    if (exchangeHistorySection) exchangeHistorySection.classList.add('hidden');
    renderBalanceHistory();
}

function showExchangeHistory() {
    setupSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    if (investmentHubSection) investmentHubSection.classList.add('hidden');
    if (exchangeSection) exchangeSection.classList.add('hidden');
    if (spendingSummarySection) spendingSummarySection.classList.add('hidden');
    if (activitySection) activitySection.classList.add('hidden');
    if (activitySummarySection) activitySummarySection.classList.add('hidden');
    planSection.classList.add('hidden');
    if (balanceHistorySection) balanceHistorySection.classList.add('hidden');
    if (exchangeHistorySection) exchangeHistorySection.classList.remove('hidden');
    renderExchangeHistory();
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
    const amount = parseFloat(activityAmountInput.value);
    const sourceType = activitySourceTypeSelect ? activitySourceTypeSelect.value : 'custom';
    const editingEntry = editingActivityId
        ? activityEntries.find(item => String(item.id) === String(editingActivityId))
        : null;
    const type = getActivityFormType(sourceType, editingEntry ? editingEntry.type : 'expense');
    const linkedItemId = activityLinkedItemSelect ? activityLinkedItemSelect.value : '';
    const linkedItem = (sourceType === 'custom' || sourceType === PLAN_TYPES.unexpectedIncome)
        ? null
        : planItems.find(item => item.id === linkedItemId);
    const reason = linkedItem ? linkedItem.label : activityReasonInput.value.trim();
    const detail = activityDetailInput ? activityDetailInput.value.trim() : '';
    const isShared = Boolean(activitySharedInput && activitySharedInput.checked);

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
    if (isShared) {
        if (type !== 'expense') {
            alert('Shared entries are only available for expenses.');
            return;
        }
    }

    const entry = {
        id: editingActivityId || Date.now().toString(),
        date,
        type,
        amount: Number(amount.toFixed(2)),
        reason,
        detail,
        isShared,
        sourceType,
        linkedPlanItemId: linkedItem ? linkedItem.id : '',
        linkedPlanItemLabel: linkedItem ? linkedItem.label : '',
        createdAt: editingEntry && editingEntry.createdAt ? editingEntry.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (isRemoteEnabled()) {
        await activityCollection(currentUser).doc(entry.id).set(entry);
        resetActivityForm();
        return;
    }

    if (editingActivityId) {
        activityEntries = activityEntries.map(item => String(item.id) === String(editingActivityId) ? entry : item);
    } else {
        activityEntries.push(entry);
    }
    saveActivityEntries();
    resetActivityForm();
    renderActivity();
}

async function editActivityEntry(id) {
    enterActivityEditMode(id);
}

async function deleteActivityEntry(id) {
    if (!confirm('Delete this entry?')) return;
    if (isRemoteEnabled()) {
        await activityCollection(currentUser).doc(String(id)).delete();
        if (String(editingActivityId) === String(id)) {
            resetActivityForm();
        }
        return;
    }
    activityEntries = activityEntries.filter(item => item.id !== id);
    if (String(editingActivityId) === String(id)) {
        resetActivityForm();
    }
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
        if (!isEntryInRange(entry.date, range, now, startOfWeek, endOfWeek, selectedSummaryMonth)) return false;
        if (hideRentInChart && isRentReason(entry.reason)) return false;
        return true;
    });

    const totalsByReason = {};
    expenses.forEach(entry => {
        const key = (entry.reason || 'Uncategorized').trim();
        totalsByReason[key] = (totalsByReason[key] || 0) + getEntryEffectiveAmount(entry);
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
if (toggleExchangeBtn) toggleExchangeBtn.addEventListener('click', toggleExchangePanel);
if (exchangePanelHeader) {
    exchangePanelHeader.addEventListener('click', event => {
        if (event.target.closest('button')) return;
        toggleExchangePanel();
    });
}
if (openBalanceHistoryBtn) openBalanceHistoryBtn.addEventListener('click', showBalanceHistory);
if (closeBalanceHistoryBtn) closeBalanceHistoryBtn.addEventListener('click', showDashboard);
if (clearBalanceHistoryBtn) clearBalanceHistoryBtn.addEventListener('click', clearBalanceHistory);
if (openExchangeHistoryBtn) openExchangeHistoryBtn.addEventListener('click', showExchangeHistory);
if (closeExchangeHistoryBtn) closeExchangeHistoryBtn.addEventListener('click', showDashboard);
if (clearExchangeHistoryBtn) clearExchangeHistoryBtn.addEventListener('click', clearExchangeHistory);
if (saveExchangeSnapshotBtn) saveExchangeSnapshotBtn.addEventListener('click', saveExchangeSnapshot);
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
if (cancelActivityEditBtn) {
    cancelActivityEditBtn.addEventListener('click', resetActivityForm);
}
if (activitySourceTypeSelect) {
    activitySourceTypeSelect.addEventListener('change', syncActivitySourceWithType);
}
if (activitySharedInput) {
    activitySharedInput.addEventListener('change', syncActivitySharedControls);
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
if (activityListSizeGroup) {
    activityListSizeGroup.addEventListener('click', event => {
        const button = event.target.closest('.activity-list-size-btn');
        if (!button) return;
        setActivityListSize(button.dataset.size || 'medium');
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
if (budgetProgressRows) {
    budgetProgressRows.addEventListener('click', event => {
        const row = event.target.closest('.summary-progress-row[data-plan-type]');
        if (!row) return;
        togglePlanDetailType(row.dataset.planType);
        renderBudgetProgressTable();
    });
}
if (legendSortSelect) legendSortSelect.addEventListener('change', renderActivity);
if (rentToggleBtn) {
    rentToggleBtn.addEventListener('click', () => {
        hideRentInChart = !hideRentInChart;
        updateRentToggleUI();
        if (hideRentInChart && isRentReason(selectedReasonLabel)) {
            selectedReasonLabel = null;
        }
        renderActivity();
    });
}
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

updateRentToggleUI();
resetActivityForm();
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
if (exchangeHistoryList) {
    exchangeHistoryList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="delete-exchange-history"]');
        if (!button) return;
        const item = button.closest('.ledger-history-item');
        if (!item || item.classList.contains('empty')) return;
        deleteExchangeHistoryEntry(item.dataset.id);
    });
}
if (usdCadFromAmountInput) usdCadFromAmountInput.addEventListener('input', () => updateExchangePairUI('usd-cad'));
if (usdCadFromCurrencySelect) usdCadFromCurrencySelect.addEventListener('change', () => updateExchangePairUI('usd-cad'));
if (cadKrwFromAmountInput) cadKrwFromAmountInput.addEventListener('input', () => updateExchangePairUI('cad-krw'));
if (cadKrwFromCurrencySelect) cadKrwFromCurrencySelect.addEventListener('change', () => updateExchangePairUI('cad-krw'));
document.querySelectorAll('.exchange-swap-btn').forEach(button => {
    button.addEventListener('click', () => swapExchangePair(button.dataset.pair));
});

(function init() {
    setActivityTypeFilter('all');
    loadActivityListSize();
    applyActivityListSize();
    exitEditMode();
    syncActivitySourceWithType();
    if (activityDateInput) {
        activityDateInput.max = getTodayDateString();
    }

    loadExchangeRates();
    renderExchangeSection();
    fetchExchangeRates();

    if (requireAuthRef) {
        renderInvestmentHubOverview();
        requireAuthRef().then(user => {
            currentUser = user;
            startLedgerSync(user);
        });
        return;
    }

    loadBalances();
    loadBalanceHistory();
    loadExchangeHistory();
    loadPlanItems();
    loadActivityEntries();
    loadInvestmentSnapshot();
    updateActivitySourceControls();
    renderInvestmentHubOverview();

    if (hasBalances()) {
        showDashboard();
    } else {
        showSetup();
    }

    updateActivitySummaryRangeLabels();
    scheduleMidnightRefresh();
})();

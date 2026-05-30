const investmentForm = document.getElementById('investmentForm');
const investmentFormTitleEl = document.getElementById('investmentFormTitle');
const investmentSnapshotDateInput = document.getElementById('investmentSnapshotDate');
const investmentUpdatedAtEl = document.getElementById('investmentUpdatedAt');
const investmentHistoryList = document.getElementById('investmentHistoryList');
const saveInvestmentSnapshotBtn = document.getElementById('saveInvestmentSnapshotBtn');
const saveInvestmentSnapshotBtnIcon = document.getElementById('saveInvestmentSnapshotBtnIcon');
const saveInvestmentSnapshotBtnText = document.getElementById('saveInvestmentSnapshotBtnText');
const cancelInvestmentEditBtn = document.getElementById('cancelInvestmentEditBtn');
const investmentFormActions = document.querySelector('.investment-form-actions');
const investmentSaveRow = document.querySelector('.investment-save-row');

const ACCOUNT_CONFIG = [
    { key: 'tfsa', label: 'TFSA', region: 'canada' },
    { key: 'rrsp', label: 'RRSP', region: 'canada' },
    { key: 'korea', label: 'Korea account', region: 'korea' }
];

const accountInputs = {
    tfsa: {
        invested: document.getElementById('tfsaInvested'),
        current: document.getElementById('tfsaCurrent'),
        gain: document.getElementById('tfsaGain'),
        returnRate: document.getElementById('tfsaReturn')
    },
    rrsp: {
        invested: document.getElementById('rrspInvested'),
        current: document.getElementById('rrspCurrent'),
        gain: document.getElementById('rrspGain'),
        returnRate: document.getElementById('rrspReturn')
    },
    korea: {
        invested: document.getElementById('koreaInvested'),
        current: document.getElementById('koreaCurrent'),
        gain: document.getElementById('koreaGain'),
        returnRate: document.getElementById('koreaReturn')
    }
};

const canadaCurrentValueEl = document.getElementById('canadaCurrentValue');
const canadaOverviewMetaEl = document.getElementById('canadaOverviewMeta');
const koreaCurrentValueEl = document.getElementById('koreaCurrentValue');
const koreaOverviewMetaEl = document.getElementById('koreaOverviewMeta');

const authApi = window.__ledgerAuth || {};
const requireAuthRef = authApi.requireAuth;
const dbRef = authApi.db;

const STORAGE_INVESTMENT_CURRENT = 'investmentCurrentSnapshot';
const STORAGE_INVESTMENT_HISTORY = 'investmentSnapshotHistory';

let currentUser = null;
let currentSnapshot = null;
let investmentHistory = [];
let currentSnapshotUnsub = null;
let investmentHistoryUnsub = null;
let editingInvestmentId = null;
let editingInvestmentSyncsCurrent = false;

function updateInvestmentFormActionsVisibility() {
    if (!investmentFormActions) return;
    const showActions = !!(cancelInvestmentEditBtn && !cancelInvestmentEditBtn.classList.contains('hidden'));
    investmentFormActions.classList.toggle('hidden', !showActions);
    if (investmentSaveRow) investmentSaveRow.classList.toggle('hidden', !showActions);
}

function isRemoteEnabled() {
    return !!(currentUser && dbRef);
}

function investmentCurrentDoc(user) {
    return dbRef.collection('users').doc(user.uid).collection('investmentSnapshots').doc('main');
}

function investmentHistoryCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('investmentHistory');
}

function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatWon(value) {
    const amount = Math.round(Number(value || 0));
    return amount.toLocaleString('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatCurrencyByAccount(accountKey, value) {
    return accountKey === 'korea' ? formatWon(value) : formatCurrency(value);
}

function formatPercent(value) {
    const amount = Number(value || 0);
    return `${amount.toFixed(1)}%`;
}

function formatSignedCurrency(value, accountKey = '') {
    const amount = Number(value || 0);
    const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
    return `${sign}${formatCurrencyByAccount(accountKey, Math.abs(amount))}`;
}

function parseAmount(value) {
    const normalized = String(value || '').replace(/,/g, '').trim();
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) return 0;
    return Number(parsed.toFixed(2));
}

function formatKoreanInputValue(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ko-KR');
}

function buildEmptyAccounts() {
    return {
        tfsa: { invested: 0, current: 0 },
        rrsp: { invested: 0, current: 0 },
        korea: { invested: 0, current: 0 }
    };
}

function normalizeSnapshot(data) {
    const accounts = buildEmptyAccounts();
    const source = data && data.accounts ? data.accounts : {};
    ACCOUNT_CONFIG.forEach(account => {
        const entry = source[account.key] || {};
        accounts[account.key] = {
            invested: parseAmount(entry.invested),
            current: parseAmount(entry.current)
        };
    });

    return {
        id: data && data.id ? String(data.id) : '',
        snapshotDate: data && typeof data.snapshotDate === 'string' ? data.snapshotDate : getTodayDateString(),
        updatedAt: data && data.updatedAt ? data.updatedAt : null,
        savedAt: data && data.savedAt ? data.savedAt : null,
        accounts
    };
}

function loadCurrentSnapshot() {
    const raw = localStorage.getItem(STORAGE_INVESTMENT_CURRENT);
    currentSnapshot = raw ? normalizeSnapshot(JSON.parse(raw)) : null;
}

function saveCurrentSnapshot() {
    if (!currentSnapshot) {
        localStorage.removeItem(STORAGE_INVESTMENT_CURRENT);
        return;
    }
    localStorage.setItem(STORAGE_INVESTMENT_CURRENT, JSON.stringify(currentSnapshot));
}

function loadInvestmentHistory() {
    const raw = localStorage.getItem(STORAGE_INVESTMENT_HISTORY);
    investmentHistory = raw ? JSON.parse(raw).map(normalizeSnapshot) : [];
}

function saveInvestmentHistory() {
    localStorage.setItem(STORAGE_INVESTMENT_HISTORY, JSON.stringify(investmentHistory));
}

function computeAccountMetrics(account) {
    const invested = parseAmount(account.invested);
    const current = parseAmount(account.current);
    const gain = Number((current - invested).toFixed(2));
    const returnRate = invested > 0 ? Number(((gain / invested) * 100).toFixed(1)) : 0;
    return { invested, current, gain, returnRate };
}

function computeSnapshotSummary(snapshot) {
    const accounts = snapshot ? snapshot.accounts : buildEmptyAccounts();
    const tfsa = computeAccountMetrics(accounts.tfsa);
    const rrsp = computeAccountMetrics(accounts.rrsp);
    const korea = computeAccountMetrics(accounts.korea);

    const canadaInvested = Number((tfsa.invested + rrsp.invested).toFixed(2));
    const canadaCurrent = Number((tfsa.current + rrsp.current).toFixed(2));
    const canadaGain = Number((canadaCurrent - canadaInvested).toFixed(2));
    const canadaReturnRate = canadaInvested > 0 ? Number(((canadaGain / canadaInvested) * 100).toFixed(1)) : 0;

    const portfolioInvested = Number((canadaInvested + korea.invested).toFixed(2));
    const portfolioCurrent = Number((canadaCurrent + korea.current).toFixed(2));
    const portfolioGain = Number((portfolioCurrent - portfolioInvested).toFixed(2));
    const portfolioReturnRate = portfolioInvested > 0 ? Number(((portfolioGain / portfolioInvested) * 100).toFixed(1)) : 0;

    return {
        tfsa,
        rrsp,
        korea,
        canada: {
            invested: canadaInvested,
            current: canadaCurrent,
            gain: canadaGain,
            returnRate: canadaReturnRate
        },
        portfolio: {
            invested: portfolioInvested,
            current: portfolioCurrent,
            gain: portfolioGain,
            returnRate: portfolioReturnRate
        }
    };
}

function getSnapshotLabel(snapshot) {
    if (!snapshot) return 'No snapshot yet';
    return snapshot.snapshotDate || 'No snapshot yet';
}

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    return null;
}

function renderOverview() {
    const summary = computeSnapshotSummary(currentSnapshot || normalizeSnapshot({}));
    if (canadaCurrentValueEl) canadaCurrentValueEl.textContent = formatCurrency(summary.canada.current);
    if (canadaOverviewMetaEl) canadaOverviewMetaEl.textContent = `Invested ${formatCurrency(summary.canada.invested)} · Return ${formatPercent(summary.canada.returnRate)}`;
    if (koreaCurrentValueEl) koreaCurrentValueEl.textContent = formatWon(summary.korea.current);
    if (koreaOverviewMetaEl) koreaOverviewMetaEl.textContent = `Invested ${formatWon(summary.korea.invested)} · Return ${formatPercent(summary.korea.returnRate)}`;

    if (investmentUpdatedAtEl) {
        const updatedAt = currentSnapshot ? (toDate(currentSnapshot.updatedAt) || toDate(currentSnapshot.savedAt)) : null;
        if (updatedAt) {
            investmentUpdatedAtEl.textContent = `Updated ${updatedAt.toLocaleDateString('en-CA')}`;
        } else {
            investmentUpdatedAtEl.textContent = getSnapshotLabel(currentSnapshot);
        }
    }
}

function renderLiveMetrics() {
    ACCOUNT_CONFIG.forEach(account => {
        const fields = accountInputs[account.key];
        if (!fields) return;
        const metrics = computeAccountMetrics({
            invested: parseAmount(fields.invested.value),
            current: parseAmount(fields.current.value)
        });
        if (fields.gain) {
            fields.gain.textContent = `${formatSignedCurrency(metrics.gain, account.key)} gain`;
            fields.gain.classList.toggle('negative', metrics.gain < 0);
            fields.gain.classList.toggle('positive', metrics.gain > 0);
        }
        if (fields.returnRate) {
            fields.returnRate.textContent = formatPercent(metrics.returnRate);
            fields.returnRate.classList.toggle('negative', metrics.returnRate < 0);
            fields.returnRate.classList.toggle('positive', metrics.returnRate > 0);
        }
    });
}

function syncFormWithSnapshot(snapshot) {
    const normalized = snapshot ? normalizeSnapshot(snapshot) : normalizeSnapshot({});
    if (investmentSnapshotDateInput) {
        investmentSnapshotDateInput.value = normalized.snapshotDate || getTodayDateString();
        investmentSnapshotDateInput.max = getTodayDateString();
    }
    ACCOUNT_CONFIG.forEach(account => {
        const fields = accountInputs[account.key];
        const values = normalized.accounts[account.key];
        if (!fields || !values) return;
        if (account.key === 'korea') {
            fields.invested.value = values.invested ? formatKoreanInputValue(values.invested) : '';
            fields.current.value = values.current ? formatKoreanInputValue(values.current) : '';
        } else {
            fields.invested.value = values.invested ? Number(values.invested).toFixed(2) : '';
            fields.current.value = values.current ? Number(values.current).toFixed(2) : '';
        }
    });
    renderLiveMetrics();
}

function resetInvestmentForm() {
    editingInvestmentId = null;
    editingInvestmentSyncsCurrent = false;
    if (investmentFormTitleEl) investmentFormTitleEl.textContent = 'Save Snapshot';
    if (saveInvestmentSnapshotBtnText) saveInvestmentSnapshotBtnText.textContent = 'Save snapshot';
    if (saveInvestmentSnapshotBtnIcon) saveInvestmentSnapshotBtnIcon.textContent = '\u2713';
    if (cancelInvestmentEditBtn) cancelInvestmentEditBtn.classList.add('hidden');
    updateInvestmentFormActionsVisibility();
    syncFormWithSnapshot(currentSnapshot);
}

function getLatestHistoryId() {
    if (!investmentHistory.length) return '';
    const sorted = getHistorySortedDescending(investmentHistory);
    return sorted[0] ? String(sorted[0].id || '') : '';
}

function enterInvestmentEditMode(id) {
    const snapshot = investmentHistory.find(item => String(item.id) === String(id));
    if (!snapshot) return;
    editingInvestmentId = String(id);
    editingInvestmentSyncsCurrent = String(id) === getLatestHistoryId();
    if (investmentFormTitleEl) investmentFormTitleEl.textContent = 'Edit Snapshot';
    if (saveInvestmentSnapshotBtnText) saveInvestmentSnapshotBtnText.textContent = 'Update snapshot';
    if (saveInvestmentSnapshotBtnIcon) saveInvestmentSnapshotBtnIcon.textContent = '\u270E';
    if (cancelInvestmentEditBtn) cancelInvestmentEditBtn.classList.remove('hidden');
    updateInvestmentFormActionsVisibility();
    syncFormWithSnapshot(snapshot);
    if (investmentForm && typeof investmentForm.scrollIntoView === 'function') {
        investmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function createHistoryRow(snapshot) {
    const summary = computeSnapshotSummary(snapshot);
    const item = document.createElement('li');
    item.className = 'ledger-history-item investment-history-item';
    item.dataset.id = snapshot.id || '';
    item.innerHTML = `
        <div class="history-meta">
            <div class="history-title">${snapshot.snapshotDate}</div>
            <div class="history-sub">Canada ${formatCurrency(summary.canada.current)} · Korea ${formatWon(summary.korea.current)}</div>
            <div class="investment-history-breakdown">
                <span class="investment-history-line">TFSA: Invested ${formatCurrency(summary.tfsa.invested)} · Current ${formatCurrency(summary.tfsa.current)} · ${formatPercent(summary.tfsa.returnRate)}</span>
                <span class="investment-history-line">RRSP: Invested ${formatCurrency(summary.rrsp.invested)} · Current ${formatCurrency(summary.rrsp.current)} · ${formatPercent(summary.rrsp.returnRate)}</span>
                <span class="investment-history-line">Korea: Invested ${formatWon(summary.korea.invested)} · Current ${formatWon(summary.korea.current)} · ${formatPercent(summary.korea.returnRate)}</span>
            </div>
        </div>
        <div class="investment-history-side">
            <div class="history-actions">
                <button type="button" class="icon-btn activity-icon-btn" data-action="edit-investment" aria-label="Edit investment snapshot" title="Edit investment snapshot">\u270F\uFE0F</button>
                <button type="button" class="icon-btn activity-icon-btn activity-delete-btn" data-action="delete-investment" aria-label="Delete investment snapshot" title="Delete investment snapshot">\u{1F5D1}</button>
            </div>
        </div>
    `;
    return item;
}

function renderHistory() {
    if (!investmentHistoryList) return;
    investmentHistoryList.innerHTML = '';
    if (!investmentHistory.length) {
        const empty = document.createElement('li');
        empty.className = 'ledger-history-item empty';
        empty.textContent = 'No snapshots yet.';
        investmentHistoryList.appendChild(empty);
        return;
    }

    getHistorySortedDescending(investmentHistory).forEach(snapshot => {
            investmentHistoryList.appendChild(createHistoryRow(snapshot));
    });
}

function parseDateString(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return new Date();
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function buildSnapshotFromForm() {
    const snapshotDate = investmentSnapshotDateInput ? investmentSnapshotDateInput.value : '';
    if (!snapshotDate) {
        alert('Please select a snapshot date.');
        return null;
    }

    const accounts = buildEmptyAccounts();
    for (const account of ACCOUNT_CONFIG) {
        const fields = accountInputs[account.key];
        const invested = parseAmount(fields.invested.value);
        const current = parseAmount(fields.current.value);
        if (invested < 0 || current < 0) {
            alert('Amounts cannot be negative.');
            return null;
        }
        accounts[account.key] = { invested, current };
    }

    return {
        snapshotDate,
        accounts
    };
}

function getHistorySortedDescending(list = investmentHistory) {
    return list
        .slice()
        .sort((a, b) => {
            const aDate = (toDate(a.savedAt) || parseDateString(a.snapshotDate)).getTime();
            const bDate = (toDate(b.savedAt) || parseDateString(b.snapshotDate)).getTime();
            return bDate - aDate;
        });
}

function getNextCurrentSnapshotAfterDelete(id) {
    const remaining = investmentHistory.filter(item => String(item.id) !== String(id));
    const next = getHistorySortedDescending(remaining)[0] || null;
    return next ? normalizeSnapshot(next) : null;
}

async function deleteInvestmentSnapshot(id) {
    const target = investmentHistory.find(item => String(item.id) === String(id));
    if (!target) return;
    if (!confirm('Delete this investment snapshot?')) return;

    const wasLatest = String(id) === getLatestHistoryId();
    const nextCurrent = getNextCurrentSnapshotAfterDelete(id);

    if (isRemoteEnabled()) {
        await investmentHistoryCollection(currentUser).doc(String(id)).delete();
        if (wasLatest) {
            if (nextCurrent) {
                await investmentCurrentDoc(currentUser).set({
                    snapshotDate: nextCurrent.snapshotDate,
                    accounts: nextCurrent.accounts,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await investmentCurrentDoc(currentUser).delete();
            }
        }
        if (String(editingInvestmentId) === String(id)) {
            resetInvestmentForm();
        }
        return;
    }

    investmentHistory = investmentHistory.filter(item => String(item.id) !== String(id));
    if (wasLatest) {
        currentSnapshot = nextCurrent;
    }
    if (String(editingInvestmentId) === String(id)) {
        resetInvestmentForm();
    }
    saveCurrentSnapshot();
    saveInvestmentHistory();
    renderOverview();
    renderHistory();
    applyInvestmentMultilineLayout();
}

async function saveSnapshot() {
    const snapshot = buildSnapshotFromForm();
    if (!snapshot) return;

    if (isRemoteEnabled()) {
        const nowTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        if (editingInvestmentId) {
            await investmentHistoryCollection(currentUser).doc(editingInvestmentId).update(snapshot);
            if (editingInvestmentSyncsCurrent) {
                await investmentCurrentDoc(currentUser).set({
                    ...snapshot,
                    updatedAt: nowTimestamp
                });
            }
        } else {
            await investmentCurrentDoc(currentUser).set({
                ...snapshot,
                updatedAt: nowTimestamp
            });
            await investmentHistoryCollection(currentUser).add({
                ...snapshot,
                savedAt: nowTimestamp
            });
        }
        resetInvestmentForm();
        return;
    }

    const timestamp = new Date().toISOString();
    if (editingInvestmentId) {
        investmentHistory = investmentHistory.map(item => {
            if (String(item.id) !== String(editingInvestmentId)) return item;
            return normalizeSnapshot({
                ...item,
                ...snapshot
            });
        });
        if (editingInvestmentSyncsCurrent) {
            currentSnapshot = normalizeSnapshot({
                ...snapshot,
                updatedAt: timestamp
            });
        }
    } else {
        currentSnapshot = normalizeSnapshot({
            ...snapshot,
            updatedAt: timestamp
        });
        investmentHistory.unshift(normalizeSnapshot({
            id: `${Date.now()}`,
            ...snapshot,
            savedAt: timestamp
        }));
    }
    saveCurrentSnapshot();
    saveInvestmentHistory();
    renderOverview();
    renderHistory();
    applyInvestmentMultilineLayout();
    resetInvestmentForm();
}

function startInvestmentSync(user) {
    if (!dbRef) return;
    if (currentSnapshotUnsub) currentSnapshotUnsub();
    if (investmentHistoryUnsub) investmentHistoryUnsub();

    currentSnapshotUnsub = investmentCurrentDoc(user).onSnapshot(doc => {
        currentSnapshot = doc.exists ? normalizeSnapshot({ id: doc.id, ...doc.data() }) : null;
        renderOverview();
        applyInvestmentMultilineLayout();
        syncFormWithSnapshot(currentSnapshot);
    });

    investmentHistoryUnsub = investmentHistoryCollection(user)
        .orderBy('savedAt', 'desc')
        .limit(40)
        .onSnapshot(snapshot => {
            investmentHistory = snapshot.docs.map(doc => normalizeSnapshot({ id: doc.id, ...doc.data() }));
            renderHistory();
            applyInvestmentMultilineLayout();
        });
}

function attachLiveMetricListeners() {
    ACCOUNT_CONFIG.forEach(account => {
        const fields = accountInputs[account.key];
        if (!fields) return;
        [fields.invested, fields.current].forEach(input => {
            if (!input) return;
            input.addEventListener('input', () => {
                if (account.key === 'korea') {
                    input.value = formatKoreanInputValue(input.value);
                }
                renderLiveMetrics();
            });
        });
    });
}

function applyInvestmentMultilineLayout() {
    [canadaOverviewMetaEl, koreaOverviewMetaEl].forEach(element => {
        if (!element) return;
        const text = String(element.textContent || '').trim();
        if (!text) return;
        const parts = text.split(/Â·|·/).map(part => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
            element.innerHTML = parts.map(part => `<span>${part}</span>`).join('');
        }
    });

    const historySummaries = document.querySelectorAll('.investment-history-item .history-sub');
    historySummaries.forEach(element => {
        const text = String(element.textContent || '').trim();
        if (!text) return;
        const parts = text.split(/Â·|·/).map(part => part.trim()).filter(Boolean);
        if (!parts.length) return;
        element.classList.add('investment-history-summary');
        element.innerHTML = parts.map(part => `<span>${part}</span>`).join('');
    });
}

(function init() {
    if (investmentForm) {
        investmentForm.addEventListener('submit', event => {
            event.preventDefault();
            saveSnapshot();
        });
    }
    if (cancelInvestmentEditBtn) {
        cancelInvestmentEditBtn.addEventListener('click', resetInvestmentForm);
    }
    if (investmentHistoryList) {
        investmentHistoryList.addEventListener('click', event => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const item = button.closest('.investment-history-item');
            if (!item) return;
            if (button.dataset.action === 'edit-investment') {
                enterInvestmentEditMode(item.dataset.id);
                return;
            }
            if (button.dataset.action === 'delete-investment') {
                deleteInvestmentSnapshot(item.dataset.id);
            }
        });
    }

    attachLiveMetricListeners();

    if (requireAuthRef) {
        requireAuthRef().then(user => {
            currentUser = user;
            startInvestmentSync(user);
        });
        return;
    }

    loadCurrentSnapshot();
    loadInvestmentHistory();
    renderOverview();
    renderHistory();
    resetInvestmentForm();
    applyInvestmentMultilineLayout();
})();

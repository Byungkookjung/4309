// Read ledger and plan data from localStorage and render totals & lists

// Use storage.load() (storage.js included on page)
function loadJSON(key) {
    const raw = storage.load(); // load returns full myAppData
    return raw[key] || [];
}

function loadValue(key) {
    const raw = storage.load();
    return raw[key] !== undefined ? raw[key] : 0;
}

function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Parse a date string into a local-midnight Date to avoid timezone shifts.
function parseDateLocal(dateStr) {
    if (!dateStr) return null;
    const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
        const y = parseInt(ymd[1], 10);
        const m = parseInt(ymd[2], 10);
        const d = parseInt(ymd[3], 10);
        return new Date(y, m - 1, d);
    }
    const iso = new Date(dateStr);
    if (isNaN(iso.getTime())) return null;
    return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
}

// Format a Date (or date string) into local YYYY-MM-DD
function formatDateLocal(dateOrStr) {
    let d = null;
    if (!dateOrStr) return '';
    if (typeof dateOrStr === 'string') d = parseDateLocal(dateOrStr);
    else if (dateOrStr instanceof Date) d = new Date(dateOrStr.getFullYear(), dateOrStr.getMonth(), dateOrStr.getDate());
    if (!d || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMonthKeyFromDateObj(d) {
    if (!d) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getMonthKey(dateStrOrIso) {
    const d = parseDateLocal(dateStrOrIso);
    return getMonthKeyFromDateObj(d);
}

// Render safely using textContent (no innerHTML with user data)
function renderSummary() {
    // Use storage.get mapping for backward-compatible access to nested ledger
    const ledgerEntries = storage.get('ledgerEntries') || [];
    const planItems = storage.get('planItems') || [];
    const initialBalance = Number(storage.get('ledgerInitialBalance') || 0);

    // totals
    let totalIncome = 0, totalExpense = 0;
    ledgerEntries.forEach(e => {
        if (e.type === 'income') totalIncome += Number(e.amount || 0);
        else totalExpense += Number(e.amount || 0);
    });

    // plannedTotal: exclude repeating plans (they are materialized into ledgerEntries)
    const plannedTotal = (planItems || []).filter(p => !p.repeat).reduce((s, p) => s + (Number(p.unit||0) * Number(p.qty||1)), 0);

    const net = totalIncome - totalExpense;
    const accountBalance = Number(initialBalance || 0) + totalIncome - totalExpense;

    // update stats
    document.getElementById('totalIncomeAll').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpenseAll').textContent = formatCurrency(totalExpense);
    document.getElementById('plannedTotalAll').textContent = formatCurrency(plannedTotal);
    document.getElementById('netAll').textContent = formatCurrency(net);
    document.getElementById('accountBalanceAll').textContent = formatCurrency(accountBalance);

    // recent transactions (most recent 20) - use safe DOM methods
    const recentList = document.getElementById('recentList');
    if (recentList) {
        recentList.innerHTML = '';
        const sorted = ledgerEntries
            .slice()
            .sort((a,b) => {
                // pick best date for sorting: prefer date, else createdAt
                const da = parseDateLocal(a.date) || parseDateLocal(a.createdAt) || new Date(a.createdAt || 0);
                const db = parseDateLocal(b.date) || parseDateLocal(b.createdAt) || new Date(b.createdAt || 0);
                return db.getTime() - da.getTime();
            })
            .slice(0,20);

        sorted.forEach(e => {
            const li = document.createElement('li');
            li.className = 'item';

            const left = document.createElement('div');
            const title = document.createElement('div');
            title.textContent = (e.description && String(e.description).trim()) || (e.type === 'income' ? 'Income' : 'Expense');
            const dateText = document.createElement('div');
            dateText.style.fontSize = '0.85em';
            dateText.style.color = '#666';
            const dateObj = parseDateLocal(e.date) || parseDateLocal(e.createdAt) || null;
            dateText.textContent = dateObj ? formatDateLocal(dateObj) : (e.createdAt ? formatDateLocal(e.createdAt) : '');

            left.appendChild(title);
            left.appendChild(dateText);

            const right = document.createElement('div');
            right.style.fontWeight = '700';
            right.textContent = (e.type === 'income' ? '' : '-') + formatCurrency(Number(e.amount || 0));

            li.appendChild(left);
            li.appendChild(right);
            recentList.appendChild(li);
        });
    }

    // include planned items: only non-recurring plans to avoid duplicate with materialized recurring entries
    if (planItems && planItems.length > 0) {
        // header
        const header = document.createElement('li');
        header.className = 'item';
        const hdrLeft = document.createElement('div');
        hdrLeft.style.fontWeight = '700';
        hdrLeft.textContent = 'Planned items';
        header.appendChild(hdrLeft);
        recentList.appendChild(header);

        (planItems || []).filter(p => !p.repeat).forEach(p => {
            const li = document.createElement('li');
            li.className = 'item';
            const left = document.createElement('div');
            const title = document.createElement('div');
            title.textContent = String(p.label || '');
            const sub = document.createElement('div');
            sub.style.fontSize = '0.85em';
            sub.style.color = '#666';
            sub.textContent = 'Planned';
            left.appendChild(title);
            left.appendChild(sub);

            const right = document.createElement('div');
            right.style.fontWeight = '700';
            right.textContent = '-' + formatCurrency(Number(p.unit || 0) * Number(p.qty || 1));

            li.appendChild(left);
            li.appendChild(right);
            recentList.appendChild(li);
        });
    }

    // monthly breakdown
    const monthly = {};
    ledgerEntries.forEach(e => {
        const d = parseDateLocal(e.date) || parseDateLocal(e.createdAt) || null;
        const key = d ? getMonthKeyFromDateObj(d) : 'unknown';
        if (!monthly[key]) monthly[key] = { income:0, expense:0 };
        if (e.type === 'income') monthly[key].income += Number(e.amount || 0);
        else monthly[key].expense += Number(e.amount || 0);
    });

    const monthlyList = document.getElementById('monthlyList');
    if (monthlyList) {
        monthlyList.innerHTML = '';
        const keys = Object.keys(monthly).sort();
        if (keys.length === 0) {
            const none = document.createElement('div');
            none.style.color = '#666';
            none.style.padding = '8px';
            none.textContent = 'No ledger entries yet.';
            monthlyList.appendChild(none);
        } else {
            keys.forEach(k => {
                const m = monthly[k];
                const li = document.createElement('li');
                li.className = 'item';
                const left = document.createElement('div');
                left.textContent = k;
                const sub = document.createElement('div');
                sub.style.fontSize = '0.85em';
                sub.style.color = '#666';
                sub.textContent = 'Month';
                left.appendChild(sub);

                const right = document.createElement('div');
                right.style.fontWeight = '700';
                right.textContent = `${formatCurrency(m.income)} / ${formatCurrency(m.expense)}`;

                li.appendChild(left);
                li.appendChild(right);
                monthlyList.appendChild(li);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', renderSummary);

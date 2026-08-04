const STORAGE_SHIFTS = 'weeklySheetShifts';
const STORAGE_PAYOUTS = 'weeklySheetPayouts';
const STORAGE_SETTINGS = 'weeklySheetSettings';

const authApi = window.__ledgerAuth || {};
const requireAuthRef = authApi.requireAuth;
const dbRef = authApi.db;

let currentUser = null;
let shifts = [];
let payouts = [];
let settings = { hourlyRate: 15, holidayMultiplier: 1.5 };
let shiftUnsub = null;
let payoutUnsub = null;
let settingsUnsub = null;
let weekBlockOffset = 0;
let currentCalendarMonth = new Date();
let selectedCalendarDate = null;
let isEditingRate = false;
let editingPayoutId = null;

const currentHourlyRate = document.getElementById('currentHourlyRate');
const currentHolidayRate = document.getElementById('currentHolidayRate');
const hourlyRateInput = document.getElementById('hourlyRateInput');
const holidayMultiplierInput = document.getElementById('holidayMultiplierInput');
const editRateBtn = document.getElementById('editRateBtn');
const saveRateBtn = document.getElementById('saveRateBtn');
const cancelRateEditBtn = document.getElementById('cancelRateEditBtn');
const rateForm = document.getElementById('rateForm');
const twoWeekHours = document.getElementById('twoWeekHours');
const twoWeekIncome = document.getElementById('twoWeekIncome');
const actualPayoutTotal = document.getElementById('actualPayoutTotal');
const sheetRangeTitle = document.getElementById('sheetRangeTitle');
const prevWeekBlockBtn = document.getElementById('prevWeekBlockBtn');
const nextWeekBlockBtn = document.getElementById('nextWeekBlockBtn');
const todayWeekBlockBtn = document.getElementById('todayWeekBlockBtn');
const weekCardOne = document.getElementById('weekCardOne');
const weekCardTwo = document.getElementById('weekCardTwo');
const payoutForm = document.getElementById('payoutForm');
const payoutDateInput = document.getElementById('payoutDate');
const payoutHoursInput = document.getElementById('payoutHours');
const payoutRegularPayInput = document.getElementById('payoutRegularPay');
const payoutHolidayWorkPayInput = document.getElementById('payoutHolidayWorkPay');
const payoutStatHolidayPayInput = document.getElementById('payoutStatHolidayPay');
const payoutTipsInput = document.getElementById('payoutTips');
const payoutVacationInput = document.getElementById('payoutVacation');
const payoutDeductionsInput = document.getElementById('payoutDeductions');
const payoutGrossInput = document.getElementById('payoutGross');
const payoutAmountInput = document.getElementById('payoutAmount');
const savePayoutBtn = document.getElementById('savePayoutBtn');
const payoutList = document.getElementById('payoutList');
const prevCalendarMonthBtn = document.getElementById('prevCalendarMonthBtn');
const nextCalendarMonthBtn = document.getElementById('nextCalendarMonthBtn');
const calendarMonthLabel = document.getElementById('calendarMonthLabel');
const sheetCalendarGrid = document.getElementById('sheetCalendarGrid');
const sheetCalendar = document.getElementById('sheetCalendar');
const selectedDayCard = document.getElementById('selectedDayCard');
const selectedDayTitle = document.getElementById('selectedDayTitle');
const selectedDayMeta = document.getElementById('selectedDayMeta');
const selectedDayDetail = document.getElementById('selectedDayDetail');

function isRemoteEnabled() {
    return !!(currentUser && dbRef);
}

function shiftsCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('weeklyWorkShifts');
}

function payoutsCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('weeklyWorkPayouts');
}

function settingsDoc(user) {
    return dbRef.collection('users').doc(user.uid).collection('weeklyWorkMeta').doc('settings');
}

function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseISODate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

function formatCompactDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeGrossPay(regularPay, holidayWorkPay, statHolidayPay, tips, vacationPayout) {
    return Number((
        Number(regularPay || 0) +
        Number(holidayWorkPay || 0) +
        Number(statHolidayPay || 0) +
        Number(tips || 0) +
        Number(vacationPayout || 0)
    ).toFixed(2));
}

function computeNetPay(grossPay, deductions) {
    return Number((Number(grossPay || 0) - Number(deductions || 0)).toFixed(2));
}

function computeRegularPay(hours, hourlyRate) {
    return Number((Number(hours || 0) * Number(hourlyRate || 0)).toFixed(2));
}

function safeText(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function weekdayLabel(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getMonthLabel(date) {
    return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function toMinutes(timeString) {
    if (!timeString || !timeString.includes(':')) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

function normalizePastedTime(rawValue) {
    if (!rawValue) return null;
    let value = String(rawValue).trim().toLowerCase();
    if (!value) return null;

    const isAm = value.includes('am') || value.includes('a.m') || value.includes('오전');
    const isPm = value.includes('pm') || value.includes('p.m') || value.includes('오후');
    value = value
        .replace(/a\.?m\.?/g, '')
        .replace(/p\.?m\.?/g, '')
        .replace(/오전/g, '')
        .replace(/오후/g, '')
        .trim();

    let hours;
    let minutes;

    if (value.includes(':')) {
        const [hourPart, minutePart] = value.split(':');
        hours = Number(hourPart);
        minutes = Number((minutePart || '0').slice(0, 2));
    } else if (/^\d{3,4}$/.test(value)) {
        const padded = value.padStart(4, '0');
        hours = Number(padded.slice(0, 2));
        minutes = Number(padded.slice(2, 4));
    } else if (/^\d{1,2}$/.test(value)) {
        hours = Number(value);
        minutes = 0;
    } else {
        return null;
    }

    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    if (isAm && hours === 12) hours = 0;
    if (isPm && hours < 12) hours += 12;
    if (hours < 0 || hours > 23) return null;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function computeShiftDurationHours(checkIn, checkOut) {
    const startMinutes = toMinutes(checkIn);
    const endMinutes = toMinutes(checkOut);
    if (startMinutes == null || endMinutes == null) return 0;
    let minutes = endMinutes - startMinutes;
    if (minutes < 0) minutes += 24 * 60;
    return Number((minutes / 60).toFixed(2));
}

function computeBreakHours(shift) {
    return computeShiftDurationHours(shift.checkIn, shift.checkOut) >= 5.5 ? 0.5 : 0;
}

function computeTotalHours(shift) {
    const durationHours = computeShiftDurationHours(shift.checkIn, shift.checkOut);
    const breakHours = computeBreakHours(shift);
    if (!durationHours) return 0;
    return Math.max(0, Number((durationHours - breakHours).toFixed(2)));
}

function normalizeShift(raw) {
    const shift = {
        id: String(raw.id || raw.date || Date.now()),
        date: raw.date || isoDate(new Date()),
        checkIn: raw.checkIn || '',
        checkOut: raw.checkOut || '',
        breakHours: 0,
        isHoliday: Boolean(raw.isHoliday),
        note: String(raw.note || ''),
        createdAt: raw.createdAt || new Date().toISOString()
    };
    shift.breakHours = computeBreakHours(shift);
    shift.totalHours = computeTotalHours(shift);
    return shift;
}

function normalizePayout(raw) {
    const regularPay = Number(raw.regularPay || 0);
    const holidayWorkPay = Number(raw.holidayWorkPay || 0);
    const statHolidayPay = Number(raw.statHolidayPay || 0);
    const tips = Number(raw.tips || 0);
    const vacationPayout = Number(raw.vacationPayout || 0);
    const grossPay = Number(raw.grossPay || computeGrossPay(regularPay, holidayWorkPay, statHolidayPay, tips, vacationPayout));
    const deductions = Number(raw.deductions || 0);
    const amount = Number(raw.amount || computeNetPay(grossPay, deductions));
    return {
        id: String(raw.id || Date.now()),
        date: raw.date || isoDate(new Date()),
        hours: Number(raw.hours || 0),
        regularPay,
        holidayWorkPay,
        statHolidayPay,
        tips,
        vacationPayout,
        grossPay,
        deductions,
        amount,
        note: String(raw.note || ''),
        createdAt: raw.createdAt || new Date().toISOString()
    };
}

function loadLocalState() {
    try {
        shifts = JSON.parse(localStorage.getItem(STORAGE_SHIFTS) || '[]').map(normalizeShift);
        payouts = JSON.parse(localStorage.getItem(STORAGE_PAYOUTS) || '[]').map(normalizePayout);
        settings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{"hourlyRate":15,"holidayMultiplier":1.5}');
        settings.hourlyRate = Number(settings.hourlyRate || 15);
        settings.holidayMultiplier = Number(settings.holidayMultiplier || 1.5);
    } catch (error) {
        shifts = [];
        payouts = [];
        settings = { hourlyRate: 15, holidayMultiplier: 1.5 };
    }
}

function saveLocalState() {
    localStorage.setItem(STORAGE_SHIFTS, JSON.stringify(shifts));
    localStorage.setItem(STORAGE_PAYOUTS, JSON.stringify(payouts));
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

function getFriday(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = (day - 5 + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
}

function getFridayWeekStart(offset = 0) {
    const start = getFriday(new Date());
    start.setDate(start.getDate() + offset * 7);
    return start;
}

function getWeekStart(offset = 0) {
    return getFridayWeekStart(offset);
}

function getWeekDates(offset = 0) {
    const start = getWeekStart(offset);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function getShiftByDate(dateString) {
    return shifts.find(item => item.date === dateString) || null;
}

function getOrCreateShift(dateString) {
    return getShiftByDate(dateString) || normalizeShift({ date: dateString, id: dateString });
}

function sortPayouts(list) {
    return list.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
}

function getWeekHours(weekDates) {
    return weekDates.reduce((sum, date) => sum + getOrCreateShift(isoDate(date)).totalHours, 0);
}

function getWeekExpectedIncome(weekDates) {
    return Number(weekDates.reduce((sum, date) => {
        const shift = getOrCreateShift(isoDate(date));
        const multiplier = shift.isHoliday ? Number(settings.holidayMultiplier || 1.5) : 1;
        return sum + shift.totalHours * Number(settings.hourlyRate || 0) * multiplier;
    }, 0).toFixed(2));
}

function getWeekHolidayHours(weekDates) {
    return Number(weekDates.reduce((sum, date) => {
        const shift = getOrCreateShift(isoDate(date));
        return sum + (shift.isHoliday ? shift.totalHours : 0);
    }, 0).toFixed(2));
}

function renderRate() {
    currentHourlyRate.textContent = `${formatCurrency(settings.hourlyRate)} / hr`;
    currentHolidayRate.textContent = `Holiday: ${Number(settings.holidayMultiplier || 1.5).toFixed(1)}x`;
    hourlyRateInput.value = Number(settings.hourlyRate || 15).toFixed(2);
    holidayMultiplierInput.value = Number(settings.holidayMultiplier || 1.5).toFixed(1);
    rateForm.classList.toggle('hidden', !isEditingRate);
}

function buildWeekTableMarkup(weekDates) {
    const monthLabel = getMonthLabel(weekDates[0]);
    const weekHours = getWeekHours(weekDates);
    const weekIncome = getWeekExpectedIncome(weekDates);

    const rows = weekDates.map(date => {
        const dateString = isoDate(date);
        const shift = getOrCreateShift(dateString);
        const dayIndex = date.getDay();
        const weekendClass = dayIndex === 0 || dayIndex === 6 ? 'weekend' : '';
        return `
            <tr data-date="${safeText(dateString)}">
                <td class="sheet-date-cell ${weekendClass}">${date.getDate()}</td>
                <td class="sheet-day-cell ${weekendClass}">${safeText(weekdayLabel(date))}</td>
                <td><input class="sheet-time-input" data-field="checkIn" type="time" value="${safeText(shift.checkIn)}" /></td>
                <td><input class="sheet-time-input" data-field="checkOut" type="time" value="${safeText(shift.checkOut)}" /></td>
                <td><input class="sheet-break-input" data-field="breakHours" type="text" value="${safeText(shift.breakHours ? String(shift.breakHours) : '0')}" readonly tabindex="-1" aria-label="Automatic break hours" /></td>
                <td class="sheet-holiday-cell"><label class="sheet-holiday-toggle" aria-label="Holiday"><input data-field="isHoliday" type="checkbox" ${shift.isHoliday ? 'checked' : ''} /></label></td>
                <td class="sheet-total-cell">${shift.totalHours.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="sheet-card-header">
            <span class="sheet-month-tag">${safeText(monthLabel)}</span>
            <span class="sheet-range-tag">${safeText(formatCompactDate(weekDates[0]))} - ${safeText(formatCompactDate(weekDates[6]))}</span>
        </div>
        <div class="sheet-table-wrap">
            <table class="weekly-sheet-table">
                <colgroup>
                    <col class="sheet-col-date" />
                    <col class="sheet-col-day" />
                    <col class="sheet-col-time" />
                    <col class="sheet-col-time" />
                    <col class="sheet-col-break" />
                    <col class="sheet-col-holiday" />
                    <col class="sheet-col-total" />
                </colgroup>
                <thead>
                    <tr>
                        <th></th>
                        <th>Day of the week</th>
                        <th>Check-in time</th>
                        <th>Check-out time</th>
                        <th>Break hours</th>
                        <th>Holiday</th>
                        <th>Total hours</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr>
                        <td></td>
                        <td colspan="5" class="sheet-summary-label-row">TOTAL HOURS</td>
                        <td class="sheet-summary-value-row">${weekHours.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td colspan="5" class="sheet-summary-label-row muted-line">HOLIDAY HOURS</td>
                        <td class="sheet-summary-value-row">${getWeekHolidayHours(weekDates).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td colspan="5" class="sheet-summary-label-row income-line">EXPECTED INCOME</td>
                        <td class="sheet-summary-value-row">${formatCurrency(weekIncome)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function attachWeekTableHandlers(container) {
    container.querySelectorAll('tbody tr').forEach(row => {
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => handleShiftInput(row));
            input.addEventListener('blur', () => handleShiftInput(row));
        });
        row.querySelectorAll('.sheet-time-input').forEach(input => {
            input.addEventListener('paste', event => {
                const pastedValue = event.clipboardData?.getData('text');
                const normalized = normalizePastedTime(pastedValue);
                if (!normalized) return;
                event.preventDefault();
                input.value = normalized;
                handleShiftInput(row);
            });
        });
    });
}

async function persistShift(shift) {
    if (isRemoteEnabled()) {
        await shiftsCollection(currentUser).doc(String(shift.id)).set(shift);
        return;
    }
    const index = shifts.findIndex(item => item.id === shift.id);
    if (index >= 0) shifts[index] = shift; else shifts.push(shift);
    saveLocalState();
    renderAll();
}

async function deleteShift(id) {
    if (isRemoteEnabled()) {
        await shiftsCollection(currentUser).doc(String(id)).delete();
        return;
    }
    shifts = shifts.filter(item => item.id !== String(id));
    saveLocalState();
    renderAll();
}

async function handleShiftInput(row) {
    const date = row.dataset.date;
    const checkIn = row.querySelector('[data-field="checkIn"]').value;
    const checkOut = row.querySelector('[data-field="checkOut"]').value;
    const isHoliday = row.querySelector('[data-field="isHoliday"]').checked;
    const draft = normalizeShift({
        id: date,
        date,
        checkIn,
        checkOut,
        isHoliday,
        note: '',
        createdAt: new Date().toISOString()
    });
    row.querySelector('[data-field="breakHours"]').value = draft.breakHours ? String(draft.breakHours) : '0';
    row.querySelector('.sheet-total-cell').textContent = draft.totalHours.toFixed(2);

    const hasData = Boolean(checkIn || checkOut || isHoliday);
    if (!hasData && !draft.totalHours) {
        await deleteShift(date);
        return;
    }
    await persistShift(draft);
}

function renderWeekSheets() {
    const weekOne = getWeekDates(weekBlockOffset);
    const weekTwo = getWeekDates(weekBlockOffset + 1);
    weekCardOne.innerHTML = buildWeekTableMarkup(weekOne);
    weekCardTwo.innerHTML = buildWeekTableMarkup(weekTwo);
    attachWeekTableHandlers(weekCardOne);
    attachWeekTableHandlers(weekCardTwo);

    const rangeText = `${formatCompactDate(weekOne[0])} - ${formatCompactDate(weekTwo[6])}`;
    sheetRangeTitle.textContent = rangeText;
}

function getShiftHoursByDate(dateString) {
    return shifts
        .filter(item => item.date === dateString)
        .reduce((sum, item) => sum + item.totalHours, 0);
}

function renderShiftCalendar() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = isoDate(new Date());
    const headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    calendarMonthLabel.textContent = currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    sheetCalendar.innerHTML = '';

    headers.forEach(day => {
        const head = document.createElement('div');
        head.className = 'calendar-day-header';
        head.textContent = day;
        sheetCalendar.appendChild(head);
    });

    for (let i = 0; i < firstDay; i += 1) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        sheetCalendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const dateString = isoDate(date);
        const hours = getShiftHoursByDate(dateString);
        const shift = getShiftByDate(dateString);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = Boolean(shift?.isHoliday);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar-day work-calendar-day';
        button.setAttribute('aria-label', `${day}${hours ? ` ${hours.toFixed(2)} hours` : ''}`);
        if (dateString === today) button.classList.add('today');
        if (dateString === selectedCalendarDate) button.classList.add('selected');
        if (isWeekend || isHoliday) button.classList.add('accent-day');
        button.innerHTML = `
            <span class="day-number">${day}</span>
            <span class="work-calendar-hours">${hours ? `${hours.toFixed(2)}h` : ''}</span>
            <span class="work-calendar-count">${hours ? 'worked' : ''}</span>
        `;
        button.addEventListener('click', () => {
            selectedCalendarDate = selectedCalendarDate === dateString ? null : dateString;
            renderShiftCalendar();
            renderSelectedDayDetail();
        });
        sheetCalendar.appendChild(button);
    }

    const totalSlots = firstDay + daysInMonth;
    const trailingEmptySlots = (7 - (totalSlots % 7)) % 7;
    for (let i = 0; i < trailingEmptySlots; i += 1) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        sheetCalendar.appendChild(empty);
    }
}

function renderSelectedDayDetail() {
    if (!selectedCalendarDate) {
        sheetCalendarGrid.classList.remove('detail-open');
        selectedDayCard.classList.remove('open');
        selectedDayTitle.textContent = 'Selected Day';
        selectedDayMeta.textContent = 'Choose a day on the calendar to review saved time.';
        selectedDayDetail.innerHTML = '';
        return;
    }

    const date = parseISODate(selectedCalendarDate);
    const shift = getShiftByDate(selectedCalendarDate);
    sheetCalendarGrid.classList.add('detail-open');
    selectedDayCard.classList.add('open');
    selectedDayTitle.textContent = date ? formatCompactDate(date) : 'Selected Day';

    if (!shift || !shift.totalHours) {
        selectedDayMeta.textContent = 'No saved shift for this day.';
        selectedDayDetail.innerHTML = '<div class="work-empty">No hours saved for this date yet.</div>';
        return;
    }

    selectedDayMeta.textContent = `${weekdayLabel(date)} • ${shift.totalHours.toFixed(2)} total hours`;
    selectedDayDetail.innerHTML = `
        <article class="work-item-card">
            <div class="work-item-main">
                <div class="work-item-title-row">
                    <strong>${safeText(shift.checkIn || '--:--')} - ${safeText(shift.checkOut || '--:--')}</strong>
                    <span class="sheet-payout-amount">${shift.totalHours.toFixed(2)}h</span>
                </div>
                <div class="work-item-stats">
                    <span>Break ${Number(shift.breakHours || 0).toFixed(2)}h</span>
                    <span>${shift.isHoliday ? 'Holiday' : 'Regular'}</span>
                    <span>Expected ${formatCurrency(shift.totalHours * Number(settings.hourlyRate || 0) * (shift.isHoliday ? Number(settings.holidayMultiplier || 1.5) : 1))}</span>
                </div>
            </div>
        </article>
    `;
}

function renderTopSummary() {
    const weekOne = getWeekDates(weekBlockOffset);
    const weekTwo = getWeekDates(weekBlockOffset + 1);
    const blockDates = [...weekOne, ...weekTwo];
    const totalHours = blockDates.reduce((sum, date) => sum + getOrCreateShift(isoDate(date)).totalHours, 0);
    const totalIncome = Number((totalHours * Number(settings.hourlyRate || 0)).toFixed(2));
    const payoutTotal = payouts.reduce((sum, item) => sum + item.amount, 0);

    twoWeekHours.textContent = totalHours.toFixed(2);
    twoWeekIncome.textContent = formatCurrency(totalIncome);
    actualPayoutTotal.textContent = formatCurrency(payoutTotal);
}

function buildPayoutMarkup(item) {
    return `
        <article class="work-item-card" data-payout-id="${safeText(item.id)}">
            <div class="work-item-main">
                <div class="work-item-title-row">
                    <strong>${safeText(formatCompactDate(parseISODate(item.date)))}</strong>
                    <span class="sheet-payout-amount">${formatCurrency(item.amount)}</span>
                </div>
                <div class="work-item-stats payouts">
                    <span>${item.hours ? `${item.hours.toFixed(2)}h` : '0.00h'}</span>
                    <span>Gross ${formatCurrency(item.grossPay || item.amount)}</span>
                    <span class="negative">Deduct ${formatCurrency(item.deductions || 0)}</span>
                </div>
                <div class="work-item-stats payouts">
                    <span>Regular ${formatCurrency(item.regularPay || 0)}</span>
                    <span>Holiday work ${formatCurrency(item.holidayWorkPay || 0)}</span>
                    <span>Stat holiday ${formatCurrency(item.statHolidayPay || 0)}</span>
                </div>
                <div class="work-item-stats payouts">
                    <span>Tips ${formatCurrency(item.tips || 0)}</span>
                    <span>Vacation ${formatCurrency(item.vacationPayout || 0)}</span>
                </div>
            </div>
            <div class="work-item-actions">
                <button type="button" class="icon-btn activity-icon-btn" data-action="edit-payout" title="Edit payout" aria-label="Edit payout">&#9998;</button>
                <button type="button" class="icon-btn activity-icon-btn activity-delete-btn" data-action="delete-payout" title="Delete payout" aria-label="Delete payout">&#128465;</button>
            </div>
        </article>
    `;
}

function renderPayouts() {
    const ordered = sortPayouts(payouts);
    if (!ordered.length) {
        payoutList.innerHTML = '<div class="work-empty">No payout entries yet.</div>';
        return;
    }
    payoutList.innerHTML = ordered.map(buildPayoutMarkup).join('');
    payoutList.querySelectorAll('[data-action="edit-payout"]').forEach(button => {
        button.addEventListener('click', event => {
            const card = event.currentTarget.closest('[data-payout-id]');
            if (card) startEditPayout(card.dataset.payoutId);
        });
    });
    payoutList.querySelectorAll('[data-action="delete-payout"]').forEach(button => {
        button.addEventListener('click', event => {
            const card = event.currentTarget.closest('[data-payout-id]');
            if (card) deletePayout(card.dataset.payoutId);
        });
    });
}

async function persistPayout(entry) {
    if (isRemoteEnabled()) {
        await payoutsCollection(currentUser).doc(String(entry.id)).set(entry);
        return;
    }
    payouts.unshift(entry);
    saveLocalState();
    renderAll();
}

async function deletePayout(id) {
    if (!confirm('Delete this payout entry?')) return;
    if (isRemoteEnabled()) {
        await payoutsCollection(currentUser).doc(String(id)).delete();
        return;
    }
    payouts = payouts.filter(item => item.id !== String(id));
    saveLocalState();
    renderAll();
}

function resetPayoutForm() {
    editingPayoutId = null;
    payoutForm.reset();
    payoutDateInput.value = isoDate(new Date());
    savePayoutBtn.textContent = 'Save payout';
    refreshPayoutTotals();
}

function startEditPayout(id) {
    const item = payouts.find(entry => entry.id === String(id));
    if (!item) return;
    editingPayoutId = item.id;
    payoutDateInput.value = item.date || isoDate(new Date());
    payoutHoursInput.value = item.hours ? String(item.hours) : '';
    payoutHolidayWorkPayInput.value = item.holidayWorkPay ? String(item.holidayWorkPay) : '';
    payoutStatHolidayPayInput.value = item.statHolidayPay ? String(item.statHolidayPay) : '';
    payoutTipsInput.value = item.tips ? String(item.tips) : '';
    payoutVacationInput.value = item.vacationPayout ? String(item.vacationPayout) : '';
    payoutDeductionsInput.value = item.deductions ? String(item.deductions) : '';
    savePayoutBtn.textContent = 'Update payout';
    refreshPayoutTotals();
    payoutForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function refreshPayoutTotals() {
    const hours = Number(payoutHoursInput.value || 0);
    const regularPay = computeRegularPay(hours, settings.hourlyRate);
    payoutRegularPayInput.value = regularPay.toFixed(2);
    const holidayWorkPay = Number(payoutHolidayWorkPayInput.value || 0);
    const statHolidayPay = Number(payoutStatHolidayPayInput.value || 0);
    const tips = Number(payoutTipsInput.value || 0);
    const vacationPayout = Number(payoutVacationInput.value || 0);
    const deductions = Number(payoutDeductionsInput.value || 0);
    const grossPay = computeGrossPay(regularPay, holidayWorkPay, statHolidayPay, tips, vacationPayout);
    const netPay = computeNetPay(grossPay, deductions);
    payoutGrossInput.value = grossPay.toFixed(2);
    payoutAmountInput.value = netPay.toFixed(2);
}

async function saveHourlyRate() {
    const hourlyRate = Number(hourlyRateInput.value || 15);
    const holidayMultiplier = Number(holidayMultiplierInput.value || 1.5);
    settings.hourlyRate = hourlyRate;
    settings.holidayMultiplier = holidayMultiplier;
    if (isRemoteEnabled()) {
        await settingsDoc(currentUser).set(settings);
    } else {
        saveLocalState();
    }
    isEditingRate = false;
    renderAll();
}

function openRateEditor() {
    isEditingRate = true;
    renderRate();
}

function closeRateEditor() {
    isEditingRate = false;
    renderRate();
}

function isTypingTarget(element) {
    if (!element) return false;
    const tagName = element.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || element.isContentEditable;
}

async function handleSavePayout() {
    const date = payoutDateInput.value;
    const hours = Number(payoutHoursInput.value || 0);
    const regularPay = computeRegularPay(hours, settings.hourlyRate);
    const holidayWorkPay = Number(payoutHolidayWorkPayInput.value || 0);
    const statHolidayPay = Number(payoutStatHolidayPayInput.value || 0);
    const tips = Number(payoutTipsInput.value || 0);
    const vacationPayout = Number(payoutVacationInput.value || 0);
    const deductions = Number(payoutDeductionsInput.value || 0);
    const grossPay = computeGrossPay(regularPay, holidayWorkPay, statHolidayPay, tips, vacationPayout);
    const amount = computeNetPay(grossPay, deductions);
    if (!date || amount <= 0) {
        alert('Please enter a pay date and valid paystub amounts.');
        return;
    }
    await persistPayout(normalizePayout({
        id: editingPayoutId || `${date}-${Date.now()}`,
        date,
        hours,
        regularPay,
        holidayWorkPay,
        statHolidayPay,
        tips,
        vacationPayout,
        grossPay,
        deductions,
        amount,
        createdAt: new Date().toISOString()
    }));
    resetPayoutForm();
}

function renderAll() {
    renderRate();
    renderTopSummary();
    renderWeekSheets();
    renderShiftCalendar();
    renderSelectedDayDetail();
    renderPayouts();
}

function initializeDefaults() {
    resetPayoutForm();
}

function startRemoteSync(user) {
    if (!dbRef) return;
    if (shiftUnsub) shiftUnsub();
    if (payoutUnsub) payoutUnsub();
    if (settingsUnsub) settingsUnsub();

    shiftUnsub = shiftsCollection(user).onSnapshot(snapshot => {
        shifts = snapshot.docs.map(doc => normalizeShift({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    payoutUnsub = payoutsCollection(user).onSnapshot(snapshot => {
        payouts = snapshot.docs.map(doc => normalizePayout({ id: doc.id, ...doc.data() }));
        renderAll();
    });

    settingsUnsub = settingsDoc(user).onSnapshot(async doc => {
        if (!doc.exists) {
            settings = { hourlyRate: 15, holidayMultiplier: 1.5 };
            await settingsDoc(user).set(settings);
        } else {
            settings = {
                hourlyRate: Number(doc.data()?.hourlyRate || 15),
                holidayMultiplier: Number(doc.data()?.holidayMultiplier || 1.5)
            };
        }
        renderAll();
    });
}

rateForm.addEventListener('submit', saveHourlyRate);
editRateBtn.addEventListener('click', openRateEditor);
cancelRateEditBtn.addEventListener('click', closeRateEditor);
payoutForm.addEventListener('submit', handleSavePayout);
[payoutHoursInput, payoutHolidayWorkPayInput, payoutStatHolidayPayInput, payoutTipsInput, payoutVacationInput, payoutDeductionsInput].forEach(input => {
    input.addEventListener('input', refreshPayoutTotals);
});
prevCalendarMonthBtn.addEventListener('click', () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    renderShiftCalendar();
});
nextCalendarMonthBtn.addEventListener('click', () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    renderShiftCalendar();
});
prevWeekBlockBtn.addEventListener('click', () => {
    weekBlockOffset -= 2;
    renderAll();
});
nextWeekBlockBtn.addEventListener('click', () => {
    weekBlockOffset += 2;
    renderAll();
});
todayWeekBlockBtn.addEventListener('click', () => {
    weekBlockOffset = 0;
    renderAll();
});
document.addEventListener('keydown', event => {
    if (isTypingTarget(document.activeElement)) return;
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        weekBlockOffset -= 2;
        renderAll();
    }
    if (event.key === 'ArrowRight') {
        event.preventDefault();
        weekBlockOffset += 2;
        renderAll();
    }
});

const ledgerBtn = document.getElementById('ledgerBtn');
if (ledgerBtn) {
    ledgerBtn.addEventListener('click', () => {
        window.location.href = 'ledger.html';
    });
}

loadLocalState();
initializeDefaults();
renderAll();

if (requireAuthRef) {
    requireAuthRef().then(user => {
        currentUser = user;
        startRemoteSync(user);
    });
}

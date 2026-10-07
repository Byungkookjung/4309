(function (root) {
    const definitions = [
        { id: 'booster', name: 'Booster Juice', suffix: '' },
        { id: 'iron', name: 'Iron Peak Auto Repair', suffix: 'IronPeak' }
    ];
    function minutes(value) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return null;
        return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    }
    function summarize(definition, shift, settings = {}) {
        const base = { id: definition.id, name: definition.name, checkIn: shift?.checkIn || '', checkOut: shift?.checkOut || '', hours: 0, amount: 0, status: 'off' };
        if (!shift || (!base.checkIn && !base.checkOut)) return base;
        const start = minutes(base.checkIn), end = minutes(base.checkOut);
        if (start === null || end === null) return { ...base, status: 'incomplete' };
        const duration = Number((((end - start + 1440) % 1440) / 60).toFixed(2));
        const hours = Math.max(0, Number((duration - (duration >= 5.5 ? 0.5 : 0)).toFixed(2)));
        const rate = Number(settings.hourlyRate ?? 15);
        const multiplier = shift.isHoliday ? Number(settings.holidayMultiplier ?? 1.5) : 1;
        if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(multiplier) || multiplier < 1) throw Error('Invalid pay settings. Check both jobs before exporting.');
        return { ...base, hours, amount: Number((hours * rate * multiplier).toFixed(2)), status: 'scheduled' };
    }
    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function buildSnapshot(records, now = new Date()) {
        const days = Array.from({ length: 32 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index - 1);
            const key = dateKey(date);
            return { date: key, jobs: definitions.map(def => {
                const data = records[def.id];
                if (!data) throw Error(`Missing ${def.name} data. Please retry.`);
                return summarize(def, data.shifts.find(shift => shift.date === key), data.settings);
            }) };
        });
        return { version: 1, isSample: false, generatedAt: now.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, days };
    }
    function displayTime(time) {
        const value = minutes(time);
        if (value === null) return time;
        const hour = Math.floor(value / 60);
        return `${hour % 12 || 12}:${String(value % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
    }
    const api = { definitions, summarize, buildSnapshot, dateKey, displayTime };
    if (typeof module !== 'undefined') module.exports = api;
    else root.WorkWidgetData = api;
})(globalThis);

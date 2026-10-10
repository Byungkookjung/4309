(function (root) {
    const zone = 'America/Edmonton';
    const instants = new Map();
    function dayKey(date) {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
        const get = key => parts.find(p => p.type === key).value;
        return `${get('year')}-${get('month')}-${get('day')}`;
    }
    function nextDay(key, offset = 1) {
        const date = new Date(key + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset);
        return date.toISOString().slice(0, 10);
    }
    function instant(key, time = '00:00') {
        const cacheKey = key + ' ' + time;
        if (instants.has(cacheKey)) return instants.get(cacheKey);
        const target = Date.parse(`${key}T${time}:00Z`);
        let value = target;
        for (let i = 0; i < 3; i++) {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value);
            const get = key => parts.find(p => p.type === key).value;
            const represented = Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
            value += target - represented;
        }
        if (instants.size >= 4096) instants.clear();
        instants.set(cacheKey, value);
        return value;
    }
    function summarize(data, now = new Date()) {
        const today = dayKey(now), month = today.slice(0, 7);
        let spent = 0, earned = 0;
        for (const row of data.entries) {
            if (!row.date?.startsWith(month + '-') || row.date.length !== 10 || !Number.isFinite(row.amount) || row.amount <= 0) continue;
            if (row.type === 'income') earned += Math.round(row.amount * 100);
            else spent += Math.round(row.amount / (row.isShared ? 2 : 1) * 100);
        }
        const monthStart = instant(month + '-01');
        const monthEndDate = new Date(month + '-01T12:00:00Z'); monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
        const monthEnd = instant(monthEndDate.toISOString().slice(0, 10));
        const spans = [];
        for (const record of Object.values(data.jobs)) {
            for (const row of record.shifts) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.checkIn || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.checkOut || '')) continue;
                let start = instant(row.date, row.checkIn);
                let end = instant(row.checkOut < row.checkIn ? nextDay(row.date) : row.date, row.checkOut);
                if (end - start >= 5.5 * 3600000) end -= 1800000;
                start = Math.max(start, monthStart); end = Math.min(end, monthEnd);
                if (end > start) spans.push([start, end]);
            }
        }
        spans.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const span of spans) {
            const last = merged.at(-1);
            if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
            else merged.push([...span]);
        }
        const worked = merged.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(+now, end) - start) / 1000, 0);
        const required = Math.max(0, spent - earned) / 100 / 15 * 3600;
        return { today, month, spent: spent / 100, earned: earned / 100, worked, required,
            remaining: Math.max(0, required - worked), fraction: required ? Math.min(1, worked / required) : 1,
            active: merged.some(([start, end]) => start <= +now && +now < end) };
    }
    function duration(seconds) {
        const total = Math.max(0, Math.ceil(seconds));
        return `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    const api = { zone, dayKey, nextDay, instant, summarize, duration };
    if (typeof module !== 'undefined') module.exports = api; else root.MobileModel = api;
})(globalThis);

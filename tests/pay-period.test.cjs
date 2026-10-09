const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
function period(job, raw, date, offset = 0) {
    const context = vm.createContext({ activeJobId: job });
    for (const name of ['normalizeSettings', 'getPayPeriodAnchor', 'getPayPeriodStart']) {
        const start = source.indexOf(`function ${name}(`);
        const end = source.indexOf('\n}\n', start) + 2;
        vm.runInContext(source.slice(start, end), context);
    }
    context.raw = raw;
    context.reference = date;
    context.offset = offset;
    return vm.runInContext(`
        function parseISODate(value) { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); }
        const settings = normalizeSettings(raw);
        const start = getPayPeriodStart(offset, parseISODate(reference));
        const end = new Date(start); end.setDate(start.getDate() + 13);
        JSON.stringify({anchor: settings.periodAnchor,
            start: [start.getFullYear(), start.getMonth()+1, start.getDate()],
            end: [end.getFullYear(), end.getMonth()+1, end.getDate()]});
    `, context);
}
test('Iron Peak defaults and old saved settings use October 5-18', () => {
    for (const anchor of [undefined, '2026-07-31', '2026-09-14', '2026-09-28', '2026-10-05']) {
        const value = JSON.parse(period('iron', { periodAnchor: anchor }, '2026-10-08'));
        assert.equal(value.anchor, '2026-10-05');
        assert.deepEqual(value.start, [2026, 10, 5]);
        assert.deepEqual(value.end, [2026, 10, 18]);
    }
});
test('Iron Peak next block starts October 19 and crosses into November', () => {
    const value = JSON.parse(period('iron', {}, '2026-10-08', 1));
    assert.deepEqual(value.start, [2026, 10, 19]);
    assert.deepEqual(value.end, [2026, 11, 1]);
});
test('Booster Juice and custom anchors are unchanged', () => {
    assert.equal(JSON.parse(period('booster', {}, '2026-10-08')).anchor, '2026-07-31');
    assert.equal(JSON.parse(period('iron', { periodAnchor: '2026-10-12' }, '2026-10-08')).anchor, '2026-10-12');
});

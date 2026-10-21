const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
function period(job, raw, date, offset = 0) {
    const context = vm.createContext({ activeJobId: job });
    for (const name of ['normalizeSettings', 'getPayPeriodAnchor', 'getPayPeriodStart', 'getBlockPayoutDate', 'isoDate', 'addDays']) {
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
        const dates = Array.from({length:14}, (_,i) => addDays(start,i));
        JSON.stringify({anchor: settings.periodAnchor, delay: settings.payoutDelay, payday: getBlockPayoutDate(dates),
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
test('Iron payroll Fridays match the supplied schedule across DST and year boundaries', () => {
    const paydays = ['2026-10-23','2026-11-06','2026-11-20','2026-12-04','2026-12-18',
        '2027-01-01','2027-01-15','2027-01-29','2027-02-12','2027-02-26','2027-03-12',
        '2027-03-26','2027-04-09','2027-04-23','2027-05-07','2027-05-21','2027-06-04',
        '2027-06-18','2027-07-02','2027-07-16','2027-07-30','2027-08-13','2027-08-27',
        '2027-09-10','2027-09-24','2027-10-08','2027-10-22','2027-11-05','2027-11-19',
        '2027-12-03','2027-12-17','2027-12-31','2028-01-14'];
    for (const payoutDelay of [undefined, 7, '7', 5]) {
        paydays.forEach((expected, index) => {
            const actual = JSON.parse(period('iron', {payoutDelay}, '2026-10-08', index));
            assert.equal(actual.payday, expected);
            assert.equal(actual.delay, 5);
        });
    }
});
test('Custom delays and Booster defaults are preserved', () => {
    assert.equal(JSON.parse(period('booster', {}, '2026-10-08')).delay, 7);
    assert.equal(JSON.parse(period('iron', {payoutDelay:3}, '2026-10-08')).delay, 3);
    assert.equal(JSON.parse(period('iron', {payoutDelay:7, payrollScheduleVersion:1}, '2026-10-08')).delay, 7);
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

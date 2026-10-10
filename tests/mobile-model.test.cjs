const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../mobile/model.js');
const base = () => ({ entries: [], jobs: { iron: { shifts: [], settings: {} }, booster: { shifts: [], settings: {} } } });
test('mobile uses Edmonton dates and DST-aware shift instants', () => {
    assert.equal(model.dayKey(new Date('2026-10-01T05:00:00Z')), '2026-09-30');
    assert.equal(new Date(model.instant('2026-10-06', '10:00')).toISOString(), '2026-10-06T16:00:00.000Z');
    assert.equal(new Date(model.instant('2026-12-06', '10:00')).toISOString(), '2026-12-06T17:00:00.000Z');
    assert.equal(model.nextDay('2026-12-31'), '2027-01-01');
});
test('mobile recovery uses ledger income, shared expense cents and elapsed work', () => {
    const data = base();
    data.entries = [{ date: '2026-10-01', amount: 300, type: 'expense' }, { date: '2026-10-02', amount: 0.03, isShared: true },
        { date: '2026-10-01', amount: 150, type: 'income' }, { date: '2026-09-30', amount: 900, type: 'income' }];
    data.payouts = [{ amount: 99999 }];
    data.jobs.iron.shifts = [{ date: '2026-10-06', checkIn: '09:00', checkOut: '17:00' }, { date: '2026-10-07', checkIn: '09:00', checkOut: '17:00' }];
    const now = new Date('2026-10-06T16:00:00Z');
    const state = model.summarize(data, now);
    assert.equal(state.spent, 300.02); assert.equal(state.earned, 150);
    assert.equal(state.worked, 3600); assert.equal(state.active, true);
    assert.ok(Math.abs(state.remaining - ((300.02 - 150) / 15 * 3600 - 3600)) < 0.001);
    assert.ok(Math.abs(model.summarize(data, new Date(+now + 1000)).remaining - (state.remaining - 1)) < 0.001);
});
test('breaks, overlapping jobs, midnight clipping and zero floor', () => {
    const data = base();
    data.entries = [{ date: '2026-10-01', amount: 1500, type: 'expense' }];
    data.jobs.iron.shifts = [{ date: '2026-09-30', checkIn: '22:00', checkOut: '02:00' }, { date: '2026-10-01', checkIn: '09:00', checkOut: '17:00' }];
    data.jobs.booster.shifts = [{ date: '2026-10-01', checkIn: '10:00', checkOut: '12:00' }];
    const state = model.summarize(data, new Date('2026-10-01T22:45:00Z'));
    assert.equal(state.worked, 9.5 * 3600); assert.equal(state.active, false);
    assert.equal(state.remaining, 90.5 * 3600);
    data.entries.push({ date: '2026-10-01', type: 'income', amount: 2000 });
    assert.equal(model.summarize(data, new Date('2026-10-01T22:45:00Z')).remaining, 0);
    assert.equal(model.duration(3661), '1:01:01');
});

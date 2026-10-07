const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, definitions, buildSnapshot, dateKey } = require('../widget-data.js');

test('each job uses its own rate and holiday multiplier', () => {
    const shift = { checkIn: '14:15', checkOut: '21:15' };
    assert.equal(summarize(definitions[0], shift, { hourlyRate: 15 }).amount, 97.5);
    assert.equal(summarize(definitions[1], { ...shift, isHoliday: true }, { hourlyRate: 20, holidayMultiplier: 1.5 }).amount, 195);
});
test('break boundary, overnight shift, incomplete time and off day', () => {
    assert.equal(summarize(definitions[0], { checkIn: '08:00', checkOut: '13:29' }).hours, 5.48);
    assert.equal(summarize(definitions[0], { checkIn: '08:00', checkOut: '13:30' }).hours, 5);
    assert.equal(summarize(definitions[0], { checkIn: '22:00', checkOut: '06:00' }).hours, 7.5);
    assert.equal(summarize(definitions[0], { checkIn: '14:15' }).status, 'incomplete');
    assert.equal(summarize(definitions[0], null).status, 'off');
    assert.equal(summarize(definitions[0], { checkIn: '25:00', checkOut: '26:00' }).status, 'incomplete');
    assert.equal(summarize(definitions[0], { checkIn: '08:00', checkOut: '13:00' }, { hourlyRate: 0 }).amount, 0);
});
test('date range crosses month/year without losing either job', () => {
    const now = new Date(2026, 11, 31, 12);
    const snapshot = buildSnapshot({ booster: { shifts: [] }, iron: { shifts: [] } }, now);
    assert.equal(snapshot.days.length, 32);
    assert.equal(snapshot.days[0].date, '2026-12-30');
    assert.equal(snapshot.days.at(-1).date, '2027-01-30');
    assert.equal(snapshot.days.find(day => day.date === dateKey(now)).jobs.length, 2);
    assert.throws(() => buildSnapshot({ booster: { shifts: [] } }), /Missing/);
});

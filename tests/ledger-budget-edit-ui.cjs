// Isolated fixtures: auth and Firebase SDK requests are stubbed, so no live data is written.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.MOBILE_TEST_URL || 'http://localhost:8000';
(async () => {
    for (const [name, engine] of [['Chrome', chromium], ['WebKit', webkit]]) {
        const browser = await engine.launch(name === 'Chrome' ? { channel: 'chrome', headless: true } : { headless: true });
        try {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Edmonton', serviceWorkers: 'block' });
            await context.route('https://www.gstatic.com/**', route => route.fulfill({ body: '' }));
            await context.route('**/auth.js', route => route.fulfill({ body: 'window.__ledgerAuth={};' }));
            await context.addInitScript(() => {
                if (localStorage.getItem('budgetEditFixture')) return;
                localStorage.setItem('budgetEditFixture', 'yes');
                localStorage.setItem('ledgerBalances', JSON.stringify({ checking: 1000, saving: 2000, etc: 0 }));
                localStorage.setItem('ledgerPlanItems', JSON.stringify([
                    { id: 'food', type: 'expected', label: 'Food', amount: 100 },
                    { id: 'transit', type: 'expected', label: 'Transit', amount: 200 },
                    { id: 'other', type: 'expected', label: 'Other', amount: 50 },
                    { id: 'rent', type: 'fixed', label: 'Rent', amount: 900 },
                    { id: 'pay-first', type: 'income', label: 'First job', amount: 1000 },
                    { id: 'pay-second', type: 'income', label: 'Second job', amount: 1500 }
                ]));
                const now = new Date();
                const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const rows = [
                    { id: 'imported', reason: 'Transit', linkedPlanItemId: '' },
                    { id: 'linked', reason: 'Transit', linkedPlanItemId: 'transit' },
                    { id: 'old-id', reason: 'TRANSIT', linkedPlanItemId: 'previous-transit', linkedPlanItemLabel: 'TRANSIT' },
                    { id: 'deleted', reason: 'Old category', linkedPlanItemId: 'deleted-budget', linkedPlanItemLabel: 'Old category' },
                    { id: 'income', type: 'income', sourceType: 'income', reason: 'Second job', linkedPlanItemId: '' }
                ].map(row => ({ date, amount: 20, type: 'expense', sourceType: 'expected', detail: '', isShared: false, ...row }));
                localStorage.setItem('ledgerActivity', JSON.stringify(rows));
            });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('dialog', dialog => dialog.accept());
            await page.goto(base + '/ledger.html');
            const preview = page.locator('#activityImportText');
            const importButton = page.locator('#importActivityBtn');
            const status = page.locator('#activityImportStatus');
            for (const line of ['- 10 EE Missing', '- 10 EE TransitExtra', '- 10 EE Rent', '+ 10 EI Missing']) {
                await preview.fill('1/1/2026\n' + line);
                assert.equal(await importButton.isDisabled(), true, 'unknown name or wrong budget group blocks import');
                assert.match(await status.textContent(), /Line 2:.*does not match/);
                assert.ok((await status.textContent()).endsWith(` --> "${line}"`), 'error shows the full original TXT line');
            }
            const unsafeLine = '  - 12.34 EE Unknown <img src=x onerror=alert(1)>  ';
            await preview.fill('1/1/2026\n\n' + unsafeLine);
            assert.match(await status.textContent(), /^Line 3:/);
            assert.ok((await status.textContent()).endsWith(` --> "${unsafeLine}"`), 'original spacing is preserved');
            assert.equal(await status.locator('img').count(), 0, 'TXT line is rendered as text');
            await preview.fill('Quick format\n- 8.12 EE groceries');
            assert.equal(await status.textContent(), 'Line 1: invalid entry format --> "Quick format"', 'format errors show the requested inline message');
            const beforeInvalid = await page.evaluate(() => localStorage.getItem('ledgerActivity'));
            await preview.fill('1/1/2026\n- 10 EE Transit\n- 20 EE Unknown');
            assert.match(await status.textContent(), /Line 3:/);
            await page.evaluate(() => importActivityEntriesFromText());
            assert.equal(await page.evaluate(() => localStorage.getItem('ledgerActivity')), beforeInvalid, 'one invalid line prevents all writes');

            const validText = '1/1/2026\n- 10 EE tRaNsIt bus ticket\n+ 100 EI Second   job bonus';
            await page.locator('#activityImportFile').setInputFiles({ name: 'valid.txt', mimeType: 'text/plain', buffer: Buffer.from(validText) });
            await page.waitForFunction(() => document.getElementById('activityImportText').value.includes('Second   job'));
            assert.equal(await importButton.isDisabled(), false);
            assert.equal((await status.textContent()).includes(' --> '), false, 'fixed input clears the old error line');
            const parsed = await page.evaluate(text => parseActivityImportText(text), validText);
            assert.deepEqual(parsed.map(row => [row.reason, row.detail, row.linkedPlanItemId]), [
                ['Transit', 'bus ticket', 'transit'], ['Second job', 'bonus', 'pay-second']
            ]);
            await page.evaluate(() => { planItems = planItems.filter(item => item.id !== 'transit'); renderPlan(); });
            assert.equal(await importButton.isDisabled(), true, 'budget updates revalidate the preview');
            await page.evaluate(() => { planItems = normalizePlanItems(JSON.parse(localStorage.getItem('ledgerPlanItems'))); renderPlan(); });
            assert.equal(await importButton.isDisabled(), false);
            assert.equal(await page.evaluate(() => parseActivityImportText('1/1/2026\n+ 10 UI gift\n- 5 CE coffee').length), 2);
            await page.locator('#clearActivityImportBtn').click();
            const budget = page.locator('#activityLinkedItem');
            async function edit(id) {
                await page.locator(`#activityList [data-id="${id}"]`).getByRole('button', { name: 'Edit activity entry' }).click();
            }
            for (const id of ['imported', 'linked', 'old-id']) {
                await edit(id);
                assert.equal(await budget.inputValue(), 'transit', name + ' restores ' + id);
                await page.locator('#activityAmount').fill('25');
                await page.locator('#addActivityBtn').click();
                const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('ledgerActivity')).find(row => row.id === id), id);
                assert.equal(saved.reason, 'Transit');
                assert.equal(saved.linkedPlanItemId, 'transit');
                assert.equal(saved.amount, 25);
            }
            await edit('linked');
            await budget.selectOption('other');
            await page.evaluate(() => { planItems = planItems.map(item => item.id === 'other' ? { ...item, label: 'Other updated' } : item); updateActivitySourceControls(); });
            assert.equal(await budget.inputValue(), 'other', 'plan refresh preserves draft selection');
            assert.equal(await page.locator('#activityReason').inputValue(), 'Other updated');
            await page.locator('#activitySourceType').selectOption('fixed');
            assert.equal(await budget.inputValue(), 'rent', 'source change selects the new source bucket');
            await edit('deleted');
            assert.match(await budget.locator('option:checked').textContent(), /Old category/);
            assert.notEqual(await budget.inputValue(), 'food', 'deleted category must not become first budget item');
            await page.locator('#activityAmount').fill('30');
            await page.locator('#addActivityBtn').click();
            const deleted = await page.evaluate(() => JSON.parse(localStorage.getItem('ledgerActivity')).find(row => row.id === 'deleted'));
            assert.equal(deleted.reason, 'Old category');
            assert.equal(deleted.linkedPlanItemId, 'deleted-budget');
            assert.equal(deleted.linkedPlanItemLabel, 'Old category');
            await edit('income');
            assert.equal(await budget.inputValue(), 'pay-second', 'income label also restores the correct budget');
            await page.reload();
            await edit('imported');
            assert.equal(await budget.inputValue(), 'transit', 'saved selection survives reload');
            await page.locator('#activityImportText').fill(validText);
            await Promise.all([page.waitForEvent('load'), page.locator('#importActivityBtn').click()]);
            const imported = await page.evaluate(() => JSON.parse(localStorage.getItem('ledgerActivity')).filter(row => row.date === '2026-01-01'));
            assert.deepEqual(imported.map(row => [row.reason, row.linkedPlanItemId]), [['Transit', 'transit'], ['Second job', 'pay-second']]);
            assert.deepEqual(errors, []);
            console.log(name + ': budget editing plus TXT unknown/wrong-group errors, all-or-nothing import, multiword names, live validation and saved links PASS');
        } finally { await browser.close(); }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });

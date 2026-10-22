// Browser-only fixtures. Firebase requests are blocked; no live account data is touched.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.MOBILE_TEST_URL || 'http://localhost:8000';
const pdf = Buffer.from('%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLPsAAAAASUVORK5CYII=', 'base64');
(async () => {
    for (const [name, engine] of [['Chrome', chromium], ['WebKit', webkit]]) {
        if (process.env.TEST_ENGINE && name !== process.env.TEST_ENGINE) continue;
        const browser = await engine.launch(name === 'Chrome' ? { channel: 'chrome', headless: true } : { headless: true });
        try {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: 'block' });
            await context.route('https://www.gstatic.com/**', route => route.fulfill({ body: '' }));
            await context.route('**/auth.js', route => route.fulfill({ body: 'window.__ledgerAuth={};' }));
            const page = await context.newPage();
            const errors = [], dialogs = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
            await page.goto(base + '/index.html?job=iron');
            await page.evaluate(() => {
                const add = Paystubs.Store.prototype.add;
                Paystubs.Store.prototype.add = async function (...args) {
                    try { return await add.apply(this, args); }
                    catch (error) { window.paystubTestError = { name: error.name, message: error.message }; throw error; }
                };
            });
            await page.locator('#payoutHours').fill('40');
            await page.locator('#payoutFiles').setInputFiles({ name: 'paystub original.pdf', mimeType: 'application/pdf', buffer: pdf });
            await page.locator('#savePayoutBtn').click();
            const card = page.locator('[data-payout-id]');
            await page.waitForFunction(() => !paystubBusy && payouts.length === 1 && payouts[0].paystubs.length === 1)
                .catch(async error => { console.error({ name, dialogs, errors, state: await page.evaluate(() => ({ busy: paystubBusy, error: window.paystubTestError })) }); throw error; });
            assert.equal(await card.locator('.paystub-name').textContent(), 'paystub original.pdf');
            assert.equal(await page.locator('#payoutFiles').inputValue(), '');
            await page.reload();
            assert.equal(await card.locator('.paystub-name').textContent(), 'paystub original.pdf');
            assert.equal(await card.locator('.paystub-section').getAttribute('open'), null, 'paystubs start collapsed even with attachments');
            await card.locator('.paystub-section summary').click();
            assert.equal(await card.getByRole('button', { name: 'Open paystub', exact: true }).textContent(), 'Open');
            assert.equal(await card.getByRole('button', { name: 'Download original', exact: true }).textContent(), 'Download');
            await page.evaluate(() => renderAll());
            assert.notEqual(await card.locator('.paystub-section').getAttribute('open'), null, 'refresh preserves an explicitly opened section');

            const downloaded = page.waitForEvent('download');
            await card.getByRole('button', { name: 'Download original', exact: true }).click();
            const file = await downloaded;
            assert.equal(file.suggestedFilename(), 'paystub original.pdf');
            assert.deepEqual(await fs.readFile(await file.path()), pdf);
            await page.waitForFunction(() => !paystubBusy);

            await card.locator('input[type=file]').setInputFiles({ name: 'October <paystub> 사진.png', mimeType: 'image/png', buffer: png });
            await page.waitForFunction(() => !paystubBusy && payouts[0].paystubs.length === 2);
            assert.equal(await card.locator('.paystub-name').nth(1).textContent(), 'October <paystub> 사진.png');
            const popupEvent = context.waitForEvent('page');
            await card.getByRole('button', { name: 'Open paystub', exact: true }).nth(1).click();
            const popup = await popupEvent;
            await popup.waitForURL('blob:**');
            await popup.close();
            await page.waitForFunction(() => !paystubBusy);

            for (const width of [320, 390, 640, 768, 1024, 1200, 1440]) {
                await page.setViewportSize({ width, height: 844 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, name + ' overflow at ' + width);
                const layout = await card.evaluate(card => {
                    const main = card.querySelector('.work-item-main').getBoundingClientRect();
                    const section = card.querySelector('.paystub-section').getBoundingClientRect();
                    const history = card.closest('.payout-history-card');
                    const list = history.querySelector('#payoutList').getBoundingClientRect();
                    const controls = [...card.querySelectorAll('.paystub-controls button')].map(button => button.getBoundingClientRect());
                    return { fullWidth: Math.abs(section.right - main.right) < 1,
                        noExtraBottom: history.getBoundingClientRect().bottom - list.bottom <= parseFloat(getComputedStyle(history).paddingBottom) + 2,
                        buttonsInside: controls.every(box => box.left >= main.left && box.right <= main.right + 1) };
                });
                assert.deepEqual(layout, { fullWidth: true, noExtraBottom: true, buttonsInside: true }, name + ' payout spacing at ' + width);
            }
            await page.setViewportSize({ width: 390, height: 844 });
            await card.scrollIntoViewIfNeeded();
            await page.screenshot({ path: '/tmp/paystub-history-' + name + '.png' });
            await card.locator('[data-action=edit-payout]').click();
            await page.locator('#payoutHours').fill('45');
            await page.locator('#savePayoutBtn').click();
            await page.waitForFunction(() => !paystubBusy && payouts[0].hours === 45);
            assert.equal(await card.count(), 1, 'editing must not duplicate payout');
            assert.equal(await card.locator('.paystub-name').count(), 2, 'editing preserves attachments');

            await card.locator('input[type=file]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>bad</html>') });
            await page.waitForFunction(() => !paystubBusy);
            assert.match(await card.locator('.paystub-status').textContent(), /Choose a PDF/);
            assert.equal(await card.locator('.paystub-name').count(), 2);
            await card.getByRole('button', { name: 'Delete paystub', exact: true }).first().click();
            await page.waitForFunction(() => !paystubBusy && payouts[0].paystubs.length === 1);
            await page.goto(base + '/index.html?job=booster');
            assert.equal(await page.locator('.paystub-name').count(), 0, 'job separation');
            await page.goto(base + '/index.html?job=iron');
            await page.locator('[data-action=delete-payout]').click();
            await page.waitForFunction(() => !paystubBusy && payouts.length === 0);
            assert.equal(await page.evaluate(async () => {
                const db = await new Promise(resolve => { const request = indexedDB.open('weekly-work-paystubs', 1); request.onsuccess = () => resolve(request.result); });
                return new Promise(resolve => { const request = db.transaction('files').objectStore('files').count(); request.onsuccess = () => { db.close(); resolve(request.result); }; });
            }), 0, 'payout deletion cleans original files');
            assert.deepEqual(errors, []);
            assert.equal(dialogs.some(message => message.includes('Could not')), false);
            console.log(name + ': attach PDF/photo, reload, exact download, preview, edit, invalid file, delete, job isolation, responsive widths PASS');
        } finally { await browser.close(); }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });

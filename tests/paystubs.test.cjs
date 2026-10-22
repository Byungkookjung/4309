const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Store, prepare, MAX_BYTES } = require('../paystubs.js');

const pdf = (size = 32) => {
    const bytes = Buffer.alloc(size, 32); bytes.write('%PDF-1.7\n');
    return new File([bytes], 'original paystub.pdf', { type: 'application/pdf' });
};
function fixture() {
    const data = new Map([['payout', { amount: 123, paystubs: [] }]]);
    const ref = path => ({ path, collection: name => ({ doc: id => ref(path + '/' + name + '/' + id) }),
        get: async () => ({ exists: data.has(path), data: () => structuredClone(data.get(path)) }) });
    let fail = false;
    const db = { async runTransaction(callback) {
        const next = new Map(data);
        await callback({ get: r => r.get(), set: (r, v) => next.set(r.path, structuredClone(v)),
            update: (r, v) => next.set(r.path, { ...next.get(r.path), ...structuredClone(v) }), delete: r => next.delete(r.path) });
        if (fail) throw Error('Connection failed');
        data.clear(); for (const [key, value] of next) data.set(key, value);
    } };
    const store = new Store({ db, ref: ref('payout') });
    return { store, data, setFail: value => { fail = value; } };
}
test('Original multi-chunk PDF round trips without compression or changed bytes', async () => {
    const { store, data } = fixture();
    const original = pdf(1400000);
    const metadata = await store.add(original);
    assert.equal(metadata.chunks, 4);
    assert.equal(data.size, 5);
    assert.equal(data.get('payout').amount, 123);
    const result = await store.get(metadata);
    assert.deepEqual(Buffer.from(await result.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
    assert.equal(result.type, 'application/pdf');
    assert.equal(metadata.name, original.name);
});
test('Invalid types, empty files and oversize originals are rejected before writes', async () => {
    const { store, data } = fixture();
    await assert.rejects(store.add(new File(['<html>unsafe</html>'], 'fake.pdf', { type: 'application/pdf' })), /Choose a PDF/);
    await assert.rejects(store.add(new File([], 'empty.pdf')), /4 MB/);
    await assert.rejects(store.add(pdf(MAX_BYTES + 1)), /4 MB/);
    assert.equal(data.size, 1);
});
test('Failed uploads leave no metadata or chunks; failed deletes preserve both', async () => {
    const f = fixture();
    f.setFail(true);
    await assert.rejects(f.store.add(pdf()));
    assert.equal(f.data.size, 1);
    assert.equal(f.data.get('payout').paystubs.length, 0);
    f.setFail(false);
    const file = await f.store.add(pdf());
    f.setFail(true);
    await assert.rejects(f.store.remove(file));
    assert.equal(f.data.size, 2);
    assert.equal(f.data.get('payout').paystubs.length, 1);
});
test('Integrity checks reject missing and changed bytes', async () => {
    const { store, data } = fixture();
    const file = await store.add(pdf());
    const path = store.chunk(file, 0).path;
    data.set(path, { data: Buffer.from('%PDF-corrupted').toString('base64') });
    await assert.rejects(store.get(file), /verification failed/);
    data.delete(path);
    await assert.rejects(store.get(file), /incomplete/);
});
test('File limit is enforced against latest payout; deletion cleans all chunks', async () => {
    const { store, data } = fixture();
    for (let i = 0; i < 5; i++) await store.add(pdf());
    assert.equal(data.get('payout').paystubs.length, 5);
    await assert.rejects(store.add(pdf()), /up to 5/);
    await assert.rejects(store.deleteEmptyPayout(), /Another paystub/);
    for (const file of [...data.get('payout').paystubs]) await store.remove(file);
    await store.deleteEmptyPayout();
    assert.equal(data.size, 0);
    await assert.rejects(store.add(pdf()), /Save the payout/);
});
test('Account change during preparation prevents saving any bytes', async () => {
    const { store, data } = fixture();
    store.assertActive = () => { throw Error('Account changed'); };
    await assert.rejects(store.add(pdf()), /Account changed/);
    assert.equal(data.size, 1);
});
test('Photo metadata is inferred from bytes, including an iPhone HEIC original', async () => {
    const heic = new File([Buffer.from([0,0,0,24]), 'ftypheic', Buffer.alloc(20)], 'iphone.HEIC');
    assert.equal((await prepare(heic)).metadata.type, 'image/heic');
    const png = new File([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.alloc(20)], 'photo.png');
    assert.equal((await prepare(png)).metadata.type, 'image/png');
});

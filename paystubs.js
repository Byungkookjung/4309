(function (root) {
    const MAX_BYTES = 4 * 1024 * 1024;
    const MAX_FILES = 5;
    const CHUNK_SIZE = 600000;
    const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

    function fileType(bytes) {
        const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
        if (ascii(0, 5) === '%PDF-') return 'application/pdf';
        if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
        if ([137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return 'image/png';
        if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return 'image/gif';
        if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
        if (ascii(4, 4) === 'ftyp' && ['heic','heix','hevc','hevx','mif1','msf1'].includes(ascii(8, 4))) return 'image/heic';
        throw Error('Choose a PDF or a JPG, PNG, WebP, GIF or HEIC photo.');
    }
    async function digest(bytes) {
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, '0')).join('');
    }
    async function prepare(file) {
        if (!file.size || file.size > MAX_BYTES) throw Error('Each paystub must be between 1 byte and 4 MB.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const type = fileType(bytes);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        const encoded = btoa(binary);
        const chunks = [];
        for (let i = 0; i < encoded.length; i += CHUNK_SIZE) chunks.push(encoded.slice(i, i + CHUNK_SIZE));
        const metadata = { id: crypto.randomUUID(), name: file.name.slice(0, 200), type, size: file.size,
            sha256: await digest(bytes), uploadedAt: new Date().toISOString(), chunks: chunks.length };
        return { metadata, chunks, blob: new Blob([bytes], { type }) };
    }
    function validateMetadata(file) {
        if (!file || !/^[a-z0-9-]{36}$/i.test(file.id) || !Number.isInteger(file.chunks) || file.chunks < 1 || file.chunks > 10
            || !Number.isInteger(file.size) || file.size < 1 || file.size > MAX_BYTES || !/^[a-f0-9]{64}$/.test(file.sha256)) {
            throw Error('This paystub record is invalid.');
        }
    }
    function localDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('weekly-work-paystubs', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('files');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(Error('File storage is unavailable in this browser.'));
        });
    }
    async function localFile(key, operation, value) {
        const db = await localDatabase();
        try {
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction('files', operation === 'get' ? 'readonly' : 'readwrite');
                const store = transaction.objectStore('files');
                const request = operation === 'put' ? store.put(value, key) : store[operation](key);
                transaction.oncomplete = () => resolve(request.result);
                transaction.onabort = transaction.onerror = () => reject(Error('Could not store the file. Check available browser storage.'));
            });
        } finally { db.close(); }
    }
    class Store {
        constructor({ db, ref, localKey, readLocal, writeLocal, assertActive = () => {} }) {
            Object.assign(this, { db, ref, localKey, readLocal, writeLocal, assertActive });
        }
        key(file) { return this.localKey + ':' + file.id; }
        chunk(file, i) { return this.ref.collection('paystubFiles').doc(file.id).collection('chunks').doc(String(i)); }
        async add(file) {
            const prepared = await prepare(file);
            this.assertActive();
            const { metadata, chunks, blob } = prepared;
            if (this.ref) {
                // Commit the file and its reference together: failed uploads leave no partial paystub.
                await this.db.runTransaction(async transaction => {
                    const payout = await transaction.get(this.ref);
                    if (!payout.exists) throw Error('Save the payout before adding a paystub.');
                    const files = payout.data().paystubs || [];
                    if (files.length >= MAX_FILES) throw Error('You can attach up to 5 paystubs per payout.');
                    chunks.forEach((data, i) => transaction.set(this.chunk(metadata, i), { data }));
                    transaction.update(this.ref, { paystubs: [...files, metadata] });
                });
            } else {
                const payout = this.readLocal();
                if (!payout) throw Error('Save the payout before adding a paystub.');
                if ((payout.paystubs || []).length >= MAX_FILES) throw Error('You can attach up to 5 paystubs per payout.');
                // ArrayBuffer also works in Safari contexts that cannot persist Blob values.
                await localFile(this.key(metadata), 'put', await blob.arrayBuffer());
                try {
                    this.assertActive();
                    const latest = this.readLocal();
                    if (!latest) throw Error('This payout was deleted.');
                    this.writeLocal({ ...latest, paystubs: [...(latest.paystubs || []), metadata] });
                } catch (error) {
                    await localFile(this.key(metadata), 'delete');
                    throw error;
                }
            }
            return metadata;
        }
        async get(file) {
            validateMetadata(file);
            let blob;
            if (this.ref) {
                const documents = await Promise.all(Array.from({ length: file.chunks }, (_, i) => this.chunk(file, i).get()));
                if (documents.some(doc => !doc.exists || typeof doc.data().data !== 'string')) throw Error('This paystub is incomplete. Please upload it again.');
                const binary = atob(documents.map(doc => doc.data().data).join(''));
                blob = new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))]);
            } else {
                const stored = await localFile(this.key(file), 'get');
                if (stored) blob = stored instanceof Blob ? stored : new Blob([stored]);
            }
            if (!blob) throw Error('This paystub is unavailable on this browser.');
            const bytes = new Uint8Array(await blob.arrayBuffer());
            if (bytes.length !== file.size || await digest(bytes) !== file.sha256) throw Error('File verification failed. Please upload the original again.');
            const type = fileType(bytes);
            this.assertActive();
            return new Blob([bytes], { type });
        }
        async remove(file) {
            validateMetadata(file);
            this.assertActive();
            if (this.ref) {
                await this.db.runTransaction(async transaction => {
                    const payout = await transaction.get(this.ref);
                    if (!payout.exists) throw Error('This payout was deleted.');
                    for (let i = 0; i < file.chunks; i++) transaction.delete(this.chunk(file, i));
                    transaction.update(this.ref, { paystubs: (payout.data().paystubs || []).filter(f => f.id !== file.id) });
                });
            } else {
                const payout = this.readLocal();
                if (payout) this.writeLocal({ ...payout, paystubs: (payout.paystubs || []).filter(f => f.id !== file.id) });
                await localFile(this.key(file), 'delete');
            }
        }
        async deleteEmptyPayout() {
            this.assertActive();
            await this.db.runTransaction(async transaction => {
                const payout = await transaction.get(this.ref);
                if (payout.exists && (payout.data().paystubs || []).length) throw Error('Another paystub was added. Please try deleting again.');
                transaction.delete(this.ref);
            });
        }
    }
    const api = { Store, prepare, fileType, MAX_BYTES, MAX_FILES, ACCEPT };
    if (typeof module !== 'undefined') module.exports = api;
    else root.Paystubs = api;
})(globalThis);

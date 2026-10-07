(function(root) {
    async function encryptWorkConnection(publicKey, state, credentials) {
        const fromBase64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
        const toBase64 = value => btoa(String.fromCharCode(...new Uint8Array(value)));
        const recipient = await crypto.subtle.importKey('raw', fromBase64(publicKey), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipient }, keys.privateKey, 256);
        const hash = await crypto.subtle.digest('SHA-256', secret);
        const aes = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt']);
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, new TextEncoder().encode(JSON.stringify(credentials)));
        const response = new URLSearchParams({ state, key: toBase64(await crypto.subtle.exportKey('raw', keys.publicKey)), nonce: toBase64(nonce), data: toBase64(encrypted) });
        return `worktoday://connect#${response}`;
    }
    if (typeof module !== 'undefined') module.exports = encryptWorkConnection;
    else root.encryptWorkConnection = encryptWorkConnection;
})(globalThis);

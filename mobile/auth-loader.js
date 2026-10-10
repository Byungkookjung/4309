// An offline shell must still open even when Firebase's CDN is unavailable.
window.mobileAuthReady = new Promise(resolve => {
    if (!window.firebase?.auth || !window.firebase?.firestore) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '../auth.js';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.append(script);
});

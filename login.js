(function initLogin() {
    const authApi = window.__ledgerAuth || {};
    const authRef = authApi.auth;
    const googleBtn = document.getElementById('googleSignInBtn');

    if (!authRef || !authApi.signInWithGoogle) {
        alert('Firebase is not initialized. Check auth.js config.');
        return;
    }

    authRef.onAuthStateChanged(user => {
        if (user && authApi.redirectToApp) {
            authApi.redirectToApp();
        }
    });

    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            authApi.signInWithGoogle().catch(error => {
                alert(error && error.message ? error.message : 'Sign-in failed.');
            });
        });
    }
})();

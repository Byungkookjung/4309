// Firebase shared auth helpers.
// Fill in firebaseConfig with your project's settings.

const firebaseConfig = {
    apiKey: "AIzaSyC4i32hyIRXhib_keTTr9zSj3AOolasYLc",
    authDomain: "todo-ledger.firebaseapp.com",
    projectId: "todo-ledger",
    storageBucket: "todo-ledger.firebasestorage.app",
    messagingSenderId: "46805693940",
    appId: "1:46805693940:web:ec4c90a3dd7976c49d35a1",
    measurementId: "G-0LZ5QK69H2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

function redirectToLogin() {
    window.location.href = 'login.html';
}

function redirectToApp() {
    window.location.href = 'index.html';
}

function requireAuth() {
    return new Promise(resolve => {
        auth.onAuthStateChanged(user => {
            if (!user) {
                redirectToLogin();
                return;
            }
            resolve(user);
        });
    });
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider).catch(error => {
        if (error && error.code === 'auth/popup-blocked') {
            return auth.signInWithRedirect(provider);
        }
        throw error;
    });
}

function attachLogoutButton() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        auth.signOut().then(redirectToLogin);
    });
}

window.__ledgerAuth = {
    auth,
    db,
    requireAuth,
    redirectToLogin,
    redirectToApp,
    signInWithGoogle,
    attachLogoutButton
};

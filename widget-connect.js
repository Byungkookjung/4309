(async () => {
    const status = document.getElementById('connectStatus');
    const signIn = document.getElementById('connectSignIn');
    const confirm = document.getElementById('connectConfirm');
    const params = new URLSearchParams(location.hash.slice(1));
    const state = params.get('state'), publicKey = params.get('key');
    const scriptable = params.get('mode') === 'scriptable';
    const scriptName = params.get('script');
    if(scriptable){
        if(!scriptName||scriptName.length>100){status.textContent='Start the connection from Scriptable.';return;}
        document.querySelector('h1').textContent='Connect Pocket Paws';
        document.querySelector('main > p').textContent='Connect today’s shifts and tasks to Scriptable. The script only reads data, but the saved login credential has your account permissions. Only connect a script you trust. Disconnect in Scriptable to remove its saved login.';
    }
    const fromBase64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
    if (!state || !/^[a-zA-Z0-9-]{36}$/.test(state) || !publicKey) {
        status.textContent = 'Start the connection from the Work Today app.'; return;
    }
    let recipient;
    try {
        recipient = await crypto.subtle.importKey('raw', fromBase64(publicKey), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    } catch { status.textContent = 'Invalid connection. Start again from Work Today.'; return; }
    firebase.auth().onAuthStateChanged(user => {
        signIn.disabled = false;
        document.getElementById('connectAccount').textContent = user ? `Account: ${user.email || user.displayName}` : '';
        confirm.hidden = !user;
        signIn.textContent = user ? 'Use another Google account' : 'Sign in with Google';
        status.textContent = user ? 'Confirm to connect this account to your app.' : 'Sign in to connect your schedules.';
    });
    signIn.addEventListener('click', async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await firebase.auth().signInWithPopup(provider);
        } catch { status.textContent = 'Sign-in did not finish. Allow the sign-in window and try again.'; }
    });
    confirm.addEventListener('click', async () => {
        confirm.disabled = true;
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw Error('Sign in again');
            await user.getIdToken(true);
            // Only the client holding the originating private key can decrypt this payload.
            const encrypted = await encryptWorkConnection(publicKey, state, { uid: user.uid, refreshToken: user.refreshToken });
            location.href = scriptable ? 'scriptable:///run?scriptName='+encodeURIComponent(scriptName)+'&'+encrypted.split('#')[1] : encrypted;
            status.textContent = scriptable?'Returning to Scriptable...':'Returning to Work Today...';
        } catch { status.textContent = 'Connection failed. Please retry from Work Today.'; }
        finally { confirm.disabled = false; }
    });
})();

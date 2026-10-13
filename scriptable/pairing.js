// Runs in a local WebView only, never in the widget's network context.
async function pocketPairing(action,input){
    const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    const to64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
    if(action==='create'){
        const key=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
        return {privateKey:await crypto.subtle.exportKey('jwk',key.privateKey),publicKey:to64(await crypto.subtle.exportKey('raw',key.publicKey))};
    }
    const key=await crypto.subtle.importKey('jwk',input.privateKey,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
    const peer=await crypto.subtle.importKey('raw',from64(input.key),{name:'ECDH',namedCurve:'P-256'},false,[]);
    const secret=await crypto.subtle.deriveBits({name:'ECDH',public:peer},key,256);
    const hash=await crypto.subtle.digest('SHA-256',secret);
    const aes=await crypto.subtle.importKey('raw',hash,'AES-GCM',false,['decrypt']);
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(input.nonce)},aes,from64(input.data));
    const result=JSON.parse(new TextDecoder().decode(clear));
    if(typeof result.uid!=='string'||!result.uid||result.uid.length>128||typeof result.refreshToken!=='string'||!result.refreshToken)throw Error('credentials');
    return result;
}
if(typeof module!=='undefined')module.exports=pocketPairing;

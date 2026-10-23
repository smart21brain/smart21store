// node gen-vapid.mjs  -> prints your web push keys (keep the private one secret)
import {generateKeyPairSync} from 'node:crypto';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});
const j=privateKey.export({format:'jwk'});
const pub=Buffer.concat([Buffer.from([4]),Buffer.from(j.x,'base64url'),Buffer.from(j.y,'base64url')]).toString('base64url');
console.log('wrangler secret put VAPID_PUBLIC   # '+pub);
console.log('wrangler secret put VAPID_PRIVATE_JWK   # '+JSON.stringify(j));
console.log('wrangler secret put VAPID_SUBJECT   # mailto:you@yourdomain');

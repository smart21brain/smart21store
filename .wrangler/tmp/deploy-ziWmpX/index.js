var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/lib/auth.js
var PBKDF2_ITERATIONS = 1e5;
var SESSION_DAYS = 30;
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
function fromHex(hex2) {
  const bytes = new Uint8Array(hex2.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex2.substr(i * 2, 2), 16);
  return bytes;
}
__name(fromHex, "fromHex");
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  if (typeof hashHex !== "string" || hash.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
__name(verifyPassword, "verifyPassword");
function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
__name(randomToken, "randomToken");
async function createSession(db, userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  return { token, expires };
}
__name(createSession, "createSession");
function sessionCookie(token, expires, domain) {
  const expiresStr = new Date(expires).toUTCString();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresStr}` + (domain ? `; Domain=${domain}` : "");
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie(domain) {
  return "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" + (domain ? `; Domain=${domain}` : "");
}
__name(clearSessionCookie, "clearSessionCookie");
function getCookies(request, name) {
  const out = [];
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) out.push(part.slice(i + 1).trim());
  }
  return out;
}
__name(getCookies, "getCookies");

// src/store-api.js
var sha32 = /* @__PURE__ */ __name(() => hex(crypto.getRandomValues(new Uint8Array(32))), "sha32");
var J = /* @__PURE__ */ __name((d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } }), "J");
var hex = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hex");
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
__name(hmac, "hmac");
async function getUser(request, env) {
  let u = null;
  for (const tk of getCookies(request, "s21_session")) {
    const ss = await env.DB.prepare("SELECT user_id FROM sessions WHERE token=? AND datetime(expires_at)>datetime('now')").bind(tk).first();
    if (!ss) continue;
    u = await env.DB.prepare("SELECT id,name,email,role FROM users WHERE id=?").bind(ss.user_id).first();
    if (u) break;
  }
  if (!u) return null;
  let role = u.role === "admin" ? "admin" : "user";
  if (role === "user" && u.role === "teacher") {
    const s = await env.DB.prepare("SELECT approved FROM store_sellers WHERE user_id=?").bind(u.id).first();
    if (s && s.approved) role = "seller";
  }
  return { id: u.id, name: u.name, email: u.email, role, base: u.role };
}
__name(getUser, "getUser");
var need = /* @__PURE__ */ __name(async (c, role) => {
  const o = c.request.headers.get("origin");
  if (c.request.method !== "GET" && o && new URL(o).host !== new URL(c.request.url).host) return [null, J({ error: "bad origin" }, 403)];
  const u = await getUser(c.request, c.env);
  if (!u) return [null, J({ error: "login required" }, 401)];
  if (role && u.role !== role && u.role !== "admin") return [null, J({ error: "forbidden" }, 403)];
  if (role === "admin" && c.request.method !== "GET") await audit(c.env, u, c.request.method, new URL(c.request.url).pathname);
  return [u, null];
}, "need");
async function r_earn(c, u) {
  const sh = (await c.env.DB.prepare("SELECT share_percent FROM store_sellers WHERE user_id=?").bind(u.id).first())?.share_percent ?? 70;
  const g = (await c.env.DB.prepare("SELECT COALESCE(SUM(oi.price_tzs),0) t FROM store_order_items oi JOIN store_orders o ON o.id=oi.order_id AND o.status='paid' JOIN store_items i ON i.id=oi.item_id WHERE i.seller_id=?").bind(u.id).first()).t, p = (await c.env.DB.prepare("SELECT COALESCE(SUM(amount_tzs),0) t FROM store_payouts WHERE seller_id=? AND status IN ('requested','paid')").bind(u.id).first()).t;
  return J({ available: Math.max(0, Math.floor(g * sh / 100) - p) });
}
__name(r_earn, "r_earn");
var sha = /* @__PURE__ */ __name(async (t) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))), "sha");
var rnd = /* @__PURE__ */ __name((n) => hex(crypto.getRandomValues(new Uint8Array(n))), "rnd");
var LIB = "INSERT OR REPLACE INTO store_library(user_id,item_id,version) VALUES(?,?,COALESCE((SELECT MAX(version) FROM store_versions WHERE item_id=?),1))";
async function devAuth(c) {
  const t = c.request.headers.get("x-device-token");
  if (!t) return null;
  return c.env.DB.prepare("SELECT * FROM store_devices WHERE token_hash=?").bind(await sha(t)).first();
}
__name(devAuth, "devAuth");
var esc = /* @__PURE__ */ __name((t) => String(t || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
async function notify(env, uid, kind, title, body, link) {
  await env.DB.prepare("INSERT INTO store_notifications(user_id,kind,title,body,link) VALUES(?,?,?,?,?)").bind(uid, kind, title, body, link || null).run();
  await pushTo(env, uid);
  if (env.MAIL_API_URL) {
    const u = await env.DB.prepare("SELECT email FROM users WHERE id=?").bind(uid).first();
    if (u) await fetch(env.MAIL_API_URL, { method: "POST", headers: { authorization: "Bearer " + env.MAIL_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ to: u.email, subject: title, text: body }) }).catch(() => {
    });
  }
}
__name(notify, "notify");
var plus = /* @__PURE__ */ __name(async (env, uid) => !!await env.DB.prepare("SELECT 1 x FROM store_subscriptions s WHERE s.expires_at>datetime('now') AND (s.user_id=?1 OR EXISTS(SELECT 1 FROM store_sub_seats m WHERE m.sub_id=s.id AND m.user_id=?1)) LIMIT 1").bind(uid).first(), "plus");
async function colDisc(c, b, total) {
  if (!b.collection) return 0;
  const col = await c.env.DB.prepare("SELECT * FROM store_collections WHERE id=?").bind(b.collection).first();
  if (!col) return 0;
  const A = JSON.parse(col.item_ids).map(Number).sort().join(), B = [...b.items].map(Number).sort().join();
  return A === B ? Math.round(total * col.percent / 100) : 0;
}
__name(colDisc, "colDisc");
var audit = /* @__PURE__ */ __name((env, u, act, d) => env.DB.prepare("INSERT INTO store_audit(user_id,action,detail) VALUES(?,?,?)").bind(u.id, act, String(d || "").slice(0, 200)).run().catch(() => {
}), "audit");
var b64u = /* @__PURE__ */ __name((b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64u");
async function vapid(env, ep) {
  const e = new TextEncoder(), h = b64u(e.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))), p = b64u(e.encode(JSON.stringify({ aud: new URL(ep).origin, exp: Math.floor(Date.now() / 1e3) + 43200, sub: env.VAPID_SUBJECT }))), k = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]), s = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, e.encode(h + "." + p));
  return `vapid t=${h}.${p}.${b64u(s)}, k=${env.VAPID_PUBLIC}`;
}
__name(vapid, "vapid");
async function pushUsers(env, sql, id) {
  try {
    for (const r of (await env.DB.prepare(sql).bind(id).all()).results) await pushTo(env, r.user_id);
  } catch (_) {
  }
}
__name(pushUsers, "pushUsers");
async function pushTo(env, uid) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC) return;
  try {
    for (const s of (await env.DB.prepare("SELECT endpoint FROM store_push_subs WHERE user_id=?").bind(uid).all()).results) {
      const r = await fetch(s.endpoint, { method: "POST", headers: { authorization: await vapid(env, s.endpoint), ttl: "86400" } }).catch(() => null);
      if (r && (r.status === 404 || r.status === 410)) await env.DB.prepare("DELETE FROM store_push_subs WHERE endpoint=?").bind(s.endpoint).run();
    }
  } catch (_) {
  }
}
__name(pushTo, "pushTo");
var Jc = /* @__PURE__ */ __name((d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } }), "Jc");
async function keyAuth(c) {
  const m = (c.request.headers.get("authorization") || "").match(/^Bearer (s21_[a-f0-9]+)$/);
  if (!m) return [null, J({ error: "missing API key" }, 401)];
  const k = await c.env.DB.prepare("SELECT id FROM store_api_keys WHERE key_hash=? AND revoked=0").bind(await sha(m[1])).first();
  if (!k) return [null, J({ error: "invalid key" }, 401)];
  const n = (await c.env.DB.prepare("INSERT INTO store_rate(key_id,minute,n) VALUES(?,?,1) ON CONFLICT(key_id,minute) DO UPDATE SET n=n+1 RETURNING n").bind(k.id, Math.floor(Date.now() / 6e4)).first()).n;
  if (n > 60) return [null, J({ error: "rate limit: 60 requests per minute" }, 429)];
  await c.env.DB.prepare("UPDATE store_api_keys SET calls=calls+1 WHERE id=?").bind(k.id).run();
  return [k, null];
}
__name(keyAuth, "keyAuth");
var PUB = "SELECT id,kind,name,description,subject,grade,file_type,price_tzs,rating_avg,rating_count,license,(SELECT MAX(version) FROM store_versions WHERE item_id=store_items.id) AS latest_version FROM store_items WHERE status='published' AND kind!='Plan'";
var _jwks = null;
var _jwksAt = 0;
var gb64 = /* @__PURE__ */ __name((t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(t.length / 4) * 4, "=")), (c) => c.charCodeAt(0)), "gb64");
async function verifyGoogle(idToken, clientId) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("bad token");
  const hd = JSON.parse(new TextDecoder().decode(gb64(parts[0]))), pl = JSON.parse(new TextDecoder().decode(gb64(parts[1])));
  if (hd.alg !== "RS256") throw new Error("bad alg");
  if (!_jwks || Date.now() - _jwksAt > 36e5 || !_jwks.keys.some((k) => k.kid === hd.kid)) {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!r.ok) throw new Error("keys unavailable");
    _jwks = await r.json();
    _jwksAt = Date.now();
  }
  const jwk = _jwks.keys.find((k) => k.kid === hd.kid);
  if (!jwk) throw new Error("unknown key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, gb64(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) throw new Error("bad signature");
  if (pl.aud !== clientId) throw new Error("wrong audience");
  if (pl.iss !== "https://accounts.google.com" && pl.iss !== "accounts.google.com") throw new Error("wrong issuer");
  if (!pl.exp || pl.exp * 1e3 < Date.now()) throw new Error("expired");
  if (!(pl.email_verified === true || pl.email_verified === "true")) throw new Error("email not verified");
  return pl;
}
__name(verifyGoogle, "verifyGoogle");
function registerStore(r) {
  const sameOrigin = /* @__PURE__ */ __name((req) => {
    const o = req.headers.get("origin");
    return !o || new URL(o).host === new URL(req.url).host;
  }, "sameOrigin");
  const akey = /* @__PURE__ */ __name((req, email) => (req.headers.get("cf-connecting-ip") || "?") + "|" + email, "akey");
  const tooMany = /* @__PURE__ */ __name(async (env, k, lim) => {
    try {
      const x = await env.DB.prepare("SELECT COUNT(*) n FROM store_auth_attempts WHERE k=? AND created_at>datetime('now','-15 minutes')").bind(k).first();
      return x.n >= (lim || 8);
    } catch (e) {
      return false;
    }
  }, "tooMany");
  const failed = /* @__PURE__ */ __name(async (env, k) => {
    try {
      await env.DB.prepare("INSERT INTO store_auth_attempts(k) VALUES(?)").bind(k).run();
      await env.DB.prepare("DELETE FROM store_auth_attempts WHERE created_at<datetime('now','-1 day')").run();
    } catch (e) {
    }
  }, "failed");
  const clearFails = /* @__PURE__ */ __name(async (env, k) => {
    try {
      await env.DB.prepare("DELETE FROM store_auth_attempts WHERE k=?").bind(k).run();
    } catch (e) {
    }
  }, "clearFails");
  const okSession = /* @__PURE__ */ __name(async (env, row) => {
    const ss = await createSession(env.DB, row.id);
    return new Response(JSON.stringify({ ok: 1, name: row.name, role: row.role }), { status: 200, headers: { "content-type": "application/json", "set-cookie": sessionCookie(ss.token, ss.expires, env.COOKIE_DOMAIN) } });
  }, "okSession");
  r.post("/api/store/login", async ({ request, env }) => {
    if (!sameOrigin(request)) return J({ error: "bad origin" }, 403);
    let b;
    try {
      b = await request.json();
    } catch (e) {
      return J({ error: "bad request" }, 400);
    }
    const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "");
    if (!email || !pw) return J({ error: "Enter your email and password" }, 400);
    const k = akey(request, email);
    if (await tooMany(env, k)) return J({ error: "Too many attempts. Wait 15 minutes and try again." }, 429);
    const row = await env.DB.prepare("SELECT * FROM users WHERE lower(email)=?").bind(email).first();
    const h = row && (row.password_hash || row.pass_hash || row.hash), sl = row && (row.password_salt || row.pass_salt || row.salt);
    if (row && !(h && sl)) return J({ error: "users table has no password_hash / password_salt columns" }, 500);
    if (!row) {
      await hashPassword(pw);
      await failed(env, k);
      return J({ error: "Wrong email or password" }, 401);
    }
    if (!await verifyPassword(pw, h, sl)) {
      await failed(env, k);
      return J({ error: "Wrong email or password" }, 401);
    }
    await clearFails(env, k);
    return okSession(env, row);
  });
  r.post("/api/store/register", async ({ request, env }) => {
    if (!sameOrigin(request)) return J({ error: "bad origin" }, 403);
    let b;
    try {
      b = await request.json();
    } catch (e) {
      return J({ error: "bad request" }, 400);
    }
    const name = String(b.name || "").trim().replace(/\s+/g, " "), email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "");
    if (name.length < 2 || name.length > 80) return J({ error: "Enter your full name (2-80 characters)" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return J({ error: "Enter a valid email address" }, 400);
    if (pw.length < 8) return J({ error: "Password must be at least 8 characters" }, 400);
    if (pw.length > 200) return J({ error: "Password is too long" }, 400);
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return J({ error: "Password needs at least one letter and one number" }, 400);
    const k = akey(request, "register");
    if (await tooMany(env, k, 40)) return J({ error: "Too many attempts. Try again later." }, 429);
    const ex = await env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(email).first();
    if (ex) {
      await failed(env, k);
      return J({ error: "An account with this email already exists. Sign in instead." }, 409);
    }
    const { hash, salt } = await hashPassword(pw);
    let row;
    try {
      row = await env.DB.prepare("INSERT INTO users(name,email,password_hash,password_salt,role) VALUES(?,?,?,?,'user') RETURNING id,name,role").bind(name, email, hash, salt).first();
    } catch (e) {
      if (/unique/i.test(String(e && e.message))) return J({ error: "An account with this email already exists. Sign in instead." }, 409);
      throw e;
    }
    return okSession(env, row);
  });
  r.get("/api/store/config", async ({ env }) => J({ google_client_id: env.GOOGLE_CLIENT_ID || null }));
  r.post("/api/store/google", async ({ request, env }) => {
    if (!sameOrigin(request)) return J({ error: "bad origin" }, 403);
    if (!env.GOOGLE_CLIENT_ID) return J({ error: "Google sign-in is not set up yet" }, 501);
    let b;
    try {
      b = await request.json();
    } catch (e) {
      return J({ error: "bad request" }, 400);
    }
    let pl;
    try {
      pl = await verifyGoogle(b.credential, env.GOOGLE_CLIENT_ID);
    } catch (e) {
      return J({ error: "Google sign-in failed. Try again." }, 401);
    }
    const email = String(pl.email || "").trim().toLowerCase();
    if (!email) return J({ error: "Google did not return an email" }, 400);
    let row = await env.DB.prepare("SELECT * FROM users WHERE lower(email)=?").bind(email).first();
    if (!row) {
      const name = String(pl.name || email.split("@")[0]).trim().slice(0, 80) || "Member";
      const { hash, salt } = await hashPassword(sha32());
      try {
        row = await env.DB.prepare("INSERT INTO users(name,email,password_hash,password_salt,role) VALUES(?,?,?,?,'user') RETURNING id,name,role").bind(name, email, hash, salt).first();
      } catch (e) {
        row = await env.DB.prepare("SELECT * FROM users WHERE lower(email)=?").bind(email).first();
        if (!row) throw e;
      }
    }
    return okSession(env, row);
  });
  r.post("/api/store/logout", async ({ request, env }) => {
    if (!sameOrigin(request)) return J({ error: "bad origin" }, 403);
    for (const t of getCookies(request, "s21_session")) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(t).run();
    const h = new Headers({ "content-type": "application/json" });
    h.append("set-cookie", clearSessionCookie());
    if (env.COOKIE_DOMAIN) h.append("set-cookie", clearSessionCookie(env.COOKIE_DOMAIN));
    return new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: h });
  });
  r.get("/api/store/items", async ({ env, url }) => {
    const k = url.searchParams.get("kind");
    const sel = "SELECT *,(SELECT MAX(version) FROM store_versions WHERE item_id=store_items.id) AS latest,(SELECT notes FROM store_versions WHERE item_id=store_items.id ORDER BY version DESC LIMIT 1) AS notes,(SELECT created_at FROM store_versions WHERE item_id=store_items.id ORDER BY version DESC LIMIT 1) AS updated,(SELECT COUNT(*) FROM store_previews WHERE item_id=store_items.id) AS pv,(SELECT verified FROM store_sellers WHERE user_id=store_items.seller_id) AS sv,(SELECT name FROM users WHERE id=store_items.seller_id) AS seller,(store_items.seller_id IS NULL) AS off,(SELECT type FROM store_samples WHERE item_id=store_items.id) AS smp,(SELECT group_concat(platform) FROM store_platform_files WHERE item_id=store_items.id) AS plats FROM store_items WHERE status='published' AND ";
    const q = k ? env.DB.prepare(sel + "kind=? ORDER BY downloads DESC").bind(k) : env.DB.prepare(sel + "kind!='Plan' ORDER BY downloads DESC");
    return J((await q.all()).results);
  });
  r.get("/api/store/items/:id", async ({ env, params, request }) => {
    const me = await getUser(request, env);
    const i = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND status='published'").bind(params.id).first();
    if (!i) return J({ error: "not found" }, 404);
    const v = await env.DB.prepare("SELECT version,notes,created_at FROM store_versions WHERE item_id=? ORDER BY version DESC").bind(params.id).all();
    const rv = await env.DB.prepare("SELECT id,stars,body,verified,created_at,(SELECT name FROM users WHERE id=store_reviews.user_id) AS u,reply,reply_at,(SELECT COUNT(*) FROM store_review_votes WHERE review_id=store_reviews.id) AS helpful,(SELECT 1 FROM store_review_votes WHERE review_id=store_reviews.id AND user_id=?2) AS mine FROM store_reviews WHERE item_id=?1 AND reports<5 ORDER BY id DESC LIMIT 50").bind(params.id, me ? me.id : 0).all();
    return J({ ...i, versions: v.results, reviews: rv.results });
  });
  r.get("/api/store/library", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT l.item_id,l.version AS owned,(SELECT MAX(version) FROM store_versions WHERE item_id=l.item_id) AS latest FROM store_library l WHERE user_id=?").bind(u.id).all()).results);
  });
  r.post("/api/store/wishlist/:id", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_wishlist VALUES(?,?)").bind(u.id, c.params.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/download/:id", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const own = await c.env.DB.prepare("SELECT version FROM store_library WHERE user_id=? AND item_id=?").bind(u.id, c.params.id).first();
    if (!own && !await plus(c.env, u.id)) return J({ error: "not owned" }, 403);
    const v = await c.env.DB.prepare("SELECT version FROM store_versions WHERE item_id=? ORDER BY version DESC LIMIT 1").bind(c.params.id).first();
    const bd = await c.request.clone().json().catch(() => ({})), pf = ["android", "windows", "mac", "ios", "linux"].includes(bd && bd.platform) ? bd.platform : "", has = pf ? await c.env.DB.prepare("SELECT 1 x FROM store_platform_files WHERE item_id=? AND platform=?").bind(c.params.id, pf).first().catch(() => null) : null, pq = has ? pf : "", exp = Date.now() + 6e5, ver = v?.version || 1, sig = await hmac(c.env.STORE_SECRET, `${u.id}.${c.params.id}.${ver}.${exp}` + (pq ? "." + pq : ""));
    await c.env.DB.prepare("UPDATE store_library SET version=? WHERE user_id=? AND item_id=?").bind(ver, u.id, c.params.id).run();
    return J({ url: `/api/store/file?u=${u.id}&i=${c.params.id}&v=${ver}&e=${exp}&s=${sig}` + (pq ? "&p=" + pq : "") });
  });
  r.get("/api/store/file", async ({ request, env, url }) => {
    const p = Object.fromEntries(url.searchParams), ok = Date.now() < +p.e && p.s === await hmac(env.STORE_SECRET, `${p.u}.${p.i}.${p.v}.${p.e}` + (p.p ? "." + p.p : ""));
    if (!ok) return J({ error: "link expired" }, 403);
    const row = p.p ? await env.DB.prepare("SELECT r2_key FROM store_platform_files WHERE item_id=? AND platform=?").bind(p.i, p.p).first() : await env.DB.prepare("SELECT r2_key FROM store_versions WHERE item_id=? AND version=?").bind(p.i, p.v).first();
    if (!row) return J({ error: "missing" }, 404);
    const o = await env.MATERIALS.get(row.r2_key, { range: request.headers });
    if (!o) return J({ error: "missing" }, 404);
    const h = new Headers({ "accept-ranges": "bytes", "content-type": "application/octet-stream", "cache-control": "private, no-store" });
    o.writeHttpMetadata?.(h);
    h.set("content-type", "application/octet-stream");
    h.set("content-disposition", 'attachment; filename="' + String(row.r2_key).split("/").pop().replace(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-/, "").replace(/[^\x20-\x7e]|"/g, "_") + '"');
    let s = 200;
    if (o.range) {
      const { offset = 0, length = o.size - offset } = o.range;
      h.set("content-range", `bytes ${offset}-${offset + length - 1}/${o.size}`);
      s = 206;
    }
    await env.DB.prepare("UPDATE store_items SET downloads=downloads+1 WHERE id=?").bind(p.i).run();
    return new Response(o.body, { status: s, headers: h });
  });
  r.post("/api/store/reviews", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json(), own = await c.env.DB.prepare("SELECT 1 x FROM store_library WHERE user_id=? AND item_id=?").bind(u.id, b.item).first();
    if (!own) return J({ error: "own the item to review" }, 403);
    await c.env.DB.prepare("INSERT INTO store_reviews(item_id,user_id,stars,body,verified) VALUES(?,?,?,?,1)").bind(b.item, u.id, Math.min(5, Math.max(1, b.stars | 0)), String(b.body).slice(0, 1e3)).run();
    await c.env.DB.prepare("UPDATE store_items SET rating_count=(SELECT COUNT(*) FROM store_reviews WHERE item_id=?1),rating_avg=(SELECT AVG(stars) FROM store_reviews WHERE item_id=?1) WHERE id=?1").bind(b.item).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/reviews/report", async (c) => {
    const b = await c.request.json();
    await c.env.DB.prepare("UPDATE store_reviews SET reports=reports+1 WHERE id=?").bind(b.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/orders", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json();
    if (b.list) {
      const GL = await c.env.DB.prepare("SELECT u.email e FROM store_lists l JOIN users u ON u.id=l.user_id WHERE l.code=?").bind(String(b.list)).first();
      if (GL) b.gift = GL.e;
    }
    if (b.gift && !await c.env.DB.prepare("SELECT 1 x FROM users WHERE lower(email)=?").bind(String(b.gift).toLowerCase()).first()) return J({ error: "recipient needs a Smart21 account" }, 404);
    let total = 0;
    const rows = [], seats = Math.max(1, Math.min(500, b.seats | 0 || 1));
    for (const id of b.items) {
      const i = await c.env.DB.prepare("SELECT id,price_tzs,stock FROM store_items WHERE id=? AND status='published'").bind(id).first();
      if (i) {
        if (i.stock != null && i.stock < seats) return J({ error: "out of stock" }, 409);
        rows.push(i);
        total += i.price_tzs * seats;
      }
    }
    if (!rows.length) return J({ error: "empty" }, 400);
    let disc = await colDisc(c, b, total);
    if (b.coupon) {
      const cp = await c.env.DB.prepare("SELECT * FROM store_coupons WHERE code=? AND used<max_uses AND (expires_at IS NULL OR expires_at>datetime('now'))").bind(String(b.coupon).toUpperCase()).first();
      if (cp) {
        disc = Math.min(total, disc + Math.round(total * cp.percent / 100));
        await c.env.DB.prepare("UPDATE store_coupons SET used=used+1 WHERE code=?").bind(cp.code).run();
      }
    }
    const pay = total - disc, rno = "S21-" + Date.now().toString(36).toUpperCase();
    const o = await c.env.DB.prepare("INSERT INTO store_orders(receipt_no,user_id,total_tzs,discount_tzs,coupon,method,phone,delivery,pickup,gift_email,gift_msg) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(rno, u.id, pay, disc, b.coupon || null, b.method, b.phone || null, b.delivery || null, String(b.address || "").slice(0, 200) || null, b.gift || null, String(b.gift_msg || "").slice(0, 200) || null).run();
    for (const i of rows) await c.env.DB.prepare("INSERT INTO store_order_items(order_id,item_id,price_tzs,seats) VALUES(?,?,?,?)").bind(o.meta.last_row_id, i.id, i.price_tzs * seats, seats).run();
    const res = await fetch(c.env.PAY_API_URL, { method: "POST", headers: { authorization: "Bearer " + c.env.PAY_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ reference: rno, amount: pay, currency: "TZS", method: b.method, phone: b.phone }) }).catch(() => null);
    if (!res || !res.ok) return J({ error: "payment provider unavailable" }, 502);
    return J({ receipt_no: rno, total: pay, status: "pending" });
  });
  r.post("/api/store/pay/webhook", async ({ request, env }) => {
    const raw = await request.text();
    if (request.headers.get("x-signature") !== await hmac(env.PAY_WEBHOOK_SECRET, raw)) return J({ error: "bad signature" }, 401);
    const b = JSON.parse(raw);
    if (b.status !== "paid") return J({ ok: 1 });
    const o = await env.DB.prepare("SELECT id,user_id,gift_email,gift_msg FROM store_orders WHERE receipt_no=? AND status!=?").bind(b.reference, "paid").first();
    if (!o) return J({ ok: 1 });
    await env.DB.prepare("UPDATE store_orders SET status='paid',provider_ref=? WHERE id=?").bind(b.provider_ref || null, o.id).run();
    await notify(env, o.user_id, "payment", "Payment confirmed", "Receipt " + b.reference, "/smart21store.html");
    const its = await env.DB.prepare("SELECT oi.item_id,oi.seats,i.kind,i.name FROM store_order_items oi JOIN store_items i ON i.id=oi.item_id WHERE oi.order_id=?").bind(o.id).all();
    const g = o.gift_email ? await env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(o.gift_email.toLowerCase()).first() : null, tgt = g ? g.id : o.user_id;
    if (g) await notify(env, g.id, "gift", "You received a gift", (o.gift_msg ? "\u201C" + o.gift_msg + "\u201D \u2014 " : "") + "Open your library to use it", "/smart21store.html");
    for (const i of its.results) {
      if (i.kind === "Plan") await env.DB.prepare("INSERT INTO store_subscriptions(user_id,item_id,expires_at,seats) VALUES(?,?,datetime('now',?),?)").bind(o.user_id, i.item_id, i.name.includes("Yearly") ? "+365 days" : "+30 days", i.seats).run();
      if (i.seats > 1 && i.kind !== "Plan") await env.DB.prepare("INSERT INTO store_bundles(owner_id,item_id,seats) VALUES(?,?,?)").bind(o.user_id, i.item_id, i.seats).run();
      await env.DB.prepare("INSERT OR REPLACE INTO store_library(user_id,item_id,version) VALUES(?,?,COALESCE((SELECT MAX(version) FROM store_versions WHERE item_id=?),1))").bind(tgt, i.item_id, i.item_id).run();
      await env.DB.prepare("UPDATE store_items SET stock=stock-? WHERE id=? AND stock IS NOT NULL").bind(i.seats, i.item_id).run();
    }
    if (o.gift_email) await notify(env, tgt, "gift", "You received a gift", "A Smart21Store buyer sent you a file.", "/smart21store.html");
    return J({ ok: 1 });
  });
  r.get("/api/store/orders", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT id,receipt_no,total_tzs,discount_tzs,method,status,delivery,pickup,ship,created_at FROM store_orders WHERE user_id=? ORDER BY id DESC").bind(u.id).all()).results);
  });
  r.post("/api/store/admin/items", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const f = await c.request.formData(), file = f.get("file");
    if (!file || !file.name || !String(f.get("name") || "").trim()) return J({ error: "file and title required" }, 400);
    const st = u.role === "admin" || c.env.AUTO_PUBLISH === "1" ? "published" : c.env.SCAN_URL ? "scanning" : "review", key = `store/${crypto.randomUUID()}-${file.name}`;
    await c.env.MATERIALS.put(key, file);
    const it = await c.env.DB.prepare("INSERT INTO store_items(kind,name,description,subject,grade,file_type,size_bytes,price_tzs,target_app,seller_id,license,status) VALUES('Files',?,?,?,?,?,?,?,?,?,?,?)").bind(f.get("name"), f.get("description"), f.get("subject"), f.get("grade"), file.name.split(".").pop(), file.size, +f.get("price") || 0, f.get("target_app") || null, u.id, f.get("license") || "single", st).run();
    await c.env.DB.prepare("INSERT INTO store_versions(item_id,version,r2_key,size_bytes) VALUES(?,1,?,?)").bind(it.meta.last_row_id, key, file.size).run();
    if (st === "scanning") c.ctx.waitUntil(fetch(c.env.SCAN_URL, { method: "POST", body: JSON.stringify({ key, item: it.meta.last_row_id }) }));
    return J({ id: it.meta.last_row_id, status: st });
  });
  r.post("/api/store/admin/uploads/start", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const b = await c.request.json(), nm = String(b.name || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 120), key = `store/${crypto.randomUUID()}-${nm}`, mp = await c.env.MATERIALS.createMultipartUpload(key);
    return J({ key, uploadId: mp.uploadId });
  });
  r.post("/api/store/admin/uploads/part", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const q = c.url.searchParams, key = q.get("key"), id = q.get("uploadId"), n = +q.get("n");
    if (!key || !key.startsWith("store/") || !id || !(n > 0 && n <= 1e4)) return J({ error: "bad request" }, 400);
    const p = await c.env.MATERIALS.resumeMultipartUpload(key, id).uploadPart(n, await c.request.arrayBuffer());
    return J({ partNumber: p.partNumber, etag: p.etag });
  });
  r.post("/api/store/admin/uploads/finish", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const b = await c.request.json();
    if (!b.key || !String(b.key).startsWith("store/") || !b.uploadId || !Array.isArray(b.parts) || !String(b.name || "").trim()) return J({ error: "bad request" }, 400);
    await c.env.MATERIALS.resumeMultipartUpload(b.key, b.uploadId).complete(b.parts);
    const h = await c.env.MATERIALS.head(b.key), size2 = h ? h.size : 0, fn = String(b.filename || b.key), st = u.role === "admin" || c.env.AUTO_PUBLISH === "1" ? "published" : c.env.SCAN_URL ? "scanning" : "review";
    const it = await c.env.DB.prepare("INSERT INTO store_items(kind,name,description,subject,grade,file_type,size_bytes,price_tzs,target_app,seller_id,license,status) VALUES('Files',?,?,?,?,?,?,?,?,?,?,?)").bind(b.name, b.description || "", b.subject || "General", b.grade || "All", fn.split(".").pop(), size2, +b.price || 0, b.target_app || null, u.id, b.license || "single", st).run();
    await c.env.DB.prepare("INSERT INTO store_versions(item_id,version,r2_key,size_bytes) VALUES(?,1,?,?)").bind(it.meta.last_row_id, b.key, size2).run();
    if (st === "scanning") c.ctx.waitUntil(fetch(c.env.SCAN_URL, { method: "POST", body: JSON.stringify({ key: b.key, item: it.meta.last_row_id }) }));
    return J({ id: it.meta.last_row_id, status: st });
  });
  r.post("/api/store/admin/items/:id/publish", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const b = await c.request.json();
    await c.env.DB.prepare("UPDATE store_items SET status=?,featured=? WHERE id=? AND status!='rejected'").bind(b.unpublish ? "unpublished" : "published", b.featured ? 1 : 0, c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/stats", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const s = await c.env.DB.prepare("SELECT date(created_at) d,COUNT(*) orders,SUM(total_tzs) revenue FROM store_orders WHERE status='paid' GROUP BY d ORDER BY d DESC LIMIT 30").all();
    const t = await c.env.DB.prepare("SELECT name,downloads FROM store_items ORDER BY downloads DESC LIMIT 10").all();
    return J({ daily: s.results, top: t.results });
  });
  r.get("/api/store/bundles", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const bs = (await c.env.DB.prepare("SELECT b.id,b.seats,i.name FROM store_bundles b JOIN store_items i ON i.id=b.item_id WHERE b.owner_id=? ORDER BY b.id DESC").bind(u.id).all()).results;
    for (const b of bs) b.seat_list = (await c.env.DB.prepare("SELECT s.user_id,x.name,x.email FROM store_bundle_seats s JOIN users x ON x.id=s.user_id WHERE s.bundle_id=?").bind(b.id).all()).results;
    return J(bs);
  });
  r.post("/api/store/bundles/:id/assign", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.env.DB.prepare("SELECT * FROM store_bundles WHERE id=? AND owner_id=?").bind(c.params.id, u.id).first();
    if (!b) return J({ error: "not found" }, 404);
    const n = (await c.env.DB.prepare("SELECT COUNT(*) n FROM store_bundle_seats WHERE bundle_id=?").bind(b.id).first()).n;
    if (n >= b.seats) return J({ error: "no seats left" }, 409);
    const x = await c.env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(String((await c.request.json()).email).trim().toLowerCase()).first();
    if (!x) return J({ error: "no account with that email" }, 404);
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_bundle_seats VALUES(?,?)").bind(b.id, x.id).run();
    await c.env.DB.prepare(LIB).bind(x.id, b.item_id, b.item_id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/bundles/:id/unassign", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.env.DB.prepare("SELECT * FROM store_bundles WHERE id=? AND owner_id=?").bind(c.params.id, u.id).first();
    if (!b) return J({ error: "not found" }, 404);
    const t = (await c.request.json()).user_id;
    await c.env.DB.prepare("DELETE FROM store_bundle_seats WHERE bundle_id=? AND user_id=?").bind(b.id, t).run();
    await c.env.DB.prepare("DELETE FROM store_library WHERE user_id=? AND item_id=? AND user_id!=?").bind(t, b.item_id, u.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/devices", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const ds = (await c.env.DB.prepare("SELECT id,name,last_sync FROM store_devices WHERE user_id=?").bind(u.id).all()).results;
    for (const d of ds) d.files = (await c.env.DB.prepare("SELECT i.name,f.version,(SELECT MAX(version) FROM store_versions WHERE item_id=i.id) AS latest FROM store_device_files f JOIN store_items i ON i.id=f.item_id WHERE f.device_id=?").bind(d.id).all()).results;
    return J(ds);
  });
  r.post("/api/store/devices", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const tok = rnd(24);
    await c.env.DB.prepare("INSERT INTO store_devices(user_id,name,token_hash) VALUES(?,?,?)").bind(u.id, String((await c.request.json()).name || "Brain Box").slice(0, 60), await sha(tok)).run();
    return J({ token: tok });
  });
  r.post("/api/store/devices/:id/remove", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    await c.env.DB.prepare("DELETE FROM store_devices WHERE id=? AND user_id=?").bind(c.params.id, u.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/device/manifest", async (c) => {
    const d = await devAuth(c);
    if (!d) return J({ error: "bad device token" }, 401);
    const rows = (await c.env.DB.prepare("SELECT i.id,i.name,(SELECT MAX(version) FROM store_versions WHERE item_id=i.id) AS v FROM store_library l JOIN store_items i ON i.id=l.item_id WHERE l.user_id=? AND i.kind='Files'").bind(d.user_id).all()).results, exp = Date.now() + 36e5, out = [];
    for (const x of rows) {
      const v = x.v || 1;
      out.push({ item: x.id, name: x.name, version: v, url: `/api/store/file?u=${d.user_id}&i=${x.id}&v=${v}&e=${exp}&s=${await hmac(c.env.STORE_SECRET, `${d.user_id}.${x.id}.${v}.${exp}`)}` });
    }
    return J(out);
  });
  r.post("/api/store/device/report", async (c) => {
    const d = await devAuth(c);
    if (!d) return J({ error: "bad device token" }, 401);
    for (const f of (await c.request.json()).files || []) await c.env.DB.prepare("INSERT OR REPLACE INTO store_device_files VALUES(?,?,?)").bind(d.id, f.item, f.version).run();
    await c.env.DB.prepare("UPDATE store_devices SET last_sync=datetime('now') WHERE id=?").bind(d.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/seller/earnings", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const sh = (await c.env.DB.prepare("SELECT share_percent FROM store_sellers WHERE user_id=?").bind(u.id).first())?.share_percent ?? 70;
    const items = (await c.env.DB.prepare("SELECT i.name,COUNT(*) sales,SUM(oi.price_tzs) gross,i.rating_avg r FROM store_order_items oi JOIN store_orders o ON o.id=oi.order_id AND o.status='paid' JOIN store_items i ON i.id=oi.item_id WHERE i.seller_id=? GROUP BY i.id").bind(u.id).all()).results;
    const gross = items.reduce((t, x) => t + x.gross, 0), paid = (await c.env.DB.prepare("SELECT COALESCE(SUM(amount_tzs),0) t FROM store_payouts WHERE seller_id=? AND status IN ('requested','paid')").bind(u.id).first()).t;
    return J({ share: sh, gross, paid, available: Math.max(0, Math.floor(gross * sh / 100) - paid), items, payouts: (await c.env.DB.prepare("SELECT amount_tzs,method,status,created_at FROM store_payouts WHERE seller_id=? ORDER BY id DESC LIMIT 20").bind(u.id).all()).results });
  });
  r.post("/api/store/seller/payout", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const b = await c.request.json(), g = await (await r_earn(c, u)).json();
    if (g.available < 1e4) return J({ error: "minimum payout is TSh 10,000" }, 400);
    await c.env.DB.prepare("INSERT INTO store_payouts(seller_id,amount_tzs,method,phone) VALUES(?,?,?,?)").bind(u.id, g.available, b.method, b.phone).run();
    return J({ ok: 1, amount: g.available });
  });
  r.get("/api/store/admin/payouts", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT p.id,p.amount_tzs,p.method,p.phone,x.name FROM store_payouts p JOIN users x ON x.id=p.seller_id WHERE p.status='requested' ORDER BY p.id").all()).results);
  });
  r.post("/api/store/admin/payouts/:id/paid", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_payouts SET status='paid' WHERE id=?").bind(c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/referral", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    let x = await c.env.DB.prepare("SELECT code FROM store_referrals WHERE owner_id=?").bind(u.id).first();
    if (!x) {
      const code = "S21-" + rnd(3).toUpperCase();
      await c.env.DB.prepare("INSERT INTO store_referrals(code,owner_id) VALUES(?,?)").bind(code, u.id).run();
      await c.env.DB.prepare("INSERT INTO store_coupons(code,percent,max_uses) VALUES(?,10,1000)").bind(code).run();
      x = { code };
    }
    const cp = await c.env.DB.prepare("SELECT used FROM store_coupons WHERE code=?").bind(x.code).first();
    return J({ code: x.code, uses: cp?.used || 0 });
  });
  r.post("/api/store/admin/items/:id/previews", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT seller_id FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it || u.role !== "admin" && it.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    let n = 0;
    for (const f of (await c.request.formData()).getAll("img")) {
      if (n >= 5 || !["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 2097152) continue;
      const k = `store/previews/${c.params.id}/${n}`;
      await c.env.MATERIALS.put(k, f, { httpMetadata: { contentType: f.type } });
      await c.env.DB.prepare("INSERT OR REPLACE INTO store_previews VALUES(?,?,?)").bind(c.params.id, n, k).run();
      n++;
    }
    return J({ saved: n });
  });
  r.get("/api/store/preview/:id/:n", async ({ env, params }) => {
    const row = await env.DB.prepare("SELECT p.r2_key FROM store_previews p JOIN store_items i ON i.id=p.item_id WHERE p.item_id=? AND p.n=? AND i.status='published'").bind(params.id, params.n).first();
    const o = row && await env.MATERIALS.get(row.r2_key);
    if (!o) return J({ error: "missing" }, 404);
    return new Response(o.body, { headers: { "content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "public, max-age=86400" } });
  });
  r.get("/api/store/recommend", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, mine = (await D.prepare("SELECT i.name,i.subject,i.grade FROM store_items i JOIN store_library l ON l.item_id=i.id WHERE l.user_id=?1 UNION SELECT i.name,i.subject,i.grade FROM store_items i JOIN store_wishlist w ON w.item_id=i.id WHERE w.user_id=?1").bind(u.id).all()).results, cat = (await D.prepare("SELECT id,name,subject,grade FROM store_items WHERE status='published' AND id NOT IN (SELECT item_id FROM store_library WHERE user_id=?) ORDER BY rating_avg DESC LIMIT 30").bind(u.id).all()).results;
    let out = cat.slice(0, 4).map((x) => ({ id: x.id, why: "Top rated" }));
    if (c.env.AI && mine.length && cat.length) {
      try {
        const res = await c.env.AI.run(c.env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages: [{ role: "system", content: 'You recommend items from a school store. Reply with ONLY a JSON array of up to 4 objects {"id":number,"why":string under 60 chars}. Use only ids from the catalog.' }, { role: "user", content: "Owned or saved: " + JSON.stringify(mine) + "\nCatalog: " + JSON.stringify(cat) }], max_tokens: 300, temperature: 0.3 }), t = typeof res === "string" ? res : res.response || "", m = t.match(/\[[\s\S]*\]/);
        if (m) {
          const ok = new Set(cat.map((x) => x.id)), a = JSON.parse(m[0]).filter((x) => ok.has(x.id)).slice(0, 4).map((x) => ({ id: x.id, why: String(x.why).slice(0, 80) }));
          if (a.length) out = a;
        }
      } catch (_) {
      }
    }
    return J(out);
  });
  r.get("/api/store/notifications", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT id,kind,title,body,link,read,created_at FROM store_notifications WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(u.id).all()).results);
  });
  r.post("/api/store/notifications/read", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_notifications SET read=1 WHERE user_id=?").bind(u.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/items/:id/version", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const f = await c.request.formData(), file = f.get("file"), id = c.params.id, v = ((await c.env.DB.prepare("SELECT MAX(version) v FROM store_versions WHERE item_id=?").bind(id).first()).v || 0) + 1, key = `store/${crypto.randomUUID()}-${file.name}`;
    await c.env.MATERIALS.put(key, file);
    await c.env.DB.prepare("INSERT INTO store_versions(item_id,version,r2_key,size_bytes,notes) VALUES(?,?,?,?,?)").bind(id, v, key, file.size, String(f.get("notes") || "")).run();
    await c.env.DB.prepare("INSERT INTO store_notifications(user_id,kind,title,body,link) SELECT l.user_id,'update',i.name||' updated to v'||?1,?2,'/smart21store.html?item='||i.id FROM store_library l JOIN store_items i ON i.id=l.item_id WHERE l.item_id=?3").bind(v, String(f.get("notes") || "A new version is ready."), id).run();
    c.ctx.waitUntil(pushUsers(c.env, "SELECT user_id FROM store_library WHERE item_id=?", id));
    return J({ version: v });
  });
  r.get("/api/store/platforms/:id", async (c) => {
    try {
      return J((await c.env.DB.prepare("SELECT platform,size_bytes,filename FROM store_platform_files WHERE item_id=? ORDER BY platform").bind(c.params.id).all()).results || []);
    } catch (e) {
      return J([]);
    }
  });
  r.post("/api/store/admin/items/:id/platform", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const f = await c.request.formData(), file = f.get("file"), pf = String(f.get("platform") || "");
    if (!["android", "windows", "mac", "ios", "linux"].includes(pf)) return J({ error: "unknown device" }, 400);
    if (f.get("remove")) {
      await c.env.DB.prepare("DELETE FROM store_platform_files WHERE item_id=? AND platform=?").bind(c.params.id, pf).run();
      return J({ ok: 1 });
    }
    if (f.get("use_main") === "1") {
      const v = await c.env.DB.prepare("SELECT r2_key,size_bytes FROM store_versions WHERE item_id=? ORDER BY version DESC LIMIT 1").bind(c.params.id).first();
      if (!v) return J({ error: "no main file" }, 400);
      await c.env.DB.prepare("INSERT OR REPLACE INTO store_platform_files(item_id,platform,r2_key,size_bytes,filename) VALUES(?,?,?,?,?)").bind(c.params.id, pf, v.r2_key, v.size_bytes || 0, String(v.r2_key).split("/").pop().replace(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-/, "")).run();
      return J({ ok: 1, platform: pf });
    }
    if (!file || !file.name) return J({ error: "platform and file required" }, 400);
    const key = `store/${crypto.randomUUID()}-${file.name}`;
    await c.env.MATERIALS.put(key, file);
    await c.env.DB.prepare("INSERT OR REPLACE INTO store_platform_files(item_id,platform,r2_key,size_bytes,filename) VALUES(?,?,?,?,?)").bind(c.params.id, pf, key, file.size, file.name).run();
    return J({ ok: 1, platform: pf });
  });
  r.post("/api/store/admin/items/:id/price", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const p = +(await c.request.json()).price, it = await c.env.DB.prepare("SELECT price_tzs,name FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it) return J({ error: "not found" }, 404);
    await c.env.DB.prepare("UPDATE store_items SET price_tzs=? WHERE id=?").bind(p, c.params.id).run();
    if (p < it.price_tzs) await c.env.DB.prepare("INSERT INTO store_notifications(user_id,kind,title,body,link) SELECT user_id,'sale',?1,?2,'/smart21store.html?item='||?3 FROM (SELECT user_id FROM store_wishlist WHERE item_id=?3 UNION SELECT user_id FROM store_watch WHERE item_id=?3)").bind(it.name + " is on sale", "Now TSh " + p.toLocaleString(), c.params.id).run();
    if (p < it.price_tzs) c.ctx.waitUntil(pushUsers(c.env, "SELECT user_id FROM store_wishlist WHERE item_id=?1 UNION SELECT user_id FROM store_watch WHERE item_id=?1", c.params.id));
    return J({ ok: 1 });
  });
  r.get("/api/store/collections", async ({ env }) => J((await env.DB.prepare("SELECT id,name,percent,item_ids FROM store_collections").all()).results.map((x) => ({ id: x.id, name: x.name, percent: x.percent, ids: JSON.parse(x.item_ids) }))));
  r.get("/api/store/share/:id", async ({ env, params, url }) => {
    const i = await env.DB.prepare("SELECT id,name,description,price_tzs,has_banner FROM store_items WHERE id=? AND status='published'").bind(params.id).first();
    if (!i) return Response.redirect(url.origin + "/smart21store.html", 302);
    const img = i.has_banner ? url.origin + "/api/store/banner/" + i.id : url.origin + "/icons/store-512.png", to = url.origin + "/smart21store.html?item=" + i.id;
    return new Response(`<!doctype html><meta charset="utf-8"><title>${esc(i.name)}</title><meta property="og:title" content="${esc(i.name)} | Smart21Store"><meta property="og:description" content="${esc(i.description)} ${i.price_tzs ? "TSh " + i.price_tzs.toLocaleString() : "Free"}"><meta property="og:image" content="${img}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${to}"><a href="${to}">Open in Smart21Store</a>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  });
  r.post("/api/store/refunds", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json(), o = await c.env.DB.prepare("SELECT id FROM store_orders WHERE receipt_no=? AND user_id=? AND status='paid' AND created_at>datetime('now','-7 days')").bind(b.receipt_no, u.id).first();
    if (!o) return J({ error: "not eligible (paid orders within 7 days only)" }, 400);
    try {
      await c.env.DB.prepare("INSERT INTO store_refunds(order_id,user_id,reason) VALUES(?,?,?)").bind(o.id, u.id, String(b.reason || "").slice(0, 500)).run();
    } catch (_) {
      return J({ error: "already requested" }, 409);
    }
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/refunds", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT f.id,f.reason,o.receipt_no,o.total_tzs,x.name FROM store_refunds f JOIN store_orders o ON o.id=f.order_id JOIN users x ON x.id=f.user_id WHERE f.status='requested' ORDER BY f.id").all()).results);
  });
  r.post("/api/store/admin/refunds/:id/decide", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const ap = !!(await c.request.json()).approve, f = await c.env.DB.prepare("SELECT * FROM store_refunds WHERE id=? AND status='requested'").bind(c.params.id).first();
    if (!f) return J({ error: "not found" }, 404);
    await c.env.DB.prepare("UPDATE store_refunds SET status=? WHERE id=?").bind(ap ? "approved" : "denied", f.id).run();
    if (ap) {
      await c.env.DB.prepare("UPDATE store_orders SET status='refunded' WHERE id=?").bind(f.order_id).run();
      await c.env.DB.prepare("DELETE FROM store_library WHERE user_id=? AND item_id IN (SELECT item_id FROM store_order_items WHERE order_id=?)").bind(f.user_id, f.order_id).run();
    }
    await notify(c.env, f.user_id, "refund", ap ? "Refund approved" : "Refund declined", ap ? "Your refund was approved." : "Your refund request was declined.", "/smart21store.html");
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/reports", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT id,item_id,body,reports FROM store_reviews WHERE reports>0 AND reports<99 ORDER BY reports DESC LIMIT 50").all()).results);
  });
  r.post("/api/store/admin/reviews/:id/moderate", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_reviews SET reports=? WHERE id=?").bind((await c.request.json()).hide ? 99 : 0, c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/audit", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT a.action,a.detail,a.created_at,x.name FROM store_audit a LEFT JOIN users x ON x.id=a.user_id ORDER BY a.id DESC LIMIT 40").all()).results);
  });
  r.get("/api/store/admin/sellers", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT s.user_id,s.approved,s.verified,x.name FROM store_sellers s JOIN users x ON x.id=s.user_id ORDER BY s.rowid DESC LIMIT 50").all()).results);
  });
  r.post("/api/store/admin/sellers/:id/verify", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_sellers SET verified=1 WHERE user_id=?").bind(c.params.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/items/:id/stock", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const n = (await c.request.json()).stock, it = await c.env.DB.prepare("SELECT stock,name FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it) return J({ error: "not found" }, 404);
    await c.env.DB.prepare("UPDATE store_items SET stock=? WHERE id=?").bind(n, c.params.id).run();
    if (it.stock === 0 && n > 0) await c.env.DB.prepare("INSERT INTO store_notifications(user_id,kind,title,body,link) SELECT user_id,'stock',?1,'Back in stock','/smart21store.html?item='||?2 FROM store_wishlist WHERE item_id=?2").bind(it.name + " is back in stock", c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/device-orders", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT DISTINCT o.id,o.receipt_no,o.delivery,o.pickup,o.ship FROM store_orders o JOIN store_order_items oi ON oi.order_id=o.id JOIN store_items i ON i.id=oi.item_id WHERE i.kind='Devices' AND o.status='paid' ORDER BY o.id DESC LIMIT 50").all()).results);
  });
  r.post("/api/store/admin/orders/:id/ship", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const s = (await c.request.json()).status;
    if (!["received", "packed", "shipped", "delivered"].includes(s)) return J({ error: "bad status" }, 400);
    const o = await c.env.DB.prepare("SELECT user_id,receipt_no FROM store_orders WHERE id=?").bind(c.params.id).first();
    if (!o) return J({ error: "not found" }, 404);
    await c.env.DB.prepare("UPDATE store_orders SET ship=? WHERE id=?").bind(s, c.params.id).run();
    await notify(c.env, o.user_id, "delivery", "Order " + o.receipt_no + ": " + s, "Your device order is now " + s + ".", "/smart21store.html");
    return J({ ok: 1 });
  });
  r.get("/api/store/push/key", async ({ env }) => J({ key: env.VAPID_PUBLIC || "" }));
  r.post("/api/store/push/subscribe", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json();
    if (!/^https:\/\//.test(b.endpoint || "")) return J({ error: "bad endpoint" }, 400);
    await c.env.DB.prepare("INSERT OR REPLACE INTO store_push_subs(user_id,endpoint) VALUES(?,?)").bind(u.id, b.endpoint).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/school", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const ss = (await c.env.DB.prepare("SELECT id,seats,expires_at FROM store_subscriptions WHERE user_id=? AND seats>1").bind(u.id).all()).results;
    for (const s of ss) s.seat_list = (await c.env.DB.prepare("SELECT m.user_id,x.name,x.email,(SELECT AVG(pct) FROM store_progress WHERE user_id=m.user_id) pct FROM store_sub_seats m JOIN users x ON x.id=m.user_id WHERE m.sub_id=?").bind(s.id).all()).results;
    return J(ss);
  });
  r.post("/api/store/school/:id/assign", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const s = await c.env.DB.prepare("SELECT * FROM store_subscriptions WHERE id=? AND user_id=? AND expires_at>datetime('now')").bind(c.params.id, u.id).first();
    if (!s) return J({ error: "not found" }, 404);
    if ((await c.env.DB.prepare("SELECT COUNT(*) n FROM store_sub_seats WHERE sub_id=?").bind(s.id).first()).n >= s.seats) return J({ error: "no seats left" }, 409);
    const x = await c.env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(String((await c.request.json()).email).trim().toLowerCase()).first();
    if (!x) return J({ error: "no account with that email" }, 404);
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_sub_seats VALUES(?,?)").bind(s.id, x.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/school/:id/unassign", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const s = await c.env.DB.prepare("SELECT id FROM store_subscriptions WHERE id=? AND user_id=?").bind(c.params.id, u.id).first();
    if (!s) return J({ error: "not found" }, 404);
    await c.env.DB.prepare("DELETE FROM store_sub_seats WHERE sub_id=? AND user_id=?").bind(s.id, (await c.request.json()).user_id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/family/link", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const x = await c.env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(String((await c.request.json()).email).trim().toLowerCase()).first();
    if (!x || x.id === u.id) return J({ error: "no such account" }, 404);
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_family(parent_id,child_id) VALUES(?,?)").bind(u.id, x.id).run();
    await notify(c.env, x.id, "family", u.name + " wants to link your account", "Open Family in Smart21Store to accept.", "/smart21store.html");
    return J({ ok: 1 });
  });
  r.get("/api/store/family", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const ch = (await c.env.DB.prepare("SELECT f.child_id id,x.name,f.status FROM store_family f JOIN users x ON x.id=f.child_id WHERE f.parent_id=?").bind(u.id).all()).results;
    for (const k of ch) k.files = k.status === "accepted" ? (await c.env.DB.prepare("SELECT i.name FROM store_library l JOIN store_items i ON i.id=l.item_id WHERE l.user_id=?").bind(k.id).all()).results.map((x) => x.name) : [];
    const rq = (await c.env.DB.prepare("SELECT f.parent_id,x.name FROM store_family f JOIN users x ON x.id=f.parent_id WHERE f.child_id=? AND f.status='pending'").bind(u.id).all()).results;
    return J({ children: ch, requests: rq });
  });
  r.post("/api/store/family/accept", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_family SET status='accepted' WHERE parent_id=? AND child_id=?").bind((await c.request.json()).parent_id, u.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/family/assign", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json(), l = await c.env.DB.prepare("SELECT 1 x FROM store_family WHERE parent_id=? AND child_id=? AND status='accepted'").bind(u.id, b.child_id).first(), own = await c.env.DB.prepare("SELECT 1 x FROM store_library WHERE user_id=? AND item_id=?").bind(u.id, b.item_id).first();
    if (!l || !own) return J({ error: "not allowed" }, 403);
    await c.env.DB.prepare(LIB).bind(b.child_id, b.item_id, b.item_id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/progress", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const b = await c.request.json();
    await c.env.DB.prepare("INSERT INTO store_progress(user_id,item_id,pct) VALUES(?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET pct=excluded.pct,updated_at=datetime('now')").bind(u.id, b.item, Math.max(0, Math.min(100, b.pct | 0))).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/progress", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT item_id,pct FROM store_progress WHERE user_id=?").bind(u.id).all()).results);
  });
  r.post("/api/store/admin/items/:id/preorder", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const d = (await c.request.json()).ships_on || null;
    await c.env.DB.prepare("UPDATE store_items SET ships_on=? WHERE id=?").bind(d, c.params.id).run();
    if (!d) await c.env.DB.prepare("INSERT INTO store_notifications(user_id,kind,title,body,link) SELECT DISTINCT o.user_id,'release',i.name||' is now available','Your pre-order is being prepared','/smart21store.html?item='||i.id FROM store_orders o JOIN store_order_items oi ON oi.order_id=o.id JOIN store_items i ON i.id=oi.item_id WHERE oi.item_id=? AND o.status='paid'").bind(c.params.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/items/:id/sample", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT seller_id FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it || u.role !== "admin" && it.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    const f = (await c.request.formData()).get("sample"), pdf = f.type === "application/pdf" && f.size <= 8388608, vid = f.type === "video/mp4" && f.size <= 31457280;
    if (!pdf && !vid) return J({ error: "PDF up to 8 MB or MP4 up to 30 MB" }, 400);
    const k = `store/samples/${c.params.id}`;
    await c.env.MATERIALS.put(k, f, { httpMetadata: { contentType: f.type } });
    await c.env.DB.prepare("INSERT OR REPLACE INTO store_samples VALUES(?,?,?)").bind(c.params.id, k, pdf ? "pdf" : "video").run();
    return J({ ok: 1 });
  });
  r.get("/api/store/sample/:id", async ({ request, env, params }) => {
    const row = await env.DB.prepare("SELECT s.r2_key FROM store_samples s JOIN store_items i ON i.id=s.item_id WHERE s.item_id=? AND i.status='published'").bind(params.id).first(), o = row && await env.MATERIALS.get(row.r2_key, { range: request.headers });
    if (!o) return J({ error: "missing" }, 404);
    const h = new Headers({ "content-type": o.httpMetadata?.contentType || "application/pdf", "accept-ranges": "bytes", "content-disposition": "inline", "cache-control": "public, max-age=3600" });
    let s = 200;
    if (o.range) {
      const { offset = 0, length = o.size - offset } = o.range;
      h.set("content-range", `bytes ${offset}-${offset + length - 1}/${o.size}`);
      s = 206;
    }
    return new Response(o.body, { status: s, headers: h });
  });
  r.post("/api/store/search-log", async ({ request, env }) => {
    const q = String((await request.json()).q || "").toLowerCase().trim().slice(0, 60);
    if (q.length > 2) await env.DB.prepare("INSERT INTO store_searches(q,n) VALUES(?,1) ON CONFLICT(q) DO UPDATE SET n=n+1").bind(q).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/event", async ({ request, env }) => {
    const b = await request.json(), t = b.type;
    if (t === "view" && +b.item) await env.DB.prepare("INSERT INTO store_item_views(item_id,day,n) VALUES(?,date('now'),1) ON CONFLICT(item_id,day) DO UPDATE SET n=n+1").bind(+b.item).run();
    if (t === "view" || t === "cart") await env.DB.prepare("INSERT INTO store_events(day,type,n) VALUES(date('now'),?,1) ON CONFLICT(day,type) DO UPDATE SET n=n+1").bind(t).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/analytics", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const D = c.env.DB, ev = Object.fromEntries((await D.prepare("SELECT type,SUM(n) n FROM store_events WHERE day>=date('now','-30 day') GROUP BY type").all()).results.map((x) => [x.type, x.n]));
    return J({ searches: (await D.prepare("SELECT q,n FROM store_searches ORDER BY n DESC LIMIT 15").all()).results, views: ev.view || 0, carts: ev.cart || 0, paid: (await D.prepare("SELECT COUNT(*) n FROM store_orders WHERE status='paid' AND created_at>=datetime('now','-30 days')").first()).n });
  });
  r.get("/api/store/rates", async ({ env }) => {
    try {
      return J(JSON.parse(env.RATES_JSON || "{}"));
    } catch (_) {
      return J({});
    }
  });
  r.get("/api/store/receipt/:no", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const o = await c.env.DB.prepare("SELECT * FROM store_orders WHERE receipt_no=? AND user_id=? AND status IN ('paid','refunded')").bind(c.params.no, u.id).first();
    if (!o) return J({ error: "not found" }, 404);
    const its = (await c.env.DB.prepare("SELECT i.name,oi.price_tzs,oi.seats FROM store_order_items oi JOIN store_items i ON i.id=oi.item_id WHERE oi.order_id=?").bind(o.id).all()).results, vp = +c.env.VAT_PERCENT || 0, vat = vp ? Math.round(o.total_tzs * vp / (100 + vp)) : 0;
    return new Response(`<!doctype html><meta charset="utf-8"><title>Receipt ${esc(o.receipt_no)}</title><body style="font-family:sans-serif;max-width:480px;margin:24px auto"><h2>Smart21Store receipt</h2><p>${esc(o.receipt_no)} \xB7 ${esc(o.created_at)}</p>${its.map((i) => `<p>${esc(i.name)}${i.seats > 1 ? " \xD7 " + i.seats : ""}: TSh ${i.price_tzs.toLocaleString()}</p>`).join("")}<p>Discount: TSh ${(o.discount_tzs || 0).toLocaleString()}</p>${vp ? `<p>VAT included (${vp}%): TSh ${vat.toLocaleString()}</p>` : ""}<h3>Total paid: TSh ${o.total_tzs.toLocaleString()}</h3><p>Paid with ${esc(o.method)}${c.env.TAX_ID ? " \xB7 Seller TIN " + esc(c.env.TAX_ID) : ""}</p><button onclick="print()">Print</button>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  });
  r.post("/api/store/keys", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const key = "s21_" + rnd(20);
    await c.env.DB.prepare("INSERT INTO store_api_keys(user_id,key_hash,name) VALUES(?,?,?)").bind(u.id, await sha(key), String((await c.request.json()).name || "key").slice(0, 60)).run();
    return J({ key });
  });
  r.get("/api/store/keys", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT id,name,calls,revoked FROM store_api_keys WHERE user_id=?").bind(u.id).all()).results);
  });
  r.post("/api/store/keys/:id/revoke", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_api_keys SET revoked=1 WHERE id=? AND user_id=?").bind(c.params.id, u.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/v1/items", async (c) => {
    const [k, e] = await keyAuth(c);
    if (e) return e;
    const q = c.url.searchParams.get("subject");
    return Jc((await (q ? c.env.DB.prepare(PUB + " AND subject=? ORDER BY id DESC LIMIT 200").bind(q) : c.env.DB.prepare(PUB + " ORDER BY id DESC LIMIT 200")).all()).results);
  });
  r.get("/api/v1/items/:id", async (c) => {
    const [k, e] = await keyAuth(c);
    if (e) return e;
    const i = await c.env.DB.prepare(PUB + " AND id=?").bind(c.params.id).first();
    return i ? Jc(i) : Jc({ error: "not found" }, 404);
  });
  r.get("/api/v1/collections", async (c) => {
    const [k, e] = await keyAuth(c);
    if (e) return e;
    return Jc((await c.env.DB.prepare("SELECT id,name,percent,item_ids FROM store_collections").all()).results.map((x) => ({ id: x.id, name: x.name, percent: x.percent, item_ids: JSON.parse(x.item_ids) })));
  });
  r.get("/api/v1/docs", async () => new Response('<!doctype html><meta charset="utf-8"><title>Smart21Store API</title><body style="font-family:sans-serif;max-width:640px;margin:24px auto"><h1>Smart21Store API v1</h1><p>Read-only catalog. Send <code>Authorization: Bearer YOUR_KEY</code>. Limit: 60 requests per minute per key. Create keys in the store under API.</p><ul><li><code>GET /api/v1/items?subject=Math</code></li><li><code>GET /api/v1/items/:id</code></li><li><code>GET /api/v1/collections</code></li></ul><p>Errors: 401 missing/invalid key, 404 not found, 429 rate limit.</p>', { headers: { "content-type": "text/html; charset=utf-8" } }));
  r.get("/api/store/me", async (c) => {
    try {
      const u = await getUser(c.request, c.env);
      if (!u) return J({ error: "login required" }, 401);
      let pl = false;
      try {
        pl = await plus(c.env, u.id);
      } catch (e) {
      }
      return J({ ...u, plus: pl });
    } catch (e) {
      return J({ error: "me failed: " + String(e && e.message || e).slice(0, 140) }, 500);
    }
  });
  r.post("/api/store/claim/:id", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const i = await c.env.DB.prepare("SELECT price_tzs FROM store_items WHERE id=? AND status='published'").bind(c.params.id).first();
    if (!i || i.price_tzs > 0) return J({ error: "not free" }, 400);
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_library(user_id,item_id,version) VALUES(?,?,COALESCE((SELECT MAX(version) FROM store_versions WHERE item_id=?),1))").bind(u.id, c.params.id, c.params.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/seller/apply", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    await c.env.DB.prepare("INSERT OR IGNORE INTO store_sellers(user_id,approved) VALUES(?,0)").bind(u.id).run();
    return J({ ok: 1, status: "pending approval" });
  });
  r.post("/api/store/admin/sellers/:id/approve", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    await c.env.DB.prepare("UPDATE store_sellers SET approved=1 WHERE user_id=?").bind(c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/pending", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT id,name,status,price_tzs FROM store_items WHERE status IN ('scanning','review','unpublished','published') ORDER BY id DESC LIMIT 100").all()).results);
  });
  r.post("/api/store/admin/scan-result", async ({ request, env }) => {
    if (!env.SCAN_SECRET || request.headers.get("x-scan-secret") !== env.SCAN_SECRET) return J({ error: "forbidden" }, 403);
    const b = await request.json();
    await env.DB.prepare("UPDATE store_items SET status=? WHERE id=? AND status='scanning'").bind(b.clean ? "review" : "rejected", b.item).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/icon/:id", async ({ env, params }) => {
    const row = await env.DB.prepare("SELECT has_icon FROM store_items WHERE id=? AND status='published'").bind(params.id).first();
    if (!row || !row.has_icon) return J({ error: "missing" }, 404);
    const o = await env.MATERIALS.get("store/icons/" + params.id);
    if (!o) return J({ error: "missing" }, 404);
    return new Response(o.body, { headers: { "content-type": o.httpMetadata?.contentType || "image/png", "cache-control": "public, max-age=31536000, immutable" } });
  });
  r.post("/api/store/admin/items/:id/icon", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT seller_id FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it || u.role !== "admin" && it.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    const f = (await c.request.formData()).get("icon");
    if (!f || !f.size || !["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 1048576) return J({ error: "Use a PNG, JPG or WebP under 1 MB" }, 400);
    await c.env.MATERIALS.put("store/icons/" + c.params.id, f, { httpMetadata: { contentType: f.type } });
    await c.env.DB.prepare("UPDATE store_items SET has_icon=? WHERE id=?").bind(Math.floor(Date.now() / 1e3), c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/items/:id", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT id,name,description,subject,grade,license,price_tzs,target_app,status,file_type,size_bytes FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it) return J({ error: "not found" }, 404);
    const pl = await c.env.DB.prepare("SELECT platform,size_bytes,filename FROM store_platform_files WHERE item_id=? ORDER BY platform").bind(c.params.id).all().then((x) => x.results || []).catch(() => []), v = await c.env.DB.prepare("SELECT version,size_bytes,r2_key FROM store_versions WHERE item_id=? ORDER BY version DESC LIMIT 1").bind(c.params.id).first();
    return J({ ...it, platforms: pl, main: v ? { version: v.version, size_bytes: v.size_bytes, filename: String(v.r2_key).split("/").pop().replace(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-/, "") } : null });
  });
  r.post("/api/store/admin/items/:id/edit", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const b = await c.request.json(), name = String(b.name || "").trim().slice(0, 200);
    if (!name) return J({ error: "Title is required" }, 400);
    const lic = ["single", "classroom", "school"].includes(b.license) ? b.license : "single", r2 = await c.env.DB.prepare("UPDATE store_items SET name=?,description=?,subject=?,grade=?,license=?,target_app=? WHERE id=? AND status!='deleted'").bind(name, String(b.description || "").slice(0, 5e3), String(b.subject || "").slice(0, 60), String(b.grade || "").slice(0, 60), lic, String(b.target_app || "").trim() || null, c.params.id).run();
    if (!r2.meta.changes) return J({ error: "not found" }, 404);
    await audit(c.env, u, "edit_item", c.params.id + " " + name);
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/items/:id/delete", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const id = c.params.id, it = await c.env.DB.prepare("SELECT id,name FROM store_items WHERE id=?").bind(id).first();
    if (!it) return J({ error: "not found" }, 404);
    const db = c.env.DB, cnt = /* @__PURE__ */ __name(async (q) => (await db.prepare(q).bind(id).first().catch(() => ({ n: 0 })))?.n || 0, "cnt"), bought = await cnt("SELECT COUNT(*) n FROM store_library WHERE item_id=?") + await cnt("SELECT COUNT(*) n FROM store_order_items WHERE item_id=?") + await cnt("SELECT COUNT(*) n FROM store_subscriptions WHERE item_id=?");
    if (bought > 0) {
      await db.prepare("UPDATE store_items SET status='deleted',featured=0,editors=0 WHERE id=?").bind(id).run();
      await audit(c.env, u, "archive_item", id + " " + it.name);
      return J({ ok: 1, mode: "archived" });
    }
    const keys = /* @__PURE__ */ new Set(["store/icons/" + id, "store/banners/" + id, "store/trailers/" + id]);
    for (const q of ["SELECT r2_key k FROM store_versions WHERE item_id=?1", "SELECT r2_key k FROM store_platform_files WHERE item_id=?1", "SELECT r2_key k FROM store_previews WHERE item_id=?1", "SELECT r2_key k FROM store_samples WHERE item_id=?1"]) {
      for (const x of await db.prepare(q).bind(id).all().then((z) => z.results || []).catch(() => [])) if (x.k) keys.add(x.k);
    }
    for (const k of keys) await c.env.MATERIALS.delete(k).catch(() => {
    });
    for (const t of ["store_versions", "store_platform_files", "store_previews", "store_samples", "store_wishlist", "store_reviews", "store_watch", "store_progress", "store_class_items", "store_item_views", "store_search_hits", "store_device_files"]) await db.prepare("DELETE FROM " + t + " WHERE item_id=?").bind(id).run().catch(() => {
    });
    await db.prepare("DELETE FROM store_items WHERE id=?").bind(id).run();
    await audit(c.env, u, "delete_item", id + " " + it.name);
    return J({ ok: 1, mode: "deleted" });
  });
  r.get("/api/store/banner/:id", async ({ env, params }) => {
    const row = await env.DB.prepare("SELECT has_banner FROM store_items WHERE id=? AND status='published'").bind(params.id).first();
    if (!row || !row.has_banner) return J({ error: "missing" }, 404);
    const o = await env.MATERIALS.get("store/banners/" + params.id);
    if (!o) return J({ error: "missing" }, 404);
    return new Response(o.body, { headers: { "content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  });
  r.post("/api/store/admin/items/:id/banner", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT seller_id FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it || u.role !== "admin" && it.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    const fd = await c.request.formData();
    if (fd.get("remove")) {
      await c.env.MATERIALS.delete("store/banners/" + c.params.id);
      await c.env.DB.prepare("UPDATE store_items SET has_banner=0 WHERE id=?").bind(c.params.id).run();
      return J({ ok: 1 });
    }
    const f = fd.get("banner");
    if (!f || !f.size || !["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 5242880) return J({ error: "Use a PNG, JPG or WebP banner under 5 MB" }, 400);
    await c.env.MATERIALS.put("store/banners/" + c.params.id, f, { httpMetadata: { contentType: f.type } });
    await c.env.DB.prepare("UPDATE store_items SET has_banner=? WHERE id=?").bind(Math.floor(Date.now() / 1e3), c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/trailer/:id", async ({ request, env, params }) => {
    const row = await env.DB.prepare("SELECT has_trailer FROM store_items WHERE id=? AND status='published'").bind(params.id).first();
    if (!row || !row.has_trailer) return J({ error: "missing" }, 404);
    const o = await env.MATERIALS.get("store/trailers/" + params.id, { range: request.headers });
    if (!o) return J({ error: "missing" }, 404);
    const h = new Headers({ "content-type": o.httpMetadata?.contentType || "video/mp4", "accept-ranges": "bytes", "content-disposition": "inline", "cache-control": "public, max-age=3600" });
    let s = 200;
    if (o.range) {
      const { offset = 0, length = o.size - offset } = o.range;
      h.set("content-range", `bytes ${offset}-${offset + length - 1}/${o.size}`);
      s = 206;
    }
    return new Response(o.body, { status: s, headers: h });
  });
  r.post("/api/store/admin/items/:id/trailer", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const it = await c.env.DB.prepare("SELECT seller_id FROM store_items WHERE id=?").bind(c.params.id).first();
    if (!it || u.role !== "admin" && it.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    const fd = await c.request.formData(), f = fd.get("trailer"), url = String(fd.get("url") || "").trim();
    if (fd.get("remove")) {
      await c.env.MATERIALS.delete("store/trailers/" + c.params.id);
      await c.env.DB.prepare("UPDATE store_items SET has_trailer=0,trailer_url=NULL WHERE id=?").bind(c.params.id).run();
      return J({ ok: 1 });
    }
    if (f && f.size) {
      if (!["video/mp4", "video/webm"].includes(f.type) || f.size > 104857600) return J({ error: "Trailer must be MP4 or WebM up to 100 MB" }, 400);
      await c.env.MATERIALS.put("store/trailers/" + c.params.id, f, { httpMetadata: { contentType: f.type } });
      await c.env.DB.prepare("UPDATE store_items SET has_trailer=?,trailer_url=NULL WHERE id=?").bind(Math.floor(Date.now() / 1e3), c.params.id).run();
      return J({ ok: 1 });
    }
    const m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (!m) return J({ error: "Upload an MP4/WebM, or paste a YouTube link" }, 400);
    await c.env.DB.prepare("UPDATE store_items SET trailer_url=?,has_trailer=0 WHERE id=?").bind("https://www.youtube.com/watch?v=" + m[1], c.params.id).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/items/:id/pick", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const b = await c.request.json();
    await c.env.DB.prepare("UPDATE store_items SET featured=?,editors=? WHERE id=?").bind(b.featured ? 1 : 0, b.editors ? 1 : 0, c.params.id).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/admin/coupons", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT code,percent,max_uses,used,expires_at FROM store_coupons ORDER BY rowid DESC LIMIT 100").all()).results);
  });
  r.post("/api/store/admin/coupons", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    const b = await c.request.json(), code = String(b.code || "").trim().toUpperCase(), pc = Math.round(+b.percent);
    if (!/^[A-Z0-9_-]{3,20}$/.test(code) || !(pc >= 1 && pc <= 90)) return J({ error: "Code 3-20 letters/numbers and a discount of 1-90%" }, 400);
    const ex = b.expires_at ? String(b.expires_at).slice(0, 10) : null;
    await c.env.DB.prepare("INSERT OR REPLACE INTO store_coupons(code,percent,max_uses,used,expires_at) VALUES(?,?,?,COALESCE((SELECT used FROM store_coupons WHERE code=?),0),?)").bind(code, pc, Math.max(1, Math.round(+b.max_uses) || 1e3), code, ex).run();
    return J({ ok: 1 });
  });
  r.post("/api/store/admin/coupons/:code/delete", async (c) => {
    const [u, e] = await need(c, "admin");
    if (e) return e;
    await c.env.DB.prepare("DELETE FROM store_coupons WHERE code=?").bind(c.params.code).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/seller/stats", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const all = u.role === "admin", w = all ? "" : " AND i.seller_id=?1", pd = "JOIN store_orders o ON o.id=oi.order_id AND o.status='paid'";
    const q = "SELECT i.id,i.name,i.kind,i.status,i.downloads,i.rating_avg r,i.rating_count rc,i.price_tzs p,i.featured,i.editors,i.has_icon hi,i.has_banner hb,i.has_trailer ht,i.trailer_url tu,(SELECT COUNT(*) FROM store_order_items oi " + pd + " WHERE oi.item_id=i.id) sales,(SELECT COALESCE(SUM(oi.price_tzs),0) FROM store_order_items oi " + pd + " WHERE oi.item_id=i.id) gross FROM store_items i WHERE i.kind!='Plan' AND i.status!='deleted'" + w + " ORDER BY i.id DESC LIMIT 200";
    const d = "SELECT date(o.created_at) d,COUNT(*) n FROM store_order_items oi " + pd + " JOIN store_items i ON i.id=oi.item_id WHERE o.created_at>=datetime('now','-14 days')" + w + " GROUP BY date(o.created_at) ORDER BY d";
    const run2 = /* @__PURE__ */ __name((sql) => all ? c.env.DB.prepare(sql).all() : c.env.DB.prepare(sql).bind(u.id).all(), "run");
    return J({ all, items: (await run2(q)).results, daily: (await run2(d)).results });
  });
  r.get("/api/store/trending", async ({ env }) => J((await env.DB.prepare("SELECT q FROM store_searches ORDER BY n DESC LIMIT 8").all()).results.map((x) => x.q)));
  r.post("/api/store/search-hit", async ({ request, env }) => {
    const b = await request.json(), q = String(b.q || "").toLowerCase().trim().slice(0, 60), id = +b.item;
    if (q.length > 2 && id) await env.DB.prepare("INSERT INTO store_search_hits(item_id,q,n) VALUES(?,?,1) ON CONFLICT(item_id,q) DO UPDATE SET n=n+1").bind(id, q).run();
    return J({ ok: 1 });
  });
  r.get("/api/store/watch", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J((await c.env.DB.prepare("SELECT item_id FROM store_watch WHERE user_id=?").bind(u.id).all()).results.map((x) => x.item_id));
  });
  r.post("/api/store/watch/:id", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, x = await D.prepare("SELECT 1 x FROM store_watch WHERE user_id=? AND item_id=?").bind(u.id, c.params.id).first();
    if (x) {
      await D.prepare("DELETE FROM store_watch WHERE user_id=? AND item_id=?").bind(u.id, c.params.id).run();
      return J({ on: 0 });
    }
    await D.prepare("INSERT OR IGNORE INTO store_watch(user_id,item_id) VALUES(?,?)").bind(u.id, c.params.id).run();
    return J({ on: 1 });
  });
  r.post("/api/store/reviews/:id/helpful", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, x = await D.prepare("SELECT 1 x FROM store_review_votes WHERE review_id=? AND user_id=?").bind(c.params.id, u.id).first();
    if (x) await D.prepare("DELETE FROM store_review_votes WHERE review_id=? AND user_id=?").bind(c.params.id, u.id).run();
    else await D.prepare("INSERT OR IGNORE INTO store_review_votes(review_id,user_id) VALUES(?,?)").bind(c.params.id, u.id).run();
    const n = await D.prepare("SELECT COUNT(*) n FROM store_review_votes WHERE review_id=?").bind(c.params.id).first();
    return J({ on: x ? 0 : 1, n: n.n });
  });
  r.post("/api/store/reviews/:id/reply", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const D = c.env.DB, rv = await D.prepare("SELECT r.user_id,r.item_id,i.seller_id FROM store_reviews r JOIN store_items i ON i.id=r.item_id WHERE r.id=?").bind(c.params.id).first();
    if (!rv) return J({ error: "not found" }, 404);
    if (u.role !== "admin" && rv.seller_id !== u.id) return J({ error: "forbidden" }, 403);
    const t = String((await c.request.json()).text || "").trim().slice(0, 400);
    if (!t) return J({ error: "empty" }, 400);
    await D.prepare("UPDATE store_reviews SET reply=?,reply_at=datetime('now') WHERE id=?").bind(t, c.params.id).run();
    c.ctx.waitUntil(notify(c.env, rv.user_id, "reply", "The seller replied to your review", t.slice(0, 100), "/smart21store.html?item=" + rv.item_id));
    return J({ ok: 1 });
  });
  const CL = /* @__PURE__ */ __name(async (c, id) => c.env.DB.prepare("SELECT * FROM store_classes WHERE id=?").bind(id).first(), "CL");
  r.get("/api/store/classes", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, its = /* @__PURE__ */ __name(async (id) => (await D.prepare("SELECT i.id,i.name FROM store_class_items ci JOIN store_items i ON i.id=ci.item_id WHERE ci.class_id=? ORDER BY ci.pushed_at DESC").bind(id).all()).results, "its");
    const t = (await D.prepare("SELECT id,name,code,(SELECT COUNT(*) FROM store_class_members WHERE class_id=store_classes.id) AS members FROM store_classes WHERE teacher_id=? ORDER BY id DESC").bind(u.id).all()).results, j = (await D.prepare("SELECT c.id,c.name,(SELECT name FROM users WHERE id=c.teacher_id) AS teacher FROM store_class_members m JOIN store_classes c ON c.id=m.class_id WHERE m.user_id=? ORDER BY m.joined_at DESC").bind(u.id).all()).results;
    for (const x of t) x.items = await its(x.id);
    for (const x of j) x.items = await its(x.id);
    return J({ canTeach: u.base === "teacher" || u.role === "admin", teaching: t, joined: j });
  });
  r.post("/api/store/classes", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    if (!(u.base === "teacher" || u.role === "admin")) return J({ error: "Only teachers can create classes" }, 403);
    const name = String((await c.request.json()).name || "").trim().slice(0, 60);
    if (!name) return J({ error: "Class name needed" }, 400);
    const al = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let tries = 0; tries < 5; tries++) {
      let code = "";
      for (const b of crypto.getRandomValues(new Uint8Array(6))) code += al[b % al.length];
      try {
        const x = await c.env.DB.prepare("INSERT INTO store_classes(teacher_id,name,code) VALUES(?,?,?)").bind(u.id, name, code).run();
        return J({ id: x.meta.last_row_id, code });
      } catch (_) {
      }
    }
    return J({ error: "try again" }, 500);
  });
  r.post("/api/store/classes/join", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, code = String((await c.request.json()).code || "").trim().toUpperCase(), cl = await D.prepare("SELECT id,name,teacher_id FROM store_classes WHERE code=?").bind(code).first();
    if (!cl) return J({ error: "Class code not found" }, 404);
    if (cl.teacher_id === u.id) return J({ error: "This is your own class" }, 400);
    await D.prepare("INSERT OR IGNORE INTO store_class_members(class_id,user_id) VALUES(?,?)").bind(cl.id, u.id).run();
    for (const i of (await D.prepare("SELECT item_id FROM store_class_items WHERE class_id=?").bind(cl.id).all()).results) await D.prepare(LIB).bind(u.id, i.item_id, i.item_id).run();
    return J({ id: cl.id, name: cl.name });
  });
  r.post("/api/store/classes/:id/push", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, cl = await CL(c, c.params.id);
    if (!cl || cl.teacher_id !== u.id && u.role !== "admin") return J({ error: "forbidden" }, 403);
    const id = +(await c.request.json()).item, it = await D.prepare("SELECT id,name,price_tzs,seller_id,license FROM store_items WHERE id=? AND status='published' AND kind='Files'").bind(id).first();
    if (!it) return J({ error: "File not found" }, 404);
    const mine = await D.prepare("SELECT 1 x FROM store_library WHERE user_id=? AND item_id=?").bind(u.id, id).first();
    if (!(u.role === "admin" || it.price_tzs === 0 || it.seller_id === u.id || mine && /class|school/i.test(String(it.license)))) return J({ error: "This file needs a Classroom or School license to share with a class" }, 403);
    await D.prepare("INSERT OR IGNORE INTO store_class_items(class_id,item_id) VALUES(?,?)").bind(cl.id, id).run();
    const mem = (await D.prepare("SELECT user_id FROM store_class_members WHERE class_id=? LIMIT 500").bind(cl.id).all()).results;
    for (const m of mem) await D.prepare(LIB).bind(m.user_id, id, id).run();
    c.ctx.waitUntil((async () => {
      for (const m of mem) await notify(c.env, m.user_id, "class", "New in " + cl.name, it.name, "/smart21store.html?item=" + id);
    })());
    return J({ ok: 1, members: mem.length });
  });
  r.get("/api/store/classes/:id/report", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, cl = await CL(c, c.params.id);
    if (!cl || cl.teacher_id !== u.id && u.role !== "admin") return J({ error: "forbidden" }, 403);
    const items = (await D.prepare("SELECT i.id,i.name FROM store_class_items ci JOIN store_items i ON i.id=ci.item_id WHERE ci.class_id=?").bind(cl.id).all()).results, mem = (await D.prepare("SELECT m.user_id id,(SELECT name FROM users WHERE id=m.user_id) AS name FROM store_class_members m WHERE m.class_id=?").bind(cl.id).all()).results, pg = (await D.prepare("SELECT user_id,item_id,pct FROM store_progress WHERE user_id IN (SELECT user_id FROM store_class_members WHERE class_id=?1) AND item_id IN (SELECT item_id FROM store_class_items WHERE class_id=?1)").bind(cl.id).all()).results;
    for (const m of mem) {
      m.p = {};
      for (const x of pg) if (x.user_id === m.id) m.p[x.item_id] = x.pct;
    }
    return J({ name: cl.name, items, members: mem });
  });
  r.post("/api/store/lists/share", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, title = String((await c.request.json()).title || "").trim().slice(0, 60) || "My wishlist";
    let x = await D.prepare("SELECT code FROM store_lists WHERE user_id=?").bind(u.id).first();
    if (x) await D.prepare("UPDATE store_lists SET title=? WHERE user_id=?").bind(title, u.id).run();
    else {
      const al = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (const b of crypto.getRandomValues(new Uint8Array(8))) code += al[b % al.length];
      await D.prepare("INSERT INTO store_lists(code,user_id,title) VALUES(?,?,?)").bind(code, u.id, title).run();
      x = { code };
    }
    return J({ code: x.code });
  });
  r.get("/api/store/list/:code", async ({ env, params }) => {
    const l = await env.DB.prepare("SELECT l.title,l.user_id,(SELECT name FROM users WHERE id=l.user_id) AS owner FROM store_lists l WHERE l.code=?").bind(String(params.code).toUpperCase()).first();
    if (!l) return J({ error: "List not found" }, 404);
    const ids = (await env.DB.prepare("SELECT w.item_id FROM store_wishlist w JOIN store_items i ON i.id=w.item_id WHERE w.user_id=? AND i.status='published'").bind(l.user_id).all()).results.map((x) => x.item_id);
    return J({ title: l.title, owner: String(l.owner || "").split(" ")[0], ids });
  });
  const PT = /* @__PURE__ */ __name(async (c, u) => {
    const D = c.env.DB;
    await D.prepare("INSERT OR IGNORE INTO store_points_log(user_id,reason,ref,pts) SELECT user_id,'install',CAST(item_id AS TEXT),10 FROM store_library WHERE user_id=?").bind(u.id).run();
    await D.prepare("INSERT OR IGNORE INTO store_points_log(user_id,reason,ref,pts) SELECT user_id,'review',CAST(id AS TEXT),20 FROM store_reviews WHERE user_id=?").bind(u.id).run();
    const rf = await D.prepare("SELECT code FROM store_referrals WHERE owner_id=?").bind(u.id).first();
    if (rf) {
      const cp = await D.prepare("SELECT used FROM store_coupons WHERE code=?").bind(rf.code).first();
      for (let k = 1; k <= Math.min(cp?.used || 0, 200); k++) await D.prepare("INSERT OR IGNORE INTO store_points_log(user_id,reason,ref,pts) VALUES(?,'refer',?,30)").bind(u.id, String(k)).run();
    }
    const bal = (await D.prepare("SELECT COALESCE(SUM(pts),0) n FROM store_points_log WHERE user_id=?").bind(u.id).first()).n, st = await D.prepare("SELECT last_day,streak FROM store_points_state WHERE user_id=?").bind(u.id).first(), today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), log = (await D.prepare("SELECT reason,pts,created_at FROM store_points_log WHERE user_id=? ORDER BY id DESC LIMIT 15").bind(u.id).all()).results, y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    return { balance: bal, streak: st && (st.last_day === today || st.last_day === y) ? st.streak : 0, today: !!st && st.last_day === today, log, referrals: rf ? (await D.prepare("SELECT used FROM store_coupons WHERE code=?").bind(rf.code).first())?.used || 0 : 0 };
  }, "PT");
  r.get("/api/store/points", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    return J(await PT(c, u));
  });
  r.post("/api/store/points/checkin", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10), st = await D.prepare("SELECT last_day,streak FROM store_points_state WHERE user_id=?").bind(u.id).first();
    if (st && st.last_day === today) return J(await PT(c, u));
    const sk = st && st.last_day === y ? st.streak + 1 : 1;
    await D.prepare("INSERT INTO store_points_state(user_id,last_day,streak) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_day=?2,streak=?3").bind(u.id, today, sk).run();
    await D.prepare("INSERT OR IGNORE INTO store_points_log(user_id,reason,ref,pts) VALUES(?,'daily',?,?)").bind(u.id, today, 5 + Math.min(sk - 1, 6)).run();
    return J(await PT(c, u));
  });
  r.post("/api/store/points/redeem", async (c) => {
    const [u, e] = await need(c);
    if (e) return e;
    const D = c.env.DB, tier = { 200: 10, 450: 20, 700: 30 }[+(await c.request.json()).cost];
    if (!tier) return J({ error: "bad tier" }, 400);
    const p = await PT(c, u), cost = Object.keys({ 200: 10, 450: 20, 700: 30 }).find((k) => ({ 200: 10, 450: 20, 700: 30 })[k] === tier);
    if (p.balance < +cost) return J({ error: "Not enough points" }, 400);
    const code = "PT-" + rnd(3).toUpperCase();
    await D.prepare("INSERT INTO store_coupons(code,percent,max_uses,used,expires_at) VALUES(?,?,1,0,date('now','+30 day'))").bind(code, tier).run();
    await D.prepare("INSERT INTO store_points_log(user_id,reason,ref,pts) VALUES(?,'redeem',?,?)").bind(u.id, code, -+cost).run();
    return J({ code, percent: tier, ...await PT(c, u) });
  });
  r.get("/api/store/seller/insights", async (c) => {
    const [u, e] = await need(c, "seller");
    if (e) return e;
    const D = c.env.DB, all = u.role === "admin", w = all ? "" : " AND i.seller_id=?1", pd = "JOIN store_orders o ON o.id=oi.order_id AND o.status='paid'", q = "SELECT i.id,(SELECT COALESCE(SUM(n),0) FROM store_item_views WHERE item_id=i.id AND day>=date('now','-30 day')) AS views,(SELECT COUNT(*) FROM store_order_items oi " + pd + " WHERE oi.item_id=i.id AND o.created_at>=datetime('now','-30 day')) AS sales FROM store_items i WHERE i.kind!='Plan'" + w + " LIMIT 200", rows = (await (all ? D.prepare(q) : D.prepare(q).bind(u.id)).all()).results;
    for (const x of rows) x.queries = (await D.prepare("SELECT q,n FROM store_search_hits WHERE item_id=? ORDER BY n DESC LIMIT 4").bind(x.id).all()).results;
    return J({ items: rows });
  });
  r.get("/api/store/coupon/:code", async ({ env, params }) => {
    const c = await env.DB.prepare("SELECT percent FROM store_coupons WHERE code=? AND used<max_uses AND (expires_at IS NULL OR expires_at>=date('now'))").bind(String(params.code).toUpperCase()).first();
    return c ? J({ percent: c.percent }) : J({ error: "invalid" }, 404);
  });
}
__name(registerStore, "registerStore");

// src/seo.js
var NAME = "Smart21Store";
var TITLE = "Smart21Store \u2013 Lesson Packs, Worksheets, Apps & Learning Devices";
var DESC = "Smart21Store is the learning store for Smart21Brain: lesson packs, worksheets, quizzes, apps, games and learning devices for teachers, parents and students. Prices in Tanzanian shillings.";
var esc2 = /* @__PURE__ */ __name((t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
var clip = /* @__PURE__ */ __name((s, n) => {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "\u2026" : s;
}, "clip");
var slug = /* @__PURE__ */ __name((s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60), "slug");
var money = /* @__PURE__ */ __name((n) => n > 0 ? "TSh " + Number(n).toLocaleString("en-US") : "Free", "money");
var size = /* @__PURE__ */ __name((b) => {
  b = +b || 0;
  return b >= 1048576 ? Math.round(b / 1048576) + " MB" : b >= 1024 ? Math.round(b / 1024) + " KB" : b + " B";
}, "size");
var jsonLd = /* @__PURE__ */ __name((o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "<\/script>", "jsonLd");
var itemPath = /* @__PURE__ */ __name((i) => "/item/" + i.id + (slug(i.name) ? "-" + slug(i.name) : ""), "itemPath");
var siteBase = /* @__PURE__ */ __name((env, url) => String(env.SITE_URL || url.origin).replace(/\/+$/, ""), "siteBase");
var COLS = "id,kind,name,description,subject,grade,file_type,size_bytes,price_tzs,rating_avg,rating_count,downloads,created_at,(SELECT MAX(created_at) FROM store_versions WHERE item_id=store_items.id) AS updated";
async function listItems(env, limit) {
  try {
    const q = "SELECT " + COLS + " FROM store_items WHERE status='published' AND kind!='Plan' ORDER BY downloads DESC, id" + (limit ? " LIMIT " + (+limit | 0) : "");
    return (await env.DB.prepare(q).all()).results || [];
  } catch (e) {
    return [];
  }
}
__name(listItems, "listItems");
function reply(body, type, maxAge = 600, status = 200) {
  return new Response(body, { status, headers: { "content-type": type, "cache-control": "public, max-age=" + maxAge } });
}
__name(reply, "reply");
function robots(env, url) {
  return reply([
    "User-agent: *",
    "Allow: /",
    // The store page reads its catalogue from this endpoint; Google needs it to draw the page.
    // Responses carry "X-Robots-Tag: noindex", so the JSON itself is never listed.
    "Allow: /api/store/items",
    "Disallow: /api/",
    "Disallow: /login.html",
    "",
    "Sitemap: " + siteBase(env, url) + "/sitemap.xml",
    ""
  ].join("\n"), "text/plain; charset=utf-8", 3600);
}
__name(robots, "robots");
async function sitemap(env, url) {
  const b = siteBase(env, url), items = await listItems(env);
  const day = /* @__PURE__ */ __name((r) => String(r.updated || r.created_at || "").slice(0, 10), "day");
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  x += "<url><loc>" + b + "/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n";
  for (const i of items) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day(i)) ? "<lastmod>" + day(i) + "</lastmod>" : "";
    x += "<url><loc>" + esc2(b + itemPath(i)) + "</loc>" + d + "<changefreq>weekly</changefreq><priority>0.7</priority></url>\n";
  }
  return reply(x + "</urlset>\n", "application/xml; charset=utf-8", 3600);
}
__name(sitemap, "sitemap");
async function itemPage(env, url, id) {
  const b = siteBase(env, url);
  let i = null;
  try {
    i = await env.DB.prepare("SELECT " + COLS + " FROM store_items WHERE id=? AND status='published' AND kind!='Plan'").bind(id).first();
  } catch (e) {
  }
  if (!i) return new Response("Item not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });
  const path = itemPath(i);
  if (url.pathname.replace(/\/$/, "") !== path) return Response.redirect(url.origin + path, 301);
  try {
    const x = await env.DB.prepare("SELECT has_banner FROM store_items WHERE id=?").bind(i.id).first();
    i.has_banner = x && x.has_banner;
  } catch (e) {
  }
  let rel = [];
  try {
    rel = (await env.DB.prepare("SELECT id,name,kind,price_tzs FROM store_items WHERE status='published' AND kind!='Plan' AND id!=? AND (subject=? OR kind=?) ORDER BY (subject=?) DESC, downloads DESC LIMIT 6").bind(i.id, i.subject || "", i.kind, i.subject || "").all()).results || [];
  } catch (e) {
  }
  const canon = b + path, app = "/smart21store.html?item=" + i.id;
  const title = clip(i.name, 45) + " \u2013 " + (i.subject ? i.subject + " " : "") + (i.kind === "Files" ? "Download" : i.kind) + " | " + NAME;
  const price = money(i.price_tzs);
  const desc = clip((i.description || i.name) + " " + (i.file_type ? i.file_type + " \xB7 " : "") + price + " on " + NAME + ".", 158);
  const img = +i.has_banner ? b + "/api/store/banner/" + i.id : b + "/icons/store-512.png";
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: i.name,
    description: i.description || i.name,
    url: canon,
    image: img,
    category: i.subject || i.kind,
    brand: { "@type": "Brand", name: NAME },
    offers: { "@type": "Offer", url: canon, price: String(i.price_tzs || 0), priceCurrency: "TZS", availability: "https://schema.org/InStock" }
  };
  if (+i.rating_count > 0 && +i.rating_avg > 0) product.aggregateRating = { "@type": "AggregateRating", ratingValue: String(+(+i.rating_avg).toFixed(1)), reviewCount: String(+i.rating_count) };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NAME, item: b + "/" },
    { "@type": "ListItem", position: 2, name: i.name, item: canon }
  ] };
  const facts = [["Type", i.kind], ["Subject", i.subject], ["Level", i.grade], ["Format", i.file_type], ["Size", i.size_bytes ? size(i.size_bytes) : ""], ["Rating", +i.rating_count > 0 ? (+i.rating_avg).toFixed(1) + " / 5 (" + i.rating_count + " reviews)" : ""], ["Price", price]].filter((f) => f[1]).map((f) => "<div><dt>" + f[0] + "</dt><dd>" + esc2(f[1]) + "</dd></div>").join("");
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc2(title) + '</title><meta name="description" content="' + esc2(desc) + '"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + esc2(canon) + '"><link rel="icon" href="/icons/store-192.png"><link rel="apple-touch-icon" href="/icons/store-192.png"><meta name="theme-color" content="#0B6E4F"><meta property="og:type" content="product"><meta property="og:site_name" content="' + NAME + '"><meta property="og:title" content="' + esc2(clip(i.name, 70) + " | " + NAME) + '"><meta property="og:description" content="' + esc2(desc) + '"><meta property="og:url" content="' + esc2(canon) + '"><meta property="og:image" content="' + esc2(img) + '"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="' + esc2(clip(i.name, 70)) + '"><meta name="twitter:description" content="' + esc2(desc) + '">' + jsonLd(product) + jsonLd(crumbs) + '<style>:root{--p:#0B6E4F;--bg:#F1F7F3;--card:#fff;--tx:#1E2A24;--soft:#5B6470;--bd:#E7E9EC;--s:#FFD166}@media(prefers-color-scheme:dark){:root{--bg:#0F1712;--card:#17221C;--tx:#EDEFEC;--soft:#9DA8A2;--bd:#23302A}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 Nunito,"Segoe UI",Roboto,sans-serif}a{color:var(--p)}@media(prefers-color-scheme:dark){a{color:var(--s)}}header{padding:14px 18px;border-bottom:1px solid var(--bd)}header a{font:800 20px Poppins,"Segoe UI",sans-serif;text-decoration:none;color:var(--tx)}header b{color:var(--p)}main{max-width:760px;margin:auto;padding:22px 18px}nav.bc{font-size:14px;color:var(--soft)}h1{font:800 clamp(24px,5vw,34px)/1.2 Poppins,"Segoe UI",sans-serif;margin:10px 0}.card{background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:20px;margin:16px 0}dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:0}dt{font-size:12px;color:var(--soft);text-transform:uppercase;letter-spacing:.04em}dd{margin:0;font-weight:700}.btn{display:inline-block;background:var(--p);color:#fff;padding:12px 28px;border-radius:999px;font-weight:700;text-decoration:none;margin-top:8px}ul{padding-left:20px}footer{text-align:center;color:var(--soft);font-size:13px;padding:30px 16px}</style></head><body><header><a href="/">Smart21<b>Store</b></a></header><main><nav class="bc" aria-label="Breadcrumb"><a href="/">' + NAME + "</a> \u203A " + esc2(i.kind) + (i.subject ? " \u203A " + esc2(i.subject) : "") + "</nav><h1>" + esc2(i.name) + "</h1><p>" + esc2(i.description || "") + '</p><div class="card"><dl>' + facts + '</dl><a class="btn" href="' + app + '">' + (i.price_tzs > 0 ? "View and buy in the store" : "Get it free in the store") + "</a></div>" + (rel.length ? "<h2>More from Smart21Store</h2><ul>" + rel.map((r) => '<li><a href="' + esc2(itemPath(r)) + '">' + esc2(r.name) + "</a> \xB7 " + esc2(money(r.price_tzs)) + "</li>").join("") + "</ul>" : "") + '</main><footer>\xA9 Smart21Store \xB7 part of Smart21Brain \xB7 <a href="/">All items</a></footer></body></html>';
  return reply(html, "text/html; charset=utf-8", 600);
}
__name(itemPage, "itemPage");
async function home(request, env, url) {
  const b = siteBase(env, url);
  const m = url.searchParams.get("item");
  const canon = m && /^\d+$/.test(m) ? null : b + "/";
  let canonUrl = canon;
  if (!canonUrl) {
    try {
      const r = await env.DB.prepare("SELECT id,name FROM store_items WHERE id=? AND status='published' AND kind!='Plan'").bind(m).first();
      canonUrl = r ? b + itemPath(r) : b + "/";
    } catch (e) {
      canonUrl = b + "/";
    }
  }
  const tags = '<link rel="canonical" href="' + esc2(canonUrl) + '">' + (env.GOOGLE_SITE_VERIFICATION ? '<meta name="google-site-verification" content="' + esc2(env.GOOGLE_SITE_VERIFICATION) + '">' : "") + '<meta property="og:type" content="website"><meta property="og:site_name" content="' + NAME + '"><meta property="og:title" content="' + esc2(TITLE) + '"><meta property="og:description" content="' + esc2(DESC) + '"><meta property="og:url" content="' + esc2(canonUrl) + '"><meta property="og:image" content="' + esc2(b + "/icons/store-512.png") + '"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="' + esc2(TITLE) + '"><meta name="twitter:description" content="' + esc2(DESC) + '">' + jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: NAME, url: b + "/", description: DESC, inLanguage: "en" }) + jsonLd({ "@context": "https://schema.org", "@type": "Organization", name: "Smart21Brain", url: b + "/", logo: b + "/icons/store-512.png" });
  const asset = /* @__PURE__ */ __name((p) => new Request(new URL(p, url.origin), { method: "GET", headers: request.headers }), "asset");
  let res = await env.ASSETS.fetch(asset("/smart21store.html"));
  for (let n = 0; n < 2 && res.status >= 300 && res.status < 400 && res.headers.get("location"); n++) res = await env.ASSETS.fetch(asset(res.headers.get("location")));
  if (!res.ok) return res;
  const out = new HTMLRewriter().on("head", { element(e) {
    e.append(tags, { html: true });
  } }).transform(res);
  const h = new Headers(out.headers);
  h.set("content-type", "text/html; charset=utf-8");
  h.set("cache-control", "no-cache, must-revalidate");
  return new Response(out.body, { status: 200, headers: h });
}
__name(home, "home");
async function handleSeo(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url), p = url.pathname;
  if (p === "/robots.txt") return robots(env, url);
  if (p === "/sitemap.xml") return sitemap(env, url);
  const m = p.match(/^\/item\/(\d+)(?:-[^/]*)?\/?$/);
  if (m) return itemPage(env, url, m[1]);
  if (p === "/index.html") return Response.redirect(url.origin + "/" + url.search, 301);
  if (p === "/" || p === "/smart21store.html" || p === "/smart21store") return env.ASSETS ? home(request, env, url) : null;
  return null;
}
__name(handleSeo, "handleSeo");

// src/migrate.js
var COLS2 = {
  store_items: [
    ["license", "TEXT DEFAULT 'single'"],
    ["stock", "INTEGER"],
    ["ships_on", "TEXT"],
    ["has_icon", "INTEGER DEFAULT 0"],
    ["editors", "INTEGER DEFAULT 0"],
    ["has_banner", "INTEGER DEFAULT 0"],
    ["has_trailer", "INTEGER DEFAULT 0"],
    ["trailer_url", "TEXT"]
  ],
  store_sellers: [["verified", "INTEGER DEFAULT 0"]],
  store_orders: [
    ["delivery", "TEXT"],
    ["pickup", "TEXT"],
    ["gift_email", "TEXT"],
    ["ship", "TEXT DEFAULT 'received'"],
    ["gift_msg", "TEXT"]
  ],
  store_reviews: [["reply", "TEXT"], ["reply_at", "TEXT"]]
};
var TABLES = [
  "CREATE TABLE IF NOT EXISTS store_refunds(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER UNIQUE,user_id INTEGER,reason TEXT,status TEXT DEFAULT 'requested',created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_push_subs(user_id INTEGER,endpoint TEXT PRIMARY KEY)",
  "CREATE TABLE IF NOT EXISTS store_sub_seats(sub_id INTEGER,user_id INTEGER,PRIMARY KEY(sub_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_family(parent_id INTEGER,child_id INTEGER,status TEXT DEFAULT 'pending',PRIMARY KEY(parent_id,child_id))",
  "CREATE TABLE IF NOT EXISTS store_progress(user_id INTEGER,item_id INTEGER,pct INTEGER,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_api_keys(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,key_hash TEXT UNIQUE,name TEXT,calls INTEGER DEFAULT 0,revoked INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_rate(key_id INTEGER,minute INTEGER,n INTEGER,PRIMARY KEY(key_id,minute))",
  "CREATE TABLE IF NOT EXISTS store_searches(q TEXT PRIMARY KEY,n INTEGER)",
  "CREATE TABLE IF NOT EXISTS store_events(day TEXT,type TEXT,n INTEGER,PRIMARY KEY(day,type))",
  "CREATE TABLE IF NOT EXISTS store_samples(item_id INTEGER PRIMARY KEY,r2_key TEXT,type TEXT)",
  "CREATE TABLE IF NOT EXISTS store_review_votes(review_id INTEGER,user_id INTEGER,PRIMARY KEY(review_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_watch(user_id INTEGER,item_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_classes(id INTEGER PRIMARY KEY AUTOINCREMENT,teacher_id INTEGER NOT NULL,name TEXT NOT NULL,code TEXT UNIQUE NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_class_members(class_id INTEGER,user_id INTEGER,joined_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,user_id))",
  "CREATE TABLE IF NOT EXISTS store_class_items(class_id INTEGER,item_id INTEGER,pushed_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(class_id,item_id))",
  "CREATE TABLE IF NOT EXISTS store_lists(code TEXT PRIMARY KEY,user_id INTEGER UNIQUE,title TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS store_points_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,reason TEXT,ref TEXT,pts INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,reason,ref))",
  "CREATE TABLE IF NOT EXISTS store_points_state(user_id INTEGER PRIMARY KEY,last_day TEXT,streak INTEGER DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS store_item_views(item_id INTEGER,day TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,day))",
  "CREATE TABLE IF NOT EXISTS store_search_hits(item_id INTEGER,q TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(item_id,q))",
  "CREATE TABLE IF NOT EXISTS store_platform_files(item_id INTEGER,platform TEXT,r2_key TEXT,size_bytes INTEGER DEFAULT 0,filename TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(item_id,platform))",
  "CREATE TABLE IF NOT EXISTS store_auth_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,k TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_auth_attempts_k ON store_auth_attempts(k,created_at)"
];
var done = null;
function ensureSchema(env) {
  if (!done) done = run(env).catch((e) => {
    console.error("migrate", e && e.message);
    done = null;
  });
  return done;
}
__name(ensureSchema, "ensureSchema");
async function run(env) {
  const db = env.DB;
  for (const sql of TABLES) {
    try {
      await db.prepare(sql).run();
    } catch (e) {
      console.error("migrate table", e && e.message);
    }
  }
  for (const [table, cols] of Object.entries(COLS2)) {
    let have;
    try {
      have = new Set((await db.prepare(`PRAGMA table_info(${table})`).all()).results.map((r) => r.name));
    } catch (e) {
      continue;
    }
    if (!have.size) continue;
    for (const [name, def] of cols) {
      if (have.has(name)) continue;
      try {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`).run();
      } catch (e) {
        console.error("migrate col", table, name, e && e.message);
      }
    }
  }
}
__name(run, "run");

// src/index.js
function makeRouter() {
  const routes = [];
  const add = /* @__PURE__ */ __name((method) => (path, handler) => {
    const keys = [];
    const re = new RegExp("^" + path.replace(/:([A-Za-z_]+)/g, (_, k) => {
      keys.push(k);
      return "([^/]+)";
    }) + "/?$");
    routes.push({ method, re, keys, handler });
  }, "add");
  return {
    get: add("GET"),
    post: add("POST"),
    async handle(request, env, ctx) {
      const url = new URL(request.url);
      const method = request.method === "HEAD" ? "GET" : request.method;
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
        try {
          return await r.handler({ request, env, url, params, ctx });
        } catch (e) {
          console.error("route error", url.pathname, e && e.message);
          return new Response(JSON.stringify({ error: "server error: " + String(e && e.message || e).slice(0, 200) }), { status: 500, headers: { "content-type": "application/json" } });
        }
      }
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });
    }
  };
}
__name(makeRouter, "makeRouter");
var router = makeRouter();
registerStore(router);
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      await ensureSchema(env);
      const r = await router.handle(request, env, ctx);
      const h = new Headers(r.headers);
      h.set("x-robots-tag", "noindex");
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
    }
    const seo = await handleSeo(request, env, ctx);
    if (seo) return seo;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

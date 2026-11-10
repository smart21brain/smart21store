// Smart21Brain — shared auth helpers for Cloudflare Pages Functions.
// Uses Web Crypto (available in the Workers runtime) — no npm deps needed.

const PBKDF2_ITERATIONS = 100000;
const SESSION_DAYS = 30;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  if (typeof hashHex !== 'string' || hash.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(db, userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires).run();
  return { token, expires };
}

// Pass env.COOKIE_DOMAIN (e.g. ".smart21brain.com") so ONE sign-in works on the store and on Smart21Brain.
// Without a domain the cookie belongs to the current host only.
export function sessionCookie(token, expires, domain) {
  const expiresStr = new Date(expires).toUTCString();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresStr}` + (domain ? `; Domain=${domain}` : '');
}

export function clearSessionCookie(domain) {
  return 's21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' + (domain ? `; Domain=${domain}` : '');
}

// Every s21_session value the browser sent (an old host-only cookie and the shared-domain cookie can both exist).
export function getCookies(request, name) {
  const out = [];
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) out.push(part.slice(i + 1).trim());
  }
  return out;
}

// Looks up the session cookie and returns the user row, or null.
export async function getSessionUser(request, db) {
  for (const token of getCookies(request, 's21_session')) {
    const session = await db.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
    ).bind(token).first();
    if (!session) continue;
    const user = await db.prepare(
      'SELECT id, name, email, role, avatar_key, created_at FROM users WHERE id = ?'
    ).bind(session.user_id).first();
    if (user) return user;
  }
  return null;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
export function unauthorized(message = 'Not signed in') {
  return json({ error: message }, { status: 401 });
}
export function forbidden(message = 'Admins only') {
  return json({ error: message }, { status: 403 });
}
export function notFound(message = 'Not found') {
  return json({ error: message }, { status: 404 });
}

// Admins and teachers can publish learning content (videos, resources, quizzes,
// books, courses). Teachers can only change or delete what they created
// themselves; admins can change anything.
export function isStaff(user) {
  return !!user && (user.role === 'admin' || user.role === 'teacher');
}
export function canEditOwned(user, ownerId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'teacher' && ownerId != null && Number(ownerId) === Number(user.id);
}

export function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `item-${Date.now()}`;
}

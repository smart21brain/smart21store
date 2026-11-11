// Smart21Store SEO layer (runs inside the same Worker).
//   /robots.txt        crawler rules + sitemap link
//   /sitemap.xml       home page + every published item (built live from D1)
//   /item/<id>-<slug>  a real HTML page per item (title, text, price, structured data)
//   /  and /smart21store.html  the store app, with canonical, social tags, JSON-LD
//                      and a crawlable list of items added around it
// Canonical domain: set SITE_URL in wrangler.toml [vars] (e.g. "https://store.smart21brain.com").
// If it is not set, the address the visitor used is taken instead.

const NAME = 'Smart21Store';
const TITLE = 'Smart21Store – Lesson Packs, Worksheets, Apps & Learning Devices';
const DESC = 'Smart21Store is the learning store for Smart21Brain: lesson packs, worksheets, quizzes, apps, games and learning devices for teachers, parents and students. Prices in Tanzanian shillings.';

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const money = n => (n > 0 ? 'TSh ' + Number(n).toLocaleString('en-US') : 'Free');
const size = b => { b = +b || 0; return b >= 1048576 ? Math.round(b / 1048576) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B'; };
const jsonLd = o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const itemPath = i => '/item/' + i.id + (slug(i.name) ? '-' + slug(i.name) : '');
const siteBase = (env, url) => String(env.SITE_URL || url.origin).replace(/\/+$/, '');

const COLS = 'id,kind,name,description,subject,grade,file_type,size_bytes,price_tzs,rating_avg,rating_count,downloads,created_at,(SELECT MAX(created_at) FROM store_versions WHERE item_id=store_items.id) AS updated';

async function listItems(env, limit) {
  try {
    const q = "SELECT " + COLS + " FROM store_items WHERE status='published' AND kind!='Plan' ORDER BY downloads DESC, id" + (limit ? ' LIMIT ' + (+limit | 0) : '');
    return (await env.DB.prepare(q).all()).results || [];
  } catch (e) { return []; }
}

function reply(body, type, maxAge = 600, status = 200) {
  return new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'public, max-age=' + maxAge } });
}

// ---------- robots.txt / sitemap.xml ----------
function robots(env, url) {
  return reply([
    'User-agent: *',
    'Allow: /',
    // The store page reads its catalogue from this endpoint; Google needs it to draw the page.
    // Responses carry "X-Robots-Tag: noindex", so the JSON itself is never listed.
    'Allow: /api/store/items',
    'Disallow: /api/',
    'Disallow: /login.html',
    '',
    'Sitemap: ' + siteBase(env, url) + '/sitemap.xml',
    '',
  ].join('\n'), 'text/plain; charset=utf-8', 3600);
}

async function sitemap(env, url) {
  const b = siteBase(env, url), items = await listItems(env);
  const day = r => String(r.updated || r.created_at || '').slice(0, 10);
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  x += '<url><loc>' + b + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n';
  for (const i of items) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(day(i)) ? '<lastmod>' + day(i) + '</lastmod>' : '';
    x += '<url><loc>' + esc(b + itemPath(i)) + '</loc>' + d + '<changefreq>weekly</changefreq><priority>0.7</priority></url>\n';
  }
  return reply(x + '</urlset>\n', 'application/xml; charset=utf-8', 3600);
}

// ---------- one crawlable page per item ----------
async function itemPage(env, url, id) {
  const b = siteBase(env, url);
  let i = null;
  try { i = await env.DB.prepare("SELECT " + COLS + " FROM store_items WHERE id=? AND status='published' AND kind!='Plan'").bind(id).first(); } catch (e) {}
  if (!i) return new Response('Item not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });

  const path = itemPath(i);
  if (url.pathname.replace(/\/$/, '') !== path) return Response.redirect(url.origin + path, 301);

  try { const x = await env.DB.prepare('SELECT has_banner FROM store_items WHERE id=?').bind(i.id).first(); i.has_banner = x && x.has_banner; } catch (e) {} // needs backend/store-schema-v8.sql
  let rel = [];
  try {
    rel = (await env.DB.prepare("SELECT id,name,kind,price_tzs FROM store_items WHERE status='published' AND kind!='Plan' AND id!=? AND (subject=? OR kind=?) ORDER BY (subject=?) DESC, downloads DESC LIMIT 6").bind(i.id, i.subject || '', i.kind, i.subject || '').all()).results || [];
  } catch (e) {}

  const canon = b + path, app = '/smart21store.html?item=' + i.id;
  const title = clip(i.name, 45) + ' – ' + (i.subject ? i.subject + ' ' : '') + (i.kind === 'Files' ? 'Download' : i.kind) + ' | ' + NAME;
  const price = money(i.price_tzs);
  const desc = clip((i.description || i.name) + ' ' + (i.file_type ? i.file_type + ' · ' : '') + price + ' on ' + NAME + '.', 158);
  const img = +i.has_banner ? b + '/api/store/banner/' + i.id : b + '/icons/store-512.png';

  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: i.name, description: i.description || i.name,
    url: canon, image: img, category: i.subject || i.kind, brand: { '@type': 'Brand', name: NAME },
    offers: { '@type': 'Offer', url: canon, price: String(i.price_tzs || 0), priceCurrency: 'TZS', availability: 'https://schema.org/InStock' },
  };
  if (+i.rating_count > 0 && +i.rating_avg > 0) product.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(+(+i.rating_avg).toFixed(1)), reviewCount: String(+i.rating_count) };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: NAME, item: b + '/' },
    { '@type': 'ListItem', position: 2, name: i.name, item: canon },
  ] };

  const facts = [['Type', i.kind], ['Subject', i.subject], ['Level', i.grade], ['Format', i.file_type], ['Size', i.size_bytes ? size(i.size_bytes) : ''], ['Rating', +i.rating_count > 0 ? (+i.rating_avg).toFixed(1) + ' / 5 (' + i.rating_count + ' reviews)' : ''], ['Price', price]]
    .filter(f => f[1]).map(f => '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('');

  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '">'
    + '<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + esc(canon) + '">'
    + '<link rel="icon" href="/icons/store-192.png"><link rel="apple-touch-icon" href="/icons/store-192.png"><meta name="theme-color" content="#0B6E4F">'
    + '<meta property="og:type" content="product"><meta property="og:site_name" content="' + NAME + '"><meta property="og:title" content="' + esc(clip(i.name, 70) + ' | ' + NAME) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + esc(canon) + '"><meta property="og:image" content="' + esc(img) + '">'
    + '<meta name="twitter:card" content="summary"><meta name="twitter:title" content="' + esc(clip(i.name, 70)) + '"><meta name="twitter:description" content="' + esc(desc) + '">'
    + jsonLd(product) + jsonLd(crumbs)
    + '<style>:root{--p:#0B6E4F;--bg:#F1F7F3;--card:#fff;--tx:#1E2A24;--soft:#5B6470;--bd:#E7E9EC;--s:#FFD166}@media(prefers-color-scheme:dark){:root{--bg:#0F1712;--card:#17221C;--tx:#EDEFEC;--soft:#9DA8A2;--bd:#23302A}}'
    + '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 Nunito,"Segoe UI",Roboto,sans-serif}a{color:var(--p)}@media(prefers-color-scheme:dark){a{color:var(--s)}}'
    + 'header{padding:14px 18px;border-bottom:1px solid var(--bd)}header a{font:800 20px Poppins,"Segoe UI",sans-serif;text-decoration:none;color:var(--tx)}header b{color:var(--p)}'
    + 'main{max-width:760px;margin:auto;padding:22px 18px}nav.bc{font-size:14px;color:var(--soft)}h1{font:800 clamp(24px,5vw,34px)/1.2 Poppins,"Segoe UI",sans-serif;margin:10px 0}'
    + '.card{background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:20px;margin:16px 0}dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:0}dt{font-size:12px;color:var(--soft);text-transform:uppercase;letter-spacing:.04em}dd{margin:0;font-weight:700}'
    + '.btn{display:inline-block;background:var(--p);color:#fff;padding:12px 28px;border-radius:999px;font-weight:700;text-decoration:none;margin-top:8px}ul{padding-left:20px}footer{text-align:center;color:var(--soft);font-size:13px;padding:30px 16px}</style></head><body>'
    + '<header><a href="/">Smart21<b>Store</b></a></header><main>'
    + '<nav class="bc" aria-label="Breadcrumb"><a href="/">' + NAME + '</a> › ' + esc(i.kind) + (i.subject ? ' › ' + esc(i.subject) : '') + '</nav>'
    + '<h1>' + esc(i.name) + '</h1><p>' + esc(i.description || '') + '</p>'
    + '<div class="card"><dl>' + facts + '</dl><a class="btn" href="' + app + '">' + (i.price_tzs > 0 ? 'View and buy in the store' : 'Get it free in the store') + '</a></div>'
    + (rel.length ? '<h2>More from Smart21Store</h2><ul>' + rel.map(r => '<li><a href="' + esc(itemPath(r)) + '">' + esc(r.name) + '</a> · ' + esc(money(r.price_tzs)) + '</li>').join('') + '</ul>' : '')
    + '</main><footer>© Smart21Store · part of Smart21Brain · <a href="/">All items</a></footer></body></html>';
  return reply(html, 'text/html; charset=utf-8', 600);
}

// ---------- the store app itself, with SEO tags added ----------
async function home(request, env, url) {
  const b = siteBase(env, url);
  const m = url.searchParams.get('item');
  const canon = m && /^\d+$/.test(m) ? null : b + '/';

  let canonUrl = canon;
  if (!canonUrl) {
    try {
      const r = await env.DB.prepare("SELECT id,name FROM store_items WHERE id=? AND status='published' AND kind!='Plan'").bind(m).first();
      canonUrl = r ? b + itemPath(r) : b + '/';
    } catch (e) { canonUrl = b + '/'; }
  }

  const tags = '<link rel="canonical" href="' + esc(canonUrl) + '">'
    + (env.GOOGLE_SITE_VERIFICATION ? '<meta name="google-site-verification" content="' + esc(env.GOOGLE_SITE_VERIFICATION) + '">' : '')
    + '<meta property="og:type" content="website"><meta property="og:site_name" content="' + NAME + '"><meta property="og:title" content="' + esc(TITLE) + '">'
    + '<meta property="og:description" content="' + esc(DESC) + '"><meta property="og:url" content="' + esc(canonUrl) + '"><meta property="og:image" content="' + esc(b + '/icons/store-512.png') + '">'
    + '<meta name="twitter:card" content="summary"><meta name="twitter:title" content="' + esc(TITLE) + '"><meta name="twitter:description" content="' + esc(DESC) + '">'
    + jsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: b + '/', description: DESC, inLanguage: 'en' })
    + jsonLd({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Smart21Brain', url: b + '/', logo: b + '/icons/store-512.png' });

  // Fetch the static page from the assets binding (follow the redirect Workers Assets may add for ".html").
  const asset = p => new Request(new URL(p, url.origin), { method: 'GET', headers: request.headers });
  let res = await env.ASSETS.fetch(asset('/smart21store.html'));
  for (let n = 0; n < 2 && res.status >= 300 && res.status < 400 && res.headers.get('location'); n++) res = await env.ASSETS.fetch(asset(res.headers.get('location')));
  if (!res.ok) return res;

  const out = new HTMLRewriter()
    .on('head', { element(e) { e.append(tags, { html: true }); } })
    .transform(res);
  const h = new Headers(out.headers);
  h.set('content-type', 'text/html; charset=utf-8');
  h.set('cache-control', 'no-cache, must-revalidate');
  return new Response(out.body, { status: 200, headers: h });
}

// Returns a Response for SEO routes, or null so the caller carries on.
export async function handleSeo(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url), p = url.pathname;
  if (p === '/robots.txt') return robots(env, url);
  if (p === '/sitemap.xml') return sitemap(env, url);
  const m = p.match(/^\/item\/(\d+)(?:-[^/]*)?\/?$/);
  if (m) return itemPage(env, url, m[1]);
  if (p === '/index.html') return Response.redirect(url.origin + '/' + url.search, 301);
  if (p === '/' || p === '/smart21store.html' || p === '/smart21store') return env.ASSETS ? home(request, env, url) : null;
  return null;
}

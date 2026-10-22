// Smart21Store Worker entry. Tiny router matching what store-api.js expects:
// handlers receive {request, env, url, params, ctx} and are registered with r.get / r.post.
import { registerStore } from './store-api.js';

function makeRouter() {
  const routes = [];
  const add = method => (path, handler) => {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handler });
  };
  return {
    get: add('GET'),
    post: add('POST'),
    async handle(request, env, ctx) {
      const url = new URL(request.url);
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        try {
          return await r.handler({ request, env, url, params, ctx });
        } catch (e) {
          return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
        }
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    },
  };
}

const router = makeRouter();
registerStore(router);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return router.handle(request, env, ctx);
    // Home page: open the store
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return Response.redirect(url.origin + '/smart21store.html', 302);
    }
    // Any other path: serve the static files (page, icons, manifest, service worker)
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

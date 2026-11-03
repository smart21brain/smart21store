# Smart21Store: Google (SEO) setup

## What was added
- `src/seo.js` (new) and a small change in `src/index.js`
- `/robots.txt` and `/sitemap.xml`, both built live from the database
- `/item/<id>-<name>`: a real HTML page for every published item (title, description, price, rating, related items, Product + Breadcrumb structured data). Old links like `/item/3` redirect to the full address.
- The store page (`/` and `/smart21store.html`) now has a proper title and description, a canonical link, social-share tags (Open Graph / Twitter), WebSite + Organization structured data, and a visible "Browse Smart21Store" list of links to the items so Google can discover them.
- `/api/*` answers are marked `noindex`. `login.html` is `noindex`.
- `wrangler.toml`: the Worker now runs first for the store page and SEO routes (needed to add the tags).

## Do these 4 things (about 10 minutes)
1. In `wrangler.toml`, remove the `#` from the `[vars]` lines and set your real address, e.g.
   `SITE_URL = "https://store.smart21brain.com"` (no slash at the end). Then `npx wrangler deploy`.
   Use a custom domain, not `*.workers.dev`, if you want to rank. Cloudflare dashboard > Workers > smart21store > Settings > Domains & Routes.
2. Open https://search.google.com/search-console and add your site (Domain or URL-prefix).
   If it asks for an HTML tag, copy only the token and put it in `GOOGLE_SITE_VERIFICATION` in `[vars]`, redeploy, then click Verify.
3. In Search Console > Sitemaps, submit `sitemap.xml`.
4. In Search Console > URL inspection, paste your home address and click "Request indexing". Do the same for 2 or 3 item pages.

Check after deploy: `/robots.txt`, `/sitemap.xml` and `/item/1` open in the browser, and View Source on `/` shows `<link rel="canonical"`.

## Tips that matter for ranking
- Give every item a clear name and a real description of 1 to 2 sentences (that text is used as the Google snippet). Items with empty descriptions rank poorly.
- Link to the store from smart21brain.com (menu, footer, course pages). Links from your main site are the strongest signal.
- Google takes days to weeks to start showing a new site. The sitemap refreshes itself when you publish new items.
- Optional: add a 1200x630 share image at `public/icons/` and set it as `og:image` in `src/seo.js`.

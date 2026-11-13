# Ascelcafe — Café & Sweets (demo by AscelStack)

Animated one-page café website. Ascelcafe is a fictional café, designed and developed by
[AscelStack](https://ascelstack.com) as a showcase demo for café and restaurant clients.

© 2026 AscelStack. All rights reserved.

**Stack:** Astro · GSAP (ScrollTrigger, SplitText, CustomEase) · Lenis smooth scroll · Three.js (procedural 3D food)

## Run

```bash
npm install
npm run dev      # http://localhost:4321
npm run build && npm run preview
```

## Deploy — Cloudflare Pages

Config files: `wrangler.jsonc` (project `ascelcafe`, output `dist/`), `.node-version` (Node 22),
`public/_headers` (security + cache headers), `public/robots.txt`, `src/pages/404.astro`.

**Option A — CLI (direct upload)**

```bash
npx wrangler login
npm run deploy          # astro build && wrangler pages deploy
```

The first run creates the `ascelcafe` Pages project. Test locally on the Pages runtime with `npm run preview:cf`.

**Option B — Git integration (auto-deploy on push)**

Push the repo to GitHub, then in Cloudflare: Workers & Pages → Create → Pages → Connect to Git.
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`

**Subdomain:** Pages project → Custom domains → add e.g. `cafe.ascelstack.com`
(Cloudflare adds the CNAME automatically when ascelstack.com is on Cloudflare DNS).
Then set `site: 'https://cafe.ascelstack.com'` in `astro.config.mjs`.

## Branding

- AscelStack logo: `public/brand/ascelstack-logo.svg` — replace with the official logo (same file name; SVG or change the `src` to a PNG).
- Backlinks to https://ascelstack.com (dofollow): topbar button, hero kicker, floating "Demo" badge,
  footer card, footer links, footer credit, copyright line, plus meta / JSON-LD author info.
- `/model` is a dev-only 3D viewer (noindex).

## Sections & animations

| # | Section | Motion |
|---|---------|--------|
| 0 | Intro | 5 colour panels, bouncing cup, cycling messages, real load bar → letters drop (bounce) → "Ready!" → panels lift |
| 1 | Hero | 3D toast w/ flag + floating beans/tomatoes/sugar, mouse/gyro parallax, letters pop, rotating stamp, scroll scale-out |
| 2 | Marquees | Infinite bands, speed boosted by scroll velocity, scrubbed tilt |
| 3 | Definition | Perforated stamp card, words light up while scrolling, parallax photos |
| 4 | Build (pinned) | Toast assembles: bread bounce → tomato spread → avocado fan → egg drop → salt rain → spin → mug + churros twist |
| 5 | Gallery (pinned) | Horizontal scroll, cards straighten, image parallax, titles pop |
| 6 | Names | Two counter-scrolling name rows, jelly titles, magnetic CTA |
| 7 | Amigos (pinned) | Ink-illustration → photo wipe with yellow line, brush-wipe script |
| 8 | Hours | Live open/closed status, today highlighted, cups clink on scroll |
| 9 | Visit | Outline marquee, map roads draw on scroll, pin drops & bobs, 3D tilt |
| 10 | Finale | LET'S GOOO! elastic letters, 2D physics rain of rendered 3D food (push / click), AscelStack credit |

Global: custom cursor with labels, magnetic buttons, topbar badge spins with scroll velocity, wavy section edges, reduced-motion fallback.

Files: `src/pages/index.astro`, `src/styles/main.css`, `src/scripts/*.js` (`gl.js` + `tostada.js` = Three.js scenes).

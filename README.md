# VISAT INSTRUMENTS – Website, API and Admin Panel

Website for VISAT INSTRUMENTS, Ahmedabad, with an Express + MongoDB API and an admin panel for managing site content.

- **Frontend** (repo root) – React + Vite + Tailwind CSS public site, plus the admin panel at `/admin` (lazy-loaded)
- **API** (`server/`) – Express 5, MongoDB Atlas, Cloudinary image storage

## Getting started

```bash
# Frontend
npm install
npm run dev        # http://localhost:5173 – /api is proxied to http://localhost:5000
npm run build      # production build in dist/
npm run preview    # serve the build

# API
cd server
npm install
cp .env.example .env     # fill in MongoDB, JWT/CSRF secrets, Cloudinary, initial admin
npm run seed:admin       # create the first admin (then remove INITIAL_ADMIN_PASSWORD from .env)
npm run seed:content     # load the approved content from src/data into MongoDB
npm run dev              # http://localhost:5000/api
```

Set `API_PROXY_TARGET` to point the Vite proxy at a different API address.

### API scripts (`server/`)

| Script | Purpose |
| --- | --- |
| `npm run dev` / `npm start` | Run the API (watch mode / normal) |
| `npm run seed:admin` | Create the initial admin from `INITIAL_ADMIN_*` |
| `npm run seed:content` | Seed approved business content |
| `npm run media:check` | Verify Cloudinary configuration |
| `npm run media:cleanup` | Process the media cleanup queue |
| `npm run admin:reset-password` | Reset an admin password |
| `npm test` | Unit and database tests (Vitest) |

## Structure

**Frontend (`src/`)**
- `pages/` – Home, About, Products, Product detail, Weighbridge Solutions, Services, Gallery, Reviews, Contact, 404
- `admin/` – admin panel: `api/`, `auth/` (login, protected routes, roles), `components/`, `hooks/`, `pages/`
- `components/` – `layout/`, `common/` (incl. reviews carousel), `products/`
- `hooks/usePublicSite.js` – loads `GET /api/public/site` (cached, refreshed every 60 s)
- `services/catalogService.js` – static catalogue data from `src/data/`
- `data/` – approved business content; also the source for `seed:content`
- `utils/` – API clients, WhatsApp link builder, form validation

**API (`server/src/`)**
- `app.js`, `server.js` – app setup and entry point
- `config/`, `middleware/`, `routes/`, `controllers/`, `validators/`, `services/`, `models/`, `utils/`
- `scripts/` – seed, media and admin maintenance scripts

## Admin panel

Sign in at `/admin`. Admin and Editor roles are supported. Sections: dashboard, business profile, products (with images), categories, brands, services, gallery, reviews moderation, enquiries, website content, SEO, branding & media, users (admin only).

Security: JWT in an HTTP-only cookie backed by DB sessions, bcrypt, login lockout, CSRF protection (origin check + per-session token), MongoDB-backed rate limiting, helmet and a CORS allowlist (`ALLOWED_ORIGINS`).

## Analytics & logs (Admin only)

Admin panel → **Analytics & Logs**: Overview, Visitor analytics, Visitor activity, System logs, Admin activity. Editors cannot open these pages, and the APIs (`/api/analytics/*`, `/api/logs/*`) return 403 for them.

- **Consent first:** the website shows a consent banner. Nothing is tracked, and Google Analytics is not loaded, until the visitor clicks "Allow analytics". "Cookie preferences" in the footer changes the choice later. Global Privacy Control counts as "no".
- **First-party tracking** (`src/services/analytics.js` → `POST /api/public/track`, batched): page views, product views, WhatsApp/phone/email clicks, enquiry and review submissions. No cookies, raw IPs, user agents or form contents are stored. The visitor key is a keyed hash that changes daily. Locations come from Vercel's country/region headers. Bots are ignored.
- **Google Analytics 4 (optional):** set `VITE_GA4_ID=G-XXXXXXX` in Vercel (or `.env.local`) and rebuild. It loads only after consent, with ad storage, ad personalisation and Google signals turned off.
- **System logs:** server errors, database and Cloudinary failures, failed sign-ins, CSRF/permission/rate-limit blocks. Secrets and personal fields are redacted.
- **Admin activity:** sign-in/out, password and user/role changes, and every content change (products, pricing, categories, brands, services, gallery, branding, reviews moderation, enquiries, business profile, content, SEO). Changed fields are listed; values are kept only for non-sensitive fields such as prices and status.
- **Retention (MongoDB TTL indexes):** analytics 13 months, system logs 90 days, admin activity 2 years. `TRACK_RATE_LIMIT_MAX` (default 150 per window per IP) limits the tracking endpoint.

## Customer reviews

Visitors submit reviews on `/reviews`. New reviews stay pending; they appear on the site only after an admin approves and publishes them with customer consent recorded.

## Testing

```bash
cd server && npm test   # unit + database tests (needs MONGODB_URI_TEST; the DB name must end in "_test")
npm run test:e2e        # Playwright admin e2e tests (from the repo root)
```

The e2e tests start the API in test mode (port 5055) against the Atlas test database and a separate Cloudinary test folder, build the site and serve it on port 4175, then run in the locally installed Chrome. They need `server/.env` with `MONGODB_URI_TEST` and Cloudinary settings.

## Notes

- Products, About, Contact and the Footer still read static data via `catalogService`; Home, Product detail and Reviews also load data from the API.
- Specifications, capacities and prices show "On enquiry" until confirmed.
- The contact form validates input but does **not** yet send submissions; it offers WhatsApp instead. The `POST /api/public/enquiries` endpoint exists but is not wired up yet.
- Uses `BrowserRouter`; the host must rewrite unknown paths to `index.html` (`vercel.json` covers Vercel, `public/_redirects` covers Netlify).
- Never commit `server/.env`; keep Cloudinary and other secrets server-side only (no `VITE_*` variables).

## Deployment

The static site is hosted on Vercel at https://visat-instruments.vercel.app (project `visat-instruments`).
To publish changes: `npx vercel deploy --prod` from this folder.

For production, set the API environment variables (production MongoDB, secrets, Cloudinary folder, `ALLOWED_ORIGINS`, `TRUST_PROXY`) in Vercel's Environment Variables.

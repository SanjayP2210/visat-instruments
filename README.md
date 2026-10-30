# VISAT INSTRUMENTS – Website (Phase 1)

Static React + Vite + Tailwind CSS website for VISAT INSTRUMENTS, Ahmedabad.

```bash
npm install
npm run dev      # local development
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Structure

- `src/data/` – business details, product catalogue, services, gallery (plain JS objects)
- `src/services/catalogService.js` – the only place UI reads catalogue data from; swap for API calls in Phase 2
- `src/components/` – `layout/`, `common/`, `products/`
- `src/pages/` – Home, About, Products, Product detail, Weighbridge Solutions, Services, Gallery, Contact, 404
- `src/utils/` – WhatsApp link builder, form validation
- `public/images/products/` – original product photographs

## Notes

- Specifications, capacities and prices are shown as "On enquiry" until confirmed.
- Services are labelled "To be confirmed".
- The contact form validates input but does **not** send or store submissions; it offers to send the enquiry via WhatsApp instead. Phase 2 will POST to `/api/enquiries`.
- Uses `BrowserRouter`; the host must rewrite unknown paths to `index.html` (`vercel.json` covers Vercel, `public/_redirects` covers Netlify).

## Owner information form

Private, Google-authenticated form at `/owner-information` (not linked from the public site) that saves
drafts, product photos and submissions to Google Sheets and Drive through a Google Apps Script API.

- Frontend: `src/owner/` (lazy-loaded); data services in `src/owner/services/`
- API: `apps-script/Code.gs`; tests: `node apps-script/test/run-tests.mjs`
- Setup and deployment: [docs/owner-information/SETUP.md](docs/owner-information/SETUP.md)
- Sheets schema and MongoDB mapping: [docs/owner-information/DATA-MODEL.md](docs/owner-information/DATA-MODEL.md)
- Needs `VITE_GOOGLE_CLIENT_ID` and `VITE_OWNER_API_URL` (see `.env.example`); without them the page shows "setup pending".

## Deployment

Hosted on Vercel at https://visat-instruments.vercel.app (project `visat-instruments`). Pushing to
`main` deploys automatically; other branches get preview deployments.

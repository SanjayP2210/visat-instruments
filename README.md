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

## Deployment

Hosted on Vercel at https://visat-instruments.vercel.app (project `visat-instruments`).
To publish changes: `npx vercel deploy --prod` from this folder.

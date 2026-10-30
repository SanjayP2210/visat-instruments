# Owner Information – Google setup and deployment

The private form at `/owner-information` saves to **Google Sheets** and **Google Drive** through a
**Google Apps Script web app** (`apps-script/Code.gs`). Until the steps below are done, the page shows
"setup pending" and nothing can be saved.

## How access is secured

- The owner and developer sign in with **Google Identity Services** in the browser, which issues a
  signed Google **ID token** (valid for 1 hour).
- Every API request carries that token. The Apps Script verifies it **server-side** with Google
  (`oauth2.googleapis.com/tokeninfo`): audience must equal your OAuth client ID, issuer must be Google,
  the token must be unexpired and the email verified.
- The email must be on an **allowlist** stored in Script Properties (`OWNER_EMAILS`,
  `DEVELOPER_EMAILS`). Anyone else is refused.
- Owners can only read and change their own records; developers can read everything and change review
  status. Payloads are re-validated and sanitised on the server; uploads are checked by type, size,
  file signature and SHA-256.
- The Sheet and the Drive folder stay **private** to the script-owner account and are shared
  (view-only) with the allowlisted accounts. Photos reach the browser only through the authorised API.
- No private keys or service-account credentials are used or stored anywhere in the frontend. The two
  `VITE_*` values are public identifiers.

The web app is deployed with access **"Anyone"** because Apps Script cannot receive Google login
cookies from another website; the ID-token check above is what protects it. If your Google Workspace
policy forbids "Anyone" deployments, see [Fallback: Cloud Run](#fallback-cloud-run).

## What you need

- The Google account that will **own the data** (recommended: the business owner's account). The
  Sheet, Drive folder and script live in this account.
- The owner's Google email(s) and the developer's Google email(s).
- About 20 minutes.

## 1. Create the OAuth client (Google Cloud Console)

1. Go to <https://console.cloud.google.com/> → create a project, e.g. `visat-owner-information`.
2. **APIs & Services → OAuth consent screen**: User type **External**, app name
   `VISAT INSTRUMENTS Owner Information`, support email, developer contact. No extra scopes are needed
   (sign-in only uses `openid`, `email`, `profile`).
   While the app is in **Testing**, add the owner and developer emails under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://visat-instruments.vercel.app`
     - `http://localhost:5173` (local development)
     - `http://localhost:4173` (local preview)
   - No redirect URIs are needed.
4. Copy the **Client ID** (`…apps.googleusercontent.com`). It is not a secret.

## 2. Create the Apps Script project

Signed in as the data-owner account:

1. Go to <https://script.google.com/> → **New project**, name it `VISAT Owner Information API`.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repository.
3. **Project Settings** → tick **Show "appsscript.json" manifest file in editor**, then replace
   `appsscript.json` with `apps-script/appsscript.json`.
4. **Project Settings → Script Properties → Add**:

   | Property | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | the Client ID from step 1 |
   | `OWNER_EMAILS` | owner email(s), comma-separated |
   | `DEVELOPER_EMAILS` | developer email(s), comma-separated |

5. In the editor choose the function **`setup`** → **Run** → approve the permissions (Sheets, Drive,
   external requests). `setup` creates:
   - the spreadsheet **VISAT INSTRUMENTS – Owner Information** with all sheets and headers,
   - the Drive folder tree below, set to private and shared with the allowlisted emails,
   - the `SPREADSHEET_ID` and `ROOT_FOLDER_ID` Script Properties.

   The execution log prints the Sheet and folder links. Running `setup` again is safe.

```
VISAT-INSTRUMENTS/
  Owner-Submissions/
    Drafts/        one JSON copy per draft, updated in place
    Submitted/     <reference>-v<version>.json per submission
  Product-Images/
    Weighing-Scales/  Indicators/  Junction-Boxes/  Weighbridges/  Other/
  Business-Documents/
```

`Other/` holds photos for products outside the four named folders (communication modules, software).

## 3. Deploy the web app

1. **Deploy → New deployment → Select type: Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. **Deploy**, then copy the **Web app URL** ending in `/exec`.
4. Check it: opening the URL should show
   `{"ok":true,"data":{"service":"visat-owner-information","configured":true}}`.

When you change `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version** so
the URL stays the same.

## 4. Configure the website

Local development – create `.env.local` (git-ignored) from `.env.example`:

```
VITE_GOOGLE_CLIENT_ID=<client id>
VITE_OWNER_API_URL=<web app /exec URL>
```

Production – Vercel → project `visat-instruments` → **Settings → Environment Variables**: add the same
two variables for Production (and Preview if wanted), then redeploy (push to `main`).

## 5. Verify

1. Open `/owner-information`, sign in with the **owner** account → the form opens; change a field and
   wait for "Saved to cloud"; check the `Drafts` sheet.
2. Upload a photo → it appears in `Product-Images/<category>/` and in `File_References`.
3. Submit → a reference like `VI-20261030-AB2CD` is shown; rows appear in `Submissions`, `Products`, etc.
4. Sign in with the **developer** account in another browser → **Submissions** → open it → request
   changes / approve.
5. Sign in with any other Google account → access is refused.

## Managing access

- Add or remove people by editing `OWNER_EMAILS` / `DEVELOPER_EMAILS`. The allowlist is read on every
  request, so the change applies immediately.
- After adding someone, run `setup` again to share the Sheet and Drive folder with them. When removing
  someone, also remove them from the Sheet's and folder's **Share** settings.

## Tests

`node apps-script/test/run-tests.mjs` runs `Code.gs` against in-memory fakes of Sheets, Drive and token
verification and checks authentication, permissions, drafts, uploads, submission and review rules.

## Limits

- Photos: JPG/PNG/WebP, max 5 MB each, 12 per product (checked in the browser and on the server).
- Form text: about 45,000 characters in total (a Google Sheets cell holds 50,000).
- Apps Script consumer quotas apply (e.g. 20,000 URL fetches/day for token checks, cached per token);
  ample for this form.

## Fallback: Cloud Run

If the Apps Script cannot be deployed with "Anyone" access (some Workspace policies block it), host the
same API on **Cloud Run / Cloud Functions** with the same protocol (`POST {action, idToken, requestId,
payload}` → `{ok, data | error}`): verify the ID token with `google-auth-library`, check the same
allowlists, and use the Sheets/Drive APIs with the service's own identity (no keys in the frontend).
Only `VITE_OWNER_API_URL` changes on the website.

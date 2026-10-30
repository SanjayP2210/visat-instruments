# Owner Information – data model

The form is one JSON document per **form** (`formId`, e.g. `FRM-<uuid>`), with stable IDs for every
product (`PRD-…`), specification (`SPEC-…`) and service (`SVC-…`). The frontend only talks to the
service layer in `src/owner/services/`; replacing the Apps Script API with a Node/MongoDB API means
re-implementing those services (or the same HTTP protocol), not the UI.

## Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → CHANGES_REQUESTED → (owner edits) → SUBMITTED (version + 1) → … → APPROVED
                 ↘ CHANGES_REQUESTED / APPROVED directly from SUBMITTED are also allowed
```

- The owner can edit while the status is `DRAFT` or `CHANGES_REQUESTED`.
- Each submission increments `version`; normalised rows are written per version, so earlier versions
  remain as history. The `reference` (`VI-YYYYMMDD-XXXXX`) stays the same across versions.
- Every status change is appended to `Submissions.historyJson` with who and when.

## Sheets

Common conventions: timestamps are ISO-8601 UTC; `ownerEmail` is the verified Google email; text that
starts with `= + - @` is stored with a leading `'` so Sheets never evaluates it as a formula.

| Sheet | Key | Columns | Notes |
|---|---|---|---|
| **Drafts** | `formId` | ownerEmail, status, revision, dataJson, draftFileId, lastRequestId, createdAt, updatedAt | One row per form, updated in place. `revision` prevents overwrites from another tab; `lastRequestId` makes retries idempotent. |
| **Submissions** | `formId` | reference, ownerEmail, status, version, submittedAt, reviewedBy, reviewNote, historyJson, snapshotJson, snapshotFileId, lastRequestId, createdAt, updatedAt | One row per form; `snapshotJson` is the latest submitted document. |
| **Business_Profile** | `recordId` = `BUS-<formId>-v<n>` | formId, version, ownerEmail, businessName, contactPerson, phone, whatsapp, email, address, city, state, pincode, gstin, description, workingHours, serviceAreas, highlightsJson, createdAt, updatedAt | Business highlights are stored as JSON here. |
| **Products** | `recordId` = `<productId>-v<n>` | productId, formId, version, ownerEmail, name, category, imageCategory, description, capacity, modelNumber, brand, priceNote, applications, warranty, imageFileIds, createdAt, updatedAt | `imageFileIds` = comma-separated Drive file IDs. |
| **Product_Specifications** | `recordId` = `<productId>-<specId>-v<n>` | specId, productId, formId, version, label, value, unit, sortOrder, createdAt | Child of Products via `productId` + `version`. |
| **Services** | `recordId` = `<serviceId>-<formId>-v<n>` | serviceId, formId, version, type, offered, description, coverageArea, charges, turnaround, createdAt | `offered`: yes / no / to-confirm. |
| **Weighbridge** | `recordId` = `WB-<formId>-v<n>` | formId, version, offersHardware, offersSoftware, platformSizes, capacities, foundationTypes, loadCells, softwareFeatures, installationTime, notes, createdAt | |
| **Website_Feedback** | `recordId` = `FB-<formId>-v<n>` | formId, version, ownerEmail, overallRating, contentApproval, likes, changes, missingInfo, photosToReplace, otherComments, createdAt | |
| **File_References** | `fileId` (Drive ID) | formId, productId, ownerEmail, imageCategory, originalName, storedName, mimeType, sizeBytes, sha256, folderId, status, createdAt, updatedAt | `status`: ACTIVE / REMOVED. Same `formId + productId + sha256` is never stored twice. Removed photos stay in Drive for audit. |

Relationships: `Submissions.formId` → `Drafts.formId` (1:1) → `Products.formId` (1:n per version) →
`Product_Specifications.productId` (1:n) and `File_References.productId` (1:n).

## Drive

- Photos: `Product-Images/<folder>/<productId>_<yyyyMMdd-HHmmss>_<sha256[0:10]>.<ext>`
  (`folder` from the product category: Weighing-Scales, Indicators, Junction-Boxes, Weighbridges, Other).
- Draft copies: `Owner-Submissions/Drafts/<formId>.json` (updated in place).
- Submitted snapshots: `Owner-Submissions/Submitted/<reference>-v<version>.json`.

## Future MongoDB mapping

| Sheets | MongoDB collection | Shape |
|---|---|---|
| Drafts | `drafts` | `{ _id: formId, ownerEmail, status, revision, data, createdAt, updatedAt }` – `data` is the form document as-is. |
| Submissions + history | `submissions` | `{ _id: formId, reference, ownerEmail, status, version, submittedAt, review: { by, note }, history: [...], snapshot }` |
| Business_Profile (+ highlights) | `businessProfiles` | `{ formId, version, ...businessFields, highlights: {...} }` |
| Products + Product_Specifications | `products` | `{ _id: productId, formId, version, name, category, ..., specifications: [{ specId, label, value, unit }], imageIds: [...] }` – specs embedded. |
| Services | `services` | `{ _id: serviceId, formId, version, type, offered, ... }` |
| Weighbridge | `weighbridgeOfferings` | one document per `formId` + `version` |
| Website_Feedback | `websiteFeedback` | one document per `formId` + `version` |
| File_References | `files` | `{ _id: fileId, formId, productId, storage: { provider: 'gdrive', folderId }, originalName, mimeType, sizeBytes, sha256, status }` |

Migration: export each sheet as rows, parse the `*Json` columns, group child rows by their parent IDs,
and insert. IDs are already globally unique strings, so they can become `_id` values directly.

## API protocol

`POST` (body `text/plain`, JSON): `{ action, idToken, requestId, payload }` → `{ ok: true, data }` or
`{ ok: false, error: { code, message, details? } }`.

| Action | Who | Purpose |
|---|---|---|
| `whoami` | owner, developer | verified identity and role |
| `draft.list`, `draft.get` | owner (own), developer (all) | read drafts |
| `draft.save` | owner | create/update draft (`baseRevision`, idempotent by `requestId`) |
| `submission.submit` | owner | validate, save, write normalised rows and snapshot |
| `submission.list`, `submission.get` | owner (own), developer (all) | read submissions |
| `submission.setStatus` | developer | review transitions (note required for changes) |
| `image.upload` / `image.remove` | owner | store / deactivate a photo |
| `image.get` | owner (own), developer (all) | photo bytes for previews |

Error codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_CONFIGURED`, `BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`,
`LOCKED`, `VALIDATION_FAILED`, `PENDING_UPLOADS`, `INVALID_FILE`, `TOO_MANY_FILES`, `TOO_LARGE`,
`INVALID_TRANSITION`, `BUSY`, `SERVER_ERROR`, `UNKNOWN_ACTION`.

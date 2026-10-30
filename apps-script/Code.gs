/**
 * VISAT INSTRUMENTS – Owner Information API (Google Apps Script web app).
 *
 * Deployment: Execute as "Me", Who has access "Anyone".
 * The URL is public, but every request must carry a Google ID token. The token is
 * verified with Google on every request (audience, issuer, expiry, verified email)
 * and the email must be on an allowlist kept in Script Properties:
 *
 *   GOOGLE_CLIENT_ID   OAuth web client ID the frontend signs in with
 *   OWNER_EMAILS       comma-separated owner accounts (create/edit/submit)
 *   DEVELOPER_EMAILS   comma-separated developer accounts (view/review)
 *   SPREADSHEET_ID     set by setup()
 *   ROOT_FOLDER_ID     set by setup()
 *
 * Run setup() once from the Apps Script editor before deploying.
 * See docs/owner-information/SETUP.md.
 */

var CONFIG = {
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  ALLOWED_MIME: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
  MAX_IMAGES_PER_PRODUCT: 12,
  MAX_JSON_CHARS: 45000, // Google Sheets cell limit is 50,000 characters
  TOKEN_CACHE_SECONDS: 300,
  TIMEZONE: 'Asia/Kolkata',
  ROOT_FOLDER_NAME: 'VISAT-INSTRUMENTS',
  SPREADSHEET_NAME: 'VISAT INSTRUMENTS – Owner Information',
}

var STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  APPROVED: 'APPROVED',
}

// Statuses in which the owner may edit the form.
var EDITABLE = [STATUS.DRAFT, STATUS.CHANGES_REQUESTED]

// Review transitions a developer may make.
var REVIEW_TRANSITIONS = {
  SUBMITTED: [STATUS.UNDER_REVIEW, STATUS.CHANGES_REQUESTED, STATUS.APPROVED],
  UNDER_REVIEW: [STATUS.CHANGES_REQUESTED, STATUS.APPROVED],
}

// Product image folders under Product-Images/.
var IMAGE_FOLDERS = {
  'weighing-scales': 'Weighing-Scales',
  indicators: 'Indicators',
  'junction-boxes': 'Junction-Boxes',
  weighbridges: 'Weighbridges',
  other: 'Other',
}

var SHEETS = {
  Business_Profile: [
    'recordId', 'formId', 'version', 'ownerEmail', 'businessName', 'contactPerson', 'phone', 'whatsapp', 'email',
    'address', 'city', 'state', 'pincode', 'gstin', 'description', 'workingHours', 'serviceAreas',
    'highlightsJson', 'createdAt', 'updatedAt',
  ],
  Products: [
    'recordId', 'productId', 'formId', 'version', 'ownerEmail', 'name', 'category', 'imageCategory', 'description',
    'capacity', 'modelNumber', 'brand', 'priceNote', 'applications', 'warranty', 'imageFileIds', 'createdAt', 'updatedAt',
  ],
  Product_Specifications: [
    'recordId', 'specId', 'productId', 'formId', 'version', 'label', 'value', 'unit', 'sortOrder', 'createdAt',
  ],
  Services: [
    'recordId', 'serviceId', 'formId', 'version', 'type', 'offered', 'description', 'coverageArea', 'charges',
    'turnaround', 'createdAt',
  ],
  Weighbridge: [
    'recordId', 'formId', 'version', 'offersHardware', 'offersSoftware', 'platformSizes', 'capacities',
    'foundationTypes', 'loadCells', 'softwareFeatures', 'installationTime', 'notes', 'createdAt',
  ],
  Submissions: [
    'formId', 'reference', 'ownerEmail', 'status', 'version', 'submittedAt', 'reviewedBy', 'reviewNote',
    'historyJson', 'snapshotJson', 'snapshotFileId', 'lastRequestId', 'createdAt', 'updatedAt',
  ],
  Drafts: [
    'formId', 'ownerEmail', 'status', 'revision', 'dataJson', 'draftFileId', 'lastRequestId', 'createdAt', 'updatedAt',
  ],
  Website_Feedback: [
    'recordId', 'formId', 'version', 'ownerEmail', 'overallRating', 'contentApproval', 'likes', 'changes',
    'missingInfo', 'photosToReplace', 'otherComments', 'createdAt',
  ],
  File_References: [
    'fileId', 'formId', 'productId', 'ownerEmail', 'imageCategory', 'originalName', 'storedName', 'mimeType',
    'sizeBytes', 'sha256', 'folderId', 'status', 'createdAt', 'updatedAt',
  ],
}

/* ------------------------------------------------------------------ */
/* Form schema: server-side sanitisation (unknown keys are dropped).   */
/* ------------------------------------------------------------------ */

function str_(max) {
  return { type: 'string', max: max || 500 }
}

var FORM_SCHEMA = {
  type: 'object',
  fields: {
    schemaVersion: { type: 'number' },
    business: {
      type: 'object',
      fields: {
        businessName: str_(120), contactPerson: str_(120), phone: str_(20), whatsapp: str_(20), email: str_(120),
        address: str_(400), city: str_(80), state: str_(80), pincode: str_(10), gstin: str_(20),
        description: str_(2000), workingHours: str_(200), serviceAreas: str_(500),
      },
    },
    products: {
      type: 'array', maxItems: 50,
      item: {
        type: 'object',
        fields: {
          id: str_(80), name: str_(150), category: str_(80), imageCategory: str_(40), description: str_(2000),
          capacity: str_(200), modelNumber: str_(100), brand: str_(100), priceNote: str_(200),
          applications: str_(500), warranty: str_(200),
          specifications: {
            type: 'array', maxItems: 40,
            item: { type: 'object', fields: { id: str_(80), label: str_(100), value: str_(300), unit: str_(40) } },
          },
          images: {
            type: 'array', maxItems: 12,
            item: {
              type: 'object',
              fields: {
                fileId: str_(100), name: str_(200), mimeType: str_(40), sizeBytes: { type: 'number' }, sha256: str_(64),
              },
            },
          },
        },
      },
    },
    services: {
      type: 'array', maxItems: 20,
      item: {
        type: 'object',
        fields: {
          id: str_(80), type: str_(80), offered: str_(20), description: str_(1000), coverageArea: str_(300),
          charges: str_(300), turnaround: str_(200),
        },
      },
    },
    weighbridge: {
      type: 'object',
      fields: {
        offersHardware: str_(20), offersSoftware: str_(20), platformSizes: str_(500), capacities: str_(500),
        foundationTypes: str_(500), loadCells: str_(500), softwareFeatures: str_(1500), installationTime: str_(200),
        notes: str_(1500),
      },
    },
    highlights: {
      type: 'object',
      fields: {
        establishedYear: str_(10), customersServed: str_(200), certifications: str_(500), keyStrengths: str_(1500),
        notableProjects: str_(1500),
      },
    },
    feedback: {
      type: 'object',
      fields: {
        overallRating: str_(2), contentApproval: str_(20), likes: str_(1500), changes: str_(2000),
        missingInfo: str_(1500), photosToReplace: str_(1000), otherComments: str_(1500),
      },
    },
  },
}

function sanitize_(schema, value) {
  if (schema.type === 'string') return value == null ? '' : String(value).trim().slice(0, schema.max)
  if (schema.type === 'number') {
    var n = Number(value)
    return isFinite(n) ? n : 0
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return []
    return value.slice(0, schema.maxItems).map(function (v) { return sanitize_(schema.item, v) })
  }
  var out = {}
  var src = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  Object.keys(schema.fields).forEach(function (key) { out[key] = sanitize_(schema.fields[key], src[key]) })
  return out
}

var ID_PATTERNS = {
  formId: /^FRM-[A-Za-z0-9-]{8,64}$/,
  productId: /^PRD-[A-Za-z0-9-]{4,64}$/,
  fileId: /^[A-Za-z0-9_-]{10,100}$/,
}

function requireId_(kind, value) {
  if (typeof value !== 'string' || !ID_PATTERNS[kind].test(value)) throw apiError_('BAD_REQUEST', 'Invalid ' + kind)
  return value
}

// Required fields for final submission (drafts may be incomplete).
function validateForSubmit_(form) {
  var errors = []
  var b = form.business
  if (!b.businessName) errors.push('Business name is required.')
  if (!b.contactPerson) errors.push('Contact person is required.')
  if (!/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(b.phone)) errors.push('A valid 10-digit mobile number is required.')
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) errors.push('Business email is not valid.')
  if (!b.address) errors.push('Business address is required.')
  if (!form.products.length) errors.push('Add at least one product.')
  form.products.forEach(function (p, i) {
    var label = 'Product ' + (i + 1)
    if (!p.id || !ID_PATTERNS.productId.test(p.id)) errors.push(label + ': invalid product ID.')
    if (!p.name) errors.push(label + ': name is required.')
    if (!p.category) errors.push(label + ': category is required.')
    if (!IMAGE_FOLDERS[p.imageCategory]) errors.push(label + ': photo folder is required.')
    p.specifications.forEach(function (s, j) {
      if (!s.label || !s.value) errors.push(label + ', specification ' + (j + 1) + ': name and value are required.')
    })
  })
  form.services.forEach(function (s, i) {
    if (!s.type) errors.push('Service ' + (i + 1) + ': service type is required.')
    if (!s.offered) errors.push('Service ' + (i + 1) + ': say whether it is offered.')
  })
  return errors
}

/* ------------------------------------------------------------------ */
/* HTTP entry points                                                    */
/* ------------------------------------------------------------------ */

function doGet() {
  var props = PropertiesService.getScriptProperties()
  var configured = !!(props.getProperty('GOOGLE_CLIENT_ID') && props.getProperty('SPREADSHEET_ID') && props.getProperty('ROOT_FOLDER_ID'))
  return json_({ ok: true, data: { service: 'visat-owner-information', configured: configured } })
}

function doPost(e) {
  return json_(handleRequest_(e))
}

function handleRequest_(e) {
  var req
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '')
  } catch (err) {
    return fail_('BAD_REQUEST', 'Request body must be JSON.')
  }
  try {
    var action = ACTIONS[req.action]
    if (!action) throw apiError_('UNKNOWN_ACTION', 'Unknown action.')
    var user = authenticate_(req.idToken)
    if (action.role === 'owner' && !user.isOwner) throw apiError_('FORBIDDEN', 'Only the business owner can do this.')
    if (action.role === 'developer' && !user.isDeveloper) throw apiError_('FORBIDDEN', 'Only the developer can do this.')
    var payload = req.payload && typeof req.payload === 'object' ? req.payload : {}
    var requestId = typeof req.requestId === 'string' ? req.requestId.slice(0, 80) : ''
    var data = action.write
      ? withLock_(function () { return action.run(user, payload, requestId) })
      : action.run(user, payload, requestId)
    return { ok: true, data: data }
  } catch (err) {
    if (err && err.apiCode) return fail_(err.apiCode, err.message, err.details)
    console.error(err && err.stack ? err.stack : err)
    return fail_('SERVER_ERROR', 'Unexpected server error. Please try again.')
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function fail_(code, message, details) {
  var error = { code: code, message: message }
  if (details) error.details = details
  return { ok: false, error: error }
}

function apiError_(code, message, details) {
  var err = new Error(message || code)
  err.apiCode = code
  err.details = details
  return err
}

function withLock_(fn) {
  var lock = LockService.getScriptLock()
  if (!lock.tryLock(20000)) throw apiError_('BUSY', 'The server is busy. Please retry.')
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

/* ------------------------------------------------------------------ */
/* Authentication                                                       */
/* ------------------------------------------------------------------ */

function emailList_(name) {
  return (PropertiesService.getScriptProperties().getProperty(name) || '')
    .split(',')
    .map(function (s) { return s.trim().toLowerCase() })
    .filter(Boolean)
}

function authenticate_(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) {
    throw apiError_('UNAUTHENTICATED', 'Please sign in with Google.')
  }
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID')
  if (!clientId) throw apiError_('NOT_CONFIGURED', 'The server is not configured yet.')

  var cache = CacheService.getScriptCache()
  var cacheKey = 'tok_' + sha256Hex_(Utilities.newBlob(idToken).getBytes())
  var info
  var cached = cache.get(cacheKey)
  if (cached) {
    info = JSON.parse(cached)
  } else {
    var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
      muteHttpExceptions: true,
    })
    if (res.getResponseCode() !== 200) throw apiError_('UNAUTHENTICATED', 'Your sign-in has expired. Please sign in again.')
    info = JSON.parse(res.getContentText())
  }

  var nowSec = Math.floor(Date.now() / 1000)
  var validIssuer = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com'
  var verified = info.email_verified === true || info.email_verified === 'true'
  if (info.aud !== clientId || !validIssuer || !verified || !info.email || Number(info.exp) <= nowSec) {
    throw apiError_('UNAUTHENTICATED', 'Your sign-in could not be verified. Please sign in again.')
  }
  if (!cached) {
    var ttl = Math.min(CONFIG.TOKEN_CACHE_SECONDS, Number(info.exp) - nowSec)
    if (ttl > 0) cache.put(cacheKey, JSON.stringify(info), ttl)
  }

  var email = String(info.email).toLowerCase()
  var user = {
    email: email,
    name: info.name || '',
    picture: info.picture || '',
    isOwner: emailList_('OWNER_EMAILS').indexOf(email) !== -1,
    isDeveloper: emailList_('DEVELOPER_EMAILS').indexOf(email) !== -1,
  }
  if (!user.isOwner && !user.isDeveloper) {
    throw apiError_('FORBIDDEN', 'This Google account (' + email + ') is not authorised for owner information.')
  }
  return user
}

function canRead_(user, ownerEmail) {
  return user.isDeveloper || (user.isOwner && ownerEmail === user.email)
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

var ACTIONS = {
  whoami: {
    run: function (user) {
      return user
    },
  },

  'draft.list': {
    run: function (user) {
      return readRows_('Drafts')
        .filter(function (r) { return canRead_(user, r.ownerEmail) })
        .map(function (r) {
          var data = parseJson_(r.dataJson, {})
          return {
            formId: r.formId,
            ownerEmail: r.ownerEmail,
            status: r.status,
            revision: Number(r.revision),
            businessName: (data.business && data.business.businessName) || '',
            productCount: (data.products || []).length,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }
        })
        .sort(byUpdatedDesc_)
    },
  },

  'draft.get': {
    run: function (user, p) {
      var formId = requireId_('formId', p.formId)
      var row = findRow_('Drafts', 'formId', formId)
      if (!row || !canRead_(user, row.ownerEmail)) throw apiError_('NOT_FOUND', 'Draft not found.')
      return draftView_(row)
    },
  },

  'draft.save': {
    role: 'owner',
    write: true,
    run: function (user, p, requestId) {
      var formId = requireId_('formId', p.formId)
      var data = sanitize_(FORM_SCHEMA, p.data)
      var dataJson = JSON.stringify(data)
      if (dataJson.length > CONFIG.MAX_JSON_CHARS) {
        throw apiError_('TOO_LARGE', 'The form has too much text to save. Please shorten some descriptions.')
      }
      var now = isoNow_()
      var row = findRow_('Drafts', 'formId', formId)

      if (row) {
        if (row.ownerEmail !== user.email) throw apiError_('FORBIDDEN', 'This draft belongs to another account.')
        if (requestId && row.lastRequestId === requestId) return draftMeta_(row) // retried request
        if (EDITABLE.indexOf(row.status) === -1) throw apiError_('LOCKED', 'This form has been submitted and cannot be edited now.')
        if (Number(p.baseRevision) !== Number(row.revision)) {
          throw apiError_('CONFLICT', 'This draft was changed elsewhere. Reload to get the latest version.', {
            revision: Number(row.revision),
          })
        }
        var fileId = writeDraftFile_(row.draftFileId, formId, dataJson)
        row = updateRow_('Drafts', row, {
          revision: Number(row.revision) + 1, dataJson: dataJson, draftFileId: fileId, lastRequestId: requestId, updatedAt: now,
        })
        return draftMeta_(row)
      }

      if (Number(p.baseRevision) !== 0) throw apiError_('NOT_FOUND', 'Draft not found.')
      var newFileId = writeDraftFile_('', formId, dataJson)
      row = appendRow_('Drafts', {
        formId: formId, ownerEmail: user.email, status: STATUS.DRAFT, revision: 1, dataJson: dataJson,
        draftFileId: newFileId, lastRequestId: requestId, createdAt: now, updatedAt: now,
      })
      return draftMeta_(row)
    },
  },

  'submission.submit': {
    role: 'owner',
    write: true,
    run: function (user, p, requestId) {
      var formId = requireId_('formId', p.formId)
      var draft = findRow_('Drafts', 'formId', formId)
      if (!draft || draft.ownerEmail !== user.email) throw apiError_('NOT_FOUND', 'Save the draft before submitting.')

      var existing = findRow_('Submissions', 'formId', formId)
      if (existing && requestId && existing.lastRequestId === requestId) return submissionMeta_(existing) // retried request
      if (EDITABLE.indexOf(draft.status) === -1) throw apiError_('LOCKED', 'This form has already been submitted.')
      if (Number(p.baseRevision) !== Number(draft.revision)) {
        throw apiError_('CONFLICT', 'This draft was changed elsewhere. Reload to get the latest version.', {
          revision: Number(draft.revision),
        })
      }

      var data = sanitize_(FORM_SCHEMA, p.data)
      var errors = validateForSubmit_(data)
      if (errors.length) throw apiError_('VALIDATION_FAILED', 'Some required information is missing.', { errors: errors })
      var pending = imagesNotStored_(formId, data)
      if (pending.length) {
        throw apiError_('PENDING_UPLOADS', 'Some photos have not finished uploading.', { files: pending })
      }
      var dataJson = JSON.stringify(data)
      if (dataJson.length > CONFIG.MAX_JSON_CHARS) {
        throw apiError_('TOO_LARGE', 'The form has too much text to save. Please shorten some descriptions.')
      }

      var now = isoNow_()
      var version = existing ? Number(existing.version) + 1 : 1
      var reference = existing ? existing.reference : newReference_()
      writeNormalizedRecords_(formId, version, user.email, data, now)
      var snapshotFileId = writeSubmittedFile_(reference, version, dataJson)
      var history = existing ? parseJson_(existing.historyJson, []) : []
      history.push({ status: STATUS.SUBMITTED, version: version, by: user.email, at: now })

      var fields = {
        status: STATUS.SUBMITTED, version: version, submittedAt: now, reviewNote: '', historyJson: JSON.stringify(history),
        snapshotJson: dataJson, snapshotFileId: snapshotFileId, lastRequestId: requestId, updatedAt: now,
      }
      var sub = existing
        ? updateRow_('Submissions', existing, fields)
        : appendRow_('Submissions', merge_(fields, { formId: formId, reference: reference, ownerEmail: user.email, reviewedBy: '', createdAt: now }))

      var draftFileId = writeDraftFile_(draft.draftFileId, formId, dataJson)
      updateRow_('Drafts', draft, {
        status: STATUS.SUBMITTED, revision: Number(draft.revision) + 1, dataJson: dataJson, draftFileId: draftFileId,
        lastRequestId: requestId, updatedAt: now,
      })
      return submissionMeta_(sub)
    },
  },

  'submission.list': {
    run: function (user) {
      return readRows_('Submissions')
        .filter(function (r) { return canRead_(user, r.ownerEmail) })
        .map(function (r) {
          var data = parseJson_(r.snapshotJson, {})
          return merge_(submissionMeta_(r), {
            ownerEmail: r.ownerEmail,
            businessName: (data.business && data.business.businessName) || '',
            productCount: (data.products || []).length,
            reviewNote: r.reviewNote,
          })
        })
        .sort(byUpdatedDesc_)
    },
  },

  'submission.get': {
    run: function (user, p) {
      var formId = requireId_('formId', p.formId)
      var row = findRow_('Submissions', 'formId', formId)
      if (!row || !canRead_(user, row.ownerEmail)) throw apiError_('NOT_FOUND', 'Submission not found.')
      return merge_(submissionMeta_(row), {
        ownerEmail: row.ownerEmail,
        reviewedBy: row.reviewedBy,
        reviewNote: row.reviewNote,
        history: parseJson_(row.historyJson, []),
        data: parseJson_(row.snapshotJson, {}),
      })
    },
  },

  'submission.setStatus': {
    role: 'developer',
    write: true,
    run: function (user, p) {
      var formId = requireId_('formId', p.formId)
      var row = findRow_('Submissions', 'formId', formId)
      if (!row) throw apiError_('NOT_FOUND', 'Submission not found.')
      var allowed = REVIEW_TRANSITIONS[row.status] || []
      if (allowed.indexOf(p.status) === -1) {
        throw apiError_('INVALID_TRANSITION', 'Cannot change status from ' + row.status + ' to ' + p.status + '.')
      }
      var note = typeof p.note === 'string' ? p.note.trim().slice(0, 2000) : ''
      if (p.status === STATUS.CHANGES_REQUESTED && !note) throw apiError_('BAD_REQUEST', 'Explain which changes are needed.')

      var now = isoNow_()
      var history = parseJson_(row.historyJson, [])
      history.push({ status: p.status, version: Number(row.version), by: user.email, at: now, note: note })
      row = updateRow_('Submissions', row, {
        status: p.status, reviewedBy: user.email, reviewNote: note, historyJson: JSON.stringify(history), updatedAt: now,
      })
      var draft = findRow_('Drafts', 'formId', formId)
      if (draft) updateRow_('Drafts', draft, { status: p.status, updatedAt: now })
      return merge_(submissionMeta_(row), { reviewNote: note, history: history })
    },
  },

  'image.upload': {
    role: 'owner',
    write: true,
    run: function (user, p) {
      var formId = requireId_('formId', p.formId)
      var productId = requireId_('productId', p.productId)
      var draft = findRow_('Drafts', 'formId', formId)
      if (!draft || draft.ownerEmail !== user.email) throw apiError_('NOT_FOUND', 'Save the draft before adding photos.')
      if (EDITABLE.indexOf(draft.status) === -1) throw apiError_('LOCKED', 'This form has been submitted and cannot be edited now.')
      if (!IMAGE_FOLDERS[p.imageCategory]) throw apiError_('BAD_REQUEST', 'Choose a photo folder for this product.')
      var ext = CONFIG.ALLOWED_MIME[p.mimeType]
      if (!ext) throw apiError_('INVALID_FILE', 'Only JPG, PNG and WebP photos are allowed.')
      if (typeof p.base64 !== 'string' || !p.base64) throw apiError_('INVALID_FILE', 'The photo is empty.')
      if (p.base64.length > Math.ceil(CONFIG.MAX_IMAGE_BYTES / 3) * 4 + 8) throw apiError_('INVALID_FILE', 'Photos must be 5 MB or smaller.')

      var bytes
      try {
        bytes = Utilities.base64Decode(p.base64)
      } catch (err) {
        throw apiError_('INVALID_FILE', 'The photo could not be read.')
      }
      if (!bytes.length || bytes.length > CONFIG.MAX_IMAGE_BYTES) throw apiError_('INVALID_FILE', 'Photos must be 5 MB or smaller.')
      if (detectImageType_(bytes) !== p.mimeType) throw apiError_('INVALID_FILE', 'The file content is not a valid ' + ext.toUpperCase() + ' image.')
      var sha256 = sha256Hex_(bytes)
      if (p.sha256 && p.sha256 !== sha256) throw apiError_('INVALID_FILE', 'The photo was corrupted during upload. Please retry.')

      var refs = readRows_('File_References')
      var duplicate = refs.filter(function (r) {
        return r.formId === formId && r.productId === productId && r.sha256 === sha256
      })[0]
      var now = isoNow_()
      if (duplicate) {
        if (duplicate.status !== 'ACTIVE') duplicate = updateRow_('File_References', duplicate, { status: 'ACTIVE', updatedAt: now })
        return fileView_(duplicate, true)
      }
      var activeForProduct = refs.filter(function (r) {
        return r.formId === formId && r.productId === productId && r.status === 'ACTIVE'
      }).length
      if (activeForProduct >= CONFIG.MAX_IMAGES_PER_PRODUCT) {
        throw apiError_('TOO_MANY_FILES', 'Up to ' + CONFIG.MAX_IMAGES_PER_PRODUCT + ' photos per product.')
      }

      var folder = getFolderPath_(['Product-Images', IMAGE_FOLDERS[p.imageCategory]])
      var originalName = String(p.fileName || 'photo').replace(/[^\w.\- ]+/g, '_').slice(0, 150)
      var storedName = productId + '_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') + '_' + sha256.slice(0, 10) + '.' + ext
      var file = folder.createFile(Utilities.newBlob(bytes, p.mimeType, storedName))
      file.setDescription('Form ' + formId + ' · product ' + productId + ' · uploaded by ' + user.email)

      var ref = appendRow_('File_References', {
        fileId: file.getId(), formId: formId, productId: productId, ownerEmail: user.email, imageCategory: p.imageCategory,
        originalName: originalName, storedName: storedName, mimeType: p.mimeType, sizeBytes: bytes.length, sha256: sha256,
        folderId: folder.getId(), status: 'ACTIVE', createdAt: now, updatedAt: now,
      })
      return fileView_(ref, false)
    },
  },

  'image.remove': {
    role: 'owner',
    write: true,
    run: function (user, p) {
      var fileId = requireId_('fileId', p.fileId)
      var ref = findRow_('File_References', 'fileId', fileId)
      if (!ref || ref.ownerEmail !== user.email) throw apiError_('NOT_FOUND', 'Photo not found.')
      var draft = findRow_('Drafts', 'formId', ref.formId)
      if (!draft || EDITABLE.indexOf(draft.status) === -1) throw apiError_('LOCKED', 'This form has been submitted and cannot be edited now.')
      // Kept in Drive for the audit trail; only the reference is deactivated.
      updateRow_('File_References', ref, { status: 'REMOVED', updatedAt: isoNow_() })
      return { fileId: fileId, status: 'REMOVED' }
    },
  },

  'image.get': {
    run: function (user, p) {
      var fileId = requireId_('fileId', p.fileId)
      var ref = findRow_('File_References', 'fileId', fileId)
      if (!ref || !canRead_(user, ref.ownerEmail)) throw apiError_('NOT_FOUND', 'Photo not found.')
      var blob = DriveApp.getFileById(fileId).getBlob()
      return { fileId: fileId, mimeType: ref.mimeType, base64: Utilities.base64Encode(blob.getBytes()) }
    },
  },
}

/* ------------------------------------------------------------------ */
/* Records                                                              */
/* ------------------------------------------------------------------ */

function draftMeta_(row) {
  return { formId: row.formId, revision: Number(row.revision), status: row.status, updatedAt: row.updatedAt }
}

function draftView_(row) {
  return merge_(draftMeta_(row), { ownerEmail: row.ownerEmail, createdAt: row.createdAt, data: parseJson_(row.dataJson, {}) })
}

function submissionMeta_(row) {
  return {
    formId: row.formId, reference: row.reference, status: row.status, version: Number(row.version),
    submittedAt: row.submittedAt, updatedAt: row.updatedAt,
  }
}

function fileView_(ref, duplicate) {
  return {
    fileId: ref.fileId, productId: ref.productId, name: ref.originalName, storedName: ref.storedName,
    mimeType: ref.mimeType, sizeBytes: Number(ref.sizeBytes), sha256: ref.sha256, createdAt: ref.createdAt, duplicate: duplicate,
  }
}

// Image references in the form that are not active uploads for this form/product.
function imagesNotStored_(formId, data) {
  var active = {}
  readRows_('File_References').forEach(function (r) {
    if (r.formId === formId && r.status === 'ACTIVE') active[r.fileId] = r.productId
  })
  var missing = []
  data.products.forEach(function (product) {
    product.images.forEach(function (img) {
      if (!img.fileId || active[img.fileId] !== product.id) missing.push(img.name || img.fileId || 'photo')
    })
  })
  return missing
}

// One row per entity per submitted version, so earlier versions remain as history.
function writeNormalizedRecords_(formId, version, ownerEmail, data, now) {
  var v = 'v' + version
  var b = data.business
  appendRow_('Business_Profile', merge_(b, {
    recordId: 'BUS-' + formId + '-' + v, formId: formId, version: version, ownerEmail: ownerEmail,
    highlightsJson: JSON.stringify(data.highlights), createdAt: now, updatedAt: now,
  }))
  data.products.forEach(function (prod) {
    appendRow_('Products', {
      recordId: prod.id + '-' + v, productId: prod.id, formId: formId, version: version, ownerEmail: ownerEmail,
      name: prod.name, category: prod.category, imageCategory: prod.imageCategory, description: prod.description,
      capacity: prod.capacity, modelNumber: prod.modelNumber, brand: prod.brand, priceNote: prod.priceNote,
      applications: prod.applications, warranty: prod.warranty,
      imageFileIds: prod.images.map(function (i) { return i.fileId }).join(','), createdAt: now, updatedAt: now,
    })
    prod.specifications.forEach(function (spec, i) {
      appendRow_('Product_Specifications', {
        recordId: prod.id + '-' + (spec.id || 'SPEC-' + i) + '-' + v, specId: spec.id, productId: prod.id, formId: formId,
        version: version, label: spec.label, value: spec.value, unit: spec.unit, sortOrder: i + 1, createdAt: now,
      })
    })
  })
  data.services.forEach(function (svc, i) {
    appendRow_('Services', merge_(svc, {
      recordId: (svc.id || 'SVC-' + i) + '-' + formId + '-' + v, serviceId: svc.id, formId: formId, version: version, createdAt: now,
    }))
  })
  appendRow_('Weighbridge', merge_(data.weighbridge, { recordId: 'WB-' + formId + '-' + v, formId: formId, version: version, createdAt: now }))
  appendRow_('Website_Feedback', merge_(data.feedback, {
    recordId: 'FB-' + formId + '-' + v, formId: formId, version: version, ownerEmail: ownerEmail, createdAt: now,
  }))
}

function newReference_() {
  var existing = {}
  readRows_('Submissions').forEach(function (r) { existing[r.reference] = true })
  var date = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd')
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (var attempt = 0; attempt < 20; attempt++) {
    var suffix = ''
    for (var i = 0; i < 5; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    var ref = 'VI-' + date + '-' + suffix
    if (!existing[ref]) return ref
  }
  throw apiError_('SERVER_ERROR', 'Could not generate a submission reference.')
}

/* ------------------------------------------------------------------ */
/* Sheets helpers                                                       */
/* ------------------------------------------------------------------ */

function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw apiError_('NOT_CONFIGURED', 'The server is not configured yet. Run setup().')
  return SpreadsheetApp.openById(id)
}

function sheet_(name) {
  var sheet = spreadsheet_().getSheetByName(name)
  if (!sheet) throw apiError_('NOT_CONFIGURED', 'Missing sheet ' + name + '. Run setup().')
  return sheet
}

function readRows_(name) {
  var headers = SHEETS[name]
  var sheet = sheet_(name)
  var last = sheet.getLastRow()
  if (last < 2) return []
  return sheet.getRange(2, 1, last - 1, headers.length).getValues().map(function (values, i) {
    var row = { _row: i + 2, _sheet: name }
    headers.forEach(function (h, j) { row[h] = values[j] instanceof Date ? values[j].toISOString() : values[j] })
    return row
  })
}

function findRow_(name, key, value) {
  return readRows_(name).filter(function (r) { return r[key] === value })[0] || null
}

function appendRow_(name, obj) {
  var headers = SHEETS[name]
  var values = headers.map(function (h) { return cell_(obj[h]) })
  var sheet = sheet_(name)
  sheet.appendRow(values)
  var row = { _row: sheet.getLastRow(), _sheet: name }
  headers.forEach(function (h, j) { row[h] = values[j] })
  return row
}

function updateRow_(name, row, changes) {
  var headers = SHEETS[name]
  var next = merge_(row, changes)
  var values = headers.map(function (h) { return cell_(next[h]) })
  sheet_(name).getRange(row._row, 1, 1, headers.length).setValues([values])
  headers.forEach(function (h, j) { next[h] = values[j] })
  return next
}

// Prefix strings that Sheets would treat as formulas.
function cell_(value) {
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return value
  var s = String(value)
  return /^[=+\-@]/.test(s) ? "'" + s : s
}

/* ------------------------------------------------------------------ */
/* Drive helpers                                                        */
/* ------------------------------------------------------------------ */

function rootFolder_() {
  var id = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID')
  if (!id) throw apiError_('NOT_CONFIGURED', 'The server is not configured yet. Run setup().')
  return DriveApp.getFolderById(id)
}

function getFolderPath_(parts) {
  var folder = rootFolder_()
  parts.forEach(function (name) {
    var it = folder.getFoldersByName(name)
    if (!it.hasNext()) throw apiError_('NOT_CONFIGURED', 'Missing Drive folder ' + parts.join('/') + '. Run setup().')
    folder = it.next()
  })
  return folder
}

function writeDraftFile_(existingId, formId, dataJson) {
  if (existingId) {
    try {
      DriveApp.getFileById(existingId).setContent(dataJson)
      return existingId
    } catch (err) {
      console.warn('Draft file ' + existingId + ' missing; creating a new one.')
    }
  }
  var folder = getFolderPath_(['Owner-Submissions', 'Drafts'])
  return folder.createFile(formId + '.json', dataJson, 'application/json').getId()
}

function writeSubmittedFile_(reference, version, dataJson) {
  var folder = getFolderPath_(['Owner-Submissions', 'Submitted'])
  return folder.createFile(reference + '-v' + version + '.json', dataJson, 'application/json').getId()
}

/* ------------------------------------------------------------------ */
/* Utilities                                                            */
/* ------------------------------------------------------------------ */

function detectImageType_(bytes) {
  var b = function (i) { return bytes[i] & 0xff }
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg'
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png'
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
      b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return 'image/webp'
  return ''
}

function sha256Hex_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2) })
    .join('')
}

function isoNow_() {
  return new Date().toISOString()
}

function parseJson_(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback
  } catch (err) {
    return fallback
  }
}

function merge_(a, b) {
  var out = {}
  Object.keys(a).forEach(function (k) { out[k] = a[k] })
  Object.keys(b).forEach(function (k) { out[k] = b[k] })
  return out
}

function byUpdatedDesc_(a, b) {
  return String(b.updatedAt).localeCompare(String(a.updatedAt))
}

/* ------------------------------------------------------------------ */
/* One-time setup (run manually from the Apps Script editor)           */
/* ------------------------------------------------------------------ */

function setup() {
  var props = PropertiesService.getScriptProperties()
  ;['GOOGLE_CLIENT_ID', 'OWNER_EMAILS', 'DEVELOPER_EMAILS'].forEach(function (key) {
    if (!props.getProperty(key)) throw new Error('Set the Script Property ' + key + ' before running setup().')
  })

  // Spreadsheet and sheets
  var ssId = props.getProperty('SPREADSHEET_ID')
  var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME)
  props.setProperty('SPREADSHEET_ID', ss.getId())
  Object.keys(SHEETS).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name)
    var headers = SHEETS[name]
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
    sheet.setFrozenRows(1)
  })
  var defaultSheet = ss.getSheetByName('Sheet1')
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet)

  // Drive folders
  var rootId = props.getProperty('ROOT_FOLDER_ID')
  var root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME)
  props.setProperty('ROOT_FOLDER_ID', root.getId())
  var tree = {
    'Owner-Submissions': ['Drafts', 'Submitted'],
    'Product-Images': Object.keys(IMAGE_FOLDERS).map(function (k) { return IMAGE_FOLDERS[k] }),
    'Business-Documents': [],
  }
  Object.keys(tree).forEach(function (parentName) {
    var parent = childFolder_(root, parentName)
    tree[parentName].forEach(function (child) { childFolder_(parent, child) })
  })

  // Access: private, shared only with allowlisted accounts.
  root.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
  var me = Session.getEffectiveUser().getEmail().toLowerCase()
  emailList_('OWNER_EMAILS').concat(emailList_('DEVELOPER_EMAILS')).forEach(function (email) {
    if (email === me) return
    root.addViewer(email)
    ss.addViewer(email)
  })

  console.log('Setup complete. Spreadsheet: ' + ss.getUrl() + ' · Drive folder: ' + root.getUrl())
}

function childFolder_(parent, name) {
  var it = parent.getFoldersByName(name)
  return it.hasNext() ? it.next() : parent.createFolder(name)
}

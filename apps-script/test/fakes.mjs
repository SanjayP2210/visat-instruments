// In-memory fakes of the Apps Script services used by Code.gs (Sheets, Drive,
// token verification, cache, lock), for running the API in Node.
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

export const CLIENT_ID = 'test-client.apps.googleusercontent.com'

const toSigned = (buf) => Array.from(new Int8Array(buf.buffer, buf.byteOffset, buf.length))
const toBuf = (bytes) => Buffer.from(bytes.map((b) => b & 0xff))

export function makeEnv({ owners, developers }) {
  const props = { GOOGLE_CLIENT_ID: CLIENT_ID, OWNER_EMAILS: owners, DEVELOPER_EMAILS: developers }
  const tokens = {} // token -> tokeninfo payload
  const cache = {}
  const sheetsById = {}
  const files = {}
  const folders = {}
  const stats = { tokenFetches: 0 }

  const blob = (bytes, mime, name) => ({ bytes, mime, name, getBytes: () => bytes })

  function makeSheet(name) {
    const rows = []
    const sheet = {
      name,
      rows,
      getLastRow: () => rows.length,
      appendRow: (values) => rows.push([...values]),
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => Array.from({ length: nc }, (_, j) => row[c - 1 + j] ?? '')),
        setValues: (vals) => {
          vals.forEach((vrow, i) => {
            rows[r - 1 + i] = rows[r - 1 + i] || []
            vrow.forEach((v, j) => (rows[r - 1 + i][c - 1 + j] = v))
          })
          return { setFontWeight: () => {} }
        },
      }),
      setFrozenRows: () => {},
    }
    return sheet
  }

  function makeSpreadsheet(id) {
    const sheets = { Sheet1: makeSheet('Sheet1') }
    const ss = {
      id,
      sheets,
      viewers: [],
      getId: () => id,
      getUrl: () => `https://sheets/${id}`,
      getSheetByName: (n) => sheets[n] || null,
      insertSheet: (n) => (sheets[n] = makeSheet(n)),
      getSheets: () => Object.values(sheets),
      deleteSheet: (s) => delete sheets[s.name],
      addViewer: (e) => ss.viewers.push(e),
    }
    sheetsById[id] = ss
    return ss
  }

  function makeFolder(name, parent) {
    const id = 'fold' + randomUUID().replace(/-/g, '')
    const folder = {
      id, name, parent, children: [], viewers: [], sharing: null,
      getId: () => id,
      getUrl: () => `https://drive/${id}`,
      getFoldersByName: (n) => {
        const list = folder.children.filter((c) => c.name === n)
        let i = 0
        return { hasNext: () => i < list.length, next: () => list[i++] }
      },
      createFolder: (n) => {
        const f = makeFolder(n, folder)
        folder.children.push(f)
        return f
      },
      createFile: (a, content, mime) => {
        const b = typeof a === 'string' ? blob(toSigned(Buffer.from(content)), mime, a) : a
        return makeFile(b, folder)
      },
      setSharing: (access, perm) => (folder.sharing = [access, perm]),
      addViewer: (e) => folder.viewers.push(e),
    }
    folders[id] = folder
    return folder
  }

  function makeFile(b, folder) {
    const id = 'file' + randomUUID().replace(/-/g, '')
    const file = {
      id, name: b.name, mime: b.mime, bytes: b.bytes, folder, description: '',
      getId: () => id,
      setContent: (s) => (file.bytes = toSigned(Buffer.from(s))),
      setDescription: (d) => (file.description = d),
      getBlob: () => blob(file.bytes, file.mime, file.name),
    }
    files[id] = file
    return file
  }

  const globals = {
    console: { log() {}, warn() {}, error() {} },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => (props[k] = v) }),
    },
    CacheService: {
      getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => (cache[k] = v) }),
    },
    UrlFetchApp: {
      fetch: (url) => {
        stats.tokenFetches++
        const token = decodeURIComponent(url.split('id_token=')[1])
        const info = tokens[token]
        return {
          getResponseCode: () => (info ? 200 : 400),
          getContentText: () => JSON.stringify(info || { error: 'invalid_token' }),
        }
      },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_alg, bytes) => toSigned(createHash('sha256').update(toBuf(bytes)).digest()),
      base64Decode: (s) => {
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('bad base64')
        return toSigned(Buffer.from(s, 'base64'))
      },
      base64Encode: (bytes) => toBuf(bytes).toString('base64'),
      newBlob: (data, mime, name) => blob(typeof data === 'string' ? toSigned(Buffer.from(data)) : data, mime, name),
      formatDate: (d, _tz, fmt) => {
        const iso = d.toISOString()
        return fmt === 'yyyyMMdd' ? iso.slice(0, 10).replace(/-/g, '') : iso.slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
      },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ content: s, setMimeType() { return this } }),
    },
    SpreadsheetApp: {
      openById: (id) => sheetsById[id],
      create: () => makeSpreadsheet('ss' + randomUUID().slice(0, 8)),
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      Permission: { NONE: 'NONE' },
      createFolder: (n) => makeFolder(n, null),
      getFolderById: (id) => folders[id],
      getFileById: (id) => {
        if (!files[id]) throw new Error('No file')
        return files[id]
      },
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'script-owner@example.com' }) },
  }

  const context = vm.createContext(globals)
  vm.runInContext(readFileSync(new URL('../Code.gs', import.meta.url), 'utf8'), context, { filename: 'Code.gs' })

  function issueToken(email, overrides = {}) {
    const token = 'tok-' + randomUUID() + randomUUID()
    tokens[token] = {
      aud: CLIENT_ID, iss: 'https://accounts.google.com', email, email_verified: 'true',
      exp: String(Math.floor(Date.now() / 1000) + 3600), name: email.split('@')[0], ...overrides,
    }
    return token
  }

  function call(action, token, payload = {}, requestId = randomUUID()) {
    const out = context.doPost({ postData: { contents: JSON.stringify({ action, idToken: token, payload, requestId }) } })
    return JSON.parse(out.content)
  }

  const registerToken = (token, info) => (tokens[token] = info)
  return { context, props, files, folders, sheetsById, stats, issueToken, registerToken, call }
}

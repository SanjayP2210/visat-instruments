// Generic create/read/update/delete for content models, with optional per-resource hooks.
import { errors } from '../utils/http.js'
import { paginate } from '../utils/listQuery.js'
import { changesOf, labelOf, logAdmin, valuesOf } from './logService.js'

/**
 * @param Model    Mongoose model
 * @param options  { label, searchFields, filterFields, populate, beforeSave(data, doc?, actor), beforeDelete(doc), afterDelete(doc),
 *                   decorateList(items) → items with computed fields,
 *                   audit: { entity, action?(changes) → action name override } records admin activity }
 */
export function createCrudService(Model, options) {
  const { label, searchFields = [], filterFields = [], populate, beforeSave, beforeDelete, afterDelete, decorateList, audit } = options
  const tracksAuthor = Boolean(Model.schema.path('updatedBy'))

  async function get(id) {
    let query = Model.findById(id)
    if (populate) query = query.populate(populate)
    const doc = await query
    if (!doc) throw errors.notFound(`${label} not found.`)
    return doc
  }

  function record(verb, doc, actor, changes) {
    if (!audit) return
    const action = (verb === 'update' && audit.action?.(changes)) || `${audit.entity}.${verb}`
    const summary = changes?.length ? `Changed: ${changes.map((c) => c.field).join(', ')}` : undefined
    return logAdmin({ actor, action, entity: { type: audit.entity, id: doc._id, label: labelOf(doc) }, summary, changes })
  }

  return {
    async list(query) {
      const result = await paginate(Model, query, { searchFields, filterFields, populate })
      return decorateList ? { ...result, items: await decorateList(result.items) } : result
    },
    get,

    async create(data, actor) {
      if (beforeSave) await beforeSave(data, undefined, actor)
      const doc = new Model({ ...data, ...(tracksAuthor ? { createdBy: actor._id, updatedBy: actor._id } : {}) })
      await doc.save()
      await record('create', doc, actor)
      return populate ? doc.populate(populate) : doc
    },

    async update(id, data, actor) {
      const doc = await get(id)
      if (beforeSave) await beforeSave(data, doc, actor)
      const before = audit && valuesOf(doc)
      doc.set({ ...data, ...(tracksAuthor ? { updatedBy: actor._id } : {}) })
      const changes = audit ? changesOf(doc, before) : []
      await doc.save()
      if (changes.length) await record('update', doc, actor, changes)
      return populate ? doc.populate(populate) : doc
    },

    async remove(id, actor) {
      const doc = await get(id)
      if (beforeDelete) await beforeDelete(doc)
      await doc.deleteOne()
      if (afterDelete) await afterDelete(doc)
      await record('delete', doc, actor)
      return doc
    },
  }
}

/** Throws a 422 if a referenced document does not exist. */
export async function assertExists(Model, id, path, label) {
  if (id && !(await Model.exists({ _id: id }))) {
    throw errors.validation([{ path, message: `${label} does not exist.` }])
  }
}

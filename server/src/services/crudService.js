// Generic create/read/update/delete for content models, with optional per-resource hooks.
import { errors } from '../utils/http.js'
import { paginate } from '../utils/listQuery.js'

/**
 * @param Model    Mongoose model
 * @param options  { label, searchFields, filterFields, populate, beforeSave(data, doc?, actor), beforeDelete(doc), afterDelete(doc),
 *                   decorateList(items) → items with computed fields }
 */
export function createCrudService(Model, options) {
  const { label, searchFields = [], filterFields = [], populate, beforeSave, beforeDelete, afterDelete, decorateList } = options
  const tracksAuthor = Boolean(Model.schema.path('updatedBy'))

  async function get(id) {
    let query = Model.findById(id)
    if (populate) query = query.populate(populate)
    const doc = await query
    if (!doc) throw errors.notFound(`${label} not found.`)
    return doc
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
      return populate ? doc.populate(populate) : doc
    },

    async update(id, data, actor) {
      const doc = await get(id)
      if (beforeSave) await beforeSave(data, doc, actor)
      doc.set({ ...data, ...(tracksAuthor ? { updatedBy: actor._id } : {}) })
      await doc.save()
      return populate ? doc.populate(populate) : doc
    },

    async remove(id) {
      const doc = await get(id)
      if (beforeDelete) await beforeDelete(doc)
      await doc.deleteOne()
      if (afterDelete) await afterDelete(doc)
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

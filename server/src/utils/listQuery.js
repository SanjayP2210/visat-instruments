const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Runs a paginated, searchable, sortable list query.
 * @param model     Mongoose model
 * @param query     validated query ({ page, limit, sort, q, ...filters })
 * @param options   { searchFields: string[], filterFields: string[], baseFilter, populate }
 */
export async function paginate(model, query, { searchFields = [], filterFields = [], baseFilter = {}, populate } = {}) {
  const filter = { ...baseFilter }
  for (const field of filterFields) {
    if (query[field] !== undefined) filter[field] = query[field]
  }
  if (query.q && searchFields.length) {
    const pattern = new RegExp(escapeRegex(query.q), 'i')
    filter.$or = searchFields.map((field) => ({ [field]: pattern }))
  }

  const sortField = query.sort.replace(/^-/, '')
  const sort = { [sortField]: query.sort.startsWith('-') ? -1 : 1, _id: 1 }
  const skip = (query.page - 1) * query.limit

  let find = model.find(filter).sort(sort).skip(skip).limit(query.limit)
  if (populate) find = find.populate(populate)
  const [items, total] = await Promise.all([find, model.countDocuments(filter)])

  return {
    items,
    meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  }
}

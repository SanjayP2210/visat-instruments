import { z } from 'zod'
import { isStrongPassword, PASSWORD_RULES } from '../services/passwordService.js'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID.')
export const idParams = z.object({ id: objectId })

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address.'))
export const strongPassword = z.string().refine(isStrongPassword, PASSWORD_RULES)
export const personName = z.string().trim().min(2, 'Name must be at least 2 characters.').max(100)

/** List query parameters shared by all list endpoints. */
export function listQuery({ sortFields, defaultSort = '-createdAt', filters = {} }) {
  const sortValues = sortFields.flatMap((f) => [f, `-${f}`])
  return z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sort: z.enum(sortValues).default(defaultSort),
      q: z.string().trim().max(100).optional(),
      ...filters,
    })
    .strict()
}

export const booleanParam = z.enum(['true', 'false']).transform((v) => v === 'true')

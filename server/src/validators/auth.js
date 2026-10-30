import { z } from 'zod'
import { ROLES } from '../models/User.js'
import { booleanParam, email, listQuery, personName, strongPassword } from './common.js'

export const loginBody = z
  .object({
    email,
    password: z.string().min(1, 'Enter your password.').max(128),
  })
  .strict()

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(128),
    newPassword: strongPassword,
  })
  .strict()
  .refine((b) => b.currentPassword !== b.newPassword, { message: 'Choose a different password.', path: ['newPassword'] })

const role = z.enum(Object.values(ROLES))

export const createUserBody = z.object({ name: personName, email, password: strongPassword, role }).strict()

export const updateUserBody = z
  .object({ name: personName, email, role, active: z.boolean() })
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')

export const resetPasswordBody = z.object({ password: strongPassword }).strict()

export const listUsersQuery = listQuery({
  sortFields: ['name', 'email', 'role', 'createdAt', 'lastLoginAt'],
  defaultSort: 'name',
  filters: { role: role.optional(), active: booleanParam.optional() },
})

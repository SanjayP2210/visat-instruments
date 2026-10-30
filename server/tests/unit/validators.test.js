import { describe, expect, it } from 'vitest'
import { changePasswordBody, createUserBody, listUsersQuery, loginBody, updateUserBody } from '../../src/validators/auth.js'
import { idParams } from '../../src/validators/common.js'

describe('request validation', () => {
  it('normalises the login email', () => {
    expect(loginBody.parse({ email: '  Admin@Example.COM ', password: 'x' }).email).toBe('admin@example.com')
  })

  it('rejects unknown fields (no mass assignment)', () => {
    expect(loginBody.safeParse({ email: 'a@b.co', password: 'x', role: 'admin' }).success).toBe(false)
    expect(createUserBody.safeParse({ name: 'Al', email: 'a@b.co', password: 'Password123', role: 'editor', passwordHash: 'x' }).success).toBe(false)
  })

  it('rejects query-operator objects where strings are expected', () => {
    expect(loginBody.safeParse({ email: { $ne: '' }, password: 'x' }).success).toBe(false)
    expect(loginBody.safeParse({ email: 'a@b.co', password: { $gt: '' } }).success).toBe(false)
  })

  it('accepts only known roles and strong passwords for new users', () => {
    expect(createUserBody.safeParse({ name: 'Al', email: 'a@b.co', password: 'Password123', role: 'superuser' }).success).toBe(false)
    expect(createUserBody.safeParse({ name: 'Al', email: 'a@b.co', password: 'weak', role: 'editor' }).success).toBe(false)
    expect(createUserBody.safeParse({ name: 'Al', email: 'a@b.co', password: 'Password123', role: 'editor' }).success).toBe(true)
  })

  it('requires at least one field when updating a user', () => {
    expect(updateUserBody.safeParse({}).success).toBe(false)
    expect(updateUserBody.safeParse({ active: false }).success).toBe(true)
  })

  it('requires a different new password', () => {
    expect(changePasswordBody.safeParse({ currentPassword: 'Password123', newPassword: 'Password123' }).success).toBe(false)
  })

  it('validates list parameters', () => {
    expect(listUsersQuery.parse({})).toMatchObject({ page: 1, limit: 20, sort: 'name' })
    expect(listUsersQuery.parse({ page: '2', limit: '5', sort: '-createdAt', role: 'admin', active: 'false' })).toMatchObject({
      page: 2, limit: 5, sort: '-createdAt', role: 'admin', active: false,
    })
    expect(listUsersQuery.safeParse({ limit: '1000' }).success).toBe(false)
    expect(listUsersQuery.safeParse({ sort: 'passwordHash' }).success).toBe(false)
    expect(listUsersQuery.safeParse({ unknown: '1' }).success).toBe(false)
  })

  it('validates MongoDB IDs', () => {
    expect(idParams.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true)
    expect(idParams.safeParse({ id: 'not-an-id' }).success).toBe(false)
  })
})

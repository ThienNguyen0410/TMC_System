import assert from 'node:assert/strict'
import { scryptSync, timingSafeEqual } from 'node:crypto'
import { test } from 'node:test'
import { ConflictError } from '../../../shared/errors/app-error.ts'
import type { AuthAccount, RegisterInput } from '../domain/auth-user.ts'
import type { AuthRepository, NewAccount } from '../repository/auth.repository.ts'
import { AuthService } from './auth.service.ts'

const input: RegisterInput = {
  fullName: 'Nguyen Van An',
  username: 'employee09',
  password: 'Secret123!',
  email: 'employee09@example.com',
  phone: '0901234567',
  dateOfBirth: '2003-05-15',
}

class FakeAuthRepository implements AuthRepository {
  created: NewAccount | null = null

  async findByCredentials(): Promise<AuthAccount | null> {
    return null
  }

  async createAccount(account: NewAccount): Promise<AuthAccount> {
    this.created = account
    return { id: '9', username: account.username }
  }
}

test('hashes the password in the seeded scrypt format and delegates the account', async () => {
  const repository = new FakeAuthRepository()
  const service = new AuthService(repository)

  const user = await service.register(input)

  assert.deepEqual(user, { id: '9', username: 'employee09', role: 'employee' })
  assert.ok(repository.created)
  assert.equal(repository.created.username, 'employee09')

  const [, n, r, p, salt, hash] = repository.created.passwordHash.split('$')
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(input.password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })

  assert.equal(timingSafeEqual(actual, expected), true)
})

test('propagates repository conflicts', async () => {
  const repository = new FakeAuthRepository()
  repository.createAccount = async () => {
    throw new ConflictError('Username or email is already registered.')
  }
  const service = new AuthService(repository)

  await assert.rejects(service.register(input), ConflictError)
})

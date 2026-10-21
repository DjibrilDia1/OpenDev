import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidUsername, normalizeUsername } from '../src/lib/username.ts'

test('usernames allow short Unicode names, spaces and literal punctuation', () => {
  for (const value of ['a', 'équipe dev', '名字', '🐍', 'a@b', '*_%', 'a,"b\\c']) {
    assert.equal(isValidUsername(value), true, value)
  }
  for (const value of ['', ' ', 'UPPERCASE', 'Équipe']) {
    assert.equal(isValidUsername(value), false, value)
  }
})

test('the 30-character limit counts Unicode code points', () => {
  assert.equal(isValidUsername('🐍'.repeat(30)), true)
  assert.equal(isValidUsername('🐍'.repeat(31)), false)
  assert.equal(normalizeUsername('🐍'.repeat(31)), '🐍'.repeat(30))
  assert.equal(normalizeUsername('ÉQUIPE @ DEV'), 'équipe @ dev')
  assert.equal(normalizeUsername('a'.repeat(31)), 'a'.repeat(30))
})

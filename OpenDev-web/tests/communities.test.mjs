import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCommunity } from '../src/lib/adapters.ts'

test('official communities preserve actual ownership, category and member count', () => {
  const community = toCommunity({ id: 'react', slug: 'react', name: 'React',
    description: 'React developers', created_by: 'owner', tags: ['react'],
    member_count: 1, is_official: true, category: 'Frontend' })
  assert.equal(community.kind, 'official')
  assert.equal(community.ownerId, 'owner')
  assert.equal(community.category, 'Frontend')
  assert.equal(community.memberCount, '1 membre')
})

test('existing member communities keep their default mapping', () => {
  const community = toCommunity({ id: 'community', slug: 'community', name: 'Community',
    description: 'A member community', tags: [], member_count: 0 })
  assert.equal(community.kind, 'member')
  assert.equal(community.category, 'Open source')
  assert.equal(community.memberCount, '0 membres')
})

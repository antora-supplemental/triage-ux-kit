'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  buildGroupings,
  chooseDefaultGrouping,
  groupByStatus,
} = require('../lib/groupings.js')

describe('groupings', () => {
  it('groups by destination, source, status, host', () => {
    const rows = [
      { url: 'https://old.example/a', classification: '404', status: 404, sources: ['/p1/', '/p2/'] },
      { url: 'https://old.example/b', classification: '404', status: 404, sources: ['/p1/'] },
      { url: 'https://other.example/c', classification: 'timeout', status: null, sources: ['/p3/'] },
    ]
    const g = buildGroupings(rows)
    assert.equal(g.byDestination.length, 3)
    assert.equal(g.byHost[0].key, 'old.example')
    assert.equal(g.byHost[0].count, 2)
    assert.ok(g.bySourcePage.find((x) => x.key === '/p1/' && x.count === 2))
    assert.ok(g.byStatus.find((x) => x.key === '404' && x.count === 2))
  })

  it('defaults to byDestination when host clusters dominate', () => {
    const clustered = [
      { url: 'https://rebrand.example/1', classification: '404', sources: ['/a/'] },
      { url: 'https://rebrand.example/2', classification: '404', sources: ['/b/'] },
      { url: 'https://rebrand.example/3', classification: '404', sources: ['/c/'] },
    ]
    assert.equal(chooseDefaultGrouping(clustered), 'byDestination')
    const sparse = [
      { url: 'https://a.example/1', classification: '404', sources: ['/a/'] },
      { url: 'https://b.example/2', classification: 'dns', sources: ['/b/'] },
    ]
    assert.equal(chooseDefaultGrouping(sparse), 'bySourcePage')
  })

  it('statusBucket maps unresolved kinds', () => {
    const g = groupByStatus([
      { target: 'partial.adoc', classification: 'unresolved', sources: ['page.adoc'] },
    ])
    assert.equal(g[0].key, 'unresolved')
  })
})

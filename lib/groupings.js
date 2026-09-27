'use strict'

/**
 * Generic groupings for triage UI / JSON findings.
 */

function hostOf (url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch (_) {
    return '(invalid-url)'
  }
}

function emptyGroup (key, label) {
  return { key, label: label || key, count: 0, items: [] }
}

function pushGroup (map, key, label, item) {
  if (!map.has(key)) map.set(key, emptyGroup(key, label))
  const g = map.get(key)
  g.items.push(item)
  g.count = g.items.length
}

function itemKey (item, opts = {}) {
  if (typeof opts.itemKey === 'function') return opts.itemKey(item)
  return item.url || item.target || item.key || item.path || String(item.id || '(unknown)')
}

function sourcesOf (item, opts = {}) {
  if (typeof opts.sourcesOf === 'function') return opts.sourcesOf(item)
  if (Array.isArray(item.sources) && item.sources.length) return item.sources
  if (item.source) return [item.source]
  if (item.page) return [item.page]
  return ['(unknown)']
}

function statusOf (item, opts = {}) {
  if (typeof opts.statusOf === 'function') return opts.statusOf(item)
  const c = item.classification || item.kind || item.type || 'other'
  if (c === '404' || c === 'forbidden' || c === 'timeout' || c === 'dns' || c === 'ssl') return c
  const status = item.status
  if (status == null) return c === 'ok' ? 'ok' : c
  if (status >= 500) return '5xx'
  if (status >= 400) return '4xx'
  return c
}

function groupByDestination (rows, opts) {
  const map = new Map()
  for (const r of rows) {
    const k = itemKey(r, opts)
    pushGroup(map, k, k, r)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function groupBySourcePage (rows, opts) {
  const map = new Map()
  for (const r of rows) {
    for (const s of sourcesOf(r, opts)) {
      pushGroup(map, s, s, r)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function groupByStatus (rows, opts) {
  const map = new Map()
  for (const r of rows) {
    const bucket = statusOf(r, opts)
    pushGroup(map, bucket, bucket, r)
  }
  const order = ['404', '4xx', 'forbidden', '5xx', 'timeout', 'dns', 'ssl', 'unresolved', 'unused', 'orphan', 'missing', 'stale', 'other', 'ok']
  return [...map.values()].sort((a, b) => {
    const ia = order.indexOf(a.key)
    const ib = order.indexOf(b.key)
    const sa = ia === -1 ? 99 : ia
    const sb = ib === -1 ? 99 : ib
    return sa - sb || b.count - a.count
  })
}

function groupByHost (rows, opts) {
  const map = new Map()
  for (const r of rows) {
    const url = typeof opts.urlOf === 'function' ? opts.urlOf(r) : (r.url || '')
    const h = hostOf(url)
    pushGroup(map, h, h, r)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function chooseDefaultGrouping (rows, opts = {}) {
  if (!rows || rows.length < 2) return 'bySourcePage'
  const byHost = groupByHost(rows, opts)
  if (!byHost.length || byHost[0].key === '(invalid-url)') return 'bySourcePage'
  const top = byHost[0]
  const share = top.count / rows.length
  if (top.count >= 3 || (rows.length >= 3 && share >= 0.4)) return 'byDestination'
  return 'bySourcePage'
}

function buildGroupings (rows = [], opts = {}) {
  const list = Array.isArray(rows) ? rows : []
  const chosen = opts.defaultMode || chooseDefaultGrouping(list, opts)
  return {
    default: chosen,
    byDestination: groupByDestination(list, opts),
    bySourcePage: groupBySourcePage(list, opts),
    byStatus: groupByStatus(list, opts),
    byHost: groupByHost(list, opts),
  }
}

module.exports = {
  hostOf,
  groupByDestination,
  groupBySourcePage,
  groupByStatus,
  groupByHost,
  chooseDefaultGrouping,
  buildGroupings,
}

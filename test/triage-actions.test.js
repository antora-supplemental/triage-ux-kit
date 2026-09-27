'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeCiTrigger,
  buildTriageActions,
  mailtoHref,
  formatTextEmail,
} = require('../lib/triage-actions.js')
const { buildStickyIssuePlan, planStickyIssueActions } = require('../lib/sticky-issue.js')
const { buildTriageHtml } = require('../lib/triage-page.js')

describe('triage actions', () => {
  it('encodes mailto without embedding secrets', () => {
    const report = {
      generatedAt: '2026-09-27T00:00:00Z',
      summary: { findings: 1 },
      findings: [{ target: 'x.adoc', classification: 'unresolved', sources: ['a.adoc'] }],
      meta: { reportEmail: 'support@devcentr.org' },
    }
    const href = mailtoHref(report, { toolName: 'Orphan Finder' })
    assert.match(href, /^mailto:support@devcentr\.org\?subject=/)
    assert.match(href, /body=/)
    const text = formatTextEmail(report, { toolName: 'Orphan Finder' })
    assert.match(text, /Orphan Finder/)
    assert.match(text, /x\.adoc/)

    const ci = normalizeCiTrigger({
      enabled: true,
      provider: 'github',
      dispatchUrl: 'https://example.com/proxy/dispatch',
      statusUrl: 'https://example.com/proxy/status',
    })
    assert.equal(ci.enabled, true)
    assert.ok(!JSON.stringify(ci).includes('token'))
    assert.ok(!JSON.stringify(ci).includes('ghp_'))

    const actions = buildTriageActions(report, { ciTrigger: ci, toolName: 'Orphan Finder' })
    assert.equal(actions.reportEmail, 'support@devcentr.org')
    assert.ok(actions.mailto.startsWith('mailto:'))
    assert.ok(actions.copyJson.includes('unresolved'))
  })

  it('disables ci when missing dispatch', () => {
    assert.equal(normalizeCiTrigger({ enabled: true }).enabled, false)
  })
})

describe('sticky issue', () => {
  it('builds plan and create/update actions', () => {
    const report = {
      generatedAt: '2026-09-27T00:00:00Z',
      summary: { findings: 2 },
      findings: [
        { target: 'a.adoc', classification: 'unresolved' },
        { target: 'b.adoc', classification: 'unused' },
      ],
    }
    const plan = buildStickyIssuePlan(report, {
      toolName: 'Orphan Finder',
      title: 'Orphan includes',
      triagePath: '/orphan-finder/',
    })
    assert.equal(plan.findingCount, 2)
    assert.equal(plan.shouldOpen, true)
    assert.match(plan.body, /Orphan includes/)
    assert.match(plan.body, /a\.adoc/)

    const create = planStickyIssueActions([], plan)
    assert.equal(create.action, 'create')
    const update = planStickyIssueActions([{ number: 7, title: 'Orphan includes', state: 'open' }], plan)
    assert.equal(update.action, 'update')
    assert.equal(update.issueNumber, 7)
  })
})

describe('triage page', () => {
  it('embeds client config without secrets', () => {
    const html = buildTriageHtml({
      title: 'Orphan Finder',
      toolName: 'Orphan Finder',
      ciTrigger: { enabled: true, dispatchUrl: 'https://example.com/d', statusUrl: 'https://example.com/s' },
    })
    assert.match(html, /TRIAGE_UX_CONFIG/)
    assert.match(html, /tux-ci-trigger/)
    assert.ok(!html.includes('ghp_'))
    assert.ok(!html.includes('token'))
  })
})

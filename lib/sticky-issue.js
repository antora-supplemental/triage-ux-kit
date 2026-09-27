'use strict'

const DEFAULT_EMAIL = 'support@devcentr.org'

function buildStickyIssuePlan (report, opts = {}) {
  const toolName = opts.toolName || 'Maint tool'
  const title = opts.title || `${toolName} findings`
  const label = opts.label || slugify(toolName)
  const marker = opts.marker || `<!-- ${label}-sticky -->`
  const commentMarker = opts.commentMarker || `<!-- ${label}-sticky-comment -->`
  const email = opts.reportEmail || report?.meta?.reportEmail || DEFAULT_EMAIL
  const triagePath = opts.triagePath || ''
  const maxFindings = opts.maxFindings || 30

  const s = report?.summary || {}
  const findings = report?.findings || report?.invalid || report?.issues || []
  const count = s.invalid ?? s.findings ?? s.total ?? findings.length

  const lines = [
    marker,
    `# ${title} (${count})`,
    '',
    `Generated: ${report?.generatedAt || new Date().toISOString()}`,
    `Tool: ${toolName}`,
    '',
    'Summary:',
    '```json',
    JSON.stringify(s, null, 2),
    '```',
    '',
  ]

  if (findings.length) {
    lines.push('Top findings:')
    for (const r of findings.slice(0, maxFindings)) {
      const key = r.url || r.target || r.path || r.key || '(item)'
      const kind = r.classification || r.kind || r.type || ''
      lines.push(`- ${key}${kind ? ' → ' + kind : ''}`)
    }
    lines.push('')
  } else {
    lines.push('_No findings._', '')
  }

  if (triagePath) {
    lines.push(`Triage: open \`${triagePath}\` on the published site (mailto fallback: ${email}).`)
  } else {
    lines.push(`Mailto fallback: ${email}`)
  }

  const body = lines.join('\n')

  return {
    title,
    label,
    labelColor: opts.labelColor || 'B60205',
    labelDescription: opts.labelDescription || `${toolName} findings`,
    marker,
    commentMarker,
    body,
    commentBody: commentMarker + '\n' + body,
    findingCount: count,
    shouldOpen: count > 0,
    createIfMissing: count > 0,
  }
}

function planStickyIssueActions (openIssues, plan) {
  const match = (openIssues || []).find((i) => i.title === plan.title) || (openIssues || [])[0] || null
  if (!match && plan.createIfMissing) {
    return { action: 'create', plan }
  }
  if (!match) {
    return { action: 'noop', plan }
  }
  return {
    action: 'update',
    issueNumber: match.number,
    plan,
    state: plan.shouldOpen ? 'open' : 'open',
  }
}

function slugify (s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'maint-tool'
}

module.exports = {
  buildStickyIssuePlan,
  planStickyIssueActions,
  slugify,
  DEFAULT_EMAIL,
}

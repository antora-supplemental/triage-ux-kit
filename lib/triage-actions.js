'use strict'

const DEFAULT_EMAIL = 'support@devcentr.org'

function normalizeCiTrigger (raw = {}) {
  if (!raw || raw.enabled === false) {
    return { enabled: false, provider: null, dispatchUrl: null, statusUrl: null }
  }
  const provider = (raw.provider || 'github').toLowerCase()
  return {
    enabled: Boolean(raw.enabled && (raw.dispatchUrl || raw.workflowId || raw.projectId)),
    provider,
    dispatchUrl: raw.dispatchUrl || null,
    statusUrl: raw.statusUrl || null,
    workflowId: raw.workflowId || null,
    ref: raw.ref || 'main',
    label: raw.label || 'Check now (CI)',
    pollIntervalMs: Number(raw.pollIntervalMs) || 5000,
    note: 'Site stores only a public dispatch URL or thin proxy; do not embed secrets in static HTML.',
  }
}

function formatTextEmail (report, { toolName = 'Triage Report', subjectPrefix } = {}) {
  const email = report?.meta?.reportEmail || DEFAULT_EMAIL
  const s = report?.summary || {}
  const prefix = subjectPrefix || toolName
  const lines = []
  const count = s.invalid ?? s.findings ?? s.total ?? (report?.findings?.length ?? 0)
  lines.push(`Subject: ${prefix} - ${count} finding(s)`)
  lines.push(`To: ${email}`)
  lines.push('')
  lines.push(`${toolName} (${report?.generatedAt || new Date().toISOString()})`)
  lines.push('')
  for (const [k, v] of Object.entries(s)) {
    lines.push(`${k}: ${v}`)
  }
  lines.push('')
  const items = report?.findings || report?.invalid || report?.issues || []
  if (items.length) {
    lines.push('Findings:')
    for (const r of items.slice(0, 100)) {
      const key = r.url || r.target || r.path || r.key || JSON.stringify(r).slice(0, 80)
      const kind = r.classification || r.kind || r.type || ''
      const src = (r.sources && r.sources.length) ? ` [${r.sources.join('; ')}]` : (r.source ? ` [${r.source}]` : '')
      lines.push(`  - ${key}${kind ? ' => ' + kind : ''}${src}`)
    }
  } else {
    lines.push('No findings.')
  }
  return lines.join('\n')
}

function mailtoHref (report, opts = {}) {
  const email = report?.meta?.reportEmail || opts.reportEmail || DEFAULT_EMAIL
  const s = report?.summary || {}
  const toolName = opts.toolName || 'Triage Report'
  const count = s.invalid ?? s.findings ?? s.total ?? (report?.findings?.length ?? 0)
  const subject = encodeURIComponent(`${toolName} - ${count} finding(s)`)
  const bodyLines = formatTextEmail(report, opts).split('\n').filter((l) => !/^Subject:|^To:/.test(l))
  const body = encodeURIComponent(bodyLines.join('\n').trim() + '\n')
  return `mailto:${email}?subject=${subject}&body=${body}`
}

function buildTriageActions (report, { ciTrigger, toolName } = {}) {
  const ci = normalizeCiTrigger(ciTrigger || report?.meta?.ciTrigger || {})
  const email = report?.meta?.reportEmail || DEFAULT_EMAIL
  return {
    reportEmail: email,
    mailto: mailtoHref(report, { toolName, reportEmail: email }),
    copyText: formatTextEmail(report, { toolName }),
    copyJson: JSON.stringify(report, null, 2),
    ciTrigger: ci,
  }
}

function triageClientConfig ({ reportPath, reportEmail, ciTrigger, toolName } = {}) {
  return {
    reportUrl: reportPath || './report.json',
    reportEmail: reportEmail || DEFAULT_EMAIL,
    toolName: toolName || 'Triage Report',
    ciTrigger: normalizeCiTrigger(ciTrigger || {}),
  }
}

module.exports = {
  DEFAULT_EMAIL,
  normalizeCiTrigger,
  formatTextEmail,
  mailtoHref,
  buildTriageActions,
  triageClientConfig,
}

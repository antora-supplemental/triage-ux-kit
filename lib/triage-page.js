'use strict'

const { triageClientConfig } = require('./triage-actions.js')

function escapeHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTriageHtml ({
  title = 'Triage',
  reportPath = './report.json',
  cssHref = './triage-ux.css',
  jsHref = './triage-ux.js',
  reportEmail = 'support@devcentr.org',
  ciTrigger = null,
  toolName = 'Triage Report',
  lede = 'Findings from the last scan.',
  groupOptions = null,
} = {}) {
  const client = triageClientConfig({ reportPath, reportEmail, ciTrigger, toolName })
  const ciEnabled = client.ciTrigger && client.ciTrigger.enabled
  const ciLabel = (client.ciTrigger && client.ciTrigger.label) || 'Check now (CI)'
  const opts = groupOptions || [
    { value: 'auto', label: 'Auto (default)' },
    { value: 'byDestination', label: 'Destination / target' },
    { value: 'bySourcePage', label: 'Source page' },
    { value: 'byStatus', label: 'Status / kind' },
    { value: 'byHost', label: 'Host' },
    { value: 'flat', label: 'Flat list' },
  ]
  const selectOpts = opts.map((o) =>
    `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`
  ).join('\n          ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body class="tux-triage">
  <header class="tux-header">
    <h1>${escapeHtml(title)}</h1>
    <p class="tux-lede">${escapeHtml(lede)}</p>
    <div class="tux-toolbar" id="tux-toolbar">
      <label class="tux-select-label">Group by
        <select id="tux-group-by" class="tux-select" aria-label="Group findings by">
          ${selectOpts}
        </select>
      </label>
      <button type="button" id="tux-copy" class="tux-btn">Copy report</button>
      <a id="tux-mailto" class="tux-btn tux-btn-primary" href="mailto:${escapeHtml(reportEmail)}">Email report</a>
      ${ciEnabled ? `<button type="button" id="tux-ci-trigger" class="tux-btn tux-btn-ci">${escapeHtml(ciLabel)}</button>
      <span id="tux-ci-status" class="tux-ci-status" aria-live="polite"></span>` : ''}
    </div>
  </header>
  <main>
    <section id="tux-summary" class="tux-summary" aria-live="polite">Loading report…</section>
    <div id="tux-groups" class="tux-groups"></div>
    <table class="tux-table" id="tux-table" hidden>
      <thead>
        <tr>
          <th>Target</th>
          <th>Kind</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody id="tux-tbody"></tbody>
    </table>
  </main>
  <script>
    window.TRIAGE_UX_CONFIG = ${JSON.stringify(client)};
  </script>
  <script src="${escapeHtml(jsHref)}" defer></script>
</body>
</html>
`
}

module.exports = { buildTriageHtml, escapeHtml }

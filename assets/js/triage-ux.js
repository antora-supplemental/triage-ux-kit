;(function () {
  'use strict'

  var cfg = window.TRIAGE_UX_CONFIG || {}
  var reportUrl = cfg.reportUrl || './report.json'
  var reportEmail = cfg.reportEmail || 'support@devcentr.org'
  var toolName = cfg.toolName || 'Triage Report'
  var ciTrigger = cfg.ciTrigger || { enabled: false }
  var report = null
  var groupMode = 'auto'
  var pollTimer = null

  function $(id) { return document.getElementById(id) }

  function escapeHtml (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function findings () {
    if (!report) return []
    return report.findings || report.invalid || report.issues || []
  }

  function activeGroupingKey () {
    if (groupMode === 'auto') {
      return (report && report.groupings && report.groupings.default) || 'bySourcePage'
    }
    return groupMode
  }

  function itemKey (r) {
    return r.url || r.target || r.path || r.key || '(item)'
  }

  function itemKind (r) {
    return r.classification || r.kind || r.type || 'other'
  }

  function itemSources (r) {
    if (r.sources && r.sources.length) return r.sources
    if (r.source) return [r.source]
    if (r.page) return [r.page]
    return []
  }

  function encodeMailto (rep) {
    var email = (rep.meta && rep.meta.reportEmail) || reportEmail
    var s = rep.summary || {}
    var count = s.invalid != null ? s.invalid : (s.findings != null ? s.findings : findings().length)
    var subject = encodeURIComponent(toolName + ' - ' + count + ' finding(s)')
    var lines = [toolName + ' (' + (rep.generatedAt || '') + ')', '']
    Object.keys(s).forEach(function (k) { lines.push(k + ': ' + s[k]) })
    lines.push('', 'Findings:')
    findings().slice(0, 80).forEach(function (r) {
      var src = itemSources(r)
      lines.push('  - ' + itemKey(r) + ' => ' + itemKind(r) + (src.length ? ' [' + src.join('; ') + ']' : ''))
    })
    return 'mailto:' + email + '?subject=' + subject + '&body=' + encodeURIComponent(lines.join('\n'))
  }

  function renderSummary () {
    var el = $('tux-summary')
    if (!el || !report) return
    var s = report.summary || {}
    var html = '<ul class="tux-summary-list">'
    Object.keys(s).forEach(function (k) {
      html += '<li>' + escapeHtml(k) + ': <strong>' + escapeHtml(String(s[k])) + '</strong></li>'
    })
    html += '</ul>'
    el.innerHTML = html
  }

  function renderFlat (rows) {
    var table = $('tux-table')
    var tbody = $('tux-tbody')
    var groups = $('tux-groups')
    if (groups) { groups.innerHTML = ''; groups.hidden = true }
    if (table) table.hidden = false
    if (!tbody) return
    tbody.innerHTML = ''
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="3">No findings.</td></tr>'
      return
    }
    rows.forEach(function (r) {
      tbody.insertAdjacentHTML('beforeend',
        '<tr><td>' + escapeHtml(itemKey(r)) + '</td><td><span class="tux-badge">' +
        escapeHtml(itemKind(r)) + '</span></td><td>' +
        escapeHtml(itemSources(r).join(', ') || '—') + '</td></tr>')
    })
  }

  function rebuildGroups (rows, key) {
    var map = {}
    rows.forEach(function (r) {
      var keys = []
      if (key === 'bySourcePage') keys = itemSources(r).length ? itemSources(r) : ['(unknown)']
      else if (key === 'byStatus') keys = [itemKind(r)]
      else if (key === 'byHost') {
        try { keys = [new URL(r.url || '').hostname] } catch (_) { keys = ['(invalid-url)'] }
      } else keys = [itemKey(r)]
      keys.forEach(function (k) {
        if (!map[k]) map[k] = { key: k, label: k, count: 0, items: [] }
        map[k].items.push(r)
        map[k].count++
      })
    })
    return Object.keys(map).map(function (k) { return map[k] })
      .sort(function (a, b) { return b.count - a.count || a.key.localeCompare(b.key) })
  }

  function renderGrouped (rows) {
    var table = $('tux-table')
    var groupsEl = $('tux-groups')
    if (table) table.hidden = true
    if (!groupsEl) return renderFlat(rows)
    groupsEl.hidden = false
    groupsEl.innerHTML = ''
    if (groupMode === 'flat') return renderFlat(rows)

    var key = activeGroupingKey()
    var groups = (report.groupings && report.groupings[key]) || rebuildGroups(rows, key)
    if (!groups.length) {
      groupsEl.innerHTML = '<p class="tux-empty">No findings.</p>'
      return
    }
    groups.forEach(function (g) {
      var details = document.createElement('details')
      details.className = 'tux-group'
      details.open = groups.length <= 8
      var summary = document.createElement('summary')
      summary.textContent = g.label + ' (' + g.count + ')'
      details.appendChild(summary)
      var ul = document.createElement('ul')
      ;(g.items || []).forEach(function (r) {
        var li = document.createElement('li')
        li.innerHTML = '<code>' + escapeHtml(itemKey(r)) + '</code> <span class="tux-badge">' +
          escapeHtml(itemKind(r)) + '</span> ' + escapeHtml(itemSources(r).join(', '))
        ul.appendChild(li)
      })
      details.appendChild(ul)
      groupsEl.appendChild(details)
    })
  }

  function render () {
    var rows = findings()
    if (groupMode === 'flat') renderFlat(rows)
    else renderGrouped(rows)
  }

  function wire () {
    var sel = $('tux-group-by')
    if (sel) sel.addEventListener('change', function () { groupMode = sel.value; render() })
    var copyBtn = $('tux-copy')
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var text = JSON.stringify(report, null, 2)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = 'Copied!'
            setTimeout(function () { copyBtn.textContent = 'Copy report' }, 1500)
          })
        }
      })
    }
    var mail = $('tux-mailto')
    if (mail && report) mail.href = encodeMailto(report)

    var ciBtn = $('tux-ci-trigger')
    if (ciBtn && ciTrigger.enabled && ciTrigger.dispatchUrl) {
      ciBtn.addEventListener('click', function () {
        var status = $('tux-ci-status')
        ciBtn.disabled = true
        if (status) { status.textContent = 'Triggering…'; status.className = 'tux-ci-status' }
        fetch(ciTrigger.dispatchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: ciTrigger.ref || 'main' }),
        }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status)
          if (status) status.textContent = 'Triggered. Polling…'
          if (ciTrigger.statusUrl) startPoll()
          else if (status) status.textContent = 'Triggered.'
        }).catch(function (err) {
          if (status) { status.textContent = 'Error: ' + err.message; status.className = 'tux-ci-status tux-ci-error' }
        }).finally(function () { ciBtn.disabled = false })
      })
    }
  }

  function startPoll () {
    if (pollTimer) clearInterval(pollTimer)
    var interval = ciTrigger.pollIntervalMs || 5000
    var status = $('tux-ci-status')
    pollTimer = setInterval(function () {
      fetch(ciTrigger.statusUrl, { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (data) {
        if (status) status.textContent = 'Status: ' + (data.status || data.state || 'ok')
        if (data.report || data.done) {
          clearInterval(pollTimer)
          if (data.report) { report = data.report; renderSummary(); render(); wire() }
        }
      }).catch(function () { /* keep polling */ })
    }, interval)
  }

  fetch(reportUrl, { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + reportUrl)
      return r.json()
    })
    .then(function (data) {
      report = data
      renderSummary()
      render()
      wire()
    })
    .catch(function (err) {
      var el = $('tux-summary')
      if (el) el.textContent = 'Error: ' + err.message
    })
})()

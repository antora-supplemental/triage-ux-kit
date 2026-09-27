'use strict'

const groupings = require('./groupings.js')
const triageActions = require('./triage-actions.js')
const stickyIssue = require('./sticky-issue.js')
const triagePage = require('./triage-page.js')
const path = require('node:path')

const assets = {
  cssPath: path.join(__dirname, '..', 'assets', 'css', 'triage-ux.css'),
  jsPath: path.join(__dirname, '..', 'assets', 'js', 'triage-ux.js'),
}

module.exports = {
  ...groupings,
  ...triageActions,
  ...stickyIssue,
  ...triagePage,
  assets,
}

#!/usr/bin/env node
/**
 * drift.mjs — compare two extracted locale corpora and report every difference.
 *
 *   node scripts/drift.mjs --old old-corpus.json --new new-corpus.json
 *   node scripts/drift.mjs --old upstream/corpus.json --new /tmp/corpus.json --fail-on-drift
 *
 * Use it to review what a DSH upgrade changed in the English source before
 * translating. `scripts/update-upstream.mjs` runs the same comparison inline;
 * this CLI is for comparing two corpora you already have.
 *
 * Flags:
 *   --old <path>      baseline corpus (required)
 *   --new <path>      corpus to compare (required)
 *   --report <path>   also write the Markdown report here
 *   --json            print the structured diff instead of the Markdown report
 *   --fail-on-drift   exit 1 when anything changed (CI gate)
 *   --quiet           suppress the report; combine with --fail-on-drift for a gate
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { diffCorpus, formatDriftReport } from './lib/corpus-diff.mjs'

const argv = process.argv.slice(2)
const hasFlag = (name) => argv.includes(name)

function argValue(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
}

const oldPath = argValue('--old')
const newPath = argValue('--new')
if (oldPath === undefined || newPath === undefined) {
  console.error('usage: node scripts/drift.mjs --old <corpus.json> --new <corpus.json> [--report <path>] [--json] [--fail-on-drift]')
  process.exit(2)
}

for (const [label, path] of [['--old', oldPath], ['--new', newPath]]) {
  if (!existsSync(resolve(path))) {
    console.error(`error: ${label} corpus not found at ${resolve(path)}`)
    process.exit(2)
  }
}

const oldCorpus = JSON.parse(readFileSync(resolve(oldPath), 'utf8'))
const newCorpus = JSON.parse(readFileSync(resolve(newPath), 'utf8'))
const diff = diffCorpus(oldCorpus, newCorpus)

const report = formatDriftReport(diff, { oldRef: oldPath, newRef: newPath })
const reportPath = argValue('--report')
if (reportPath !== undefined) writeFileSync(resolve(reportPath), report)

if (!hasFlag('--quiet')) {
  if (hasFlag('--json')) {
    console.log(JSON.stringify(diff, null, 2))
  } else {
    process.stdout.write(report)
  }
}

if (diff.hasDrift) {
  process.stderr.write(
    `drift: ${diff.totals.addedKeys} key(s) added, ${diff.totals.removedKeys} removed, `
    + `${diff.totals.changedValues} English value(s) changed`
    + `${diff.totals.changedValues > 0 ? ' — UPSTREAM STRING CHANGED, REVIEW REQUIRED' : ''}\n`,
  )
}

process.exit(hasFlag('--fail-on-drift') && diff.hasDrift ? 1 : 0)

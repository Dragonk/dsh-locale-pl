/**
 * Tests for the upstream locale drift detector (scripts/lib/corpus-diff.mjs and
 * scripts/drift.mjs).
 *
 * Everything here runs offline against the JSON fixtures in tests/fixtures, so
 * the drift logic is covered even when the upstream repository is unreachable.
 * The CLI is exercised through a child process to check real exit codes, which
 * is what the weekly workflow depends on.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import test from 'node:test'
import { diffCorpus, formatDriftReport, placeholdersOf } from '../scripts/lib/corpus-diff.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = join(ROOT, 'tests', 'fixtures')

const load = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'))

const base = load('corpus-base.json')
const fixture = (name) => ({ old: base, new: load(name) })

test('placeholdersOf returns the sorted unique token set', () => {
  assert.deepEqual(placeholdersOf('{b} then {a} then {b}'), ['{a}', '{b}'])
  assert.deepEqual(placeholdersOf('no tokens'), [])
  assert.deepEqual(placeholdersOf(undefined), [])
})

test('identical corpora report no drift', () => {
  const { old, new: next } = fixture('corpus-identical.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, false)
  assert.deepEqual(diff.totals, {
    addedNamespaces: 0,
    removedNamespaces: 0,
    addedKeys: 0,
    removedKeys: 0,
    changedValues: 0,
    placeholderChanges: 0,
  })
  assert.match(formatDriftReport(diff), /No drift/)
})

test('a changed English value is reported as REVIEW REQUIRED', () => {
  const { old, new: next } = fixture('corpus-changed-value.json')
  const diff = diffCorpus(old, next)

  assert.equal(diff.hasDrift, true)
  assert.equal(diff.totals.changedValues, 1)
  assert.equal(diff.totals.addedKeys, 0)
  assert.equal(diff.totals.removedKeys, 0)
  assert.deepEqual(
    diff.changedValues.map((c) => ({ id: `${c.ns}/${c.key}`, old: c.old, new: c.new })),
    [{ id: 'alpha/greeting', old: 'Hello', new: 'Hello there' }],
  )
  assert.equal(diff.totals.placeholderChanges, 0)

  const report = formatDriftReport(diff)
  assert.match(report, /UPSTREAM STRING CHANGED — REVIEW REQUIRED/)
  assert.match(report, /OLD: "Hello"/)
  assert.match(report, /NEW: "Hello there"/)
})

test('an added key is reported', () => {
  const { old, new: next } = fixture('corpus-added-key.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, true)
  assert.equal(diff.totals.addedKeys, 1)
  assert.deepEqual(diff.keys.added, [{ ns: 'alpha', key: 'added' }])
  assert.match(formatDriftReport(diff), /## Keys added/)
})

test('a removed key is reported', () => {
  const { old, new: next } = fixture('corpus-removed-key.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, true)
  assert.equal(diff.totals.removedKeys, 1)
  assert.deepEqual(diff.keys.removed, [{ ns: 'alpha', key: 'farewell' }])
  assert.match(formatDriftReport(diff), /## Keys removed/)
})

test('an added namespace reports each of its keys as new', () => {
  const { old, new: next } = fixture('corpus-added-namespace.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, true)
  assert.deepEqual(diff.namespaces.added, ['gamma'])
  assert.equal(diff.totals.addedKeys, 1)
  assert.deepEqual(diff.keys.added, [{ ns: 'gamma', key: 'fresh' }])
})

test('a removed namespace is reported', () => {
  const { old, new: next } = fixture('corpus-removed-namespace.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, true)
  assert.deepEqual(diff.namespaces.removed, ['beta'])
  assert.equal(diff.totals.removedKeys, 0)
})

test('a changed placeholder set is flagged alongside the value change', () => {
  const { old, new: next } = fixture('corpus-placeholder-change.json')
  const diff = diffCorpus(old, next)
  assert.equal(diff.hasDrift, true)
  assert.equal(diff.totals.changedValues, 1)
  assert.equal(diff.totals.placeholderChanges, 1)
  assert.deepEqual(diff.placeholderChanges, [
    { ns: 'alpha', key: 'counter', old: ['{count}'], new: ['{total}'] },
  ])
  assert.ok(
    formatDriftReport(diff).includes('PLACEHOLDERS: ["{count}"] → ["{total}"]'),
    'the report states the old and new placeholder sets',
  )
})

test('the report renders OLD and NEW for every changed value', () => {
  const diff = diffCorpus(base, load('corpus-placeholder-change.json'))
  const report = formatDriftReport(diff, { oldRef: 'tag-a', newRef: 'tag-b' })
  assert.match(report, /Compared tag-a → tag-b/)
  assert.match(report, /### .*alpha\/counter.*/)
})

test('the CLI exits 0 without drift and 1 with --fail-on-drift on drift', () => {
  const cli = join(ROOT, 'scripts', 'drift.mjs')
  const run = (oldName, newName, extra = []) =>
    spawnSync(process.execPath, [cli, '--old', join(FIXTURES, oldName), '--new', join(FIXTURES, newName), ...extra], {
      encoding: 'utf8',
    })

  const clean = run('corpus-base.json', 'corpus-identical.json')
  assert.equal(clean.status, 0, clean.stderr)
  assert.match(clean.stdout, /No drift/)

  const drifted = run('corpus-base.json', 'corpus-changed-value.json', ['--fail-on-drift'])
  assert.equal(drifted.status, 1)
  assert.match(drifted.stdout, /UPSTREAM STRING CHANGED — REVIEW REQUIRED/)
  assert.match(drifted.stderr, /REVIEW REQUIRED/)

  const reported = run('corpus-base.json', 'corpus-changed-value.json')
  assert.equal(reported.status, 0, 'without --fail-on-drift the CLI reports but does not fail')

  const missing = spawnSync(process.execPath, [cli, '--old', join(FIXTURES, 'nope.json'), '--new', join(FIXTURES, 'corpus-base.json')], { encoding: 'utf8' })
  assert.equal(missing.status, 2)
})

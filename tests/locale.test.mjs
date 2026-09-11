/**
 * Test suite for dsh-locale-pl.
 *
 * Covers the three things that can silently break a language pack:
 *   1. the dictionaries drift from the English upstream keys/placeholders,
 *   2. the committed browser bundle (lib/client.js) drifts from dict/pl/*.json,
 *   3. the bundle no longer registers the language and dictionaries against the
 *      official locale registry API.
 *
 * Run with: node --test tests/
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DICT_DIR = join(ROOT, 'dict', 'pl')
const CORPUS = JSON.parse(readFileSync(join(ROOT, 'upstream', 'corpus.json'), 'utf8'))
const PLACEHOLDER_RE = /\{[^{}]+\}/g

function loadPlDicts() {
  const out = {}
  for (const name of readdirSync(DICT_DIR).filter((f) => f.endsWith('.json')).sort()) {
    out[name.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(DICT_DIR, name), 'utf8'))
  }
  return out
}

/** Execute the committed bundle under a fake loader and return what it registers. */
function loadBundle() {
  const source = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
  let factory = null
  const window = { __ModuleLoader__: { load(mod) { factory = mod.factory } } }
  const sandbox = { window, console, Object, JSON, Symbol, Array, Set, Map, Error }
  sandbox.globalThis = sandbox
  vm.runInContext(source, vm.createContext(sandbox), { filename: 'lib/client.js' })
  assert.ok(factory, 'lib/client.js must call window.__ModuleLoader__.load')
  const mod = factory(() => { throw new Error('no external requires expected') })
  const languages = []
  const dicts = {}
  const locale = {
    addLanguage(lang) { languages.push(lang); return () => {} },
    register(ns, localeId, dict) { (dicts[ns] ??= {})[localeId] = dict; return () => {} },
  }
  let kicked = 0
  const ctx = {
    locale,
    effect(fn) { kicked++; return fn() },
  }
  assert.equal(typeof mod.apply, 'function', 'bundle must export apply')
  mod.apply(ctx)
  return { mod, languages, dicts, kicked }
}

const pl = loadPlDicts()

test('every upstream namespace has a Polish dictionary', () => {
  const missing = Object.keys(CORPUS).filter((ns) => !(ns in pl))
  assert.deepEqual(missing, [], `missing namespaces: ${missing.join(', ')}`)
})

test('every upstream key is translated', () => {
  const missing = []
  for (const ns of Object.keys(CORPUS)) {
    for (const key of Object.keys(CORPUS[ns])) {
      if (!(key in (pl[ns] ?? {}))) missing.push(`${ns}/${key}`)
    }
  }
  assert.deepEqual(missing, [], `missing keys: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`)
})

test('no Polish key is unknown upstream and every value is a non-empty string', () => {
  const problems = []
  for (const [ns, dict] of Object.entries(pl)) {
    if (!(ns in CORPUS)) { problems.push(`${ns}: unknown namespace`); continue }
    for (const [key, value] of Object.entries(dict)) {
      if (!(key in CORPUS[ns])) problems.push(`${ns}/${key}: unknown key`)
      if (typeof value !== 'string' || value.length === 0) problems.push(`${ns}/${key}: not a non-empty string`)
    }
  }
  assert.deepEqual(problems, [])
})

test('placeholders match English exactly', () => {
  const problems = []
  for (const [ns, dict] of Object.entries(pl)) {
    for (const [key, value] of Object.entries(dict)) {
      const en = CORPUS[ns]?.[key]?.en ?? ''
      const enTokens = [...new Set(en.match(PLACEHOLDER_RE) ?? [])].sort()
      const plTokens = [...new Set(value.match(PLACEHOLDER_RE) ?? [])].sort()
      if (JSON.stringify(enTokens) !== JSON.stringify(plTokens)) {
        problems.push(`${ns}/${key}: en=${JSON.stringify(enTokens)} pl=${JSON.stringify(plTokens)}`)
      }
    }
  }
  assert.deepEqual(problems, [])
})

test('the committed bundle registers exactly the dict/pl dictionaries', () => {
  const { dicts } = loadBundle()
  const dictNs = Object.keys(pl).sort()
  assert.deepEqual(Object.keys(dicts).sort(), dictNs, 'bundle namespaces must equal dict/pl namespaces')
  // Objects created inside the vm realm have a different Object.prototype, so
  // normalize both sides through JSON before comparing.
  const plain = (value) => JSON.parse(JSON.stringify(value))
  for (const ns of dictNs) {
    assert.deepEqual(plain(dicts[ns].pl), plain(pl[ns]), `bundle dictionary for ${ns} must equal dict/pl/${ns}.json`)
  }
})

test('the bundle registers Polski with an English fallback', () => {
  const { languages, kicked } = loadBundle()
  assert.equal(languages.length, 1, 'exactly one language is registered')
  assert.deepEqual(
    { id: languages[0].id, label: languages[0].label, fallback: languages[0].fallback },
    { id: 'pl', label: 'Polski', fallback: 'en' },
  )
  assert.equal(kicked, Object.keys(pl).length + 1, 'every registration rides ctx.effect')
})

test('the identical-to-en allowlist is exact', () => {
  const allowPath = join(ROOT, 'upstream', 'identical-allowlist.json')
  const allowed = new Set(JSON.parse(readFileSync(allowPath, 'utf8')).allow ?? [])
  const identical = new Set()
  for (const [ns, dict] of Object.entries(pl)) {
    for (const [key, value] of Object.entries(dict)) {
      if (value === CORPUS[ns]?.[key]?.en) identical.add(`${ns}/${key}`)
    }
  }
  const undocumented = [...identical].filter((k) => !allowed.has(k)).sort()
  const stale = [...allowed].filter((k) => !identical.has(k)).sort()
  assert.deepEqual(undocumented, [], `identical values not in upstream/identical-allowlist.json: ${undocumented.join(', ')}`)
  assert.deepEqual(stale, [], `allowlist entries that are no longer identical: ${stale.join(', ')}`)
})

test('package.json declares the bundle patch and the web client half', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-locale-pl')
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.equal(pkg.exports?.['./client']?.default ?? pkg.exports?.['./client'], './lib/client.js')
})

test('the bundle id matches the package name', () => {
  const source = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const match = /id:\s*"([^"]+)"/.exec(source)
  assert.ok(match, 'bundle must declare an id')
  assert.equal(match[1], pkg.name)
})

#!/usr/bin/env node
/**
 * check.mjs — dictionary conformance checker for dsh-locale-pl (the CI contract).
 *
 * Compares `dict/pl/<namespace>.json` against the English source captured in
 * `upstream/corpus.json` (see scripts/extract.mjs) and reports every way the
 * pack can drift from the DSH locale registry:
 *
 *   Errors (always exit 1):
 *     - a Polish namespace that is not in the upstream corpus
 *     - a Polish key that the namespace does not define (removed/renamed upstream)
 *     - a value that is not a non-empty string
 *     - a placeholder mismatch: every {token} in the English value must appear
 *       verbatim in the Polish value and vice versa
 *
 *   Warnings (informational):
 *     - a Polish value identical to English (probably untranslated)
 *     - a namespace present upstream with no Polish file yet
 *     - a plural pair (.one/.other) with a missing sibling
 *     - an `.other` value that starts with the counter, which reads badly in
 *       Polish for 2–4 ("{count} plików" → prefer the colon form)
 *
 * Flags:
 *   --strict          exit 1 when any upstream key is still missing (CI gate)
 *   --corpus <path>   override the corpus path
 *   --dict <dir>      override the dictionary directory (default dict/pl)
 *   --json            print a machine-readable summary instead of a table
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..')

/* ------------------------------------------------------------------ CLI -- */

const argv = process.argv.slice(2)
const hasFlag = (name) => argv.includes(name)

function argValue(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
}

const strict = hasFlag('--strict')
const asJson = hasFlag('--json')
const corpusPath = resolve(argValue('--corpus') ?? join(PROJECT_ROOT, 'upstream', 'corpus.json'))
const dictDir = resolve(argValue('--dict') ?? join(PROJECT_ROOT, 'dict', 'pl'))

const PLACEHOLDER_RE = /\{[^{}]+\}/g
/** Plural keys the client resolves with a binary count === 1 ternary. */
const PLURAL_SUFFIX_RE = /\.(one|other|zero|two|few|many)$/
const COUNTER_FIRST_RE = /^\{(?:count|n)\}/

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

/* ----------------------------------------------------------------- load -- */

if (!existsSync(corpusPath)) {
  fail(`upstream corpus not found at ${corpusPath} — run scripts/extract.mjs first`)
}

let corpus
try {
  corpus = JSON.parse(readFileSync(corpusPath, 'utf8'))
} catch (err) {
  fail(`upstream corpus is not valid JSON (${corpusPath}): ${err.message}`)
}
if (corpus === null || typeof corpus !== 'object' || Array.isArray(corpus)) {
  fail(`upstream corpus must be an object of namespaces (${corpusPath})`)
}

/**
 * Namespace/key pairs whose Polish value is intentionally identical to English
 * (product names, units, identifiers, separators). Kept in-repo so CI stays
 * quiet for known cases while still flagging genuinely untranslated strings.
 */
const identicalAllowlistPath = resolve(PROJECT_ROOT, 'upstream', 'identical-allowlist.json')
let identicalAllowlist = new Set()
let allowlistLoadError = null
if (existsSync(identicalAllowlistPath)) {
  try {
    const parsed = JSON.parse(readFileSync(identicalAllowlistPath, 'utf8'))
    if (Array.isArray(parsed.allow)) identicalAllowlist = new Set(parsed.allow)
  } catch (err) {
    // A corrupt allowlist must not silently pass: report it as an error below.
    allowlistLoadError = `upstream/identical-allowlist.json: invalid JSON (${err.message})`
  }
}

/** @type {Map<string, Record<string, string>>} */
const plDicts = new Map()
const parseFailures = []

if (!existsSync(dictDir) || !statSync(dictDir).isDirectory()) {
  fail(`Polish dictionary directory ${dictDir} does not exist`)
}

const dictFiles = readdirSync(dictDir, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.json'))
  .map((e) => e.name)
  .sort()

for (const name of dictFiles) {
  const ns = name.slice(0, -'.json'.length)
  let parsed
  try {
    parsed = JSON.parse(readFileSync(join(dictDir, name), 'utf8'))
  } catch (err) {
    parseFailures.push(`dict/pl/${name}: invalid JSON (${err.message})`)
    continue
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    parseFailures.push(`dict/pl/${name}: dictionary root must be a JSON object`)
    continue
  }
  plDicts.set(ns, parsed)
}

/* ------------------------------------------------------------- validate -- */

/** @type {string[]} */
const errors = []
/** @type {string[]} */
const warnings = []
const coverage = []

errors.push(...parseFailures)
if (allowlistLoadError !== null) errors.push(allowlistLoadError)

for (const [ns, dict] of plDicts) {
  const upstream = corpus[ns]
  if (upstream === undefined || upstream === null || typeof upstream !== 'object') {
    errors.push(`[${ns}] namespace is not present in the upstream corpus (stale or mistyped file name?)`)
    continue
  }
  let translated = 0
  for (const [key, value] of Object.entries(dict)) {
    const entry = upstream[key]
    if (entry === undefined || entry === null || typeof entry !== 'object') {
      errors.push(`[${ns}] key '${key}' is not present in the upstream corpus (removed or renamed upstream?)`)
      continue
    }
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`[${ns}] '${key}': value must be a non-empty string`)
      continue
    }
    translated++
    const en = typeof entry.en === 'string' ? entry.en : ''
    const enTokens = new Set(en.match(PLACEHOLDER_RE) ?? [])
    const plTokens = new Set(value.match(PLACEHOLDER_RE) ?? [])
    const missingInPl = [...enTokens].filter((t) => !plTokens.has(t))
    const extraInPl = [...plTokens].filter((t) => !enTokens.has(t))
    if (missingInPl.length > 0) {
      errors.push(`[${ns}] '${key}': placeholder(s) present in en but missing in pl: ${missingInPl.join(', ')}`)
    }
    if (extraInPl.length > 0) {
      errors.push(`[${ns}] '${key}': placeholder(s) present in pl but not in en: ${extraInPl.join(', ')}`)
    }
    if (
      missingInPl.length === 0
      && extraInPl.length === 0
      && value === en
      && !identicalAllowlist.has(`${ns}/${key}`)
    ) {
      warnings.push(`[${ns}] '${key}': pl value is identical to en (probably untranslated)`)
    }
  }
  coverage.push({ ns, total: Object.keys(upstream).length, translated })
}

const untranslated = Object.keys(corpus)
  .filter((ns) => !plDicts.has(ns))
  .sort()

/* -------------------------------------------------------- plural lint -- */

for (const [ns, dict] of plDicts) {
  const upstream = corpus[ns]
  if (upstream === undefined || typeof upstream !== 'object') continue
  for (const [key, value] of Object.entries(dict)) {
    const suffix = PLURAL_SUFFIX_RE.exec(key)
    if (suffix === null) continue
    const base = key.slice(0, -suffix[0].length)
    const siblings = Object.keys(upstream).filter(
      (k) => k.startsWith(`${base}.`) && PLURAL_SUFFIX_RE.test(k),
    )
    const missingSiblings = siblings.filter((s) => dict[s] === undefined)
    if (missingSiblings.length > 0) {
      warnings.push(`[${ns}] '${key}': plural pair has sibling key(s) missing in pl: ${missingSiblings.join(', ')}`)
    }
    if (suffix[1] === 'other' && typeof value === 'string' && COUNTER_FIRST_RE.test(value)) {
      warnings.push(
        `[${ns}] '${key}': pl .other starts with the counter ("${value}") — the client fires .other for every count except 1, so 2–4 read badly; prefer "Plików: {count}"`,
      )
    }
  }
}

/* ---------------------------------------------------------------- table -- */

const rows = [...coverage].sort((a, b) => a.ns.localeCompare(b.ns))
const allTotal = rows.reduce((acc, r) => acc + r.total, 0)
  + untranslated.reduce((acc, ns) => acc + Object.keys(corpus[ns]).length, 0)
const grandTranslated = rows.reduce((acc, r) => acc + r.translated, 0)

if (asJson) {
  console.log(JSON.stringify({
    namespaces: { total: Object.keys(corpus).length, translated: plDicts.size, missing: untranslated },
    keys: { total: allTotal, translated: grandTranslated, missing: allTotal - grandTranslated },
    errors,
    warnings,
  }, null, 2))
} else {
  const pad = (s, n) => String(s).padEnd(n)
  const padStart = (s, n) => String(s).padStart(n)
  console.log('pl dictionary coverage vs upstream corpus')
  console.log('')
  console.log(`  ${pad('namespace', 30)}${padStart('total', 7)}${padStart('translated', 12)}${padStart('coverage', 10)}`)
  console.log(`  ${'-'.repeat(59)}`)
  for (const { ns, total, translated } of rows) {
    const pct = total === 0 ? '100%' : `${Math.floor((translated / total) * 100)}%`
    console.log(`  ${pad(ns, 30)}${padStart(total, 7)}${padStart(translated, 12)}${padStart(pct, 10)}`)
  }
  for (const ns of untranslated) {
    const total = Object.keys(corpus[ns]).length
    console.log(`  ${pad(ns, 30)}${padStart(total, 7)}${padStart(0, 12)}${padStart('0%', 10)}`)
  }
  console.log(`  ${'-'.repeat(59)}`)
  const grandPct = allTotal === 0 ? '100%' : `${Math.floor((grandTranslated / allTotal) * 100)}%`
  console.log(`  ${pad('TOTAL', 30)}${padStart(allTotal, 7)}${padStart(grandTranslated, 12)}${padStart(grandPct, 10)}`)
  console.log('')

  if (untranslated.length > 0) {
    console.log(`No pl dictionary yet for ${untranslated.length} namespace(s): ${untranslated.join(', ')}`)
    console.log('')
  }
  if (errors.length > 0) {
    console.log(`Structural violations (${errors.length}):`)
    for (const e of errors) console.log(`  ERROR  ${e}`)
    console.log('')
  }
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`)
    for (const w of warnings) console.log(`  WARN   ${w}`)
    console.log('')
  }
}

const missingCount = allTotal - grandTranslated

if (!asJson && errors.length === 0) console.log('OK: no structural violations.')

if (errors.length > 0) process.exit(1)
if (strict && (missingCount > 0 || untranslated.length > 0)) {
  if (!asJson) {
    console.log(`--strict: ${missingCount} upstream key(s) across ${untranslated.length} namespace(s) still untranslated.`)
  }
  process.exit(1)
}
process.exit(0)

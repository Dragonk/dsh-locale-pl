#!/usr/bin/env node
/**
 * update-upstream.mjs — refresh the English reference corpus from a DSH release.
 *
 *   node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2
 *   node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2 --fail-on-drift
 *
 * Steps:
 *   1. clone or update the DeepSeek Harness repository at `--ref` into a local
 *      reference checkout (default `.upstream/dsh`);
 *   2. extract the new corpus into a staging directory;
 *   3. compare it with the committed `upstream/corpus.json` and write a drift
 *      report (added/removed namespaces and keys, changed English values,
 *      changed placeholder sets);
 *   4. adopt the new corpus, report, and reference metadata.
 *
 * `--fail-on-drift` exits 1 after step 4 when anything changed. That is the CI
 * gate: it forces a human to review and translate the change instead of letting
 * the corpus advance silently. Nothing here commits, pushes, or translates.
 *
 * Flags:
 *   --ref <git ref>    upstream tag/branch/commit (default: the recorded tag)
 *   --dir <path>       reference checkout (default .upstream/dsh)
 *   --out <path>       corpus output dir (default upstream)
 *   --fail-on-drift    exit 1 when the comparison finds any change
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffCorpus, formatDriftReport } from './lib/corpus-diff.mjs'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)

function argValue(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
}

const referencePath = join(PROJECT_ROOT, 'upstream', 'reference.json')
let recorded = {}
if (existsSync(referencePath)) {
  try { recorded = JSON.parse(readFileSync(referencePath, 'utf8')) } catch { recorded = {} }
}

const ref = argValue('--ref') ?? recorded.tag
if (ref === undefined) {
  console.error('error: no --ref given and upstream/reference.json has no tag to reuse')
  process.exit(1)
}
const checkout = resolve(argValue('--dir') ?? join(PROJECT_ROOT, '.upstream', 'dsh'))
const outDir = resolve(argValue('--out') ?? join(PROJECT_ROOT, 'upstream'))
const corpusPath = join(outDir, 'corpus.json')
const reportPath = join(outDir, 'drift-report.md')
const failOnDrift = argv.includes('--fail-on-drift')
const remote = recorded.repository ?? 'https://github.com/deepseek-ai/deepseek-harness'

/**
 * Run a command, inheriting stdio, and abort the whole script on failure.
 * @param command - executable name.
 * @param args - argument list.
 * @param options - extra spawnSync options.
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    console.error(`error: \`${command} ${args.join(' ')}\` exited with ${String(result.status)}`)
    process.exit(result.status ?? 1)
  }
}

/* ------------------------------------------------ 1. reference checkout -- */

if (!existsSync(join(checkout, '.git'))) {
  console.log(`update-upstream: cloning ${remote} (${ref}) into ${checkout}`)
  mkdirSync(dirname(checkout), { recursive: true })
  run('git', ['clone', '--depth', '1', '--branch', ref, remote, checkout])
} else {
  console.log(`update-upstream: updating ${checkout} to ${ref}`)
  // Fetch into FETCH_HEAD so tags, branches, and raw commits all resolve the
  // same way; then check that exact tree out detached (we only read files).
  run('git', ['-C', checkout, 'fetch', '--depth', '1', 'origin', ref])
  run('git', ['-C', checkout, 'checkout', '--force', '--detach', 'FETCH_HEAD'])
}

/* ------------------------------------------------ 2. staged extraction -- */

const staging = join(PROJECT_ROOT, '.tmp', 'upstream-extract')
rmSync(staging, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

// The extractor imports the dictionaries straight from TypeScript sources, which
// needs Node's type stripping. It is on by default from Node 22.18 and 24; pass
// the flag explicitly on the 22.6–22.17 range and flag-less builds.
const typedStripping = process.features?.typescript
const nodeArgs = typedStripping === 'strip' || typedStripping === 'transform'
  ? []
  : ['--experimental-strip-types']
run(process.execPath, [...nodeArgs, join(PROJECT_ROOT, 'scripts', 'extract.mjs'), '--root', checkout, '--out', staging])

const nextCorpus = JSON.parse(readFileSync(join(staging, 'corpus.json'), 'utf8'))

/* ------------------------------------------------------ 3. drift report -- */

let previousCorpus = null
if (existsSync(corpusPath)) {
  try {
    previousCorpus = JSON.parse(readFileSync(corpusPath, 'utf8'))
  } catch (err) {
    console.error(`warning: committed corpus is unreadable (${err.message}); treating this as a first run`)
  }
}

const diff = diffCorpus(previousCorpus ?? {}, nextCorpus)
const oldRef = typeof recorded.tag === 'string' ? recorded.tag : 'committed corpus'
const report = formatDriftReport(diff, { oldRef, newRef: ref })

/* ------------------------------------------------------------ 4. adopt -- */

mkdirSync(outDir, { recursive: true })
cpSync(join(staging, 'corpus.json'), corpusPath)
cpSync(join(staging, 'report.json'), join(outDir, 'report.json'))
writeFileSync(reportPath, report)

const commit = spawnSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const committedAt = spawnSync('git', ['-C', checkout, 'show', '-s', '--format=%cI', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const report2 = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8'))

// Keep any hand-written fields already in the reference (for example the
// provenance note) and overwrite only the values this run measured.
const next = {
  ...recorded,
  dshVersion: ref.replace(/^dsh-v/, ''),
  tag: ref,
  commit,
  repository: remote,
  committedAt,
  extractedAt: new Date().toISOString().slice(0, 10),
  namespaces: report2.totals.namespaces,
  keys: report2.totals.keys,
}
writeFileSync(referencePath, JSON.stringify(next, null, 2) + '\n')

/* --------------------------------------------------------- 5. summary -- */

process.stdout.write('\n' + report + '\n')
console.log(`update-upstream: recorded ${next.tag} (${commit.slice(0, 12)}) — ${next.namespaces} namespaces, ${next.keys} keys`)
console.log(`update-upstream: drift report written to ${reportPath}`)

if (diff.hasDrift) {
  console.log(
    `update-upstream: DRIFT — ${diff.totals.addedKeys} key(s) added, ${diff.totals.removedKeys} removed, `
    + `${diff.totals.changedValues} English value(s) changed`,
  )
  if (diff.totals.changedValues > 0) {
    console.log('update-upstream: UPSTREAM STRING CHANGED — REVIEW REQUIRED')
  }
  console.log('update-upstream: translate the affected keys in dict/pl, then run `npm run build && npm test`.')
  if (failOnDrift) {
    console.error('update-upstream: --fail-on-drift is set and drift was found; failing for review.')
    process.exit(1)
  }
} else {
  console.log('update-upstream: no drift; the English source matches the committed corpus.')
}

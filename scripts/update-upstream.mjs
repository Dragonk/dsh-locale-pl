#!/usr/bin/env node
/**
 * update-upstream.mjs — refresh the English reference corpus from a DSH release.
 *
 *   node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2
 *
 * Steps:
 *   1. clone or update the DeepSeek Harness repository at `--ref` into the
 *      local reference checkout (default `.upstream/dsh`);
 *   2. run scripts/extract.mjs against it, rewriting upstream/corpus.json and
 *      upstream/report.json;
 *   3. record the tag, commit, and totals in upstream/reference.json.
 *
 * After it finishes run `npm run check`. Missing namespaces/keys are the
 * upstream additions that still need a Polish translation; translate them in
 * dict/pl, then `npm run build && npm test`.
 *
 * Flags:
 *   --ref <git ref>   upstream tag/branch/commit (default: the recorded tag)
 *   --dir <path>      reference checkout (default .upstream/dsh)
 *   --out <path>      corpus output dir (default upstream)
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
const remote = recorded.repository ?? 'https://github.com/deepseek-ai/deepseek-harness'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    console.error(`error: \`${command} ${args.join(' ')}\` exited with ${String(result.status)}`)
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(join(checkout, '.git'))) {
  console.log(`update-upstream: cloning ${remote} (${ref}) into ${checkout}`)
  run('git', ['clone', '--depth', '1', '--branch', ref, remote, checkout])
} else {
  console.log(`update-upstream: updating ${checkout} to ${ref}`)
  run('git', ['-C', checkout, 'fetch', '--depth', '1', 'origin', 'tag', ref])
  run('git', ['-C', checkout, 'checkout', '--force', ref])
}

run(process.execPath, [join(PROJECT_ROOT, 'scripts', 'extract.mjs'), '--root', checkout, '--out', outDir])

const commit = spawnSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const committedAt = spawnSync('git', ['-C', checkout, 'show', '-s', '--format=%cI', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const report = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8'))

const next = {
  dshVersion: ref.replace(/^dsh-v/, ''),
  tag: ref,
  commit,
  repository: remote,
  committedAt,
  extractedAt: new Date().toISOString().slice(0, 10),
  namespaces: report.totals.namespaces,
  keys: report.totals.keys,
}
writeFileSync(referencePath, JSON.stringify(next, null, 2) + '\n')
console.log(`update-upstream: recorded ${next.tag} (${commit.slice(0, 12)}) — ${next.namespaces} namespaces, ${next.keys} keys`)
console.log('update-upstream: next, run \`npm run check\` to list newly added upstream keys.')

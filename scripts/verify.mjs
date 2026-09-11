#!/usr/bin/env node
/**
 * verify.mjs — the full pre-release gate, identical locally and in CI.
 *
 *   node scripts/verify.mjs
 *
 * Runs, in order:
 *   1. install the pinned DSH locale runtime (scripts/fetch-locale-runtime.mjs);
 *   2. rebuild lib/client.js from dict/pl;
 *   3. fail if the committed bundle differs from the rebuild;
 *   4. check:strict against the upstream corpus;
 *   5. `node --test` with DSH_REQUIRE_LOCALE_RUNTIME=1, so the integration test
 *      fails when the runtime is absent instead of skipping.
 *
 * Step 2 is skipped when `--no-build` is passed (CI builds in its own step and
 * diffs the tree itself). An environment variable set by the caller is honoured;
 * this script only fills in the default.
 */

import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skipBuild = process.argv.includes('--no-build')

/**
 * Run one gate step and abort the whole gate on failure.
 * @param label - step name shown in the log.
 * @param args - node script arguments, or a shell-free command description.
 * @param env - environment overrides for this step.
 */
function step(label, [command, ...args], env = {}) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) {
    console.error(`\nverify: FAILED at "${label}" (exit ${String(result.status)})`)
    process.exit(result.status ?? 1)
  }
}

const node = process.execPath

step('install pinned DSH locale runtime', [node, join(PROJECT_ROOT, 'scripts', 'fetch-locale-runtime.mjs')])

if (!skipBuild) {
  step('build browser bundle', [node, join(PROJECT_ROOT, 'scripts', 'build.mjs')])
}

step('check:strict', [node, join(PROJECT_ROOT, 'scripts', 'check.mjs'), '--strict'])

step('tests (LocaleRuntime required)', [node, '--test'], { DSH_REQUIRE_LOCALE_RUNTIME: '1' })

console.log('\nverify: OK')

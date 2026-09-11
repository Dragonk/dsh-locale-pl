#!/usr/bin/env node
/**
 * fetch-locale-runtime.mjs — install the official DSH locale plugin for testing.
 *
 *   node scripts/fetch-locale-runtime.mjs
 *
 * tests/runtime.integration.test.mjs loads the real
 * `@deepseek-ai/dsh-client-locale` browser bundle and drives its actual
 * `LocaleRuntime`. This script puts that exact package in `node_modules` so
 * the test can run — locally and in CI — instead of skipping.
 *
 * The version is read from `upstream/reference.json`, the same file the
 * translation corpus is pinned to, so the test always exercises the DSH version
 * this pack claims to support. Nothing is written to package.json or the lock
 * file: the package is a test-only fixture, not a dependency of the plugin.
 *
 * Flags:
 *   --version <semver>  override the version (default: upstream/reference.json)
 *   --quiet             only print errors
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const quiet = argv.includes('--quiet')

function argValue(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
}

function log(message) {
  if (!quiet) console.log(message)
}

const PACKAGE = '@deepseek-ai/dsh-client-locale'
const referencePath = join(PROJECT_ROOT, 'upstream', 'reference.json')

let version = argValue('--version')
if (version === undefined) {
  if (!existsSync(referencePath)) {
    console.error(`error: ${referencePath} is missing; pass --version explicitly`)
    process.exit(1)
  }
  const reference = JSON.parse(readFileSync(referencePath, 'utf8'))
  version = reference.dshVersion
  if (typeof version !== 'string' || version.length === 0) {
    console.error('error: upstream/reference.json has no usable dshVersion; pass --version explicitly')
    process.exit(1)
  }
}

const spec = `${PACKAGE}@${version}`
log(`fetch-locale-runtime: installing ${spec} (pinned by upstream/reference.json)`)

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  [
    'install',
    '--no-save',
    '--no-package-lock',
    '--no-audit',
    '--no-fund',
    // The package's only peer dependency (@deepseek-ai/cordis) is a host-side
    // runtime concern. The integration test constructs LocaleRuntime directly
    // and stubs every require, so resolving peers would only add unrelated
    // packages to the install.
    '--legacy-peer-deps',
    spec,
  ],
  { cwd: PROJECT_ROOT, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' },
)

if (result.status !== 0) {
  console.error(`error: npm install ${spec} failed with status ${String(result.status)}`)
  if (quiet && result.stderr) process.stderr.write(String(result.stderr))
  process.exit(result.status ?? 1)
}

/* ------------------------------------------------------------- verify -- */

const clientPath = join(PROJECT_ROOT, 'node_modules', PACKAGE, 'lib', 'client.js')
const manifestPath = join(PROJECT_ROOT, 'node_modules', PACKAGE, 'package.json')

if (!existsSync(clientPath) || !existsSync(manifestPath)) {
  console.error(`error: ${PACKAGE} installed but ${clientPath} is missing`)
  process.exit(1)
}

const installed = JSON.parse(readFileSync(manifestPath, 'utf8')).version
if (installed !== version) {
  console.error(`error: expected ${PACKAGE}@${version}, found ${installed}`)
  process.exit(1)
}

const bundle = readFileSync(clientPath, 'utf8')
if (!bundle.includes('LocaleRuntime')) {
  console.error(`error: ${clientPath} does not export LocaleRuntime`)
  process.exit(1)
}

log(`fetch-locale-runtime: ${PACKAGE}@${installed} ready at ${clientPath}`)

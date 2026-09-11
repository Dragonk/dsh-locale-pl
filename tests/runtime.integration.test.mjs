/**
 * Runtime integration test: load the shipped @deepseek-ai/dsh-client-locale
 * client bundle (the official registry) and this pack's lib/client.js into one
 * sandbox, then drive the real LocaleRuntime API exactly as the browser does.
 *
 * This is the strongest check that does not need a browser: it proves the pack
 * registers against the official API, that "Polski" becomes a selectable
 * language, that switching resolves Polish strings, and that any key the pack
 * does not cover falls back to English.
 *
 * Getting the package: run `node scripts/fetch-locale-runtime.mjs`, which
 * installs the exact version pinned in upstream/reference.json. CI installs it
 * and sets DSH_REQUIRE_LOCALE_RUNTIME=1, so a missing runtime FAILS the build
 * instead of silently skipping the only test that touches real DSH code.
 *
 * Environment:
 *   DSH_LOCALE_CLIENT=<path>          explicit client.js override
 *   DSH_REQUIRE_LOCALE_RUNTIME=1      treat a missing runtime as a failure
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE = '@deepseek-ai/dsh-client-locale'
const CLIENT_RELATIVE = join('node_modules', PACKAGE, 'lib', 'client.js')

/**
 * Locate the official client bundle.
 *
 * An explicit DSH_LOCALE_CLIENT is authoritative: if it points at a missing file
 * the runtime counts as absent, so a misconfigured override fails (when
 * required) instead of silently testing a different version.
 * @returns the client bundle path, or undefined when none is available.
 */
function findOfficialBundle() {
  const override = process.env.DSH_LOCALE_CLIENT
  if (typeof override === 'string' && override.length > 0) {
    return existsSync(override) ? override : undefined
  }
  const candidates = [
    // Installed by scripts/fetch-locale-runtime.mjs, including in CI.
    join(ROOT, CLIENT_RELATIVE),
    // A local DSH install, for developers running the suite by hand.
    '/usr/lib/node_modules/@deepseek-ai/dsh/' + CLIENT_RELATIVE,
    '/usr/local/lib/node_modules/@deepseek-ai/dsh/' + CLIENT_RELATIVE,
    join(homedir(), '.dsh/profiles/web', CLIENT_RELATIVE),
  ]
  return candidates.find((candidate) => existsSync(candidate))
}

/** Load both loader bundles into one sandbox and index their factories by id. */
function loadFactories(clientPath) {
  const factories = new Map()
  const window = { __ModuleLoader__: { load(mod) { factories.set(mod.id, mod.factory) } } }
  const sandbox = {
    window,
    console,
    Object,
    JSON,
    Symbol,
    Array,
    Set,
    Map,
    Error,
    String,
    Number,
    Boolean,
    // The registry reads the browser's ordered language list at construction.
    navigator: { languages: ['pl-PL', 'pl', 'en'], language: 'pl-PL' },
  }
  sandbox.globalThis = sandbox
  const context = vm.createContext(sandbox)
  for (const file of [clientPath, join(ROOT, 'lib', 'client.js')]) {
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file })
  }
  const any = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? () => '' : p === 'then' ? undefined : any),
    apply: () => any,
    construct: () => any,
  })
  const mods = {}
  for (const [id, factory] of factories) mods[id] = factory(() => any)
  return mods
}

const officialPath = findOfficialBundle()
const required = process.env.DSH_REQUIRE_LOCALE_RUNTIME === '1'

test(
  'the official LocaleRuntime adopts the Polski language and dictionaries',
  {
    skip: officialPath === undefined && !required
      ? `${PACKAGE} not installed — run \`node scripts/fetch-locale-runtime.mjs\``
      : false,
  },
  () => {
    assert.ok(
      officialPath !== undefined,
      `DSH_REQUIRE_LOCALE_RUNTIME=1 but ${PACKAGE} was not found; run \`node scripts/fetch-locale-runtime.mjs\``,
    )

    // The test must exercise the DSH version this pack claims to support, not
    // whatever happens to be installed.
    const manifestPath = join(dirname(officialPath), '..', 'package.json')
    const referencePath = join(ROOT, 'upstream', 'reference.json')
    if (existsSync(manifestPath) && existsSync(referencePath)) {
      const installedVersion = JSON.parse(readFileSync(manifestPath, 'utf8')).version
      const expectedVersion = JSON.parse(readFileSync(referencePath, 'utf8')).dshVersion
      assert.equal(
        installedVersion,
        expectedVersion,
        `${PACKAGE}@${installedVersion} does not match the pinned upstream reference ${expectedVersion}`,
      )
    }

    const mods = loadFactories(officialPath)
    const official = mods[PACKAGE]
    const pack = mods['dsh-locale-pl']
    assert.ok(official?.LocaleRuntime, 'official bundle exposes LocaleRuntime')
    assert.ok(pack?.apply, 'pack bundle exposes apply')

    const locale = new official.LocaleRuntime({
      effect: (fn) => { fn(); return () => {} },
      emit: () => {},
      on: () => () => {},
    })

    pack.apply({ locale, effect: (fn) => { fn(); return () => {} } })

    const snapshot = locale.getLocale()
    const pl = snapshot.locales.find((l) => l.id === 'pl')
    assert.ok(pl, 'Polski is in the locale catalog')
    assert.equal(pl.label, 'Polski')
    assert.equal(pl.fallback, 'en')

    locale.setLocale('pl')
    assert.equal(locale.getLocale().active, 'pl')

    // Pack-owned namespace resolves Polish.
    assert.equal(locale.bind('settings.locale')('language.title'), 'Język')
    assert.equal(locale.bind('common')('save'), 'Zapisz')
    assert.equal(locale.bind('settings')('title'), 'Ustawienia')

    // A key the pack does not cover falls back to English through the registry.
    locale.register('__probe__', 'en', { only: 'English only' })
    assert.equal(locale.bind('__probe__')('only'), 'English only')

    locale.setLocale('en')
    assert.equal(locale.getLocale().active, 'en')
  },
)

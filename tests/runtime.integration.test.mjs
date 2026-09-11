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
 * The test skips (does not fail) when the official client bundle cannot be
 * located, so it stays portable. Point DSH_LOCALE_CLIENT at the file to force a
 * specific location.
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CANDIDATES = [
  process.env.DSH_LOCALE_CLIENT,
  '/usr/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-locale/lib/client.js',
  '/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-locale/lib/client.js',
  join(homedir(), '.dsh/profiles/web/node_modules/@deepseek-ai/dsh-client-locale/lib/client.js'),
].filter(Boolean)

const officialPath = CANDIDATES.find((p) => existsSync(p))

/** Load both loader bundles into one sandbox and index their factories by id. */
function loadFactories() {
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
  for (const file of [officialPath, join(ROOT, 'lib', 'client.js')]) {
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

test('the official LocaleRuntime adopts the Polski language and dictionaries', { skip: officialPath === undefined ? 'official dsh-client-locale bundle not found' : false }, () => {
  const mods = loadFactories()
  const official = mods['@deepseek-ai/dsh-client-locale']
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
})

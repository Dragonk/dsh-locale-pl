/**
 * Polish for the Windows desktop shell, host side (Node only, never served to the browser).
 *
 * The shell keeps its own en/zh dictionary in app.asar (`apps/desktop/src/locale.ts`), outside
 * the plugin locale registry. `patchArchive` adds `desktop/pl.json` to it and a `pl` branch to its
 * language resolution in lib/main.js, lib/preload-app.cjs and lib/preload-welcome.cjs. Every DSH
 * update replaces app.asar, and Windows refuses to rename or replace it while DSH runs, so the
 * host plugin starts `scripts/patch-desktop.mjs --wait-for-exit`, which patches once DSH and the
 * update installer are gone (see `ensureDesktopPatch`).
 *
 * The shell's EnableEmbeddedAsarIntegrityValidation fuse is off (checked on 0.2.0-rc.2); the
 * per-file integrity hashes in the header are recomputed anyway.
 * @module dsh-locale-pl/desktop
 */

import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as nodeFs from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Under Electron (the DSH host) `fs` treats every `*.asar` path as a directory, so opening the
 * archive itself fails with ENOENT; `original-fs` is the unpatched module.
 */
const fs = process.versions.electron ? createRequire(import.meta.url)('original-fs') : nodeFs
const { appendFileSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, writeSync } = fs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const MARKER = '/* dsh-locale-pl desktop */'
const FILES = ['lib/main.js', 'lib/preload-app.cjs', 'lib/preload-welcome.cjs']
const BLOCK = 4 * 1024 * 1024

/** %LOCALAPPDATA%; the DSH host scrubs its environment, so fall back to the profile path. */
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
/** Per-user install directory of the desktop app. */
export const INSTALL_DIR = join(LOCAL_APP_DATA, 'Programs', 'DeepSeek Harness')
/** Default archive path. */
export const DEFAULT_ASAR = join(INSTALL_DIR, 'resources', 'app.asar')
/** State directory: waiter lock and log. */
export const STATE_DIR = join(LOCAL_APP_DATA, 'dsh-locale-pl')

/** Append one line to STATE_DIR/patch.log (best effort). */
export function logLine(line) {
  try {
    mkdirSync(STATE_DIR, { recursive: true })
    appendFileSync(join(STATE_DIR, 'patch.log'), `${new Date().toISOString()} ${line}\n`)
  } catch { /* logging must never break the host */ }
}

/** Process names that mean "the app or its update is still busy with app.asar". */
const BUSY = [/^deepseek harness\.exe$/i, /^deepseek-harness.*\.exe$/i, /^installer\.exe$/i, /^uninstall deepseek harness\.exe$/i, /^un_a\.exe$/i, /^au_\.exe$/i]

/** Running process names that keep app.asar busy (Windows), or [] elsewhere. */
export function busyProcesses() {
  if (process.platform !== 'win32') return []
  const out = execFileSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true })
  const names = out.split(/\r?\n/).map((line) => line.split('","')[0].replace(/^"/, '')).filter(Boolean)
  return [...new Set(names.filter((n) => BUSY.some((re) => re.test(n))))]
}

/** True when `asar` is the installed app's archive (a copy elsewhere is always safe to patch). */
export function isInstalledArchive(asar) {
  return resolve(asar).toLowerCase().startsWith(resolve(INSTALL_DIR).toLowerCase())
}

function readArchive(path) {
  const fd = openSync(path, 'r')
  const head = Buffer.alloc(16)
  readSync(fd, head, 0, 16, 0)
  const headerSize = head.readUInt32LE(4)
  const jsonSize = head.readUInt32LE(12)
  const json = Buffer.alloc(jsonSize)
  readSync(fd, json, 0, jsonSize, 16)
  return { fd, header: JSON.parse(json.toString('utf8')), base: 8 + headerSize }
}

function* walk(node, path = '') {
  for (const [name, child] of Object.entries(node.files ?? {})) {
    const p = path ? `${path}/${name}` : name
    if (child.files) yield* walk(child, p)
    else yield [p, child]
  }
}

function readEntry(archive, entry) {
  const buf = Buffer.alloc(entry.size)
  readSync(archive.fd, buf, 0, entry.size, archive.base + Number(entry.offset))
  return buf
}

/** Whether lib/main.js inside `asar` carries the patch marker; reads only that entry. */
export function isPatched(asar = DEFAULT_ASAR) {
  const archive = readArchive(asar)
  try {
    const entry = new Map([...walk(archive.header)]).get('lib/main.js')
    return entry !== undefined && readEntry(archive, entry).includes(MARKER)
  } finally { closeSync(archive.fd) }
}

function integrity(buf) {
  const blocks = []
  for (let i = 0; i < buf.length; i += BLOCK) blocks.push(createHash('sha256').update(buf.subarray(i, i + BLOCK)).digest('hex'))
  if (blocks.length === 0) blocks.push(createHash('sha256').update(Buffer.alloc(0)).digest('hex'))
  return { algorithm: 'SHA256', hash: createHash('sha256').update(buf).digest('hex'), blockSize: BLOCK, blocks }
}

function replaceOnce(text, from, to, what, file) {
  const n = text.split(from).length - 1
  if (n !== 1) throw new Error(`${file}: expected exactly one ${what}, found ${n}; the shell changed, update lib/desktop.js`)
  return text.replace(from, to)
}

function patchSource(file, text, pl) {
  if (text.includes(MARKER)) return null
  const fn = 'function resolveDesktopLocale(locale) {'
  const m = /\} : \{\s*id: "en",\s*messages: ([A-Za-z_$][\w$]*)/.exec(text.slice(text.indexOf(fn)))
  if (text.indexOf(fn) < 0 || !m) throw new Error(`${file}: resolveDesktopLocale with an English branch not found`)
  let out = replaceOnce(text, fn, `${MARKER}\nconst DSH_LOCALE_PL = Object.assign({}, ${m[1]}, ${JSON.stringify(pl)});\n${fn}`, 'resolveDesktopLocale', file)
  out = replaceOnce(out, 'return locale.toLowerCase().startsWith("zh") ? {',
    'return locale.toLowerCase().startsWith("pl") ? {\n\t\tid: "pl",\n\t\tmessages: DSH_LOCALE_PL\n\t} : locale.toLowerCase().startsWith("zh") ? {', 'zh branch', file)
  if (out.includes('function resolveDesktopStartupLocale(')) {
    out = replaceOnce(out, 'if (selected === "zh" || selected === "en")', 'if (selected === "pl" || selected === "zh" || selected === "en")', 'startup preference check', file)
    out = replaceOnce(out, 'if (primary === "zh" || primary === "en")', 'if (primary === "pl" || primary === "zh" || primary === "en")', 'startup system-language check', file)
  }
  return out
}

function writeArchive(archive, replaced, dest) {
  const entries = [...walk(archive.header)].filter(([, e]) => !e.unpacked).sort((a, b) => Number(a[1].offset) - Number(b[1].offset))
  // Source locations must be captured before the header is rewritten below.
  const source = new Map(entries.map(([p, e]) => [p, { offset: e.offset, size: e.size }]))
  let offset = 0
  for (const [p, e] of entries) {
    const data = replaced.get(p)
    if (data) { e.size = data.length; e.integrity = integrity(data) }
    e.offset = String(offset)
    offset += e.size
  }
  const json = Buffer.from(JSON.stringify(archive.header), 'utf8')
  const pad = (4 - (json.length % 4)) % 4
  const headerPickle = Buffer.alloc(8 + json.length + pad)
  headerPickle.writeUInt32LE(4 + json.length + pad, 0)
  headerPickle.writeUInt32LE(json.length, 4)
  json.copy(headerPickle, 8)
  const sizePickle = Buffer.alloc(8)
  sizePickle.writeUInt32LE(4, 0)
  sizePickle.writeUInt32LE(headerPickle.length, 4)
  const out = openSync(dest, 'w')
  try {
    writeSync(out, sizePickle)
    writeSync(out, headerPickle)
    for (const [p] of entries) writeSync(out, replaced.get(p) ?? readEntry(archive, source.get(p)))
  } finally { closeSync(out) }
}

/**
 * Patch `asar` in place. The new archive is written next to it and moved over the original
 * in one replacing rename, so app.asar never disappears; the unpatched original is kept as
 * `<asar>.dsh-locale-pl.bak`.
 * @param {{ asar?: string, dryRun?: boolean, log?: (line: string) => void }} [options]
 * @returns {'patched' | 'already' | 'checked'}
 */
export function patchArchive({ asar = DEFAULT_ASAR, dryRun = false, log = () => {} } = {}) {
  const pl = JSON.parse(readFileSync(join(ROOT, 'desktop', 'pl.json'), 'utf8'))
  const archive = readArchive(asar)
  let closed = false
  try {
    const index = new Map([...walk(archive.header)])
    const replaced = new Map()
    for (const file of FILES) {
      const entry = index.get(file)
      if (!entry) throw new Error(`${file} not found in the archive`)
      const patched = patchSource(file, readEntry(archive, entry).toString('utf8'), pl)
      if (patched === null) log(`${file} already patched`)
      else { replaced.set(file, Buffer.from(patched, 'utf8')); log(`${file} ready`) }
    }
    if (replaced.size === 0) return 'already'
    if (dryRun) return 'checked'
    if (isInstalledArchive(asar) && busyProcesses().length > 0) throw new Error(`close DeepSeek Harness first (busy: ${busyProcesses().join(', ')})`)
    const tmp = `${asar}.dsh-locale-pl.tmp`
    writeArchive(archive, replaced, tmp)
    closeSync(archive.fd)
    closed = true
    copyFileSync(asar, `${asar}.dsh-locale-pl.bak`)
    renameSync(tmp, asar)
    log(`wrote ${asar}`)
    return 'patched'
  } finally { if (!closed) closeSync(archive.fd) }
}

/** A Node executable outside the DSH install directory (one inside it would block updates). */
function externalNode() {
  const inside = (p) => resolve(p).toLowerCase().startsWith(resolve(INSTALL_DIR).toLowerCase())
  const candidates = []
  try {
    candidates.push(...execFileSync('where', ['node'], { encoding: 'utf8', windowsHide: true }).split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
  } catch { /* the DSH host may run with a scrubbed PATH */ }
  candidates.push(join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'))
  const ok = candidates.find((p) => !inside(p) && existsSync(p))
  if (ok) return ok
  // Last resort: a private copy of the Node runtime DSH ships (process.execPath is the Electron app here).
  const bundled = join(INSTALL_DIR, 'resources', 'runtime', 'primary-runtime', 'dependencies', 'node', 'bin', 'node.exe')
  const copy = join(STATE_DIR, 'node.exe')
  if (!existsSync(copy)) { mkdirSync(STATE_DIR, { recursive: true }); copyFileSync(bundled, copy) }
  return copy
}

/**
 * Host start-up check: when the installed archive lost the patch (a DSH update replaced it),
 * start the detached waiter that patches after DSH exits. Never throws.
 * @param {{ info: Function, warn: Function }} log
 */
export function ensureDesktopPatch(log) {
  try {
    if (process.platform !== 'win32') return
    if (!existsSync(DEFAULT_ASAR)) { logLine(`host check: no archive at ${DEFAULT_ASAR}`); return }
    if (isPatched(DEFAULT_ASAR)) { logLine('host check: shell is patched'); return }
    const script = join(ROOT, 'scripts', 'patch-desktop.mjs')
    const node = externalNode()
    mkdirSync(STATE_DIR, { recursive: true })
    const child = spawn(node, [script, '--wait-for-exit'], { detached: true, stdio: 'ignore', windowsHide: true, cwd: STATE_DIR })
    child.unref()
    logLine(`host check: shell not patched (DSH was updated), waiter started: ${node} (pid ${child.pid})`)
    log.info(`[dsh-locale-pl] desktop shell menus will be patched after DSH exits (log: ${join(STATE_DIR, 'patch.log')})`)
  } catch (error) {
    logLine(`host check failed: ${error?.stack ?? error}`)
    log.warn(`[dsh-locale-pl] desktop patch check failed: ${error?.message ?? error}`)
  }
}

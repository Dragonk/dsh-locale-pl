#!/usr/bin/env node
/**
 * patch-desktop.mjs: Polish for the Windows desktop shell (caption menus, tray, update and quit
 * dialogs, welcome window). Logic in lib/desktop.js.
 *
 *   node scripts/patch-desktop.mjs                  patch now (DSH must be closed)
 *   node scripts/patch-desktop.mjs --check          report state, change nothing
 *   node scripts/patch-desktop.mjs --restore        put back the unpatched original
 *   node scripts/patch-desktop.mjs --wait-for-exit  wait until DSH and its updater are gone, then patch
 *   --asar <path>                                    app.asar (default: per-user install)
 *
 * `--wait-for-exit` is what the host plugin starts after a DSH update: one instance at a time
 * (lock file with its PID), logging to %LOCALAPPDATA%\dsh-locale-pl\patch.log. It patches only
 * after two checks 5 s apart find neither DSH nor an update installer, so it never races the
 * installer for app.asar.
 */

import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { busyProcesses, DEFAULT_ASAR, isInstalledArchive, isPatched, logLine, patchArchive, STATE_DIR } from '../lib/desktop.js'

const argv = process.argv.slice(2)
const flag = (f) => argv.includes(f)
const value = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
const ASAR = resolve(value('--asar') ?? DEFAULT_ASAR)
const BACKUP = `${ASAR}.dsh-locale-pl.bak`

function fail(message) { console.error(`patch-desktop: ${message}`); process.exit(1) }
if (!existsSync(ASAR)) fail(`no archive at ${ASAR}`)

if (flag('--restore')) {
  if (!existsSync(BACKUP)) fail('no backup to restore')
  if (isInstalledArchive(ASAR) && busyProcesses().length > 0) fail('close DeepSeek Harness first')
  copyFileSync(BACKUP, ASAR)
  console.log(`patch-desktop: restored ${ASAR} from the backup`)
  process.exit(0)
}

if (flag('--wait-for-exit') && !flag('--orphan')) {
  // Leave the DSH process tree: relaunch detached and exit, so the waiter has no live parent
  // and closing DSH's tree (task manager, `taskkill /T`, the updater) does not take it along.
  spawn(process.execPath, [...process.argv.slice(1), '--orphan'], { detached: true, stdio: 'ignore', windowsHide: true, cwd: STATE_DIR }).unref()
  process.exit(0)
}

if (flag('--wait-for-exit')) {
  mkdirSync(STATE_DIR, { recursive: true })
  const log = (line) => logLine(`waiter: ${line}`)
  const lock = join(STATE_DIR, 'waiter.lock')
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8'))
    let alive = false
    try { process.kill(pid, 0); alive = true } catch { /* stale lock */ }
    if (alive) process.exit(0)
  }
  writeFileSync(lock, String(process.pid))
  log(`waiting for DeepSeek Harness to exit (pid ${process.pid})`)
  try {
    let quiet = 0
    while (quiet < 2) {
      await sleep(5000)
      quiet = busyProcesses().length === 0 ? quiet + 1 : 0
    }
    if (isPatched(ASAR)) log('already patched (the archive changed meanwhile)')
    else log(`result: ${patchArchive({ asar: ASAR, log })}`)
  } catch (error) {
    log(`failed: ${error?.message ?? error}`)
  } finally {
    rmSync(lock, { force: true })
  }
  process.exit(0)
}

try {
  const result = patchArchive({ asar: ASAR, dryRun: flag('--check'), log: (line) => console.log(`patch-desktop: ${line}`) })
  console.log({ patched: `patch-desktop: wrote ${ASAR} (backup: ${BACKUP})`, already: 'patch-desktop: archive is already patched', checked: 'patch-desktop: --check, nothing written' }[result])
} catch (error) {
  fail(error.message)
}

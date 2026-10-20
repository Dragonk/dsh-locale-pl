/**
 * dsh-locale-pl — host half.
 *
 * The language pack itself is browser-only: this Node half exists so the host loader can mount
 * the package (via cordis.patch.yml) and the client-modules scanner can find its `dsh.client`
 * declaration and serve `lib/client.js`, where the Polish language and its dictionaries register
 * against the official locale registry.
 *
 * On Windows it also keeps the desktop shell Polish across DSH updates: an update replaces
 * app.asar and drops the shell patch, so at start-up the host checks it and, when missing,
 * starts a detached waiter that re-applies it once DSH has exited (lib/desktop.js).
 *
 * @module dsh-locale-pl
 */

import { ensureDesktopPatch } from './lib/desktop.js'

/** Stable plugin name used by the cordis loader row. */
export const name = 'dsh-locale-pl'

/** Host-side body: only the desktop shell check; dictionaries live in the browser half. */
export function apply() {
  ensureDesktopPatch({ info: (m) => console.log(m), warn: (m) => console.warn(m) })
}

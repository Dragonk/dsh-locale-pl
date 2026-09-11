/**
 * dsh-locale-pl — host half.
 *
 * The pack is browser-only. This Node half exists so the host loader can mount
 * the package (via cordis.patch.yml) and the client-modules scanner can find
 * its `dsh.client` declaration and serve `lib/client.js` to the browser, where
 * the Polish language and its dictionaries register against the official
 * locale registry.
 *
 * @module dsh-locale-pl
 */

/** Stable plugin name used by the cordis loader row. */
export const name = 'dsh-locale-pl'

/**
 * Host-side body. There is nothing to do on the host: the locale registry and
 * the dictionaries live in the browser client half, and the durable preference
 * is owned by @deepseek-ai/dsh-client-locale.
 */
export function apply() {
  // Intentionally empty on the host side.
}

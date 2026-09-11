/**
 * corpus-diff.mjs — pure comparison of two English locale corpora.
 *
 * A corpus is the output of scripts/extract.mjs:
 *   { "<namespace>": { "<key>": { "en": "...", "zh": "..." } } }
 *
 * The weekly upstream check needs to distinguish several kinds of drift:
 *
 *   - a namespace or key added upstream (new copy to translate);
 *   - a namespace or key removed upstream (the Polish dictionary is now stale);
 *   - an English value changed under an unchanged key — the Polish string was
 *     written against the old wording and needs a human review even though the
 *     key still resolves;
 *   - the set of {placeholder} tokens changed, which also changes what the
 *     runtime interpolates.
 *
 * Nothing here writes files or exits the process: the CLI wrapper
 * (scripts/drift.mjs) and scripts/update-upstream.mjs own that.
 */

/** Placeholder tokens the locale runtime interpolates, e.g. `{count}`. */
const PLACEHOLDER_RE = /\{[^{}]+\}/g

/**
 * Sorted unique placeholder tokens found in a template string.
 * @param value - template string (missing values count as empty).
 * @returns sorted token list.
 */
export function placeholdersOf(value) {
  if (typeof value !== 'string') return []
  return [...new Set(value.match(PLACEHOLDER_RE) ?? [])].sort()
}

/**
 * Stable identity for a corpus key, used in the report and in tests.
 * @param ns - namespace name.
 * @param key - dictionary key.
 * @returns `<ns>/<key>`.
 */
export function keyId(ns, key) {
  return `${ns}/${key}`
}

/**
 * Compare two corpora and describe every difference.
 *
 * A malformed namespace or entry is skipped rather than throwing, so a partially
 * written corpus still produces a report; the caller validates shape separately.
 *
 * @param oldCorpus - previously recorded corpus (the committed reference).
 * @param newCorpus - freshly extracted corpus.
 * @returns a structured drift description.
 */
export function diffCorpus(oldCorpus, newCorpus) {
  const before = isRecord(oldCorpus) ? oldCorpus : {}
  const after = isRecord(newCorpus) ? newCorpus : {}

  const beforeNamespaces = new Set(Object.keys(before))
  const afterNamespaces = new Set(Object.keys(after))

  const addedNamespaces = [...afterNamespaces].filter((ns) => !beforeNamespaces.has(ns)).sort()
  const removedNamespaces = [...beforeNamespaces].filter((ns) => !afterNamespaces.has(ns)).sort()

  /** @type {{ns: string, key: string}[]} */
  const addedKeys = []
  /** @type {{ns: string, key: string}[]} */
  const removedKeys = []
  /** @type {{ns: string, key: string, old: string, new: string, placeholders: {old: string[], new: string[]}}[]} */
  const changedValues = []
  /** @type {{ns: string, key: string, old: string[], new: string[]}[]} */
  const placeholderChanges = []

  // Compare shared namespaces key by key. Keys that appear only on one side are
  // reported through addedKeys/removedKeys, not as a value change.
  for (const ns of [...afterNamespaces].filter((n) => beforeNamespaces.has(n)).sort()) {
    const beforeNs = isRecord(before[ns]) ? before[ns] : {}
    const afterNs = isRecord(after[ns]) ? after[ns] : {}
    const beforeKeys = new Set(Object.keys(beforeNs))
    const afterKeys = new Set(Object.keys(afterNs))

    for (const key of [...afterKeys].filter((k) => !beforeKeys.has(k)).sort()) {
      addedKeys.push({ ns, key })
    }
    for (const key of [...beforeKeys].filter((k) => !afterKeys.has(k)).sort()) {
      removedKeys.push({ ns, key })
    }

    for (const key of [...afterKeys].filter((k) => beforeKeys.has(k)).sort()) {
      const oldEn = readEn(beforeNs[key])
      const newEn = readEn(afterNs[key])
      if (oldEn === newEn) continue

      const oldTokens = placeholdersOf(oldEn)
      const newTokens = placeholdersOf(newEn)
      changedValues.push({
        ns,
        key,
        old: oldEn,
        new: newEn,
        placeholders: { old: oldTokens, new: newTokens },
      })
      if (JSON.stringify(oldTokens) !== JSON.stringify(newTokens)) {
        placeholderChanges.push({ ns, key, old: oldTokens, new: newTokens })
      }
    }
  }

  // Keys in brand-new namespaces are new translations too, not value changes.
  for (const ns of addedNamespaces) {
    for (const key of Object.keys(isRecord(after[ns]) ? after[ns] : {}).sort()) {
      addedKeys.push({ ns, key })
    }
  }

  const totals = {
    addedNamespaces: addedNamespaces.length,
    removedNamespaces: removedNamespaces.length,
    addedKeys: addedKeys.length,
    removedKeys: removedKeys.length,
    changedValues: changedValues.length,
    placeholderChanges: placeholderChanges.length,
  }

  return {
    namespaces: { added: addedNamespaces, removed: removedNamespaces },
    keys: { added: addedKeys, removed: removedKeys },
    changedValues,
    placeholderChanges,
    totals,
    hasDrift: Object.values(totals).some((count) => count > 0),
  }
}

/**
 * Render a drift description as a human-readable Markdown report.
 * @param diff - the result of {@link diffCorpus}.
 * @param options - optional labels for the compared sides.
 * @returns Markdown ending in a newline.
 */
export function formatDriftReport(diff, options = {}) {
  const oldRef = options.oldRef ?? 'previous corpus'
  const newRef = options.newRef ?? 'new corpus'
  const lines = []

  lines.push('# Upstream locale drift')
  lines.push('')
  lines.push(`Compared ${oldRef} → ${newRef}.`)
  lines.push('')

  if (!diff.hasDrift) {
    lines.push('No drift: the English source is identical for every namespace and key.')
    lines.push('')
    return lines.join('\n')
  }

  lines.push('| Change | Count |')
  lines.push('| --- | --- |')
  lines.push(`| Namespaces added | ${diff.totals.addedNamespaces} |`)
  lines.push(`| Namespaces removed | ${diff.totals.removedNamespaces} |`)
  lines.push(`| Keys added | ${diff.totals.addedKeys} |`)
  lines.push(`| Keys removed | ${diff.totals.removedKeys} |`)
  lines.push(`| English values changed | ${diff.totals.changedValues} |`)
  lines.push(`| Placeholder sets changed | ${diff.totals.placeholderChanges} |`)
  lines.push('')

  if (diff.namespaces.added.length > 0) {
    lines.push('## Namespaces added')
    lines.push('')
    for (const ns of diff.namespaces.added) lines.push(`- \`${ns}\``)
    lines.push('')
  }

  if (diff.namespaces.removed.length > 0) {
    lines.push('## Namespaces removed')
    lines.push('')
    for (const ns of diff.namespaces.removed) lines.push(`- \`${ns}\``)
    lines.push('')
  }

  if (diff.keys.added.length > 0) {
    lines.push('## Keys added')
    lines.push('')
    for (const { ns, key } of diff.keys.added) lines.push(`- \`${keyId(ns, key)}\``)
    lines.push('')
  }

  if (diff.keys.removed.length > 0) {
    lines.push('## Keys removed')
    lines.push('')
    for (const { ns, key } of diff.keys.removed) lines.push(`- \`${keyId(ns, key)}\``)
    lines.push('')
  }

  if (diff.changedValues.length > 0) {
    lines.push('## UPSTREAM STRING CHANGED — REVIEW REQUIRED')
    lines.push('')
    lines.push('The key still resolves, but its English wording changed. Re-read the Polish')
    lines.push('translation and confirm it still matches the new meaning.')
    lines.push('')
    for (const change of diff.changedValues) {
      lines.push(`### \`${keyId(change.ns, change.key)}\``)
      lines.push('')
      lines.push(`OLD: ${JSON.stringify(change.old)}`)
      lines.push('')
      lines.push(`NEW: ${JSON.stringify(change.new)}`)
      lines.push('')
      if (JSON.stringify(change.placeholders.old) !== JSON.stringify(change.placeholders.new)) {
        lines.push(
          `PLACEHOLDERS: ${JSON.stringify(change.placeholders.old)} → ${JSON.stringify(change.placeholders.new)}`,
        )
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}

/** Narrow an unknown value to a plain record. */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Read the English string of a corpus entry. */
function readEn(entry) {
  if (!isRecord(entry)) return ''
  return typeof entry.en === 'string' ? entry.en : ''
}

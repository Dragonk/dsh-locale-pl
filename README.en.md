# dsh-locale-pl

Polish language pack for the **DeepSeek Harness** web UI — a community client
plugin that adds **Polski (pl)** to the language list in
**Settings → General → Language**.

It does not modify DeepSeek Harness source or `node_modules`. It registers
through the official DSH locale system (`@deepseek-ai/dsh-client-locale`): it
adds a language to the catalog and supplies per-namespace dictionaries. Any key
the pack does not cover automatically falls back to English through the built-in
chain.

- **Namespaces:** 43
- **Translated strings:** 1292 (100% of the corpus)
- **Fallback:** `pl → en` (official DSH mechanism)

## Verified versions

| Component | Version |
| --- | --- |
| DeepSeek Harness (web client / `@deepseek-ai/*` packages) | **0.1.5-rc.2** |
| Source tag the corpus was extracted from | `dsh-v0.1.5-rc.2` (`fb2c4b9`) |
| `dsh --version` on the test machine | 0.1.5-rc.1 (CLI); bundled packages are 0.1.5-rc.2 |
| Node.js | ≥ 22 (tested on 24) |

> DSH is a developer preview with breaking changes. This pack only uses the public
> locale registry API (`ctx.locale.addLanguage` / `ctx.locale.register`), so DSH
> upgrades do not require code changes — only new strings have to be added (see
> [Updating](#updating)).

## Install

```bash
dsh plugin --profile web add github:Dragonk/dsh-locale-pl
```

**Restart DSH** afterwards (stop and start `dsh --profile web`). DSH appends the
package to the profile's `dsh.profile.bundles` and mounts it as a plugin layer.
If your install runs client HMR, the language may appear without a full restart —
a restart is always safe.

From a local checkout:

```bash
dsh plugin --profile web add file:/path/to/dsh-locale-pl
```

Or from npm (once published):

```bash
dsh plugin --profile web add dsh-locale-pl
```

## Selecting the language

1. Open **Settings**.
2. Go to **General**.
3. In the **Language** row, pick **Polski**.

The choice is stored in the DSH user settings document (the `locale` section) and
survives restarts and browser restarts.

## Uninstall

```bash
dsh plugin --profile web remove dsh-locale-pl
```

Restart DSH. The UI returns to the previous language. The stored
`locale.preference` may remain in `settings.yaml`; remove it by hand if you want
to go back to the browser language.

## Tests and conformance checking

```bash
npm run build        # generate lib/client.js from dict/pl/*.json
npm run check        # compare translations against upstream/corpus.json (report)
npm run check:strict # exit non-zero when anything is missing (CI gate)
npm test             # unit tests + an integration test against LocaleRuntime
npm run verify       # build + check:strict + test
```

The checker detects:

- missing namespaces and keys relative to the English source,
- extra / unknown keys,
- broken placeholders (`{...}` sets that differ from English),
- values identical to English (except the deliberate
  `upstream/identical-allowlist.json`),
- missing plural siblings.

You do not need DSH installed to run `check` and `test`: the English corpus is
committed in `upstream/corpus.json`, and the integration test skips itself when
the official locale package cannot be found.

## Reporting a translation bug

Open an issue: <https://github.com/Dragonk/dsh-locale-pl/issues>.

Include the namespace and key if you know it (e.g. `settings/connection.error`),
the Polish text you see and your suggested wording, a screenshot, and your DSH
version (`dsh --version`).

Edit strings directly in `dict/pl/<namespace>.json`, then run `npm run build` —
`lib/client.js` is generated and must be committed together with the dictionary.

## Repository layout

```
dict/pl/*.json        dictionaries: namespace → { key: "Polish text" }  (source of truth)
lib/client.js         generated browser bundle (window.__ModuleLoader__.load)
index.js              host half (empty — registration happens in the browser)
cordis.patch.yml      profile layer: mounts the plugin as a loader row
scripts/extract.mjs   extract the English corpus from DSH sources
scripts/build.mjs     compose lib/client.js from the dictionaries
scripts/check.mjs     completeness and conformance checker
scripts/update-upstream.mjs  refresh the corpus from a chosen DSH tag
upstream/corpus.json  English source (key → {en, zh})
upstream/reference.json  which tag/commit the corpus came from
tests/                unit and integration tests
docs/publishing.md    releasing a version and submitting to the DSH ecosystem
GLOSSARY.md           terminology contract (Polish)
```

## Updating

When DSH adds new strings:

```bash
# 1. refresh the English source from the new tag
node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2

# 2. see what is missing
npm run check

# 3. translate the new keys in dict/pl/<namespace>.json
#    (add new namespaces too; follow GLOSSARY.md)

# 4. build and test
npm run build && npm run check:strict && npm test

# 5. release
#    update CHANGELOG.md, bump package.json version, commit, tag, push
```

CI (GitHub Actions) runs `build`, `check:strict`, and `test` on every push and
pull request, and detects upstream drift weekly. There is no automatic
translation — every new string goes through review.

## Safety and fallback

- No `node_modules` or upstream source patching.
- No custom i18n layer — the official `ctx.locale` registry is used.
- Keys not covered by the pack fall back to English (`pl → en`) automatically, so
  a newer DSH can never break the UI.
- If upstream renames or removes a key, `npm run check` reports it as an error.

### What the locale system cannot translate today

A few DSH surfaces do not go through the locale registry and stay in English:

- **permission presets** (`Read Only`, `Workspace Write`, `Full access`) — the core
  defines them without display names;
- **tool names** (`Bash`, `Read`, `Write`, `Edit`) are technical identifiers in some
  surfaces, not locale strings;
- **model output** and **paths/identifiers** — untranslatable by nature.

> Unlike some language packs, this pack intentionally does not restate the
> permission preset table in the profile. That avoids duplicating core
> configuration and survives upstream changes; wherever DSH exposes a locale
> string, the translation applies.

## License

MIT — see [LICENSE](LICENSE). Dictionaries and scripts were derived from the public
DSH corpus; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

A community language pack that adds **Polish (pl)** to the DSH Web UI. It's a
regular DSH client plugin: it registers the language through the official locale
registry (`@deepseek-ai/dsh-client-locale`) via `ctx.locale.addLanguage`, and supplies
per-namespace dictionaries via `ctx.locale.register`. It does not patch
`node_modules` or the DeepSeek Harness source.

## Install

```sh
dsh plugin --profile web add github:Dragonk/dsh-locale-pl
```

Restart DSH, then open **Settings → General → Language** and pick **Polski**.

## Scope

- **43 namespaces · 1292 strings** — 100% of the audited English corpus.
- Covers the shell and settings (`settings`, `settings.models`, `settings.plugins`,
  `settings.agentPreset`, `settings.pluginInventory`), chat and conversation
  (`chat`, `conversation`), `trajectory`, `workspace`, `subagent`, `workflowRun`,
  `cordis`, `deliverables`, `approval`, `plan`, `job`, `feedback`, `sidebar`, and
  the rest.
- Keys the pack doesn't cover fall back to English automatically (`pl → en`), so a
  newer DSH never breaks the UI.

## Tests and maintenance

- **20/20 tests, 0 skipped** in CI, including an integration test that loads the
  **real `LocaleRuntime`** and checks that the language registers, switching works,
  and unknown keys fall back to English.
- A weekly workflow re-extracts the English corpus from the newest DSH tag and
  **fails on any drift** — namespaces or keys added or removed, English text changed
  under an unchanged key, or changed placeholders. It only reports; every
  translation is reviewed by hand.
- Tested against **DeepSeek Harness 0.1.5-rc.2**. Requires **Node.js ≥ 22**.

## Limitations

Some surfaces don't go through the locale registry yet and stay in English:
permission preset display names (`Read Only`, `Workspace Write`, `Full access`), tool
names in a few places, and of course model output and file paths. This pack
deliberately does not restate the permission preset table in the profile, so it
doesn't duplicate core configuration and survives upstream changes.

## Links

- Repository: https://github.com/Dragonk/dsh-locale-pl
- Release v1.0.1: https://github.com/Dragonk/dsh-locale-pl/releases/tag/v1.0.1

Wording feedback and translation bugs are welcome — please open an issue:
https://github.com/Dragonk/dsh-locale-pl/issues

Two things I'd be glad to hear from Polish-speaking users: does any technical term
feel off (I kept `prompt`, `token`, `plugin`, `provider`, and `workflow` in English
where a Polish equivalent would read forced), and are there surfaces still showing
English that I missed?

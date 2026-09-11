# Changelog

Wszystkie istotne zmiany w tym pakiecie są opisane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie zgodne z [Semantic Versioning](https://semver.org/lang/pl/).

## [1.0.0] — 2026-09-11

### Dodane

- Pierwsze wydanie polskiego pakietu językowego `dsh-locale-pl` dla interfejsu
  webowego DeepSeek Harness.
- Rejestracja języka w oficjalnym rejestrze locale DSH
  (`ctx.locale.addLanguage`) jako `pl`, etykieta **Polski**, fallback do `en`.
- **43 namespace’y** i **1292 przetłumaczone ciągi** (100% korpusu):
  `access`/`permission` (w tym `permission.access`), `agent-team`, `approval`,
  `chat`, `command`, `common`, `conversation`, `cordis`, `deliverables`,
  `directory-browser`, `documentHtml`, `documentMarkdown`, `feedback`, `goal`,
  `job`, `model`, `open-in-app`, `plan`, `question`, `reference`,
  `schedule.catalog`, `session-log-download`, `settings`, `settings.agentPreset`,
  `settings.locale`, `settings.models`, `settings.permission`,
  `settings.pluginInventory`, `settings.plugins`, `settings.theme`, `sidebar`,
  `sidebarCodePreview`, `sidebarDocumentPreview`, `sidebarFiles`, `sidebarImage`,
  `sidebarPdf`, `sidebarRight`, `skill`, `slash.menu`, `subagent`, `trajectory`,
  `workflowRun`, `workspace`.
- `scripts/extract.mjs` — ekstrakcja angielskiego korpusu ze źródeł DSH.
- `scripts/build.mjs` — generowanie `lib/client.js` ze słowników.
- `scripts/check.mjs` — kontrola zgodności (braki, nadmiary, placeholdery,
  nieprzetłumaczone wartości), z trybem `--strict`.
- `scripts/update-upstream.mjs` — odświeżanie korpusu z wybranego tagu DSH.
- Testy jednostkowe i integracyjny test z prawdziwym `LocaleRuntime`.
- `GLOSSARY.md`, `README.md`, `README.en.md`, `THIRD_PARTY_NOTICES.md`.
- GitHub Actions: weryfikacja przy push/PR oraz cotygodniowe wykrywanie zmian
  upstream.

### Zgodność

- Sprawdzone z DeepSeek Harness **0.1.5-rc.2** (tag `dsh-v0.1.5-rc.2`,
  commit `fb2c4b9`).

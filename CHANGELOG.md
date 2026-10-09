# Changelog

Wszystkie istotne zmiany w tym pakiecie są opisane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie zgodne z [Semantic Versioning](https://semver.org/lang/pl/).

## [1.2.0] (2026-10-06)

### Zmienione

- Korpus zaktualizowany do DSH 0.2.0-rc.2 (tag `dsh-v0.2.0-rc.2`, `639ed01`):
  57 przestrzeni nazw, 2574 napisy. Dotłumaczone 44 nowe napisy (nowe okno pytań
  agenta z odliczaniem, wyszukiwarka modeli, ustawienie wysyłania logu sesji
  `settings.sessionLog`, podpowiedzi instalacji pluginów), 26 przetłumaczonych od
  nowa po zmianie angielskiego tekstu (aktualizacje aplikacji, widok programisty,
  powitanie wersji 0.2, wyszukiwanie przez konto DeepSeek), 15 kluczy usuniętych
  z upstream wypadło ze słowników. Razem 58 przestrzeni nazw, 2614 napisów.

### Naprawione

- `extract.mjs` rozwija `...obiekt` w literałach słowników. Bez tego cała strona
  Presety agenta (`settings.agentPreset`, 41 napisów, w tym nazwa trybu w nagłówku
  rozmowy) wypadała z korpusu 0.2 i wyświetlała się po angielsku.

### Dodane

- Pasek menu w tytule okna aplikacji desktopowej na Windows: „Aplikacja”, „Edycja”.
  Powłoka zna tylko en/zh i nadpisuje napisy przy każdej zmianie języka albo motywu,
  więc pakiet pilnuje ich obserwatorem, gdy dokument ma `lang="pl"`.

- `scripts/patch-desktop.mjs` (`npm run patch:desktop`): polski dla powłoki desktopowej
  na Windows, której słownik (165 napisów, `desktop/pl.json`) leży w `app.asar` poza
  rejestrem locale: rozwijane menu Aplikacja i Edycja, okna aktualizacji i zamykania,
  zasobnik, okno powitalne. Łata `lib/main.js`, `lib/preload-app.cjs`
  i `lib/preload-welcome.cjs`, odbudowuje archiwum z nowymi sumami kontrolnymi,
  zostawia kopię `app.asar.dsh-locale-pl.bak` (`--restore` ją przywraca, `--check`
  niczego nie zapisuje). Wymaga zamkniętego DSH.

- Automatyczne przywracanie po aktualizacji DSH: host wtyczki (`index.js`,
  `lib/desktop.js`) przy starcie sprawdza znacznik łatki w `lib/main.js` archiwum;
  gdy go brak, uruchamia odłączony proces `patch-desktop.mjs --wait-for-exit`
  (systemowy Node, nigdy ten z katalogu instalacji, żeby nie blokować aktualizacji),
  który łata po zamknięciu DSH i instalatora aktualizacji. Polskie menu wraca od
  kolejnego uruchomienia. Log: `%LOCALAPPDATA%\dsh-locale-pl\patch.log`.

### Znane ograniczenia

- Po aktualizacji pierwsza sesja DSH ma jeszcze angielskie rozwijane menu: Windows nie
  pozwala podmienić `app.asar`, gdy aplikacja działa. Gdy powłoka zmieni kod wyboru
  języka, łatka przerwie bez zapisu (wpis w logu) i trzeba dostosować `lib/desktop.js`.
- Jednostki czasu w czacie jako `godz.`, `min`, `sek.` (DSH 0.2 składa czas
  z osobnych jednostek zamiast gotowych zdań).

## [1.1.0] (2026-09-28)

### Zmienione

- Korpus zaktualizowany do DSH 0.1.7-rc.2 (tag `dsh-v0.1.7-rc.2`, `477b4f4`):
  57 przestrzeni nazw, 2587 napisów (było 43 i 1292). Dotłumaczone 1438 nowych
  napisów, 38 przetłumaczonych od nowa po zmianie angielskiego tekstu, 142 klucze
  usunięte z upstream wypadły ze słowników.
- Spójny termin „wiersz” (tekst, kod, wyjście), formy liczebnikowe neutralne
  wobec liczby, bez długich myślników.
- `sidebarExcel.language` zostaje `en`: fortune-sheet 1.0.4 nie ma polskiej
  lokalizacji. `time.locale` = `pl` (trafia do `Intl.DateTimeFormat`).

### Naprawione

- `check.mjs` i test pokrycia pomijają klucze z pustym tekstem angielskim.
- `fetch-locale-runtime.mjs` uruchamia `npm.cmd` przez powłokę na Windows
  (Node odmawia uruchomienia `.cmd` bez niej od CVE-2024-27980).

## [1.0.1] — 2026-09-11

### Naprawione

- **CI uruchamia teraz prawdziwy test `LocaleRuntime`.** Wcześniej GitHub Actions
  nie miał zainstalowanego `@deepseek-ai/dsh-client-locale`, więc test
  integracyjny kończył się pominięciem (9 pass + 1 skip), a release v1.0.0
  opisywał lokalny wynik 10/10 jako obowiązujący. Nowy skrypt
  `scripts/fetch-locale-runtime.mjs` instaluje dokładnie wersję pakietu zapisaną
  w `upstream/reference.json` (obecnie `0.1.5-rc.2`), a CI ustawia
  `DSH_REQUIRE_LOCALE_RUNTIME=1`, więc brak runtime’u **kończy się błędem, a nie
  pominięciem**.
- Literówka w `README.md`: „prezenty uprawnień” → „presety uprawnień”, wraz z
  doprecyzowaniem, że ten pakiet celowo nie tłumaczy nazw presetów uprawnień.
- `scripts/update-upstream.mjs` nie gubi już dodatkowych pól
  `upstream/reference.json` (np. noty o pochodzeniu korpusu) i jest idempotentny
  dla tego samego tagu.

### Dodane

- **Wykrywanie zmian treści istniejących angielskich stringów.** Nowy moduł
  `scripts/lib/corpus-diff.mjs` (czysta funkcja `diffCorpus`) oraz CLI
  `scripts/drift.mjs` porównują dwa korpusy i raportują nowe oraz usunięte
  namespace’y i klucze, zmiany wartości EN pod niezmienionym kluczem (oznaczone
  jako `UPSTREAM STRING CHANGED — REVIEW REQUIRED`) oraz zmiany zestawu
  placeholderów. Raport zawiera `OLD:` i `NEW:` dla każdej zmiany.
- Flaga `--fail-on-drift` w `update-upstream.mjs` i `drift.mjs`: wymusza
  niezerowy kod wyjścia przy jakiejkolwiek zmianie, aby wymusić ręczny review.
- `scripts/fetch-locale-runtime.mjs` — instalacja oficjalnego pakietu locale w
  wersji z `upstream/reference.json` (bez zmian w `package.json` i lockfile).
- `scripts/verify.mjs` — pełna, przenośna bramka: runtime + build + kontrola
  świeżości bundla + `check:strict` + testy z wymuszonym `LocaleRuntime`.
- 10 testów driftu (`tests/drift.test.mjs`) na lokalnych fixture’ach z
  `tests/fixtures/`: zmiana treści EN, nowy klucz, usunięty klucz, zmiana
  placeholdera, brak zmian, nowy i usunięty namespace oraz kody wyjścia CLI.
  Testy nie wymagają sieci.
- `upstream/drift-report.md` — generowany raport dryfu (ignorowany przez git).

### Zmienione

- **Cotygodniowy job „upstream drift” wykrywa teraz znacznie więcej.** Pobiera
  najnowszy tag DSH, wylicza raport dryfu obejmujący nowe i usunięte
  namespace’y oraz klucze, zmiany treści EN i placeholderów, publikuje raport w
  `GITHUB_STEP_SUMMARY` i **kończy się błędem**, gdy cokolwiek wymaga review.
  Job tylko raportuje — nic nie commituje, nie pushuje i nie tłumaczy.
- Liczba testów wzrosła z 10 do **20** (wszystkie wykonane w CI, 0 pominiętych).
- CI ma teraz jawny krok instalacji runtime’u i kontrolę świeżości
  `lib/client.js`.

### Zgodność

- Sprawdzone z DeepSeek Harness **0.1.5-rc.2** (tag `dsh-v0.1.5-rc.2`,
  commit `fb2c4b9`). Zakres tłumaczenia bez zmian: 43 namespace’y, 1292 ciągi.

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
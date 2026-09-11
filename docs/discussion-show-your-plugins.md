# dsh-locale-pl — polski (pl) pakiet językowy dla DSH Web

Cześć! Dzielę się społecznościowym pakietem językowym, który dodaje **Polski (pl)**
do listy języków w **Settings → General → Language**.

- **Repozytorium:** https://github.com/Dragonk/dsh-locale-pl
- **Instalacja:** `dsh plugin --profile web add github:Dragonk/dsh-locale-pl`
- **Licencja:** MIT

## Co robi

Pakiet to zwykły plugin kliencki DSH. Rejestruje język w oficjalnym rejestrze
locale (`@deepseek-ai/dsh-client-locale`) przez `ctx.locale.addLanguage` i podłącza
słowniki per namespace przez `ctx.locale.register`. Nie patchuje `node_modules` ani
źródeł DeepSeek Harness, a klucze nieobjęte tłumaczeniem spadają do angielskiego
przez wbudowany łańcuch `pl → en`.

## Zakres

- **43 namespace’y**
- **1292 przetłumaczone ciągi** (100% skontrolowanego korpusu)
- obejmuje m.in. `chat`, `conversation`, `settings` (w tym `settings.models`,
  `settings.plugins`, `settings.agentPreset`, `settings.pluginInventory`),
  `trajectory`, `workspace`, `subagent`, `workflowRun`, `cordis`, `deliverables`,
  `approval`, `plan`, `job`, `feedback`, `sidebar` i pozostałe.

## Zgodność

- DeepSeek Harness **0.1.5-rc.2** (tag `dsh-v0.1.5-rc.2`, commit `fb2c4b9`)
- Node.js ≥ 22

## Jak to jest utrzymywane

Korpus angielski jest wyciągany ze źródeł DSH skryptem `scripts/extract.mjs` i
wersjonowany w `upstream/corpus.json`. Skrypt `scripts/check.mjs --strict` (bramka
CI) wykrywa brakujące namespace’y i klucze, klucze nadmiarowe, uszkodzone
placeholdery oraz wartości nieprzetłumaczone. Testy obejmują test integracyjny z
prawdziwym `LocaleRuntime`, który sprawdza, że „Polski” trafia do katalogu języków,
przełączanie działa, a nieznane klucze spadają do angielskiego.

Procedura aktualizacji jest opisana w README: odświeżenie korpusu → `check` →
tłumaczenie nowych kluczy → testy → release. Nie ma automatycznych tłumaczeń.

## Ograniczenia

Kilka miejsc w DSH nie przechodzi przez rejestr locale (m.in. część nazw presetów
uprawnień i nazwy narzędzi w niektórych powierzchniach), więc pozostają po angielsku.
Ten pakiet celowo nie nadpisuje tabeli presetów uprawnień w profilu — dzięki temu nie
dubluje konfiguracji rdzenia i przetrwa zmiany upstream.

Chętnie przyjmę uwagi do tłumaczenia — issues w repozytorium są otwarte.

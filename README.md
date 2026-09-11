# dsh-locale-pl

Polski pakiet językowy dla interfejsu webowego **DeepSeek Harness** — społecznościowy
plugin kliencki, który dodaje język **Polski (pl)** do listy języków w
**Ustawienia → Ogólne → Język**.

Pakiet nie modyfikuje kodu DeepSeek Harness ani `node_modules`. Rejestruje się
przez oficjalny system lokalizacji DSH
(`@deepseek-ai/dsh-client-locale`): dodaje język do katalogu i podłącza słowniki
per namespace. Brakujące klucze są automatycznie uzupełniane angielskim przez
wbudowany łańcuch fallbacku.

- **Namespace’y:** 43
- **Przetłumaczone ciągi:** 1292 (100% korpusu)
- **Fallback:** `pl → en` (oficjalny mechanizm DSH)

## Sprawdzone wersje

| Element | Wersja |
| --- | --- |
| DeepSeek Harness (klient web / pakiety `@deepseek-ai/*`) | **0.1.5-rc.2** |
| Tag źródeł, z którego pochodzi korpus | `dsh-v0.1.5-rc.2` (`fb2c4b9`) |
| `dsh --version` na maszynie testowej | 0.1.5-rc.1 (CLI); pakiety są w 0.1.5-rc.2 |
| Node.js | ≥ 22 (testowane na 24) |

> DSH jest w fazie developer preview i ma breaking changes. Pakiet używa wyłącznie
> publicznego API rejestru locale (`ctx.locale.addLanguage` /
> `ctx.locale.register`), więc aktualizacje DSH nie wymagają zmian w kodzie pluginu —
> wymagają jedynie doniesienia nowych ciągów (patrz [Aktualizacje](#aktualizacje)).

## Instalacja

```bash
dsh plugin --profile web add github:Dragonk/dsh-locale-pl
```

Po instalacji **zrestartuj DSH** (zatrzymaj i uruchom ponownie `dsh --profile web`).
DSH doda pakiet do `dsh.profile.bundles` profilu i podłączy go jako warstwę
pluginu. Jeśli w Twojej instalacji działa przeładowywanie klienta (HMR), język
może pojawić się bez pełnego restartu — ale restart jest zawsze bezpieczny.

Możesz też zainstalować z lokalnej kopii:

```bash
dsh plugin --profile web add file:/ścieżka/do/dsh-locale-pl
```

albo z npm (po publikacji):

```bash
dsh plugin --profile web add dsh-locale-pl
```

## Wybór języka

1. Otwórz **Ustawienia**.
2. Przejdź do **Ogólne**.
3. W wierszu **Język** wybierz **Polski**.

Wybór jest zapisywany w dokumencie ustawień użytkownika DSH (sekcja `locale`) i
przetrwa restart oraz ponowne otwarcie przeglądarki.

## Odinstalowanie

```bash
dsh plugin --profile web remove dsh-locale-pl
```

Zrestartuj DSH. Interfejs wróci do poprzedniego języka; zapisana preferencja
`locale.preference` może pozostać w `settings.yaml` — usuń ją ręcznie, jeśli
chcesz wrócić do języka przeglądarki.

## Testy i kontrola zgodności

```bash
npm run fetch:runtime # instaluje @deepseek-ai/dsh-client-locale w wersji z upstream/reference.json
npm run build         # generuje lib/client.js ze słowników dict/pl/*.json
npm run check         # porównuje tłumaczenia z upstream/corpus.json (raport)
npm run check:strict  # kończy się kodem != 0 przy brakach (bramka CI)
npm test              # 20 testów: słowniki, bundle, drift, integracja z LocaleRuntime
npm run drift -- --old a.json --new b.json   # porównuje dwa korpusy
npm run verify        # fetch:runtime + build + check:strict + test (z wymuszonym LocaleRuntime)
```

`npm run verify` to pełna bramka wydania — uruchamia dokładnie to, co CI, i
wymusza wykonanie testu integracyjnego. Sam `npm test` jest wygodniejszy lokalnie:
jeśli nie znajdzie oficjalnego pakietu locale, pominie tylko test integracyjny.
W CI ustawione jest `DSH_REQUIRE_LOCALE_RUNTIME=1`, więc brak runtime’u **kończy
się błędem, a nie pominięciem**.

Checker (`check.mjs`) wykrywa:

- brakujące namespace’y i klucze względem angielskiego źródła,
- klucze nadmiarowe / nieistniejące w źródle,
- uszkodzone placeholdery (`{...}` występujące w innym zbiorze niż w angielskim),
- wartości identyczne z angielskimi (z wyjątkiem świadomej listy
  `upstream/identical-allowlist.json`),
- brakujące rodzeństwo w parach liczby mnogiej.

Wykrywanie zmian upstream (`scripts/lib/corpus-diff.mjs`, `scripts/drift.mjs`)
porównuje dwa korpusy i raportuje:

- nowe i usunięte namespace’y,
- nowe i usunięte klucze,
- **zmiany treści istniejących angielskich stringów** — oznaczane jako
  `UPSTREAM STRING CHANGED — REVIEW REQUIRED` (klucz nadal się rozwiązuje, ale
  polskie tłumaczenie trzeba zweryfikować ręcznie),
- zmiany zestawu placeholderów (`{count}` → `{total}`).

Do uruchomienia `check` i testów driftu nie potrzebujesz DSH ani sieci — korpus
angielski jest wersjonowany w `upstream/corpus.json`, a testy driftu działają na
lokalnych fixture’ach z `tests/fixtures/`. Tylko test integracyjny wymaga
pobrania `@deepseek-ai/dsh-client-locale`.

## Zgłaszanie błędów tłumaczenia

Otwórz **issue** w repozytorium: <https://github.com/Dragonk/dsh-locale-pl/issues>.

Podaj:

- namespace i klucz (np. `settings/connection.error`), jeśli go znasz,
- widoczny tekst po polsku i proponowaną wersję,
- zrzut ekranu i wersję DSH (`dsh --version`).

Zmiany tekstów wprowadzaj bezpośrednio w `dict/pl/<namespace>.json`, a następnie
uruchom `npm run build` — plik `lib/client.js` jest generowany i musi być
zacommitowany razem ze słownikiem.

## Struktura repozytorium

```
dict/pl/*.json        słowniki: namespace → { klucz: "polski tekst" }  (źródło prawdy)
lib/client.js         wygenerowany bundle klienta (window.__ModuleLoader__.load)
index.js              połowa hostowa pluginu (pusta — rejestracja dzieje się w przeglądarce)
cordis.patch.yml      warstwa profilu: montuje plugin jako wiersz loadera
scripts/extract.mjs   wyciąga korpus angielski ze źródeł DSH
scripts/build.mjs     składa lib/client.js ze słowników
scripts/check.mjs     kontrola zgodności i kompletności
scripts/lib/corpus-diff.mjs  porównanie dwóch korpusów (czysta funkcja)
scripts/drift.mjs     CLI: raport zmian między dwoma korpusami
scripts/update-upstream.mjs  odświeża korpus z wybranego tagu DSH i raportuje drift
scripts/fetch-locale-runtime.mjs  instaluje oficjalny pakiet locale do testów
scripts/verify.mjs    pełna bramka: runtime + build + check:strict + testy
upstream/corpus.json  angielskie źródło (klucz → {en, zh})
upstream/reference.json  z jakiego tagu/commita pochodzi korpus
tests/                testy jednostkowe, driftu i integracyjne
tests/fixtures/       lokalne fixture’y korpusów dla testów driftu
docs/publishing.md    wydanie nowej wersji i zgłoszenie do ekosystemu DSH
GLOSSARY.md           kontrakt terminologiczny
```

## Aktualizacje

Gdy DSH doda nowe ciągi:

```bash
# 1. odśwież angielskie źródło z nowego tagu i zobacz raport dryfu
node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2 --fail-on-drift
#    raport trafia też do upstream/drift-report.md

# 2. sprawdź, czego brakuje
npm run check

# 3. przetłumacz nowe klucze w dict/pl/<namespace>.json
#    (dodaj też nowe namespace’y; wzoruj się na GLOSSARY.md)
#    dla wpisów UPSTREAM STRING CHANGED — zweryfikuj istniejące tłumaczenie

# 4. zbuduj i przetestuj pełną bramką
npm run verify

# 5. wydaj wersję
#    zaktualizuj CHANGELOG.md, podnieś version w package.json, commit, tag, push
```

CI (GitHub Actions) uruchamia przy każdym pushu i pull requeście: `build`, kontrolę
świeżości `lib/client.js`, `check:strict` oraz testy z **wymuszonym** prawdziwym
`LocaleRuntime`. Raz w tygodniu osobny job pobiera najnowszy tag DSH, wylicza raport
dryfu i **kończy się błędem**, gdy upstream dodał, usunął lub zmienił cokolwiek —
włącznie ze zmianą treści istniejącego angielskiego stringa. Job tylko raportuje:
nic nie commituje, nie pushuje i nie tłumaczy automatycznie.

## Bezpieczeństwo i fallback

- Nie patchujemy `node_modules` ani plików upstream.
- Nie tworzymy własnego mechanizmu i18n — korzystamy z oficjalnego rejestru
  `ctx.locale`.
- Dla kluczy nieobjętych tłumaczeniem rejestr DSH automatycznie używa angielskiego
  (łańcuch `pl → en`), więc nowszy DSH nie zepsuje interfejsu.
- Gdy upstream zmieni nazwę lub usunie klucz, `npm run check` zgłosi to jako błąd.

### Czego nie da się przetłumaczyć przez system locale

Kilka miejsc w DSH nie przechodzi przez rejestr locale i pozostaje po angielsku:

- **nazwy presetów uprawnień** (`Read Only`, `Workspace Write`, `Full access`) —
  rdzeń definiuje je bez nazw wyświetlanych, więc interfejs pokazuje
  identyfikatory maszynowe i żaden słownik locale ich nie obejmuje;
- **nazwy narzędzi** (`Bash`, `Read`, `Write`, `Edit`) w niektórych miejscach to
  identyfikatory techniczne, nie ciągi locale;
- **treści z modelu** i **ścieżki/identyfikatory** — oczywiście nietłumaczalne.

> Ten pakiet celowo nie nadpisuje tabeli presetów uprawnień w profilu (inaczej niż
> np. pakiet rosyjski). Dzięki temu nie dubluje konfiguracji rdzenia i nie łamie się
> przy zmianach upstream; wszędzie tam, gdzie DSH udostępnia ciąg locale, tłumaczenie
> działa.

## Społeczność

Plugin został ogłoszony w społeczności DeepSeek Harness:

- **GitHub Discussion** (kategoria *Show Your Plugins!*):
  <https://github.com/deepseek-ai/deepseek-harness/discussions/6365>

Uwagi do tłumaczenia i propozycje lepszego brzmienia zgłaszaj przez
[issues](https://github.com/Dragonk/dsh-locale-pl/issues) — albo w wątku dyskusji.

## Licencja

MIT — patrz [LICENSE](LICENSE). Słowniki i skrypty powstały na podstawie publicznego
korpusu DSH; zobacz [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

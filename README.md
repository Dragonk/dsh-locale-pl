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
npm run build        # generuje lib/client.js ze słowników dict/pl/*.json
npm run check        # porównuje tłumaczenia z upstream/corpus.json (raport)
npm run check:strict # kończy się kodem != 0 przy brakach (bramka CI)
npm test             # testy jednostkowe + integracyjny test z LocaleRuntime
npm run verify       # build + check:strict + test
```

Checker wykrywa:

- brakujące namespace’y i klucze względem angielskiego źródła,
- klucze nadmiarowe / nieistniejące w źródle,
- uszkodzone placeholdery (`{...}` występujące w innym zbiorze niż w angielskim),
- wartości identyczne z angielskimi (z wyjątkiem świadomej listy
  `upstream/identical-allowlist.json`),
- brakujące rodzeństwo w parach liczby mnogiej.

Nie musisz mieć zainstalowanego DSH, żeby uruchomić `check` i `test` — korpus
angielski jest wersjonowany w `upstream/corpus.json`, a test integracyjny
pomija się, gdy nie znajdzie oficjalnego pakietu locale.

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
scripts/update-upstream.mjs  odświeża korpus z wybranego tagu DSH
upstream/corpus.json  angielskie źródło (klucz → {en, zh})
upstream/reference.json  z jakiego tagu/commita pochodzi korpus
tests/                testy jednostkowe i integracyjne
docs/publishing.md    wydanie nowej wersji i zgłoszenie do ekosystemu DSH
GLOSSARY.md           kontrakt terminologiczny
```

## Aktualizacje

Gdy DSH doda nowe ciągi:

```bash
# 1. odśwież angielskie źródło z nowego tagu
node scripts/update-upstream.mjs --ref dsh-v0.1.5-rc.2

# 2. sprawdź, czego brakuje
npm run check

# 3. przetłumacz nowe klucze w dict/pl/<namespace>.json
#    (dodaj też nowe namespace’y; wzoruj się na GLOSSARY.md)

# 4. zbuduj i przetestuj
npm run build && npm run check:strict && npm test

# 5. wydaj wersję
#    zaktualizuj CHANGELOG.md, podnieś version w package.json, commit, tag, push
```

CI (GitHub Actions) uruchamia `build`, `check:strict` i `test` przy każdym pushu
i pull requeście oraz raz w tygodniu wykrywa zmiany upstream. Nie ma automatycznego
tłumaczenia — nowe ciągi zawsze przechodzą przez review.

## Bezpieczeństwo i fallback

- Nie patchujemy `node_modules` ani plików upstream.
- Nie tworzymy własnego mechanizmu i18n — korzystamy z oficjalnego rejestru
  `ctx.locale`.
- Dla kluczy nieobjętych tłumaczeniem rejestr DSH automatycznie używa angielskiego
  (łańcuch `pl → en`), więc nowszy DSH nie zepsuje interfejsu.
- Gdy upstream zmieni nazwę lub usunie klucz, `npm run check` zgłosi to jako błąd.

### Czego nie da się przetłumaczyć przez system locale

Kilka miejsc w DSH nie przechodzi przez rejestr locale i pozostaje po angielsku:

- **prezenty uprawnień** (`Read Only`, `Workspace Write`, `Full access`) — rdzeń
  definiuje je bez nazw wyświetlanych; tłumaczy je osobno warstwa pluginowa
  (patrz uwaga niżej);
- **nazwy narzędzi** (`Bash`, `Read`, `Write`, `Edit`) w niektórych miejscach to
  identyfikatory techniczne, nie ciągi locale;
- **treści z modelu** i **ścieżki/identyfikatory** — oczywiście nietłumaczalne.

> Ten pakiet celowo nie nadpisuje tabeli presetów uprawnień w profilu (inaczej niż
> np. pakiet rosyjski). Dzięki temu nie dubluje konfiguracji rdzenia i nie łamie się
> przy zmianach upstream; wszędzie tam, gdzie DSH udostępnia ciąg locale, tłumaczenie
> działa.

## Licencja

MIT — patrz [LICENSE](LICENSE). Słowniki i skrypty powstały na podstawie publicznego
korpusu DSH; zobacz [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

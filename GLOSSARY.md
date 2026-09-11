# Glosariusz terminów (angielski → polski)

Ten plik jest **kontraktem terminologicznym** dla pakietu `dsh-locale-pl`. Każdy
nowy ciąg tłumaczymy zgodnie z tabelami poniżej, żeby interfejs brzmiał spójnie.

Zasady ogólne:

- Tłumaczymy **wartości**, nigdy kluczy obiektów.
- Zachowujemy placeholdery `{...}`, interpolacje, markdown, skróty klawiaturowe
  (`Cmd/Ctrl+Enter`, `Tab`), nazwy modeli, nazwy pluginów, nazwy poleceń i
  identyfikatory techniczne.
- Terminologii technicznej nie spolszczamy na siłę: `shell`, `token`, `prompt`,
  `plugin`, `provider`, `commit`, `branch`, `fork`, `workflow`, `tool call`
  zostają po angielsku tam, gdzie tak brzmi naturalniej dla programisty.
- Odmiana: w etykietach i przyciskach stosujemy formę bezosobową lub rozkaźnik
  (`Zapisz`, `Usuń`, `Spróbuj ponownie`).
- Liczba mnoga w interfejsie: klient wybiera formę binarnie (`count === 1` →
  `.one`, inaczej `.other`). Dla rzeczowników z nieregularną odmianą
  (2–4 vs 5+) stosujemy formę z dwukropkiem (`Pliki: {count}`) albo skrót
  (`godz.`, `min`, `sek.`), żeby żadna liczba nie brzmiała niegramatycznie.

## Nawigacja i czynności

| Angielski | Polski | Uwaga |
| --- | --- | --- |
| Settings | Ustawienia | wymagane |
| General | Ogólne | wymagane |
| Language | Język | wymagane |
| Approve | Zatwierdź | wymagane |
| Reject / Decline | Odrzuć | wymagane |
| Refuse (plan) | Odrzuć | |
| Allow | Zezwól | |
| Allow once | Zezwól raz | |
| Retry | Spróbuj ponownie | wymagane |
| Cancel | Anuluj | wymagane |
| Save | Zapisz | wymagane |
| Delete | Usuń | wymagane |
| Edit | Edytuj | wymagane |
| Run | Uruchom | zależnie od kontekstu |
| Stop | Zatrzymaj | wymagane |
| Continue | Kontynuuj | wymagane |
| Copy | Kopiuj | |
| Copied | Skopiowano | |
| Close | Zamknij | |
| Search | Szukaj | |
| Skip | Pomiń | |
| Submit | Wyślij | |
| Next / Previous | Dalej / Poprzedni | |
| Expand / Collapse | Rozwiń / Zwiń | |
| Reload | Wczytaj ponownie | |
| Refresh | Odśwież | |
| Reset to default | Przywróć domyślne | |
| Rename | Zmień nazwę | |
| Open | Otwórz | |
| Back | Wstecz | |
| More | Więcej | |

## Interfejs i model

| Angielski | Polski | Uwaga |
| --- | --- | --- |
| Sidebar | panel boczny | |
| Session | sesja | |
| Workspace | obszar roboczy | |
| Turn | tura | |
| Message | wiadomość | |
| Conversation | rozmowa | |
| Model | Model | bez zmian |
| Provider | dostawca | |
| Reasoning effort | intensywność rozumowania | |
| Context window | okno kontekstu | |
| Token usage | zużycie tokenów | |
| Cache hit | trafienia w pamięć podręczną | |
| Output tokens | tokeny wyjściowe | |
| Tool call | wywołanie narzędzia | |
| Tool | narzędzie | |
| Subagent | podagent | |
| Skill | umiejętność | |
| Command | polecenie | |
| Prompt systemowy / System prompt | Prompt systemowy | |
| Attachment | załącznik | |
| Approval | zatwierdzenie | |
| Permission | uprawnienia | |
| Preset | preset | |
| Goal | cel | |
| Plan mode | tryb planowania | |
| Workflow | workflow | bez zmian |
| Trajectory | trajektoria | |
| Compaction | kompaktowanie | |
| Timeline | os czasu | |
| Throughput | przepustowość | |
| Time to first token (TTFT) | czas do pierwszego tokenu (TTFT) | |
| Tokens per second (TPS) | tokeny na sekundę (TPS) | |
| Diagnostics | diagnostyka | |

## Stany i statusy

| Angielski | Polski |
| --- | --- |
| Running | Działa |
| Idle | Bezczynny / Bezczynna |
| Pending | Oczekuje |
| Waiting for approval | Oczekiwanie na zatwierdzenie |
| Completed | Ukończono / Ukończona |
| Failed | Niepowodzenie / Nieudany |
| Stopped | Zatrzymano |
| Cancelled | Anulowano |
| Interrupted | Przerwano |
| Disabled | Wyłączony |
| Enabled | Włączony |
| Conditional | Warunkowy |
| Overridden | Nadpisane |
| Unavailable | Niedostępne |

## Skróty i jednostki

| Angielski | Polski | Uwaga |
| --- | --- | --- |
| ms / s | ms / s | jednostki SI bez zmian |
| K / M (compact numbers) | tys. / mln | `number.thousand`, `number.million` |
| d / h / min / mo / y (relative time) | d / godz. / min / mies. / lat | |
| Exit code | kod wyjścia | |
| Signal | sygnał | |
| Tab | Tab | nazwa klawisza |
| HTTP | HTTP | bez zmian |

## Świadomie nieprzetłumaczone

Poniższe wartości pozostają identyczne z angielskimi i są wpisane do
`upstream/identical-allowlist.json` (checker nie zgłasza ich jako brak
tłumaczenia):

- nazwy aplikacji: VS Code, Cursor, Zed, Xcode, Sublime Text, JetBrains IDEs,
  Ghostty, Warp, iTerm2, GitKraken, Sourcetree, itd.;
- nazwy formatów: JSON, HTML, Markdown, PDF;
- jednostki, separatory, znaczniki: `ms`, `s`, `{value} K/M`, `,`, ` · `,
  `{y}-{m}-{d}`;
- wyrazy identyczne w obu językach: `OK`, `Model`, `Plan`, `Start`, `Python`;
- nazwa polecenia `compact` (wywołanie `/compact`) oraz inne identyfikatory.

## Jak dodać nowy termin

1. Dodaj wiersz do odpowiedniej tabeli w tym pliku.
2. Zastosuj go we wszystkich namespace’ach, w których występuje.
3. Uruchom `npm run check:strict` i `npm test`.

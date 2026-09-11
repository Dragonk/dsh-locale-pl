# Publikacja i zgłoszenie do ekosystemu

Ten dokument opisuje proces wydania pakietu oraz zgłoszenia go do ekosystemu DSH.

## 1. Wydanie nowej wersji

```bash
# 1. odśwież korpus i przetłumacz nowe klucze (patrz README → Aktualizacje)
node scripts/update-upstream.mjs --ref <tag>
npm run build && npm run check:strict && npm test

# 2. zaktualizuj CHANGELOG.md i podnieś "version" w package.json

# 3. commit, tag, push
git add -A && git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "dsh-locale-pl vX.Y.Z"
git push origin main --follow-tags

# 4. GitHub Release
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <notatki>
```

## 2. Instalacja u użytkownika

```bash
dsh plugin --profile web add github:Dragonk/dsh-locale-pl
```

DSH dopisuje pakiet do `dsh.profile.bundles` profilu. Wymagany jest restart DSH.

## 3. Zgłoszenie do ekosystemu DSH

Polityka DeepSeek Harness (plik `CONTRIBUTING.md`) jest jednoznaczna: **projekt nie
przyjmuje zewnętrznych pull requestów**. Wskazane kanały to:

1. **Temat `dsh-plugin` na GitHubie** — nadany temu repozytorium (wymagany do
   wykrywalności w <https://github.com/topics/dsh-plugin>).
2. **GitHub Discussion** w kategorii **Show Your Plugins!** w repozytorium
   `deepseek-ai/deepseek-harness`.

Kategorii nie trzeba tworzyć — już istnieje. Identyfikator GraphQL kategorii to
`DIC_kwDOT3Tg84DDSUe` (slug: `show-your-plugins`). Jeśli się zmieni, pobierz go
ponownie:

```bash
gh api graphql -f query='{ repository(owner:"deepseek-ai", name:"deepseek-harness") {
  discussionCategories(first:20){ nodes { id name slug } } } }'
```

### Wysłanie dyskusji

Zapytanie wymaga GraphQL `createDiscussion`. Gotowy tekst znajduje się w
`docs/discussion-show-your-plugins.md`. Aby opublikować:

```bash
gh api graphql -f query='
mutation($repo:ID!, $cat:ID!, $title:String!, $body:String!) {
  createDiscussion(input:{repositoryId:$repo, categoryId:$cat, title:$title, body:$body}) {
    discussion { url }
  }
}' -f repo="$(gh api repos/deepseek-ai/deepseek-harness --jq .node_id)" \
   -f cat=DIC_kwDOT3Tg84DDSUe \
   -f title="dsh-locale-pl: Polish (pl) language pack for DSH Web" \
   -f body="$(cat docs/discussion-show-your-plugins.md)"
```

> Publikacja dyskusji to publiczne działanie w cudzym repozytorium — wykonaj je
> świadomie i tylko po potwierdzeniu, że treść jest aktualna.

## 4. Numery wersji

- `MAJOR` — zmiana wymagająca nowej wersji DSH lub usunięcie namespace’u.
- `MINOR` — nowe namespace’y lub nowe przetłumaczone klucze.
- `PATCH` — poprawki literówek i brzmienia bez zmiany zakresu kluczy.

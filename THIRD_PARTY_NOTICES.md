# Third-party notices

This project is MIT-licensed (see [LICENSE](LICENSE)). Parts of it were derived
from, or generated from, the following MIT-licensed sources.

## DeepSeek Harness

- Repository: <https://github.com/deepseek-ai/deepseek-harness>
- License: MIT
- Use here: `upstream/corpus.json` is an extraction of the English/Chinese locale
  dictionaries shipped in the `@deepseek-ai/*` packages. The Polish values in
  `dict/pl/*.json` are original translations of that English text. Source tags
  and commit are recorded in `upstream/reference.json`.

## deepseek-harness-locale-ru

- Repository: <https://github.com/warment/deepseek-harness-locale-ru>
- License: MIT
- Use here: `scripts/extract.mjs` is adapted from that project's extractor. This
  pack adds concatenation evaluation, a TypeScript-annotation-aware literal
  fallback for dictionary modules that cannot be imported, and project-specific
  CLI defaults.

## @deepseek-ai/dsh-client-locale

- Part of DeepSeek Harness (MIT).
- Use here: the pack registers against its public `LocaleRuntime` API
  (`addLanguage`, `register`); no code is copied from it, and
  `tests/runtime.integration.test.mjs` loads the shipped bundle at test time to
  verify real interoperability.

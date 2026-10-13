# Pliny packs

Word packs for [Pliny](https://github.com/Pliny-app). In the app: Settings › Word packs › Browse….

There are two kinds of pack:

- **Synonym packs** (`synonyms/*.pack.json`): suggest other words while you write. "said" → stated, murmured…; "very bad" → atrocious…
- **Thematic packs** (`themes/*.md`): Markdown documents on a theme (weather, ships, heraldry…), read beside your text in the Packs panel and turned on per project.

## Synonym pack

```json
{
  "pliny": "pack",
  "version": 1,
  "id": "said",
  "name": "Instead of “said”",
  "kind": "synonyms",
  "language": "en",
  "description": "Other words for “said”.",
  "trigger": "said",
  "source": "Who made it, or the dataset and its licence",
  "updated": "2026-10-13",
  "entries": [
    { "key": "said", "suggestions": ["stated", "murmured", "replied"] }
  ]
}
```

`trigger` decides what gets marked in the text:

- **A word or phrase** (`"said"`): every suggestion in the pack is for it. A word in its base form (`"say"`) also catches its other forms (says, said, saying), and the suggestions are put into the same form, so write them in the base form too (state, murmur).
- **A pattern with `{word}`** (`"very {word}"`): each entry's `key` goes in the slot. The key `"bad"` marks "very bad".
- **No trigger:** each `key` is matched as written.

Suggestions go best first.

## Thematic pack

A Markdown file with a short header:

```markdown
---
name: Weather
description: Words for sky, rain, wind, cold and heat.
author: Your name
license: CC BY 4.0
updated: 2026-10-13
---
# Weather
…
```

If `name` is missing, the first `#` heading is used.

## Adding a pack

1. Put the file in `synonyms/` or `themes/`.
2. Add it to `index.json`: `id`, `name`, `kind` (`synonyms` or `theme`), `description`, `file` (its path here) and `updated` (YYYY-MM-DD).
3. When you change a pack, raise its `updated` date in `index.json`. Pliny then offers Update to people who have it.

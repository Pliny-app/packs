# Pliny packs

Word packs for [Pliny](https://github.com/Pliny-app). In the app: Settings › Word packs › Library.

There are four kinds of pack:

- **Style packs** (`style/*.pack.json`): flag words that can go or be simpler: fillers, clichés, wordy phrases.
- **Synonym packs** (`synonyms/*.pack.json`): suggest other words while you write. "said" → stated, murmured…; "very bad" → atrocious…
- **Format packs** (`formats/*.pack.json`): how dates, times, amounts and quotes are written, and snippets to insert (a quotation, a citation, a link…) with blanks to fill.
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

## Style pack

The same file as a synonym pack, with `"kind": "style"`, marked with a dotted underline instead of a highlight:

```json
{
  "pliny": "pack",
  "version": 1,
  "id": "fillers",
  "name": "Fillers",
  "kind": "style",
  "language": "en",
  "description": "Words that rarely add meaning.",
  "message": "a filler that can usually go",
  "remove": true,
  "entries": [
    { "key": "very", "suggestions": [] },
    { "key": "pretty good", "suggestions": ["good"] }
  ]
}
```

- `message`: what a mark says after the words ("“very”: a filler that can usually go"); without it, the pack's name.
- `suggestions` are the fixes and may be empty.
- `remove`: an entry without suggestions offers Remove.

## Format pack

```json
{
  "pliny": "pack",
  "version": 1,
  "id": "uk-formats",
  "name": "UK formats",
  "kind": "format",
  "language": "en",
  "description": "Times like 3pm, dates like 13 October 2026.",
  "formats": { "time": "3pm", "date": "13 October 2026" },
  "snippets": [
    { "name": "Dialogue", "template": "‘{line},’ {name} said." }
  ]
}
```

- `formats` (optional): the form each kind of value is written in; Pliny marks the others and converts them. Leave a kind out to let the text's most used form count. When two packs that are on pin the same kind, the first one counts. Kinds and forms:
  - `time`: `3 pm`, `3pm`, `3 PM`, `3PM`, `3 p.m.`, `15:00`
  - `date`: `13 October 2026`, `October 13, 2026`, `2026-10-13`, `13/10/2026`, `10/13/2026`
  - `money`: `$5`, `5 dollars`, `USD 5`
  - `numbers`: `1,000`, `1 000`, `1000`
  - `percent`: `5%`, `5 percent`, `5 per cent`
  - `quotes`: `“curly”`, `"straight"`
  - `dashes`: `a—b`, `a — b`, `a – b`, `a -- b`
- `snippets`: what Edit › Insert Snippet (⌥⌘T) offers. Blanks are `{name}`; Tab goes to the next one, and a blank used twice is filled once. `\n` starts a new line.

## Category

Any pack can have a `category` (`"category": "Sci-fi"` in a `.pack.json`, `category: Sci-fi` in a thematic pack's header). The library in Pliny can be narrowed to one category.

## Thematic pack

A Markdown file with a short header:

```markdown
---
name: Weather
description: Words for sky, rain, wind, cold and heat.
category: Nature
author: Your name
license: CC BY 4.0
updated: 2026-10-13
---
# Weather
…
```

If `name` is missing, the first `#` heading is used.

## Adding a pack

1. Make it in Pliny (Settings › Word packs › Add) and use Save as file…, or write the file.
2. Put the file in `style/`, `synonyms/` or `formats/` (name ending in `.pack.json`) or `themes/` (`.md`): on github.com, Add file › Upload files.
3. That's it: on every push, a GitHub Action checks the packs and rebuilds `index.json`. Each pack's `updated` time and `commit` are its file's last change, so Pliny offers Update whenever a pack changes, with the commit message's first line as what changed. A broken pack fails the run (Actions tab) and the index stays as it was.

To check locally: `node scripts/build-index.mjs --check`

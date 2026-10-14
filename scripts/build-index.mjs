// Builds index.json from the packs in style/, synonyms/ and formats/ (*.pack.json) and themes/ (*.md), checking each one.
// `updated` is the date of the file's last commit, so changing a pack makes Pliny offer Update.
// node scripts/build-index.mjs          → writes index.json
// node scripts/build-index.mjs --check  → only checks (pull requests)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const check = process.argv.includes('--check')
const problems = []
const packs = []

const lastChanged = (file) => {
  const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim()
  return date || new Date().toISOString().slice(0, 10)   // not committed yet
}

const slug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')

const info = (data) => ({
  ...(data.description ? { description: data.description } : {}),
  ...(data.category ? { category: data.category } : {}),
})

function wordPack(file, kind) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    return problems.push(`${file}: not valid JSON (${e.message})`)
  }
  if (data.pliny !== 'pack') return problems.push(`${file}: "pliny" must be "pack"`)
  if (typeof data.id !== 'string' || !data.id) return problems.push(`${file}: no "id"`)
  if (typeof data.name !== 'string' || !data.name) return problems.push(`${file}: no "name"`)
  if (data.kind !== kind) return problems.push(`${file}: "kind" must be "${kind}"`)
  if (!Array.isArray(data.entries)) return problems.push(`${file}: "entries" must be a list: [ { "key": …, "suggestions": [ … ] } ]`)
  const bad = data.entries.findIndex((e) => typeof e?.key !== 'string' || !Array.isArray(e.suggestions) || e.suggestions.some((s) => typeof s !== 'string'))
  if (bad !== -1) return problems.push(`${file}: entry ${bad + 1} needs a "key" and a list of "suggestions"`)
  packs.push({ id: data.id, name: data.name, kind, ...info(data), file, updated: lastChanged(file) })
}

const FORMS = {
  time: ['3 pm', '3pm', '3 PM', '3PM', '3 p.m.', '15:00'],
  date: ['13 October 2026', 'October 13, 2026', '2026-10-13', '13/10/2026', '10/13/2026'],
  money: ['$5', '5 dollars', 'USD 5'],
  numbers: ['1,000', '1 000', '1000'],
  percent: ['5%', '5 percent', '5 per cent'],
  quotes: ['“curly”', '"straight"'],
  dashes: ['a—b', 'a — b', 'a – b', 'a -- b'],
}

function formatPack(file) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    return problems.push(`${file}: not valid JSON (${e.message})`)
  }
  if (data.pliny !== 'pack') return problems.push(`${file}: "pliny" must be "pack"`)
  if (typeof data.id !== 'string' || !data.id) return problems.push(`${file}: no "id"`)
  if (typeof data.name !== 'string' || !data.name) return problems.push(`${file}: no "name"`)
  if (data.kind !== 'format') return problems.push(`${file}: "kind" must be "format"`)
  for (const [kind, form] of Object.entries(data.formats ?? {})) {
    if (!FORMS[kind]) return problems.push(`${file}: "${kind}" isn't a kind of value (${Object.keys(FORMS).join(', ')})`)
    if (!FORMS[kind].includes(form)) return problems.push(`${file}: "${form}" isn't a form of ${kind} (${FORMS[kind].join(', ')})`)
  }
  if (!Array.isArray(data.snippets)) return problems.push(`${file}: "snippets" must be a list: [ { "name": …, "template": … } ]`)
  const bad = data.snippets.findIndex((s) => typeof s?.name !== 'string' || !s.name.trim() || typeof s.template !== 'string' || !s.template.trim())
  if (bad !== -1) return problems.push(`${file}: snippet ${bad + 1} needs a "name" and a "template"`)
  if (!data.formats && data.snippets.length === 0) return problems.push(`${file}: no "formats" and no "snippets"`)
  packs.push({ id: data.id, name: data.name, kind: 'format', ...info(data), file, updated: lastChanged(file) })
}

function themePack(file) {
  const text = readFileSync(file, 'utf8')
  const front = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  const fields = {}
  for (const line of front?.[1].split(/\r?\n/) ?? []) {
    const pair = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/.exec(line)
    if (pair?.[2]) fields[pair[1].toLowerCase()] = pair[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  const body = front ? text.slice(front[0].length) : text
  if (!body.trim()) return problems.push(`${file}: no text`)
  const name = fields.name ?? /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1] ?? file.replace(/^.*\/|\.md$/g, '')
  packs.push({ id: fields.id ?? slug(name), name, kind: 'theme', ...info(fields), file, updated: lastChanged(file) })
}

for (const [folder, ending, read] of [['style', '.pack.json', (f) => wordPack(f, 'style')], ['synonyms', '.pack.json', (f) => wordPack(f, 'synonyms')], ['formats', '.pack.json', formatPack], ['themes', '.md', themePack]]) {
  for (const name of readdirSync(folder).sort()) {
    if (name.startsWith('.')) continue
    if (!name.endsWith(ending)) problems.push(`${folder}/${name}: the name must end in ${ending}`)
    else read(`${folder}/${name}`)
  }
}

const seen = new Map()
for (const p of packs) {
  if (seen.has(p.id)) problems.push(`${p.file}: id "${p.id}" is also used by ${seen.get(p.id)}`)
  seen.set(p.id, p.file)
}

if (problems.length > 0) {
  console.error(`Packs with problems:\n${problems.map((p) => `- ${p}`).join('\n')}`)
  process.exit(1)
}
packs.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
console.log(packs.map((p) => `${p.kind}: ${p.name} (${p.file}, ${p.updated})`).join('\n'))
if (!check) writeFileSync('index.json', `${JSON.stringify({ pliny: 'pack-index', version: 1, packs }, null, 2)}\n`)

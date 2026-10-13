// Builds index.json from the packs in synonyms/ (*.pack.json) and themes/ (*.md), checking each one.
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

function synonymPack(file) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    return problems.push(`${file}: not valid JSON (${e.message})`)
  }
  if (data.pliny !== 'pack') return problems.push(`${file}: "pliny" must be "pack"`)
  if (typeof data.id !== 'string' || !data.id) return problems.push(`${file}: no "id"`)
  if (typeof data.name !== 'string' || !data.name) return problems.push(`${file}: no "name"`)
  if (data.kind !== 'synonyms') return problems.push(`${file}: "kind" must be "synonyms"`)
  if (!Array.isArray(data.entries)) return problems.push(`${file}: "entries" must be a list: [ { "key": …, "suggestions": [ … ] } ]`)
  const bad = data.entries.findIndex((e) => typeof e?.key !== 'string' || !Array.isArray(e.suggestions) || e.suggestions.some((s) => typeof s !== 'string'))
  if (bad !== -1) return problems.push(`${file}: entry ${bad + 1} needs a "key" and a list of "suggestions"`)
  packs.push({ id: data.id, name: data.name, kind: 'synonyms', ...(data.description ? { description: data.description } : {}), file, updated: lastChanged(file) })
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
  packs.push({ id: fields.id ?? slug(name), name, kind: 'theme', ...(fields.description ? { description: fields.description } : {}), file, updated: lastChanged(file) })
}

for (const [folder, ending, read] of [['synonyms', '.pack.json', synonymPack], ['themes', '.md', themePack]]) {
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

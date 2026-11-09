import { rgba, type RGBA } from '../color'
import type { PixelIssue, SpecColor } from './types'

export type Palette = Map<string, RGBA>

const MAX_OPAQUE_COLORS = 16

type ColorResult = { ok: true; color: RGBA } | { ok: false; message: string }

function parseArray(value: number[]): ColorResult {
  if (value.length !== 3 && value.length !== 4) {
    return { ok: false, message: 'color arrays must have 3 or 4 components' }
  }
  for (const component of value) {
    if (!Number.isInteger(component) || component < 0 || component > 255) {
      return { ok: false, message: 'color components must be integers from 0 to 255' }
    }
  }
  const alpha = value[3] ?? 255
  return {
    ok: true,
    color: alpha === 0 ? 0 : rgba(value[0], value[1], value[2], alpha),
  }
}

function parseString(value: string): ColorResult {
  const text = value.trim().toLowerCase()
  if (text === '' || text === 'transparent' || text === 'none' || text === 'null') {
    return { ok: true, color: 0 }
  }
  let hex = text.startsWith('#') ? text.slice(1) : text
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((character) => character + character)
      .join('')
  }
  if (hex.length === 6) hex += 'ff'
  if (hex.length !== 8 || !/^[0-9a-f]{8}$/.test(hex)) {
    return { ok: false, message: `invalid color: ${value}` }
  }
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const a = Number.parseInt(hex.slice(6, 8), 16)
  return { ok: true, color: a === 0 ? 0 : rgba(r, g, b, a) }
}

export function parseSpecColor(value: SpecColor): ColorResult {
  if (Array.isArray(value)) return parseArray(value)
  if (typeof value === 'string') return parseString(value)
  return { ok: false, message: 'color must be a string or an array' }
}

export function parsePalette(
  raw: Record<string, SpecColor> | undefined,
): { palette: Palette; issues: PixelIssue[] } {
  const palette: Palette = new Map()
  const issues: PixelIssue[] = []
  const opaque = new Set<RGBA>()

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      palette,
      issues: [{ code: 'palette-missing', message: 'spec.palette must be an object' }],
    }
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key.length !== 1 || /\s/.test(key)) {
      issues.push({
        code: 'palette-key',
        message: `palette keys must be a single non-whitespace character (got ${JSON.stringify(key)})`,
      })
      continue
    }
    if (key === '.') {
      palette.set('.', 0)
      continue
    }
    const parsed = parseSpecColor(value)
    if (!parsed.ok) {
      issues.push({ code: 'palette-color', message: `palette[${JSON.stringify(key)}]: ${parsed.message}` })
      continue
    }
    palette.set(key, parsed.color)
    if (parsed.color !== 0) opaque.add(parsed.color)
  }

  if (!palette.has('.')) palette.set('.', 0)

  if (opaque.size > MAX_OPAQUE_COLORS) {
    issues.push({
      code: 'palette-too-many-colors',
      message: `palette has ${opaque.size} opaque colors; the maximum is ${MAX_OPAQUE_COLORS}`,
    })
  }

  return { palette, issues }
}

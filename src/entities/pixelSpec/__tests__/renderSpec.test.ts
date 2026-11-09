import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PixelSpecError, renderSpec, resolvePlacement } from '../index'
import type { PixelSpec } from '../types'

function spec(partial: Partial<PixelSpec> = {}): PixelSpec {
  return {
    size: [4, 4],
    palette: { '.': 'transparent', a: '#ff0000', b: '#0000ff', '#': '#000000' },
    frames: [
      {
        pixels: ['....', '....', '....', '....'],
      },
    ],
    ...partial,
  }
}

describe('renderSpec', () => {
  it('renders a strict grid and metrics', () => {
    const rendered = renderSpec(
      spec({
        frames: [
          {
            pixels: ['....', '.aa.', '.aa.', '....'],
          },
        ],
      }),
    )
    expect(rendered.frames).toHaveLength(1)
    expect(rendered.frames[0].ascii).toBe('....\n.aa.\n.aa.\n....')
    expect(rendered.frames[0].metrics.occupied_pixels).toBe(4)
    expect(rendered.frames[0].metrics.bbox).toEqual([1, 1, 2, 2])
    expect(rendered.frames[0].metrics.orphan_pixels).toBe(0)
  })

  it('applies mirror_x', () => {
    const rendered = renderSpec(
      spec({
        frames: [
          {
            pixels: ['#...', 'a...', '....', '....'],
            ops: [{ op: 'mirror_x' }],
          },
        ],
      }),
    )
    expect(rendered.frames[0].ascii).toBe('#..#\na..a\n....\n....')
  })

  it('applies outline', () => {
    const rendered = renderSpec(
      spec({
        palette: { '.': 'transparent', a: '#ff0000', '#': '#000000' },
        frames: [
          {
            pixels: ['....', '.aa.', '.aa.', '....'],
            ops: [{ op: 'outline', color: '#' }],
          },
        ],
      }),
    )
    expect(rendered.frames[0].ascii).toBe('.##.\n#aa#\n#aa#\n.##.')
  })

  it('applies mirror_y, line, ellipse and flood_fill', () => {
    const mirrored = renderSpec(
      spec({
        size: [5, 5],
        frames: [{ pixels: ['a....', '.....', '.....', '.....', '.....'], ops: [{ op: 'mirror_y' }] }],
      }),
    )
    expect(mirrored.frames[0].ascii.split('\n')[4]).toBe('a....')

    const lined = renderSpec(
      spec({
        size: [5, 5],
        frames: [
          {
            pixels: ['.....', '.....', '.....', '.....', '.....'],
            ops: [{ op: 'line', x0: 0, y0: 0, x1: 4, y1: 4, color: 'a' }],
          },
        ],
      }),
    )
    expect(lined.frames[0].ascii.split('\n')[0]).toBe('a....')
    expect(lined.frames[0].ascii.split('\n')[4]).toBe('....a')

    const ellipse = renderSpec(
      spec({
        size: [5, 5],
        frames: [
          {
            pixels: ['.....', '.....', '.....', '.....', '.....'],
            ops: [{ op: 'ellipse', cx: 2.5, cy: 2.5, rx: 1.5, ry: 1.5, color: 'a' }],
          },
        ],
      }),
    )
    expect(ellipse.frames[0].ascii.split('\n')[2]).toBe('.aaa.')

    const filled = renderSpec(
      spec({
        size: [5, 5],
        frames: [
          {
            pixels: ['.....', '.....', '.....', '.....', '.....'],
            ops: [{ op: 'flood_fill', x: 2, y: 2, color: 'a' }],
          },
        ],
      }),
    )
    expect(filled.frames[0].metrics.occupied_pixels).toBe(25)
  })

  it('applies rect, replace and shift', () => {
    const rendered = renderSpec(
      spec({
        frames: [
          {
            pixels: ['....', '....', '....', '....'],
            ops: [
              { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'a' },
              { op: 'replace', from: 'a', to: 'b' },
              { op: 'shift', dx: 1, dy: 0 },
            ],
          },
        ],
      }),
    )
    expect(rendered.frames[0].ascii).toBe('.bb.\n.bb.\n....\n....')
  })

  it('applies a deterministic dither', () => {
    const rendered = renderSpec(
      spec({
        frames: [
          {
            pixels: ['aaaa', 'aaaa', '....', '....'],
            ops: [{ op: 'dither', a: 'a', b: 'b', pattern: 'checker' }],
          },
        ],
      }),
    )
    expect(rendered.frames[0].ascii).toBe('abab\nbaba\n....\n....')
  })

  it('rejects wrong row width with context', () => {
    expect(() =>
      renderSpec(
        spec({
          frames: [{ pixels: ['...', '....', '....', '....'] }],
        }),
      ),
    ).toThrow(PixelSpecError)
    try {
      renderSpec(spec({ frames: [{ pixels: ['...', '....', '....', '....'] }] }))
    } catch (error) {
      const issues = (error as PixelSpecError).issues
      expect(issues[0].code).toBe('row-width')
      expect(issues[0].row).toBe(0)
    }
  })

  it('rejects unknown characters and too many colors', () => {
    expect(() =>
      renderSpec(spec({ frames: [{ pixels: ['z...', '....', '....', '....'] }] })),
    ).toThrow(PixelSpecError)

    const palette: Record<string, string> = { '.': 'transparent' }
    for (let index = 0; index < 17; index += 1) {
      palette[String.fromCharCode(97 + index)] = `#0000${index.toString(16).padStart(2, '0')}`
    }
    expect(() => renderSpec(spec({ palette }))).toThrow(PixelSpecError)
  })

  it('renders the external skill fixture', () => {
    const fixture = JSON.parse(
      readFileSync('.opencode/skills/pixel-art/assets/slime.json', 'utf8'),
    ) as PixelSpec
    const rendered = renderSpec(fixture)
    expect(rendered.frames).toHaveLength(2)
    expect(rendered.frames[0].metrics).toMatchObject({
      size: [16, 16],
      bbox: [1, 1, 14, 13],
      occupied_pixels: 148,
      occupancy: 0.5781,
      colors: 5,
      orphan_pixels: 0,
      vertical_symmetry: 1,
    })
    expect(rendered.frames[0].ascii.split('\n')[3]).toBe('...#gGGggGGg#...')
    expect(rendered.frames[1].name).toBe('bounce')
    expect(rendered.frames[1].metrics.bbox).toEqual([1, 0, 14, 12])
  })

  it('resolves placement anchors and rejects overflow', () => {
    expect(resolvePlacement([4, 4], { width: 8, height: 8 }, undefined)).toMatchObject({
      x: 2,
      y: 2,
      issues: [],
    })
    expect(
      resolvePlacement([4, 4], { width: 8, height: 8 }, { anchor: 'bottom-center' }),
    ).toMatchObject({ x: 2, y: 4, issues: [] })
    expect(
      resolvePlacement([4, 4], { width: 8, height: 8 }, { x: 6, y: 6 }).issues,
    ).toHaveLength(1)
  })
})

import { toHex } from './color'

const SPEC_CHARS =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~'

export function encodeSpecGrid(
  pixels: Uint32Array,
  width: number,
  height: number,
): { palette: Record<string, string>; pixels: string[] } {
  const palette: Record<string, string> = { '.': 'transparent' }
  const charByColor = new Map<number, string>()
  const rows: string[] = []

  for (let y = 0; y < height; y += 1) {
    let row = ''
    for (let x = 0; x < width; x += 1) {
      const color = pixels[y * width + x]
      if (color === 0) {
        row += '.'
        continue
      }
      let character = charByColor.get(color)
      if (!character) {
        character = SPEC_CHARS[charByColor.size]
        if (!character) {
          throw new Error(
            `frame has more than ${SPEC_CHARS.length} colors and cannot be encoded as a spec`,
          )
        }
        charByColor.set(color, character)
        palette[character] = toHex(color)
      }
      row += character
    }
    rows.push(row)
  }

  return { palette, pixels: rows }
}

# Pixel Art Spec Format

A spec is a single JSON file. Everything is deterministic: the same spec always
produces the same PNG.

## Minimal example

```json
{
  "name": "coin",
  "size": [8, 8],
  "scale": 16,
  "palette": {
    ".": "transparent",
    "#": "#1a1c2c",
    "y": "#ffcd75",
    "Y": "#fff1b0"
  },
  "frames": [
    {
      "name": "idle",
      "pixels": [
        "..####..",
        ".#yyyy#.",
        "#yYYYYy#",
        "#yYYYYy#",
        "#yYYYYy#",
        "#yYYYYy#",
        ".#yyyy#.",
        "..####.."
      ],
      "ops": []
    }
  ]
}
```

## Top-level fields

| Field     | Required | Description                                                        |
| --------- | -------- | ------------------------------------------------------------------ |
| `name`    | no       | Base name for the default output file.                             |
| `size`    | yes      | `[width, height]` in pixels. Must match every frame.               |
| `scale`   | no       | Default integer upscale for the output PNG. Default `12`.          |
| `palette` | yes      | Object mapping one-character keys to colors. Must include `"."`.    |
| `frames`  | yes      | Array of frame objects. One frame = one sprite.                    |

`pixels`/`ops` may also be put at the top level instead of inside `frames`
when there is only one frame.

## Colors

`palette` values accept:

- `"transparent"`, `"none"`, or `""` → fully transparent
- `"#rgb"` / `"#rgba"` / `"#rrggbb"` / `"#rrggbbaa"`
- `[r, g, b]` or `[r, g, b, a]` with values `0-255`

Keys can be any single character. Recommended convention:

| Key | Meaning              |
| --- | -------------------- |
| `.` | transparent          |
| `#` | outline              |
| letter | base material tone |
| uppercase | highlight / light |
| lowercase variant | shadow / dark |

## Frame fields

| Field    | Required | Description                                     |
| -------- | -------- | ----------------------------------------------- |
| `name`   | no       | Frame name, used in output filenames.           |
| `pixels` | yes      | Array of strings, one per row, `size[0]` wide.  |
| `ops`    | no       | List of operations applied in order after pixels.|

Rows may also be a single newline-separated string.

## Operations

All `color`, `a`, `b`, `from`, `to` fields take a **palette key** (a character).

| Op           | Fields                                   | Effect                                              |
| ------------ | ---------------------------------------- | --------------------------------------------------- |
| `mirror_x`   | -                                        | Mirrors the left half onto the right half.          |
| `mirror_y`   | -                                        | Mirrors the top half onto the bottom half.          |
| `outline`    | `color`                                  | Adds a 4-connected border around non-transparent px.|
| `rect`       | `x`, `y`, `w`, `h`, `color`              | Filled rectangle.                                   |
| `line`       | `x0`, `y0`, `x1`, `y1`, `color`          | Bresenham line.                                     |
| `ellipse`    | `cx`, `cy`, `rx`, `ry`, `color`          | Filled ellipse.                                     |
| `flood_fill` | `x`, `y`, `color`                        | Replaces the connected region at `(x, y)`.          |
| `replace`    | `from`, `to`                             | Replaces every pixel of one key with another.       |
| `shift`      | `dx`, `dy`                               | Translates the whole frame, clipping at edges.      |
| `dither`     | `x`, `y`, `w`, `h`, `a`, `b`, `from?`, `pattern` | Checker or percentage dither between two keys. |

`pattern` is `"checker"` (default) or a number `0-100` for a deterministic
percentage mix (`"pattern": 30`).

## Command

```sh
python .opencode/skills/pixel-art/scripts/render_pixel_art.py spec.json \
  -o out/sprite.png --ascii
```

Useful flags:

- `--scale N` overrides the spec scale.
- `--ascii` prints the final grid (after ops) for visual feedback.
- `--no-1x` skips the `_1x.png` copy.
- `--gif out/anim.gif` also writes an animated GIF (requires Pillow). GIF delay
  is stored in centiseconds, so it tops out around 50 fps.
- `--webp out/anim.webp` writes an animated lossless WebP. Supports 60 fps via
  per-frame durations (16/17 ms alternating).
- `--apng out/anim.png` writes an animated PNG (APNG) at the same rate.
- `--no-frames` writes only the animations, skipping per-frame PNGs and the sheet.
- `--fps N` overrides the GIF/WebP/APNG rate (default: spec `fps`, else `8`).
- `--report report.json` also writes the metrics JSON.

Output files:

- one frame → `sprite.png` (scaled) and `sprite_1x.png`
- multiple frames → `sprite_<name>.png` per frame plus `sprite_sheet.png`

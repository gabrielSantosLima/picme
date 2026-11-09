#!/usr/bin/env python3
"""Render a deterministic pixel-art spec (JSON) to PNG.

The agent never "draws an image"; it writes a spec, this script rasterizes it.
Pillow is used when available, otherwise a dependency-free PNG encoder is used.

Usage:
    python render_pixel_art.py spec.json -o out/sprite.png --ascii
"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import zlib
from pathlib import Path

TRANSPARENT = (0, 0, 0, 0)


# --------------------------------------------------------------------------- #
# Colors
# --------------------------------------------------------------------------- #
def parse_color(value) -> tuple[int, int, int, int]:
    if value is None:
        return TRANSPARENT
    if isinstance(value, (list, tuple)) and len(value) in (3, 4):
        vals = [int(v) for v in value]
        if len(vals) == 3:
            vals.append(255)
        return tuple(vals)  # type: ignore[return-value]
    if not isinstance(value, str):
        raise ValueError(f"invalid color: {value!r}")

    v = value.strip().lower()
    if v in ("", "transparent", "none", "null"):
        return TRANSPARENT
    if v.startswith("#"):
        v = v[1:]
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    if len(v) == 4:
        v = "".join(c * 2 for c in v)
    if len(v) == 6:
        v += "ff"
    if len(v) != 8:
        raise ValueError(f"invalid hex color: {value!r}")
    try:
        r, g, b, a = (int(v[i : i + 2], 16) for i in (0, 2, 4, 6))
    except ValueError as exc:
        raise ValueError(f"invalid hex color: {value!r}") from exc
    return (r, g, b, a)


# --------------------------------------------------------------------------- #
# Grid helpers
# --------------------------------------------------------------------------- #
class Grid:
    def __init__(self, rows: list[str], width: int, height: int):
        if len(rows) != height:
            raise ValueError(
                f"expected {height} rows, got {len(rows)}"
            )
        self.w = width
        self.h = height
        self.cells: list[list[str]] = []
        for y, row in enumerate(rows):
            if len(row) != width:
                raise ValueError(
                    f"row {y} has {len(row)} columns, expected {width}: {row!r}"
                )
            self.cells.append(list(row))

    def get(self, x: int, y: int) -> str:
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.cells[y][x]
        return "."

    def set(self, x: int, y: int, ch: str) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            self.cells[y][x] = ch

    def rows(self) -> list[str]:
        return ["".join(row) for row in self.cells]


def _op_outline(g: Grid, color: str) -> None:
    mask = [[g.cells[y][x] != "." for x in range(g.w)] for y in range(g.h)]
    for y in range(g.h):
        for x in range(g.w):
            if mask[y][x] or g.cells[y][x] == color:
                continue
            if (
                (y > 0 and mask[y - 1][x])
                or (y < g.h - 1 and mask[y + 1][x])
                or (x > 0 and mask[y][x - 1])
                or (x < g.w - 1 and mask[y][x + 1])
            ):
                g.cells[y][x] = color


def _op_mirror_x(g: Grid) -> None:
    for y in range(g.h):
        for x in range(g.w // 2):
            g.cells[y][g.w - 1 - x] = g.cells[y][x]


def _op_mirror_y(g: Grid) -> None:
    for y in range(g.h // 2):
        g.cells[g.h - 1 - y] = list(g.cells[y])


def _op_rect(g: Grid, d: dict) -> None:
    x0, y0 = int(d["x"]), int(d["y"])
    w, h = int(d["w"]), int(d["h"])
    color = d["color"]
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            g.set(x, y, color)


def _op_line(g: Grid, d: dict) -> None:
    x0, y0 = int(d["x0"]), int(d["y0"])
    x1, y1 = int(d["x1"]), int(d["y1"])
    color = d["color"]
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        g.set(x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def _op_ellipse(g: Grid, d: dict) -> None:
    cx, cy = float(d["cx"]), float(d["cy"])
    rx, ry = float(d["rx"]), float(d["ry"])
    color = d["color"]
    if rx <= 0 or ry <= 0:
        return
    for y in range(g.h):
        for x in range(g.w):
            nx = (x + 0.5 - cx) / rx
            ny = (y + 0.5 - cy) / ry
            if nx * nx + ny * ny <= 1.0:
                g.set(x, y, color)


def _op_flood_fill(g: Grid, d: dict) -> None:
    x, y = int(d["x"]), int(d["y"])
    color = d["color"]
    if not (0 <= x < g.w and 0 <= y < g.h):
        return
    target = g.cells[y][x]
    if target == color:
        return
    stack = [(x, y)]
    seen = set()
    while stack:
        cx, cy = stack.pop()
        if (cx, cy) in seen or not (0 <= cx < g.w and 0 <= cy < g.h):
            continue
        if g.cells[cy][cx] != target:
            continue
        seen.add((cx, cy))
        g.cells[cy][cx] = color
        stack.extend(((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)))


def _op_replace(g: Grid, d: dict) -> None:
    old, new = d["from"], d["to"]
    for y in range(g.h):
        for x in range(g.w):
            if g.cells[y][x] == old:
                g.cells[y][x] = new


def _op_shift(g: Grid, d: dict) -> None:
    dx, dy = int(d.get("dx", 0)), int(d.get("dy", 0))
    new = [["." for _ in range(g.w)] for _ in range(g.h)]
    for y in range(g.h):
        for x in range(g.w):
            nx, ny = x + dx, y + dy
            if 0 <= nx < g.w and 0 <= ny < g.h:
                new[ny][nx] = g.cells[y][x]
    g.cells = new


def _op_dither(g: Grid, d: dict) -> None:
    x0, y0 = int(d.get("x", 0)), int(d.get("y", 0))
    w, h = int(d.get("w", g.w)), int(d.get("h", g.h))
    a, b = d["a"], d["b"]
    pattern = d.get("pattern", "checker")
    source = d.get("from")
    for y in range(y0, min(y0 + h, g.h)):
        for x in range(x0, min(x0 + w, g.w)):
            if source is not None and g.cells[y][x] != source:
                continue
            if g.cells[y][x] == ".":
                continue
            if pattern == "checker":
                use_a = (x + y) % 2 == 0
            else:
                pct = float(pattern)
                # deterministic hash, no RNG dependency
                seed = (x * 73856093 ^ y * 19349663) & 0xFFFFFFFF
                use_a = (seed % 100) < pct
            g.cells[y][x] = a if use_a else b


OPS = {
    "outline": lambda g, d: _op_outline(g, d["color"]),
    "mirror_x": lambda g, d: _op_mirror_x(g),
    "mirror_y": lambda g, d: _op_mirror_y(g),
    "rect": _op_rect,
    "line": _op_line,
    "ellipse": _op_ellipse,
    "flood_fill": _op_flood_fill,
    "replace": _op_replace,
    "shift": _op_shift,
    "dither": _op_dither,
}


def build_grid(size, frame: dict, palette: dict) -> Grid:
    w, h = int(size[0]), int(size[1])
    pixels = frame.get("pixels", frame.get("rows"))
    if isinstance(pixels, str):
        pixels = pixels.strip("\n").splitlines()
    if not pixels:
        raise ValueError(f"frame {frame.get('name', '?')!r} has no pixels")
    g = Grid(list(pixels), w, h)

    for op in frame.get("ops", []):
        kind = op.get("op")
        if kind not in OPS:
            raise ValueError(f"unknown op {kind!r}; valid: {sorted(OPS)}")
        OPS[kind](g, op)

    unknown = sorted({ch for row in g.cells for ch in row if ch not in palette})
    if unknown:
        raise ValueError(
            f"characters not in palette: {unknown}; palette has {sorted(palette)}"
        )
    return g


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
def metrics(g: Grid, palette: dict) -> dict:
    counts: dict[str, int] = {}
    solid = []
    for y in range(g.h):
        for x in range(g.w):
            ch = g.cells[y][x]
            counts[ch] = counts.get(ch, 0) + 1
            if ch != ".":
                solid.append((x, y))

    bbox = None
    if solid:
        xs = [p[0] for p in solid]
        ys = [p[1] for p in solid]
        bbox = [min(xs), min(ys), max(xs), max(ys)]

    orphans = 0
    for x, y in solid:
        neighbors = (g.get(x + 1, y), g.get(x - 1, y), g.get(x, y + 1), g.get(x, y - 1))
        if all(n == "." for n in neighbors):
            orphans += 1

    same = 0
    total = 0
    for y in range(g.h):
        for x in range(g.w):
            mirror = g.cells[y][g.w - 1 - x]
            if g.cells[y][x] == mirror:
                same += 1
            total += 1
    symmetry = round(same / total, 4) if total else 0.0

    return {
        "size": [g.w, g.h],
        "bbox": bbox,
        "occupied_pixels": len(solid),
        "occupancy": round(len(solid) / (g.w * g.h), 4) if g.w * g.h else 0.0,
        "colors": len([c for c in counts if c != "."]),
        "pixel_counts": counts,
        "orphan_pixels": orphans,
        "vertical_symmetry": symmetry,
    }


# --------------------------------------------------------------------------- #
# PNG output
# --------------------------------------------------------------------------- #
def grid_to_rgba(g: Grid, palette: dict) -> bytes:
    out = bytearray()
    for y in range(g.h):
        for x in range(g.w):
            out.extend(palette[g.cells[y][x]])
    return bytes(out)


def write_png_pillow(path: Path, g: Grid, palette: dict, scale: int) -> None:
    from PIL import Image  # type: ignore

    img = Image.frombytes("RGBA", (g.w, g.h), grid_to_rgba(g, palette))
    img = img.resize((g.w * scale, g.h * scale), Image.NEAREST)
    img.save(path)


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png_stdlib(path: Path, g: Grid, palette: dict, scale: int) -> None:
    w, h = g.w * scale, g.h * scale
    base = grid_to_rgba(g, palette)
    stride = g.w * 4
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        src = (y // scale) * stride
        row = base[src : src + stride]
        for x in range(w):
            raw.extend(row[(x // scale) * 4 : (x // scale) * 4 + 4])
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def save(path: Path, g: Grid, palette: dict, scale: int) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        write_png_pillow(path, g, palette, scale)  # type: ignore[name-defined]
        return "pillow"
    except ImportError:
        write_png_stdlib(path, g, palette, scale)
        return "stdlib"


def _gif_palette(palette: dict) -> tuple[dict[str, int], list[int]]:
    real = {
        rgba[:3]
        for key, rgba in palette.items()
        if key != "." and rgba[3] >= 128
    }
    placeholder = (1, 2, 3)
    while placeholder in real:
        placeholder = (placeholder[0] + 1, placeholder[1], placeholder[2])

    colors: list[tuple[int, int, int]] = [placeholder]
    index: dict[str, int] = {}
    for key, rgba in palette.items():
        if key == "." or rgba[3] < 128:
            index[key] = 0
            continue
        rgb = rgba[:3]
        if rgb not in colors:
            colors.append(rgb)
        index[key] = colors.index(rgb)
    if len(colors) > 256:
        raise ValueError("palette has more than 256 opaque colors; GIF cannot store it")

    flat: list[int] = []
    for color in colors:
        flat.extend(color)
    flat.extend([0, 0, 0] * (256 - len(colors)))
    return index, flat


def save_gif(
    path: Path,
    grids: list[Grid],
    palette: dict,
    scale: int,
    fps: float,
) -> None:
    try:
        from PIL import Image  # type: ignore
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise RuntimeError("GIF output requires Pillow (pip install pillow)") from exc

    index, flat = _gif_palette(palette)
    frames = []
    for g in grids:
        data = bytes(index[g.cells[y][x]] for y in range(g.h) for x in range(g.w))
        img = Image.frombytes("P", (g.w, g.h), data)
        img.putpalette(flat)
        if scale != 1:
            img = img.resize((g.w * scale, g.h * scale), Image.NEAREST)
        frames.append(img)

    path.parent.mkdir(parents=True, exist_ok=True)
    duration = max(10, int(round(1000.0 / fps))) if fps > 0 else 100
    frames[0].save(
        path,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )


def frame_durations(n: int, fps: float) -> list[int]:
    """Per-frame durations in ms that average exactly to fps.

    Useful for 60 fps, where no integer millisecond duration exists: the
    durations alternate between 16 and 17 ms so the average is 16.667 ms.
    """
    if n <= 0:
        return []
    if fps <= 0:
        return [100] * n
    total = int(round(n * 1000.0 / fps))
    base = total // n
    extra = total - base * n
    durs = [base] * n
    acc = 0
    for i in range(n):
        acc += extra
        if acc >= n:
            durs[i] += 1
            acc -= n
    return durs


def _anim_frames(grids: list[Grid], palette: dict, scale: int):
    try:
        from PIL import Image  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("animated output requires Pillow (pip install pillow)") from exc

    frames = []
    for g in grids:
        img = Image.frombytes("RGBA", (g.w, g.h), grid_to_rgba(g, palette))
        if scale != 1:
            img = img.resize((g.w * scale, g.h * scale), Image.NEAREST)
        frames.append(img)
    return frames


def save_webp(
    path: Path,
    grids: list[Grid],
    palette: dict,
    scale: int,
    fps: float,
) -> None:
    frames = _anim_frames(grids, palette, scale)
    durs = frame_durations(len(frames), fps)
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durs,
        loop=0,
        lossless=True,
        quality=100,
        method=4,
    )


def save_apng(
    path: Path,
    grids: list[Grid],
    palette: dict,
    scale: int,
    fps: float,
) -> None:
    frames = _anim_frames(grids, palette, scale)
    durs = frame_durations(len(frames), fps)
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        format="PNG",
        save_all=True,
        append_images=frames[1:],
        duration=durs,
        loop=0,
        disposal=0,
        blend=0,
    )


def build_sheet(frames: list[Grid], palette: dict) -> Grid:
    w = sum(f.w for f in frames)
    h = max(f.h for f in frames)
    rows = []
    for y in range(h):
        row = ""
        for f in frames:
            row += "".join(f.cells[y]) if y < f.h else "." * f.w
        rows.append(row)
    return Grid(rows, w, h)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description="Render a pixel-art spec JSON to PNG.")
    ap.add_argument("spec", help="path to the spec JSON")
    ap.add_argument("-o", "--out", help="output PNG path (default: <name>.png)")
    ap.add_argument("--scale", type=int, default=None, help="integer upscale factor")
    ap.add_argument("--ascii", action="store_true", help="print ASCII preview")
    ap.add_argument("--no-1x", action="store_true", help="skip the 1x PNG")
    ap.add_argument("--gif", metavar="PATH", help="also write an animated GIF to PATH")
    ap.add_argument("--webp", metavar="PATH", help="also write an animated lossless WebP to PATH")
    ap.add_argument("--apng", metavar="PATH", help="also write an animated APNG to PATH")
    ap.add_argument("--no-frames", action="store_true", help="skip per-frame PNGs and the sheet")
    ap.add_argument("--fps", type=float, default=None, help="animation frames per second")
    ap.add_argument("--report", help="write the JSON report to this path")
    args = ap.parse_args()

    spec_path = Path(args.spec)
    try:
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"error: cannot read spec: {exc}", file=sys.stderr)
        return 2

    palette_raw = spec.get("palette")
    if not isinstance(palette_raw, dict) or not palette_raw:
        print("error: spec.palette must be a non-empty object", file=sys.stderr)
        return 2
    palette = {k: parse_color(v) for k, v in palette_raw.items()}
    if "." not in palette:
        palette["."] = TRANSPARENT

    size = spec.get("size")
    if not size or len(size) != 2:
        print("error: spec.size must be [width, height]", file=sys.stderr)
        return 2

    frames_raw = spec.get("frames")
    if not frames_raw:
        frames_raw = [{"name": spec.get("name", "frame"), "pixels": spec.get("pixels"),
                       "ops": spec.get("ops", [])}]

    scale = args.scale or int(spec.get("scale", 0)) or 12
    scale = max(1, scale)

    base_out = Path(args.out) if args.out else Path(spec.get("name", spec_path.stem) + ".png")
    single = len(frames_raw) == 1

    grids: list[tuple[str, Grid]] = []
    try:
        for i, fr in enumerate(frames_raw):
            name = fr.get("name") or f"frame_{i}"
            grids.append((name, build_grid(size, fr, palette)))
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    report: dict = {"spec": str(spec_path), "scale": scale, "frames": {}, "files": []}

    for name, g in grids:
        if single:
            target = base_out
        else:
            target = base_out.with_name(f"{base_out.stem}_{name}{base_out.suffix or '.png'}")
        if args.no_frames:
            report["frames"][name] = metrics(g, palette)
            report["frames"][name]["renderer"] = "skipped"
            if args.ascii:
                print(f"--- {name} ({g.w}x{g.h}) ---")
                print("\n".join(g.rows()))
            continue
        method = save(target, g, palette, scale)
        report["files"].append(str(target))
        if not args.no_1x:
            raw_target = target.with_name(f"{target.stem}_1x{target.suffix}")
            save(raw_target, g, palette, 1)
            report["files"].append(str(raw_target))
        report["frames"][name] = metrics(g, palette)
        report["frames"][name]["renderer"] = method
        if args.ascii:
            print(f"--- {name} ({g.w}x{g.h}) ---")
            print("\n".join(g.rows()))

    if not single and not args.no_frames:
        sheet = build_sheet([g for _, g in grids], palette)
        sheet_target = base_out.with_name(f"{base_out.stem}_sheet{base_out.suffix or '.png'}")
        save(sheet_target, sheet, palette, scale)
        report["files"].append(str(sheet_target))

    fps = args.fps or float(spec.get("fps", 8) or 8)

    if args.gif:
        try:
            save_gif(Path(args.gif), [g for _, g in grids], palette, scale, fps)
        except (RuntimeError, ValueError) as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        report["gif"] = {"path": str(args.gif), "fps": fps, "scale": scale}
        report["files"].append(str(args.gif))

    for flag, saver, key in (
        (args.webp, save_webp, "webp"),
        (args.apng, save_apng, "apng"),
    ):
        if not flag:
            continue
        try:
            saver(Path(flag), [g for _, g in grids], palette, scale, fps)
        except (RuntimeError, ValueError) as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        report[key] = {"path": str(flag), "fps": fps, "scale": scale}
        report["files"].append(str(flag))

    text = json.dumps(report, indent=2)
    if args.report:
        Path(args.report).write_text(text, encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

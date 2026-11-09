import type { JsonSchema } from '../../entities/agent'

export const PIXEL_SPEC_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Deterministic pixel-art spec: a named palette, character rows and optional ops. Rows are strict: exactly size[1] rows with exactly size[0] characters each.',
  properties: {
    name: { type: 'string', description: 'Optional spec name.' },
    size: {
      type: 'array',
      items: { type: 'number' },
      description: 'Canvas size as [width, height]. Must fit the project canvas.',
    },
    palette: {
      type: 'object',
      additionalProperties: true,
      description:
        'Map of single-character keys to colors. "." is transparent. Values accept "#rgb", "#rgba", "#rrggbb", "#rrggbbaa", [r,g,b], [r,g,b,a], or "transparent". Maximum 16 opaque colors.',
    },
    frames: {
      type: 'array',
      description: 'One or more frames. All frames share the same size and palette.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          pixels: {
            type: 'array',
            items: { type: 'string' },
            description:
              'One string per row. Each character is a palette key; "." or space is transparent.',
          },
          ops: {
            type: 'array',
            description:
              'Ops applied in order: mirror_x, mirror_y, outline {color}, rect {x,y,w,h,color}, line {x0,y0,x1,y1,color}, ellipse {cx,cy,rx,ry,color}, flood_fill {x,y,color}, replace {from,to}, shift {dx,dy}, dither {x,y,w,h,a,b,from?,pattern}. Color fields take palette keys.',
            items: { type: 'object', additionalProperties: true },
          },
          durationMs: { type: 'number', description: 'Per-frame duration in milliseconds.' },
        },
        required: ['pixels'],
      },
    },
    fps: { type: 'number', description: 'Default playback rate for the frames.' },
  },
  required: ['size', 'palette', 'frames'],
}

export const DRAW_TARGET_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Where to apply the frames. "new" inserts frames after the active frame; "replace" flattens the target frame and redraws it; "merge" paints non-transparent pixels over the active layer.',
  properties: {
    mode: {
      type: 'string',
      enum: ['new', 'replace', 'merge'],
      description: 'Application mode. Defaults to "new".',
    },
    frameId: { type: 'string', description: 'Target frame for replace or merge.' },
    frameIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Target frames for replace, aligned 1:1 with spec.frames.',
    },
  },
}

export const PLACEMENT_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Where the sprite sits on the project canvas. Use x/y (top-left) or anchor/offset. Default anchor is "center"; use "bottom-center" for characters.',
  properties: {
    x: { type: 'number', description: 'Top-left x coordinate.' },
    y: { type: 'number', description: 'Top-left y coordinate.' },
    anchor: {
      type: 'string',
      enum: [
        'top-left',
        'top-center',
        'top-right',
        'center-left',
        'center',
        'center-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
    },
    offsetX: { type: 'number' },
    offsetY: { type: 'number' },
  },
}

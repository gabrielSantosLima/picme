import type { JsonSchema } from '../../entities/agent'

export const PIXEL_SPEC_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Deterministic pixel-art spec. Rows are strict: exactly size[1] rows of size[0] characters.',
  properties: {
    name: { type: 'string', description: 'Optional spec name.' },
    size: {
      type: 'array',
      items: { type: 'number' },
      description: '[width, height]; must fit the project canvas.',
    },
    palette: {
      type: 'object',
      additionalProperties: true,
      description:
        'Single-char keys to colors. "." is transparent. Max 16 opaque colors.',
    },
    frames: {
      type: 'array',
      description: 'One or more frames sharing the same size and palette.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          pixels: {
            type: 'array',
            items: { type: 'string' },
            description: 'One string per row; each char is a palette key. "." or space is transparent.',
          },
          ops: {
            type: 'array',
            description:
              'Applied in order: mirror_x, mirror_y, outline {color}, rect {x,y,w,h,color}, line {x0,y0,x1,y1,color}, ellipse {cx,cy,rx,ry,color}, flood_fill {x,y,color}, replace {from,to}, shift {dx,dy}, dither {x,y,w,h,a,b,from?,pattern}. Color fields take palette keys.',
            items: { type: 'object', additionalProperties: true },
          },
          durationMs: { type: 'number', description: 'Per-frame duration in milliseconds.' },
        },
        required: ['pixels'],
      },
    },
    fps: { type: 'number', description: 'Default playback rate.' },
  },
  required: ['size', 'palette', 'frames'],
}

export const DRAW_TARGET_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Where to apply frames. "new" inserts; "replace" flattens and redraws; "merge" paints non-transparent pixels.',
  properties: {
    mode: {
      type: 'string',
      enum: ['new', 'replace', 'merge'],
      description: 'Defaults to "new".',
    },
    frameId: { type: 'string', description: 'Target frame for replace or merge.' },
    frameIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Replace targets, aligned 1:1 with spec.frames.',
    },
  },
}

export const PLACEMENT_SCHEMA: JsonSchema = {
  type: 'object',
  description:
    'Canvas placement: x/y (top-left) or anchor/offset. Default "center"; characters use "bottom-center".',
  properties: {
    x: { type: 'number', description: 'Top-left x.' },
    y: { type: 'number', description: 'Top-left y.' },
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

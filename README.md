<div align="center">

<img src="public/favicon.png" alt="PicMe" width="200" />

# PicMe

An agent-guided animated pixel art editor that runs entirely in the browser.

[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://gabrielSantosLima.github.io/picme/)
[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/picme?label=release)](https://github.com/gabrielSantosLima/picme/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md)

</div>

PicMe combines a manual pixel-art editor with an AI agent that can discuss the
design, propose variants and paint the canvas. It is built with React,
TypeScript, Vite and Tailwind CSS, and has no backend: the document, provider
settings and API keys stay in the browser.

## Key features

- **Manual pixel editor** — pencil, eraser, fill, line, rectangle, ellipse,
  eyedropper, selections, layers, grid toggle, zoom and undo/redo.
- **Frames and animation** — timeline playback, frame duplication and
  per-frame duration.
- **Agent-guided drawing** — the agent asks questions, suggests ideas, proposes
  variants and draws through a deterministic PixelSpec renderer.
- **Live agent feedback** — streaming reasoning, collapsible activity groups and
  a compact-session command.
- **Bring your own provider** — DeepInfra, OpenAI, Gemini, Anthropic and custom
  OpenAI-compatible endpoints.
- **Export** — animated GIF, sprite sheet and individual PNG frames.
- **100% client-side** — deployable as a static site to GitHub Pages.

## Getting started

### Requirements

- Node.js 22+ and npm. The Pages workflow uses Node.js 22.
- A modern browser with Canvas, IndexedDB and Web Crypto support.
- An API key for a supported LLM provider to use the agent.

### Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

### Production build

```bash
npm run build
npm run preview
```

For the GitHub Pages build, use `npm run build:pages`.

## Usage

- **Draw**: pick a tool in the toolbar and paint on the canvas. Use the selection
  tools for copy, paste, fill and delete operations.
- **Animate**: add or duplicate frames in the timeline, adjust the duration and
  press play to preview the animation.
- **Use the agent**: open the Agent panel, configure a provider and model, then
  describe what you want. The agent can ask questions and show options before
  drawing.
- **Compact a session**: type `/compact` in the agent input to summarize the
  conversation and resend your last prompt with a smaller context.
- **Export**: choose GIF, sprite sheet or individual PNG frames from the export
  dialog.
- **Providers**: open the provider settings from the agent composer. API keys are
  stored in IndexedDB and encrypted with the Web Crypto API.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

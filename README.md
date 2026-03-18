# Film Reprocess

Browser-based film scan post-processing workstation designed for static hosting on GitHub Pages.

## Implemented scope

- Local image import from files or folders
- Project-based editing with local persistence
- Single and batch metadata editing
- Map-based location picking with Leaflet and OpenStreetMap
- Half-frame auto split with manual crop correction and per-side rotation
- Negative inversion, mask removal, basic color controls, histogram, and curve editor
- Batch export to ZIP or directly to a chosen folder when supported
- Chinese and English UI
- Responsive layout for desktop, tablet, and phone

## Tech stack

- React + TypeScript + Vite
- Hash router for GitHub Pages compatibility
- Zustand for application state
- Dexie / IndexedDB for project persistence
- Web Worker + OffscreenCanvas processing pipeline
- Leaflet + OpenStreetMap for map interaction
- JSZip for archive export
- Vitest for unit tests

## Development

```bash
pnpm install --store-dir .pnpm-store
pnpm dev
```

## Build

```bash
pnpm build
```

## Test

```bash
pnpm test
```

## Notes

- Chromium browsers provide the best experience because they support directory handles and direct folder export.
- Plain file imports are session-based by default. Project structure and thumbnails persist locally; original files are not copied into IndexedDB.
- GitHub Pages deployment is configured under `.github/workflows/deploy-pages.yml`.

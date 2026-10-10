🧪 Image Style Playground (Spec v0.1)

Purpose

A simple local-first web app for visually experimenting with image filters and overlays. Designed to quickly prototype and tune sci-fi/Brutalist aesthetics—not a photo editor.

⸻

🧱 Stack
	•	Bundler: Vite
	•	Framework: React + TypeScript
	•	UI: shadcn/ui w/ Tailwind CSS
	•	Component CLI: shadcn MCP (for page/layout/component scaffolding)
	•	Routing: React Router (minimal)
	•	State: Local state (via hooks or optional MobX/Zustand if needed later)

⸻

🖼️ Core Feature: Image Grid Playground

Image Input
	•	Drag-and-drop area or upload button
	•	Render images into a responsive grid
	•	Max ~6 images per session (no persistence for now)

Filter Controls

For each image:
	•	✅ Scanlines (toggle; maybe slider for thickness/spacing)
	•	✅ Saturation (slider: 0–100%)
	•	✅ Dithering (toggle or dropdown: Atkinson, Bayer)
	•	✅ Contrast (slider)
	•	✅ Brightness (slider)
	•	✅ Grain/Noise (toggle, range)
	•	✅ Pixelation (slider, large steps)
	•	✅ Bloom/Glow (toggle; optional glow color?)
	•	✅ CRT Curvature Overlay (toggle)
	•	✅ Blend Mode (dropdown: multiply, screen, overlay, etc.)
	•	✅ Color Matrix Effects (dropdown presets: green tint, blue-shadow, sepia bleed, etc.)

All effects apply via CSS filters, SVG, canvas, or shaders (e.g. scanline SVG overlay or WebGL shaders—use placeholder effects first).

⸻

🎨 Visual Style Guide
	•	Aesthetic: Brutalist, terminal-like, sci-fi edge
	•	Color: Monochrome base (dark), 1–2 neon-ish accents (e.g. cyan, magenta)
	•	Font: Orbitron, monospace fallback
	•	Components: Minimalist, bordered, grid-aligned (use shadcn/ui)
	•	Layout: App shell w/ sidebar (optional), main grid, and toggle control panel
	•	Motion: Subtle (if any). Avoid bloated transitions.

⸻

📂 Suggested Folder Structure (MVP)
src/
  components/
    ImageGrid.tsx
    FilterPanel.tsx
    ScanlineOverlay.tsx
  lib/
    filters.ts         // util fns or canvas helpers
  pages/
    Home.tsx
  app/
    layout.tsx         // if using MCP layout system
  styles/
    globals.css
  App.tsx
  main.tsx
  routes.tsx           // if routing needed later


  🧪 MVP UX Flow
	1.	Land on homepage
	2.	Upload or drop images
	3.	Grid renders thumbnails
	4.	Panel offers toggles/sliders per effect (global or per-image)
	5.	Preview updates live
	6.	Optionally export/save result (out of scope for MVP)

⸻

🧰 Setup Instructions
	1.	Init project:
npm create vite image-playground --template react-ts
cd image-playground
npm install


npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init
npx shadcn-ui@latest add button toggle slider dropdown-menu


	4.	Add font:
	•	Orbitron via Google Fonts or locally in public/

⸻

Let me know if you want:
	•	a starter repo
	•	initial component code (e.g. scanline overlay, dithering toggle)
	•	or a Storybook-style UI playground scaffolding for filters only

## Current implementation and hosting

The specification above describes the intended playground. The current app filters an original bundled SVG sample; Gallery and Settings remain placeholders. The ignored local photographs are not required or published.

Use Node 22.12+:

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm run preview
```

The production build uses relative assets and hash routes so it works at a GitHub Pages repository subpath and reloads without server rewrites. Vite does not copy `public/`; add intentional assets via source imports. The build then packages Vite’s single entry and CSS into `dist/index.html`, with classic JavaScript after the React root. Open it directly from disk or serve it over HTTP. The packager fails if future module splitting or extra assets require a different bundling approach.

Sample provenance: `src/assets/sample.svg` is original procedural vector artwork created for this collection. Unused React/Vite starter logos were removed before the fresh snapshot; Google Fonts are referenced remotely. Dependency sources and versions are recorded in the package manifest and lockfile.

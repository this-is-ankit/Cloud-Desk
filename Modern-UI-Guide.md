# Cloud Desk Modern UI Guide

This file is the single source of truth for the current modern UI system in Cloud Desk.
If you read this once, you should be able to continue UI work without hunting across files.

## 1) UI Direction

The current UI is intentionally:

- Monochrome-first (white/black system)
- Minimal and high-contrast
- Boxy and compact (especially controls)
- Consistent across Home, Dashboard, Problems, Problem Workspace, and Session pages

## 2) Tech Stack (Frontend UI)

- React + Vite
- Tailwind CSS v4
- daisyUI (custom themes only)
- Modern icons via Iconify (wrapped in local icon components)
- Stream SDK (video/chat) with app theme overrides
- Monaco + Excalidraw theme-aware integration

## 3) Core UI Files (Read These First)

- Theme + global styles: `frontend/src/index.css`
- Theme runtime/provider: `frontend/src/context/ThemeProvider.jsx`
- App bootstrap theme wiring: `frontend/src/main.jsx`
- Global nav shell: `frontend/src/components/Navbar.jsx`
- Theme switch UI: `frontend/src/components/ThemeToggle.jsx`
- Icon system wrapper: `frontend/src/components/icons/ModernIcons.jsx`
- Home page: `frontend/src/pages/HomePage.jsx`
- Session page: `frontend/src/pages/SessionPage.jsx`
- Host tools control surface: `frontend/src/components/HostToolsPopover.jsx`
- Stream overrides: `frontend/src/styles/stream-overrides.css`

## 4) Theme Architecture

All theme behavior is centralized.

### 4.1 Active themes

Defined in `frontend/src/index.css`:

- `cloud-light`
- `cloud-dark`

### 4.2 Theme provider behavior

`frontend/src/context/ThemeProvider.jsx` handles:

- Mode: `light | dark | system`
- Persistence in `localStorage`
- Setting `<html data-theme="...">`
- `color-scheme` sync

### 4.3 Color token model

Both daisy tokens and custom CSS vars exist in `frontend/src/index.css`:

- Daisy tokens: `--color-base-*`, `--color-primary`, etc.
- App tokens: `--bg-*`, `--text-*`, `--primary`, `--border`, `--surface-glass`

If you need to change brand look, start from those tokens only.

## 5) How Colors Work Now

Current system is monochrome:

- Light mode: white surfaces, black actions/text
- Dark mode: black surfaces, white actions/text

Foregrounds on colored surfaces should always use semantic content tokens:

- Use `text-primary-content` on `bg-primary`
- Avoid hardcoded `text-white` for primary surfaces

This prevents dark-mode regressions (white-on-white / black-on-black).

## 6) Button System (Important)

Buttons are globally standardized in `frontend/src/index.css` under `@layer components .btn`:

- Boxy corners (small radius)
- Compact height
- Uppercase, medium-bold text
- Minimal shadow

### Rules

- Prefer daisy classes (`btn`, `btn-primary`, `btn-outline`, `btn-ghost`)
- Avoid one-off rounded CTA styles unless explicitly needed
- In Home page, keep buttons small and boxy (`btn-xs` / `btn-sm`, `rounded-none`)

## 7) Icon System

Do not import icon libraries directly in page/component files.

Use:

- `frontend/src/components/icons/ModernIcons.jsx`

This wrapper ensures:

- Consistent style family (Iconify/Phosphor set)
- Centered icon rendering
- Easy future swap of icon library

If you need a new icon:

1. Add export in `ModernIcons.jsx`
2. Use that export in component/page

## 8) Home Page UI Rules

File: `frontend/src/pages/HomePage.jsx`

- Keep hero controls compact and boxy
- Keep monochrome visual language
- Primary action should remain visually stronger than secondary action
- No soft pill-style CTA buttons

## 9) Session Page UI Rules

Files:

- `frontend/src/pages/SessionPage.jsx`
- `frontend/src/components/HostToolsPopover.jsx`

Current pattern:

- Host actions are grouped under one `Host Tools` control
- Active toggle states use emphasized variant
- Inactive toggle states use neutral variant

Do not re-spread host controls into many separate header buttons.

## 10) Stream / Monaco / Whiteboard Theming

### Stream

- Overrides in `frontend/src/styles/stream-overrides.css`
- Keep colors tied to app vars, not hardcoded values

### Monaco

- `frontend/src/components/CodeEditorPanel.jsx`
- Uses theme-aware editor mode (`vs` / `vs-dark`)

### Excalidraw

- `frontend/src/components/WhiteboardPanel.jsx`
- Theme-aware with light/dark app state

## 11) Accessibility Baseline

Maintained globally in `frontend/src/index.css`:

- Focus-visible outlines
- Minimum tap/click target sizing
- Reduced-motion fallback

When adding UI, do not remove these protections.

## 12) Common UI Tasks

### Change all app colors

Edit only:

- `frontend/src/index.css` theme token blocks

### Add a new button style variant

Prefer semantic daisy variants first. If global, add in:

- `frontend/src/index.css` (`@layer components`)

### Add a new icon

- Add mapping in `frontend/src/components/icons/ModernIcons.jsx`

### Add a theme toggle somewhere else

- Reuse `frontend/src/components/ThemeToggle.jsx`

## 13) What To Avoid

- Hardcoded `text-white` on `bg-primary`
- New gradients unless explicitly requested
- Reintroducing overly rounded/pill buttons
- Direct icon library imports bypassing `ModernIcons.jsx`
- Page-specific one-off theme logic

## 14) QA Checklist Before Merging UI Changes

1. Light mode check
2. Dark mode check
3. Button/text contrast check
4. Icon alignment check
5. Home page CTA consistency check
6. Session host controls behavior check
7. `npm run lint` in `frontend/`
8. `npm run build` in `frontend/`

## 15) Quick Start for Any New UI Contributor

1. Read this file fully.
2. Open `frontend/src/index.css` and understand theme + button layers.
3. Open `frontend/src/components/icons/ModernIcons.jsx` to follow icon pattern.
4. Run app: `npm run dev` inside `frontend/`.
5. Make UI updates using existing semantic classes.
6. Validate with lint/build.

---

If this guide and implementation diverge in the future, update this file in the same PR as the UI change.

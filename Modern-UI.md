# Cloud Desk Modern UI Blueprint (Light + Dark)

## 1) Vision
Cloud Desk should feel like a **premium collaboration studio** instead of a generic dashboard.
The UI must be:
- Clean and modern
- Fast to scan during interviews/classes
- Comfortable for long sessions (light and dark)
- Consistent across video, code, whiteboard, quiz, and chat

**Creative direction name:** `Studio Grid`

Core style:
- Crisp editorial typography + technical monospace accents
- Soft glass/blur surfaces over gradient backgrounds
- Strong visual hierarchy with fewer but clearer actions
- Motion that explains state transitions (not decorative noise)

---

## 2) Current UI Audit (from existing codebase)

### Existing pages/routes
- `/` Home (`frontend/src/pages/HomePage.jsx`)
- `/dashboard` Dashboard (`frontend/src/pages/DashboardPage.jsx`)
- `/problems` Problems list (`frontend/src/pages/ProblemsPage.jsx`)
- `/problem/:id` Problem workspace (`frontend/src/pages/ProblemPage.jsx`)
- `/session/:id` Live collaboration session (`frontend/src/pages/SessionPage.jsx`)

### Main UI observations
- Visual language is inconsistent between Home, Dashboard, and Session surfaces.
- Theme strategy currently relies on daisyUI defaults (`frontend/src/index.css` has `themes: all`), which can produce inconsistent look and poor brand identity.
- Session page is feature-rich but dense; controls compete visually (anti-cheat, code, board, writers, kick, end).
- Home page looks marketing-first while app pages feel utility-first; transition between both is abrupt.
- Code, video, whiteboard, and quiz are all present but lack a unifying “information architecture shell”.
- Chat/video surfaces still use vendor default look; should be skinned to match product identity.

---

## 3) Web Research Summary (patterns to adopt)

### Design system and theme guidance
- Tailwind dark mode + `color-scheme` utilities:
  - https://tailwindcss.com/docs/color-scheme
- daisyUI theme architecture (`light --default`, `dark --prefersdark`, custom themes):
  - https://daisyui.com/docs/themes/
  - https://daisyui.com/docs/config/
- WCAG 2.2 distinguishable / contrast requirements:
  - https://www.w3.org/WAI/WCAG22/Understanding/distinguishable.html

### Collaboration product patterns
- FigJam collaboration and whiteboard experience benchmarks:
  - https://www.figma.com/figjam/
  - https://www.figma.com/figjam/online-whiteboard/
- Miro collaboration and facilitation feature patterns:
  - https://miro.com/whiteboard/
  - https://miro.com/live-embed/
  - https://miro.com/aura/
- Miro design language evolution (readability, palette, consistency):
  - https://miro.com/blog/introducing-aura/

### SDK theming references used in this plan
- Stream Video theming best practices:
  - https://getstream.io/video/docs/react/ui-components/video-theme/
- Stream Chat theming v2 and dark/light support:
  - https://getstream.io/chat/docs/sdk/react/theming/themingv2/

### Practical Figma/template references (for rapid execution)
- Figma dashboard template collection:
  - https://www.figma.com/templates/dashboard-designs/
- Figma UI kit workflow docs:
  - https://help.figma.com/hc/en-us/articles/24037724065943-Start-designing-with-UI-kits
- Example inspiration shots:
  - https://dribbble.com/shots/26294998-Collaborative-Whiteboard-Dashboard-Clean-Minimal-UI
  - https://dribbble.com/shots/26119075-Whiteboard-Koala-UI
  - https://www.behance.net/gallery/219746415/Modern-UIUX-Video-Conference-Dashboard

---

## 4) New Visual System (Light + Dark)

## 4.1 Typography
Avoid default safe stack feel.

Proposed pair:
- Display / headings: `Space Grotesk`
- UI body: `Plus Jakarta Sans`
- Code + IDs: `JetBrains Mono`

Scale:
- H1: 44/52
- H2: 32/40
- H3: 24/32
- Body L: 18/28
- Body: 15/24
- Caption: 13/18

## 4.2 Layout grid
- Desktop: 12-column, max width 1320px
- Tablet: 8-column
- Mobile: 4-column
- Base spacing: 4, 8, 12, 16, 24, 32, 48, 64

## 4.3 Shape system
- Card radius: 18px
- Input radius: 12px
- Button radius: 12px
- High emphasis shadow: 0 20px 60px rgba(0,0,0,.22)

## 4.4 Theme tokens
Define tokens once, apply to all pages/components.

```css
:root[data-theme="cloud-light"] {
  --bg-0: #f6f8fc;
  --bg-1: #ffffff;
  --bg-2: #edf1f8;
  --text-1: #111827;
  --text-2: #4b5563;
  --text-3: #6b7280;
  --primary: #2457ff;
  --secondary: #0ea5a4;
  --accent: #ff7a18;
  --success: #14b86a;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #dbe2ee;
  --surface-glass: rgba(255,255,255,.72);
}

:root[data-theme="cloud-dark"] {
  --bg-0: #0b1220;
  --bg-1: #111a2b;
  --bg-2: #18243a;
  --text-1: #eef2ff;
  --text-2: #b8c2d9;
  --text-3: #8c98b4;
  --primary: #6d8bff;
  --secondary: #35d0c2;
  --accent: #ff9c5c;
  --success: #33d17a;
  --warning: #ffbf47;
  --danger: #ff6b6b;
  --border: #26324b;
  --surface-glass: rgba(17,26,43,.62);
}
```

Theme behavior:
- `System` (default), `Light`, `Dark`
- Persist in `localStorage`
- Set `<html class="scheme-light dark:scheme-dark">` and sync with token theme

## 4.5 Motion language
- 150ms: hovers, icon transitions
- 220ms: card entrances and panel transitions
- 280ms: modal/panel open
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Respect `prefers-reduced-motion`

---

## 5) Shared App Shell Redesign

## 5.1 Navbar (all authenticated pages)
- Left: product mark + environment badge (`Interview mode` / `Practice mode`)
- Center: contextual page title
- Right: global search (optional), notifications, theme toggle, profile
- Sticky with translucent background + border blur

## 5.2 Reusable components
- `AppShell`
- `ThemeToggle`
- `CommandPalette` (Ctrl/Cmd + K)
- `StatCard` (three density variants)
- `PanelCard` (header/body/footer slots)
- `SectionToolbar`
- `EmptyState`
- `Skeleton*`

## 5.3 Feedback states
- Unified toasts (success/warn/error/info)
- Inline banners for session-critical errors
- Explicit loading skeletons for all key data fetch points

---

## 6) Page-by-Page Enhancement Plan (All pages)

## 6.1 Home (`/`)
Goal: premium landing, no generic hero.

New sections:
- Hero with animated collaboration canvas preview (code + call + whiteboard tiles)
- “How it works in 3 steps” timeline
- Feature matrix (Interview, Class, Pair Programming)
- Social proof strip + quick metrics
- CTA pair: `Start Free`, `Watch 90s walkthrough`

Style updates:
- Replace current stock gradient with layered radial mesh + subtle grain
- Stronger typography and clearer CTA hierarchy

## 6.2 Dashboard (`/dashboard`)
Goal: command center.

Structure:
- Top summary row (Active sessions, Avg duration, Recent completions)
- Primary action row (`Create Session`, `Join by Code`)
- Two-column body:
  - Left: Live sessions table/cards with filters
  - Right: Activity feed / quick tips / upcoming schedule
- Past sessions as timeline cards with session outcome badges

Enhancements:
- Session cards include role, language icon, occupancy bar, status chip
- Better sorting and compact/comfortable density switch

## 6.3 Problems list (`/problems`)
Goal: curated library, fast scanning.

Additions:
- Search, difficulty chips, category filters
- Sort: `Recommended`, `Difficulty`, `Recently practiced`
- Problem card: title, category, difficulty, estimated time, completion marker

Visual:
- Remove repetitive card style, use cleaner list-row hybrid with optional card mode

## 6.4 Problem workspace (`/problem/:id`)
Goal: focused single-player coding studio.

New layout:
- Left: sticky problem navigator + sections (Description/Examples/Constraints)
- Right: editor + output with top action bar
- Top bar: run, reset, format, language, test status

Quality additions:
- Output tabs (`stdout`, `stderr`, `tests`)
- Test summary chips and pass/fail counters
- Optional “Zen mode” to hide description panel

## 6.5 Session page (`/session/:id`) - most important
Goal: premium collaborative classroom/interview cockpit.

### New information architecture
- Header row: session metadata, participants, quick controls
- Main area with adaptive panes:
  - Video pane
  - Code pane
  - Whiteboard pane
  - Quiz drawer
- Right side utility drawer for chat + participant controls

### Whiteboard UX
- Clear mode badges: `Host writes`, `Approved writers`, `Everyone writes`
- Writer permissions in a dedicated modal/drawer (not crowded in header)
- Participant state indicator: `View only` pill near whiteboard title

### Control simplification
Group host controls into a single `Host Tools` popover:
- Anti-cheat
- Code space visibility
- Whiteboard visibility + permissions
- Quiz controls
- Kick participants

### Video/Chat skinning
- Apply Stream theme with custom CSS variables matching app tokens
- Align chat bubble, sidebar and message input style with app system

### Session-specific quality improvements
- Real-time status indicators (connection, sync health, write access)
- Non-blocking banners for permission changes
- Better empty/loading states while stream initializes

---

## 7) Dark/Light Theme Architecture

Implementation strategy:
1. Restrict daisyUI to two custom themes only (`cloud-light`, `cloud-dark`) instead of `all`.
2. Define theme tokens in `frontend/src/index.css`.
3. Add `ThemeProvider` (context + localStorage + system sync).
4. Add global toggle in Navbar and optional quick-switch in command palette.
5. Apply theme-aware overrides for:
   - Stream Video components
   - Stream Chat components
   - Monaco theme (`vs` / `vs-dark` + custom token mapping)
   - Excalidraw (`theme` prop based on current theme)

Recommended file touch points:
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/VideoCallUI.jsx`
- `frontend/src/components/CodeEditorPanel.jsx`
- `frontend/src/components/WhiteboardPanel.jsx`

---

## 8) Accessibility & UX Standards (mandatory)
- Meet WCAG contrast baseline for text and UI boundaries.
- Keyboard access for all actions, including session host controls.
- Focus-visible ring on every interactive control.
- Minimum tap target 40px.
- Reduced motion support.
- Semantic headings and labels for forms/selects.

---

## 9) Implementation Roadmap (Execution Order)

## Phase A - Foundation (2-3 days)
- Token system + theme provider
- New typography + spacing + base surfaces
- Navbar + shell unification

## Phase B - Core Pages (3-4 days)
- Home redesign
- Dashboard redesign
- Problems + Problem workspace redesign

## Phase C - Session Experience (4-6 days)
- New session layout
- Host tools consolidation
- Whiteboard permission UI polish
- Stream/Monaco/Excalidraw theming integration

## Phase D - Polish + QA (2-3 days)
- Motion, empty states, skeletons
- Responsive pass (mobile/tablet/desktop)
- Accessibility and contrast pass
- Final visual consistency sweep

---

## 10) Figma File Structure (what to build)
Create one master design file with pages:
1. `00 Foundations` (tokens, type, spacing, iconography)
2. `01 Components` (buttons, inputs, cards, navs, tables, modals)
3. `02 Templates` (shells and page frames)
4. `03 Screens` (all route states)
5. `04 Prototypes` (interaction flows)

Required screen states per page:
- Default
- Loading
- Empty
- Error
- Dark theme variant

---

## 11) Visual Inspiration Links (for final look)

### Figma / product references
- Figma dashboard templates collection:
  - https://www.figma.com/templates/dashboard-designs/
- FigJam product visual style:
  - https://www.figma.com/figjam/
- FigJam whiteboard interaction patterns:
  - https://www.figma.com/figjam/online-whiteboard/
- Figma UI kit workflow docs:
  - https://help.figma.com/hc/en-us/articles/24037724065943-Start-designing-with-UI-kits

### Collaboration UX references
- Miro whiteboard product page:
  - https://miro.com/whiteboard/
- Miro live embed patterns:
  - https://miro.com/live-embed/
- Miro Aura visual language:
  - https://miro.com/aura/

### Style-shot references (mood)
- Dribbble collaborative whiteboard dashboard:
  - https://dribbble.com/shots/26294998-Collaborative-Whiteboard-Dashboard-Clean-Minimal-UI
- Dribbble whiteboard UI concept:
  - https://dribbble.com/shots/26119075-Whiteboard-Koala-UI
- Behance video conference dashboard concept:
  - https://www.behance.net/gallery/219746415/Modern-UIUX-Video-Conference-Dashboard

---

## 12) Definition of Done (UI Revamp)
The redesign is complete only when:
- Every route (`/`, `/dashboard`, `/problems`, `/problem/:id`, `/session/:id`) is redesigned and theme-ready.
- Both light and dark themes are consistent and production-usable.
- Session page controls are decluttered and easier for host/classroom flow.
- Whiteboard permission UI is obvious and discoverable.
- Stream chat/video and editor/whiteboard visually match product language.
- Accessibility checks pass for contrast, focus, keyboard flow, and reduced motion.

---

## 13) Optional Creative Enhancements (if time permits)
- Subtle animated gradient “presence” background tied to session activity.
- Personalized dashboards (role-based: interviewer/teacher/student).
- “Session replay timeline” UI for reviewing key events (code run, whiteboard edits, quiz rounds).
- Focus mode preset profiles: `Interview`, `Teaching`, `Pairing`.


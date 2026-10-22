# Security Lab · Project Glasswing UX audit

**Author and theory:** Patrik Sundblom  
**Research & development support:** OpenAI / ChatGPT  
**Audited:** 2026-10-22  
**Release candidate:** 1.27.0  
**Scope:** visual shell, menu, lab dialog, intro/refresh, reports and PDF discovery. No inference-engine, oracle or case-storage changes.

## Five real-world visual findings

Four screenshots submitted by the author supplied the acceptance cases:

1. **Mobile menu appears oversized and complicated.** The entire analysis list is displayed inside an already long drawer, and the header block 'Perspectives & lab' looks like a differently designed screen. Root causes: duplicate navigation priorities, large mobile link sizes and nested open sections.
2. **Dimensional lab is visually a separate Q-star product.** Its logo, modal dimensions, palette and 1/0/? controls don't use the same shell geometry as Glasswing Security Lab.
3. **Blank upper-right mobile buttons.** Inherited legacy CSS hides `.plain-button > .icon` below 1024px while the newer consumer CSS hides the same buttons' labels below 950px. There is literally nothing left visible inside those controls.
4. **Reports look cut off by the bottom navigation.** Fixed bottom navigation is layered over content with inconsistent padding, while the report view is dense and visually independent of the system-guide PDF.
5. **The eagle intro is replayed during routine return visits.** Film controller automatically plays on every page load without respecting session state and deep-link navigation; the HTML element's `autoplay` attribute can start playback before the controller decides to skip.

## Underlying structural CSS defect

`glasswing-screen-v125.css` ended with `body.glasswing-visual #app .app-body { width:calc(100% - 242px); }`. A late mobile correction reset this **only at 820px**. At viewport widths from **821px to 1024px**, the actual sidebar is hidden but the full page remains 242px too narrow. This can look like a broken split-screen or cards floating behind the drawer.

The new final `glasswing-unified-shell-v127.css` defines one authority for product tokens and breakpoints. Desktop uses 242px at >1190px, 215px between 1025 and 1190px, and 0px at <=1024px. The mobile drawer remains its own finite-width overlay, with the page at a full 100%.

## Navigation and UX contract

- **Desktop:** permanent sidebar and a single topbar; no fixed bottom bar.
- **Mobile / Fold / tablet:** compact topbar with real Settings icon; an accessible overlay drawer opened from the hamburger; four fixed bottom shortcuts (Home / My cases / Investigate / Report) with reserved safe-area padding. The drawer is never a second intro page.
- **Primary order:** Home, My investigations, Worked examples, current system, five-step investigation, Results, Reports & PDF.
- **Advanced exploration:** one collapsible Explore & learn section (system facts, security perspectives, method comparison, dimensional/quantum workbench, plain-English guide).
- **Exports:** one case report, one case-independent System Guide in the Reports view. Do not repeat instant downloads in the navigation header.
- **Modal workbench:** Glasswing eagle mark and the same midnight-blue/cyan design; Back to lab always returns to the same investigation.

## Intro/update lifecycle

- First landing in a session: cinematic may play for up to 4.8 seconds and can be skipped.
- Deep links, refreshes, settings links, reduced-motion visitors and subsequent opens in the same session: enter the real app directly.
- User explicitly selects Watch intro: replay is allowed and remains dismissible.
- No duplicate green refresh landing pages and no automatic intro after service-worker updates.
- All in-app SW/cache operations have timeouts; failures offer an independent recovery page and do not clear saved cases, IndexedDB, settings or evidence.
- The cache key and loaded JS/CSS version all use app version 1.27.0.

## What is tested

CI:
- QCDS engine and existing security-lab regression tests.
- Source-level responsive CSS contracts for desktop, 821–1024px and mobile.
- Header icon never hidden together with its label; one Reports action.
- Intro controller first-session/deep-link/refresh/manual-replay behavior.
- Web and PWA release versions remain aligned; offline cache includes the final visual CSS.
- No inference engine or saved-case migration.

## Required final browser acceptance

Static assertions cannot establish visually perfect pages. Release QA should open the **actual deployed** URL and inspect at CSS viewports 360, 390, 768, 880, 1024 and 1440, portrait and landscape when available. The author’s four screenshots are the baseline. Test scroll positions at Reports, drawer open/closed, settings update, PDF generation and the dimensional dialog. Look explicitly for horizontal scroll, obscured content, truncated buttons, multiple palettes and unexpected intro replay.

**Do not claim complete visual QA until a real browser render has been inspected.**

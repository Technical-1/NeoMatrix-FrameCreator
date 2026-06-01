# Home / About Page — Design

**Date:** 2026-05-31
**Author:** Jacob Kanfer (Technical-1)
**Status:** Approved (pending spec review)

## Goal

Add a home/about landing page that tells the origin story of NeoMatrix Frame
Creator — built for senior design at the University of Florida (CEN4907C), where
the team programmed a Rust microprocessor that detected which of four directions
it was being leaned, and the author wanted to play LED-matrix animations without
hand-writing pixel coordinates. The landing page sets up that narrative and then
hands the visitor off to the existing editor ("dashboard").

This adds story/portfolio value to a project that currently drops visitors
straight into the tool with no context.

## Decisions (from brainstorming)

- **Structure:** a separate `about.html`-style landing page (its own URL), not an
  in-page overlay. The story becomes the **root** URL; the editor moves to its
  own page.
- **Landing behavior:** show the story on **first visit only**. Returning
  visitors are redirected straight to the editor. The story remains reachable on
  demand.

## Architecture & files

The editor's application code (`script.js`, `lib.js`, `style.css` editor rules)
is **unchanged in behavior** — only the HTML file it loads from is renamed.

| File | Before | After |
|------|--------|-------|
| `index.html` | the editor | **the home/about page** (new content) |
| `app.html` | — | the editor (current `index.html`, renamed verbatim) |
| `style.css` | editor styles | editor styles **+** a new `home-*` section |
| `script.js` | editor logic | unchanged (loaded by `app.html`) |
| `lib.js` | pure logic | **+** `shouldRedirectHome()` helper (testable) |

### Meta tags

The current `index.html` has SEO/OG/Twitter/canonical meta describing the
*editor*. On the split:

- `index.html` (home): story-focused `<title>`/`og:title`/`description`, canonical
  pointing at the site root.
- `app.html` (editor): keeps the editor-focused meta, canonical pointing at
  `app.html`.

The shared `og-image.png` and favicons are referenced by both.

## First-visit routing

The only routing primitives available (zero-build static site on GitHub Pages)
are which file is `index.html` and a small inline redirect script. There is no
server to branch on, so the story is made the root and *returning* visitors are
redirected to the editor.

### Redirect logic (pure, in `lib.js`)

```js
// shouldRedirectHome(hasVisited, search) -> boolean
// hasVisited: truthy if localStorage flag 'neomatrix-visited' is set
// search:     window.location.search (e.g. "?home=1")
// Returns true when the visitor should be sent straight to the editor.
function shouldRedirectHome(hasVisited, search) {
  return Boolean(hasVisited) && !String(search || '').includes('home');
}
```

### Inline script in `<head>` of `index.html`

Runs before render, so there is no flash of the story for returning visitors.
`lib.js` exposes its functions as **bare `window` globals** (it does
`Object.assign(window, api)`), so the helper is `window.shouldRedirectHome`,
not namespaced:

```html
<!-- lib.js loaded first so the helper is defined -->
<script src="lib.js"></script>
<script>
  if (typeof shouldRedirectHome === 'function' && shouldRedirectHome(
        localStorage.getItem('neomatrix-visited'), location.search)) {
    location.replace('app.html');
  }
</script>
```

`shouldRedirectHome` must be added to the object returned at the bottom of
`lib.js` (alongside `VERSION`, `nonEmptyFrames`, etc.) so it is exported to both
the browser globals and the Node test `require()`.

### Behavior summary

- **First visit:** lands on the story. The **"Launch editor →"** action sets
  `localStorage['neomatrix-visited'] = '1'` and navigates to `app.html`.
- **Return visit:** root auto-redirects to `app.html`.
- **Revisit the story:** an **"About"** link in the editor header points to
  `index.html?home=1`, whose `?home` bypasses the redirect. This also lets the
  story be shown repeatedly without clearing storage.

## Home page content

Reuses the existing neon design system — Orbitron display font, JetBrains Mono
body, `--neon-cyan` / `--neon-magenta` / `--neon-green` accents, and the dark
`--bg-*` background scale — so the landing page feels of-a-piece with the editor.

Sections, top to bottom:

1. **Hero** — the "NeoMatrix Frame Creator" logo/wordmark, a one-line tagline, a
   small animated LED-grid motif, and the primary **Launch editor →** button.
2. **The story** — approved copy:

   > Built for senior design at the University of Florida (CEN4907C). Our project
   > was a Rust-programmed microprocessor that detected which of four directions
   > it was being leaned. I wanted it to play animations on an LED matrix — and
   > quickly got tired of hand-writing pixel coordinates into Rust arrays. The
   > first version of this tool existed for exactly one reason: so I never had to
   > type a `(row, col)` by hand again. It grew into a full frame editor with
   > scrolling preview, GIF export, and one-click Rust codegen.

3. **What it does** — 3–4 compact feature cards drawn from the existing feature
   list: paint frames (click + drag), preview the scrolling animation, export
   animated GIF, generate ready-to-compile Rust.
4. **Footer** — GitHub link and "by Jacob Kanfer."

The page is responsive and respects the existing reduced-motion handling (the
animated motif disables under `prefers-reduced-motion`).

## Testing

- The existing `tests/dom.test.js` loads `index.html` via jsdom to exercise the
  editor. Repoint those loads at **`app.html`** so the editor suite keeps
  testing the editor.
- Add a unit test for `shouldRedirectHome()` in the `node:test` suite covering:
  first visit (no flag) → false; returning visitor (flag, no `?home`) → true;
  returning visitor with `?home` → false; empty/undefined search handled.
- Add a small jsdom test for `index.html` (home) asserting: the **Launch editor**
  control sets the `neomatrix-visited` flag and points at `app.html`, and the
  **About** link in the editor carries `?home`.

## Out of scope (YAGNI)

- No client-side router / hash routing.
- No in-page overlay variant.
- No CMS or multi-article "blog"; this is a single static story page.
- No change to editor behavior, export formats, or persistence beyond the new
  `neomatrix-visited` flag.

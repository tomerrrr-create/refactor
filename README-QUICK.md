# Follow Your Intuition — Quick Guide

A browser-based canvas for meditative pixel art and evolving color patterns. Draw on a square grid, explore palettes and their ordering, then run an **evolution** continuously or one generation at a time. The interface supports touch and mouse; English is the primary language, alongside Hebrew, Russian and Dutch.

For interaction details, engine explanations and maintenance guidance, read the [extended guide](Readme.md).

## Run and check

This is a static application: vanilla JavaScript ES modules, HTML5 Canvas, Tailwind CSS and custom CSS. There is no build step or application backend. Serve the repository over HTTP:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Initial styling and export dependencies are loaded from CDNs. Tests use Node's built-in runner:

```bash
node --test tests/*.test.mjs
```

## Main interactions

- **Create:** paint, connect points with the gold brush mode, or drag to copy. Palette sorting preserves the board's visible colors and the selected paint color while changing their palette indices.
- **Choose:** tap palette/color/sort controls to cycle; swipe or drag upward to open their pickers. Hold the color control for 600 ms to select the first palette entry, or 1,200 ms total for rainbow painting.
- **Evolve:** select an evolution, then use Single step or Play/Pause. Swipe the selected, paused evolution upward for supported settings. Running discrete mode cycles skip Off; paused cycles include it. Breathe is a separate visual animation and pauses when its mode changes.
- **Customize:** select and reorder the sorting cycle. Game of Life and Chi Flow each have three configurable cycle positions, distinguished by zero, one or two stars. Free one position, then fill it before saving. **Yours** keeps the last personal rules independently; Cancel discards modal edits.
- **Configure:** the technician menu is available inside WTF/help or by continuing to hold the evolution-entry control. It configures startup preferences and the board/brush used by the initialization hold.
- **Save:** the save modal exports PNG images, JSON board projects and TXT action recipes/macros, and loads JSON/TXT. Reset recipe clears the recorded journey and captures the current board as its new beginning.

Preferences live in `localStorage`; saved creations are explicit exports. Macro playback uses recorded rule values and generation targets, including mode changes. Random processes can produce different pixels; playback must not overwrite saved preferences.

## Code map

| Area | Files |
| --- | --- |
| Board, rendering, history, playback, Nudge | `js/app.js` |
| Layout, SVG icons and styles | `index.html`, `styles.css`, `js/dom-elements.js` |
| Modals, gestures and preset membership | `js/ui-modals.js`, `js/picker-gestures.js`, `js/preset-cycle-membership.js` |
| Palettes, sorting, defaults and presets | `js/data/palettes.js`, `js/colors.js`, `js/constants.js` |
| Evolution engines | `js/simulations.js`, `js/simulations/` |
| Preferences and languages | `js/*-settings.js`, `js/i18n.js` |

## Maintenance essentials

Preserve internal IDs and compatibility with existing JSON projects and TXT recipes. UI names can differ from engine IDs: Chi Flow uses `sandpile`. Update all four languages when changing interface text. Defaults are distributed across constants, preference modules and `app.js`.

Engines have different mutation, allocation and gold-cell behavior. Preserve their existing buffer reuse and profile substantial engine changes on large boards. Changes to interactions or evolution rules need recording/playback checks as well as the relevant tests.

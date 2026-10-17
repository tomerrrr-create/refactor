# Follow Your Intuition — Extended User and Maintainer Guide

Follow Your Intuition is a browser-based canvas for meditative pixel art and evolving color patterns. Its two working modes are **creation** and **evolution**. Draw, copy, reorder colors and explore cellular or spatial behaviors on the same square board.

Start with [README-QUICK.md](README-QUICK.md) for a short overview and code map. This guide retains the detailed engine documentation and adds the current interaction, preferences and recording behavior. Internal identifiers are shown where they matter for maintenance; displayed names may differ.

## Contents

- [Using the app](#using-the-app)
- [Project structure](#1-project-structure)
- [State management and rendering](#2-state-management-and-rendering)
- [Color engine and palettes](#3-color-engine-and-palettes)
- [UI, localization and modals](#4-ui-localization-and-modals)
- [Simulation integration](#5-simulation-integration)
- [Evolution engines](#6-evolution-engines)
- [Additional systems and maintenance](#7-additional-systems-and-maintenance)
- [Art logger and macro replay](#8-art-logger-and-macro-replay)



## Using the app

### Creation and color selection

The brush cycles between painting, gold line completion and copying. Gold line completion connects successive points; copying starts from a dragged source tile. The startup default is line completion. Brush size, grid size, separators and symmetry control the composition.

| Control | Tap/click | Additional interaction |
| --- | --- | --- |
| Palette | Next palette in the current group | Swipe/drag upward to open palette selection |
| Paint color | Next palette entry | Swipe/drag upward to open the color picker |
| Sort method | Next enabled sorting method | Swipe/drag upward to choose methods and arrange their cycle |
| Evolution entry | Switch interface mode | Hold 600 ms to initialize the board; swipe up to open technicians |
| Selected evolution with settings | Select/cycle its behavior | Swipe/drag upward while paused to open settings |

The picker gesture is shared between touch and mouse; it does not require a double click. A recognized swipe suppresses the tap action, so opening a picker does not also advance its cycle. A soft glow marks a supported opening gesture. Evolution settings open only for the selected evolution while paused; opening them does not start a generation.

Hold the paint-color control for **600 ms** to select index zero in the current palette. Continue to **1,200 ms total** for rainbow painting, which chooses colors randomly while painting. Moving into a swipe cancels these hold actions. The color picker opens on the page containing the current selection and marks it; rainbow has its own selection indicator.

Changing the sorting method remaps tile indices and the selected brush color to preserve their visible colors. Changing palettes clears the ordinary paint-color selection. Palette positions named “darkest” or “lightest” in several engine controls mean the first or last entry of the current ordering; custom sorting can change their physical brightness.

### Evolutions, play and cycles

Select an evolution, then use **Single step** for one generation or **Play/Pause** for continuous generations. Ordinary editing is disabled while the evolution runs. Breathe animates the rendering rather than discrete generations, so Single step is disabled for it.

For Game of Life, Chi Flow, erosion, gravity, magnet, spiral, brightness, Islands and DLA, switching a mode during playback changes the running rules without reinitializing the board. The cycle wraps between active modes and skips Off. When paused, Off remains part of the cycle and disarms the evolution. Breathe is different: changing its mode pauses it.

Button cycles intentionally expose a subset of the modes available in settings. For example, magnet cycles Cosmic → Regular → Time; Expand remains in its modal. Spiral cycles Pinwheel → Turbine → Circle; the other modes remain in its modal.

### Presets, cycle membership and Yours

Game of Life and Chi Flow have three configurable cycle positions, represented by the evolution icon with **zero, one or two stars**. Initial choices are:

| Evolution | First position | Second position | Third position |
| --- | --- | --- | --- |
| Game of Life | Yours, initially Paint 4 rules | Shuffle | Coral |
| Chi Flow | Yours, initially Harmony rules | Ripples | Nova |

The compact bronze preset panels have the cycle control **to the left** of each preset name. Rule counts are square grids: Game of Life uses 0–8; Chi Flow's existing rule choices are 1–8. Selected rule tiles are gold.

- **Unavailable:** a dim bronze icon when all three positions are occupied; it cannot be added.
- **Available:** a faint cool icon carrying the star count of the vacant position.
- **Assigned:** a lit gold icon carrying its existing position's star count.

Click an assigned icon to free its position, then an available icon to fill it. Only one position can be vacant at a time, and Save is disabled until it is filled. Membership does not apply a generation or immediately change the running app. Save commits the draft; Cancel discards it. Name selection and cycle membership are separate controls.

**Yours always appears first** and retains the last personal rules, even if it is removed from the cycle or another preset is displayed. It can occupy any cycle position. Ordinary saved rule edits update the personal choice; when Yours is assigned, its position receives those edited rules. Other custom snapshots already present in a cycle can appear as additional Yours entries. Rule snapshots and their source identities are saved separately so a personal choice can match a named preset without losing its identity.

Available/unavailable icons and stars transition softly over about half a second. Their enabled state changes immediately. Reduced-motion preferences disable these transitions.

### Technician settings and defaults

Open technicians using the gold control inside **WTF/help**, or swipe upward on the evolution-entry control. Holding that control for 600 ms still initializes the board; continuing to hold performs no additional action. An upward swipe opens technicians without initializing the board.

The menu contains startup settings and initialization settings. Startup settings govern palette, sorting, board size, separators, initial fill, brush size/mode/color, symmetry and interface mode. They affect a later opening, rather than immediately replacing the current drawing.

Without saved preferences, startup uses Journey, a 7×7 randomized board, 2-pixel separators, luminance sorting, a size-1 gold line-completion brush, no selected paint color, no symmetry and the creation interface.

Initialization defaults are a 249×249 board and size-7 brush. The hold also removes separators, darkens the board, selects its final palette entry, enables kaleidoscope symmetry and starts a new recipe from that board. This is distinct from the creation-reset action, which restores a 5×5 Journey board with a central gold seed.

Nudge's interval defaults to 100 ms and can be set from 0 to 200 ms. Its selected, paused settings can be opened like the other supported evolution settings.

### Brightness, Breathe, Islands and DLA settings

Swipe/drag up on the **selected, paused** evolution to open its settings. The shared gold swipe glow appears only when opening is available. Save commits the draft; Cancel, Escape and outside dismissal discard it. Reset restores the original parameter values in the draft and retains the selected mode. Settings are stored per profile, in settings exports and project JSON; saved edits support Undo/Redo and recipe replay. Opening or saving never starts playback or changes the live button cycle rules.

| Evolution | Parameter | Range | Original default |
| --- | --- | --- | --- |
| Brightness | Smoothing strength (Brightness mode) | 5–100% of the distance to the local average per generation | 50% |
| Brightness | Contrast strength (Contrast mode) | 1–100% of one palette-index step per generation | 10% |
| Breathe | Rate | 25–300% of the original rhythm | 100% |
| Breathe | Depth | 25–150% of the original brightness deviation | 100% |
| Islands | Copy attempts per generation | 1–50% of the board cell count | 5% |
| DLA | Particle steps per generation | 10–1,000 | 100 |

Brightness, Breathe and DLA also allow selection among their existing modes. Islands cycles Classic → Sort proximity → Off when paused; while running it alternates the two active modes without pausing or resetting its board, generation counter, random cursor or activity. The dotted leaf marks Sort proximity. Both modes use the same copy-attempt setting. Classic remains unchanged. Sort proximity chooses a random cell and a random cardinal neighbor, then accepts the copy with probability `1 / (1 + 4 × distance / span)`, where distance is the absolute difference in the current palette ranks and span is palette length minus one (at least one). Nearby ranks are copied more often; the farthest pair still has a 20% chance. This is the original acceptance rule, without weighted neighbor selection or an adjustable proximity strength. Changing sort order changes the ranks used by this rule, while preserving visible board colors. Failed attempts and copying the same color do not necessarily change a cell. Increasing activity or DLA steps increases computational work as well as potential movement.

Old settings and recipes use the original values when tuning is absent. Islands recipes retain their seed, random cursor, mode and activity for exact replay. Classic uses engine version 1 and Sort proximity uses version 2; legacy version-1 recordings remain Classic. Live mode changes are recorded at their generation and do not restart the run. Project snapshots and Undo/Redo retain the mode and random cursor. Brightness/Breathe recipes retain both mode and tuning; old `Mode:` records remain readable. Breathe still uses its existing random rhythms; this change records its parameters, without adding deterministic rhythm replay. DLA's existing randomness is likewise unchanged. New tuning is an optional extension of the V1 settings format; its original defaults remain intact.

### Save, load and help

All export and recipe-reset actions are in the save modal:

| Action | Result |
| --- | --- |
| Image / Moment | PNG of the current canvas |
| Macro / Journey | TXT action recipe for replay |
| JSON / Idea | Board project snapshot |
| Load | Restore JSON or load a TXT macro |
| Reset recipe | Confirm, clear the recorded journey and capture the current board as a new `INIT_STATE` |

Reset recipe does not reset the board. Export uses native file sharing when supported, and downloading where available as a fallback. A browser cannot confirm the eventual operating-system save destination; finishing or dismissing the share sheet can close the save modal.

A loaded TXT recipe offers macro play, an optional initial palette override and fullscreen presentation. Random evolutions can differ visually between runs. Use JSON to retain a specific board state and TXT to retain its sequence of operations.

WTF/help is grouped into Creation, Evolution and Tools. English is the primary interface language; Hebrew, Russian and Dutch are also supported.

---

## 1. Project structure

The code is modularized to separate logic, state, and UI:

* **`index.html`**: The application skeleton. It contains the Tailwind configuration, the main canvas, all UI buttons, and modal definitions. It loads the logic as a module via `js/app.js`.
* **`js/app.js`**: The core "orchestrator." It manages the global board state, animation loops (`gameLoop`, `animationLoop`), user input handling (Pointer Events), and the Undo/Redo history system.
* **`js/constants.js`**: Central repository for application constants. Includes default simulation rules, grid sizes, history limits, and palette grouping logic.
* **`js/colors.js`**: The color engine. It handles color space conversions (RGB/HEX/HSV) and provides advanced sorting algorithms (Luminance, Dark Rainbow, Temperature, etc.).
* **`js/dom-elements.js`**: A central `dom` object mapping all required HTML elements. This avoids repetitive DOM lookups and keeps the code clean.
* **`js/simulations.js`**: A router file that imports and re-exports simulation logic from the `simulations/` directory.
* **`js/simulations/*.js`**: Engine implementations. Some return copied state; others deliberately mutate the current board or retain reusable buffers.
* **`js/ui-modals.js`**: Manages the lifecycle and rendering of all modal windows (Settings, Color Picker, Help) using Dependency Injection.
* **`js/i18n.js`**: English, Hebrew, Russian and Dutch translations. Update all four when changing interface text.
* **`js/data/palettes.js`**: Palette colors, stable original names, icons and archive flags.
* **`js/picker-gestures.js`**: Shared pointer gestures, hold stages, click suppression and picker glow.
* **`js/preset-cycle-membership.js`**: Draft preset membership, vacancy rules and retained UI nodes for fades.
* **`js/evolution-cycle-settings.js`**: Rule snapshot validation, storage and preset/Yours source identities.
* **`js/startup-settings.js`**, **`js/sim-init-settings.js`**, **`js/sort-cycle-settings.js`**: Validated startup, initialization and sorting-cycle preferences.
* **`tests/*.test.mjs`**: Node regression tests. Nudge's engine and timing remain in `app.js`.

---

## 2. State management and rendering

### Board State (`boardState`)
The grid is represented as a 1D array of length `n * n`. Each tile object contains:
* `k`: The current color index from the active palette.
* `v`: A numeric palette coordinate used by several engines; brightness can retain fractional values. Turing chemical concentrations are held in separate buffers.
* `prevK`: The previous color index (used for smooth color interpolation/lerp).
* `animStart`: Timestamp of when the current color transition started.
* `isGold`: Marks a gold tile. Protection is engine-specific: several engines skip gold, Contours explicitly overwrites it, and some spatial modes move it. Do not assume universal immunity.

### Rendering Engine (`renderBoard` in `app.js`)
There are two optimized rendering paths:
1.  **Classic Path (`separatorPx > 0`)**: Renders individual tiles using `fillRect`. Optimized for the creative/drawing mode.
2.  **Ultra-Fast Path (`separatorPx === 0`)**: It renders to a cached offscreen canvas at `n × n` resolution using `ImageData`, then scales to the main canvas with `imageSmoothingEnabled = false`. This avoids a fill operation per separated tile; performance still depends on board size, engine and device.

---

## 3. Color engine and palettes

### Color Mathematics (`js/colors.js`)
This module strictly handles "pure" functional color processing. It calculates Luminance, Hue, and HSV directly from Hex strings without touching the DOM.
* **Advanced Sorting Algorithms:** The `sortColorsArray` function powers the creative visual modes. Beyond simple luminance, it calculates complex arrays:
    * `dark-rainbow`: Splits colors by saturation and groups darks/lights, sorting the colorful mid-tones by Hue buckets.
    * `temperature`: Compares the Red and Blue channels to map colors from "warmest" to "coolest".
    * `zen-void`: Sorts by RGB distance from the average palette color.
    * `outside-in`: Places dark colors at both ends and lighter colors toward the center.

### Sorting selection and order

The sort modal lets the user enable methods, arrange their tap-cycle order and reset it to defaults. At least one method remains enabled. With one enabled method, another tap selects that same method; this is expected. `sort-cycle-settings.js` normalizes obsolete/duplicate IDs and stores the selection.

| Method ID | Ordering |
| --- | --- |
| `luminance` | Dark to bright by luminance |
| `reversed` | Bright to dark by luminance |
| `dark-rainbow` | Neutral darks, hue-bucketed colors, then neutral lights |
| `center-out` | Low luminance at the center, alternating outward |
| `outside-in` | Low luminance at both ends, alternating inward |
| `rainbow-fold` | Outside-in arrangement of Dark Rainbow order |
| `temperature` | Warm to cool by red-minus-blue, with luminance tie-breaking |
| `hue` | Hue, with luminance tie-breaking |
| `zig-zag` | Rearranges the two halves of reversed luminance order |
| `zen-void` | RGB distance from the palette's average color, near to far |

The default tap cycle is luminance → dark-rainbow → reversed → center-out → temperature → outside-in. Additional methods are available through the modal; Waves/Bioms are no longer available. `SORT_MODES` in `colors.js` is the actual registry, and sorting icons also have corresponding SVG definitions in `index.html`.

### Palette Data Structure (`data/palettes.js`)
Palettes are stored as static JSON-like objects in js/data/palettes.js.

Palette Structure:

```js
{
    name: "Golden Hour",   // Display name
    emoji: "🌅",           // Fallback icon
    colors: [              // Array of Hex strings
        "#2b2b2b", 
        "#f5a25d", 
        "#ffd700"
    ],
    isArchived: false      // true routes this palette to Basement
}
```

Auto-Grouping:
You do not need to manually assign a palette to a UI group (Origin, Expansion, Resonance). In constants.js, the PALETTE_GROUPS constant automatically categorizes palettes based on their colors.length. Groups are Origin (up to 25 colors), Expansion (26–80), Resonance (81+) and Basement (archived). Within each group, palettes are sorted by color count; equal counts retain source order. The tap cycle stays within the current group.

Palette icons use `iconHTML` for SVG or an emoji fallback. Display names can be translated while `originalName` preserves identity. Some older JSON/macro data uses array indices, so reordering palette data can affect compatibility; there is no separate persistent palette ID.

---

## 4. UI, localization and modals

### Internationalization (`js/i18n.js`)
The application uses a custom, lightweight i18n engine.
* **The Dictionary:** `translations` holds localized strings; some legacy labels/fallbacks remain in HTML. Use `getText` or the existing `data-debug-text` bindings for new text and provide all four languages.
* **Adding New Languages:** To add a language, update the `translations` dictionary with the new locale code (e.g., `es` for Spanish) and update the `getAvailableLangs()` array. Always use `getText('key')` in the JS logic.

### Modal Management & Dependency Injection (`js/ui-modals.js`)
Because `app.js` controls the core state, importing it directly into `ui-modals.js` would create a circular dependency.
* **The Solution:** When `app.js` initializes, it bundles necessary state getters and action callbacks into a `contextForModals` object. `initializeModals(context)` receives this context, allowing the UI modals to safely read the board size, update rules, and trigger actions.


Adding a New Settings Modal:
HTML: Define the modal or dialog in `index.html`, using the appropriate existing visibility and focus lifecycle.

DOM Setup: Map the buttons and containers in dom-elements.js.

UI Setup: In `ui-modals.js`, connect an opener/closer to the injected context. Use `modal-visible` for overlays that already follow that transition pattern; native dialogs use their own lifecycle.

Save Logic: When the user clicks "Save" inside the modal, read the slider/button values, update the respective rule object via a setter provided in the context, and close the modal.

---

### Preferences and modal drafts

Preferences use `localStorage`, with validation and defaults when stored data is invalid or unavailable. They are independent from explicit JSON/TXT creation exports.

| Preference | Implementation | Storage key |
| --- | --- | --- |
| Startup | `startup-settings.js` | `colorGridStartup` |
| Initialization hold | `sim-init-settings.js` | `colorGridSimulationInit` |
| Selected sorting methods and order | `sort-cycle-settings.js` | `colorGridSortCycle` |
| Game of Life rule slots and personal/source metadata | `evolution-cycle-settings.js`, `app.js` | `colorGridGolCycleMembership`, `colorGridGolCycleMembershipIdentity` |
| Chi Flow rule slots and personal/source metadata | Same modules | `colorGridChiCycleMembership`, `colorGridChiCycleMembershipIdentity` |
| Nudge timing | `app.js` | `colorGridNudge` |

Not every default is in `constants.js`: startup/init defaults have dedicated modules, and Nudge's interval remains in `app.js`. Default rule arrays and both preset registries are in `constants.js`.

`preset-cycle-membership.js` maintains a modal draft with one possible vacancy. It retains rendered glyph/button nodes across refreshes, allowing opacity, color and star transitions to interpolate instead of abruptly rebuilding the UI. Functional enable/disable changes remain immediate. Commit persists complete slots and personal identity; cancelling discards the draft.

Different modals use dialogs, visibility classes or inline display state. Follow the existing modal's lifecycle rather than applying one universal close/open recipe. Dependency-injected getters/setters from `initializeModals(context)` keep UI modules from importing `app.js`.

---

## 5. Simulation integration

Execution is controlled by the `armedSimulation` variable. When active, `togglePlayPauseLife()` starts the `gameLoop()`. Inside the `gameLoop`, a `switch(armedSimulation)` statement calls the respective logic from the `Simulations` module and updates the `boardState`.

### Adding an evolution
1.  **Logic (`js/simulations/chaos.js`)**: Define an engine with explicit board/rule inputs and document whether it copies or mutates its board, and whether it keeps auxiliary state.
2.  **Exporting (`js/simulations.js`)**: Export your function.
3.  **Constants (`js/constants.js`)**: Define default rules: `export const defaultChaosRules = { ... };`.
4.  **UI (`index.html` & `dom-elements.js`)**: Add a button `<button id="btnChaos" ...>` and reference it in the `dom` object.
5.  **Wiring (`app.js`)**: Initialize rules, include the button in simulation reset lists, and add the click Event Listener.
6.  **Loop Integration (`app.js`)**: Add dispatch to both `gameLoop` and `stepForward`, unless it is a rendering-only animation like Breathe.
7.  **Compatibility:** Add rule recording/replay, settings/gesture wiring where relevant, four-language text and focused regression coverage.

---

## 6. Evolution engines


Engine contracts differ. Game of Life, Chi Flow, erosion, contours and brightness create copied board data. Gravity, magnet and spiral generally swap or update tiles in place. Turing retains chemical buffers; DLA retains crystal and walker state. Treat allocation, caches and gold handling as part of each engine's contract.

---

### 1. Breathe (Animation Engine)
**File:** `js/simulations/breathe.js`

Unlike other simulations that update discrete states per generation, `Breathe` operates directly inside the `animationLoop` to manipulate pixel brightness dynamically.

* **Mathematical Model:** Uses a continuous sine wave (`Math.sin()`) tied to the global `timestamp` to calculate a luminosity multiplier.
* **Modes (`breatheEvoMode`):**
    * `solo`: Each tile pulses individually. The sine wave's phase is offset by an initial `startDelay` assigned to the tile when the simulation arms.
    * `group`: A synchronized organic pulse. The sine phase is offset by the tile's current color index (`tileData.k * 0.8`), causing adjacent colors to breathe in localized "waves".
* **Performance:** Extracts the calculation into `getBreatheBrightnessFactor()` without changing the board's underlying color indices.

---

### 2. Brightness Evolution & Contrast
**File:** `js/simulations/brightness.js`

These models simulate cellular smoothing and contrasting by treating the color index (`v`) as a continuous float representing "brightness".

* **Brightness Evolution (Smoothing):**
    * Calculates the average `v` over the valid 3×3 neighborhood, including the cell itself and excluding gold tiles.
    * Smooths the current cell's value towards the local average using a fixed `smoothingFactor` (0.5).
    * Mathematically mimics a blur or diffusion effect over time.
* **Contrast Generation (Sharpening):**
    * Also calculates the local neighbor average.
    * Inverses the smoothing logic: If a cell is *brighter* than its neighbors, it adds `strength` (0.1) to become brighter. If *darker*, it subtracts to become darker.
    * Mathematically mimics an unsharp mask or localized edge-enhancement.
* **Clamping:** Both simulations strictly clamp the resulting float (`newV`) between 0 and `maxIndex` before rounding it back into an integer `k` for rendering.

---

### 3. Contour Lines (Topography)
**File:** `js/simulations/contour.js`

An edge-detection algorithm that generates topological contour maps based on color gradients.

* **Threshold Logic:**
    * The user UI defines `sensitivity` (0-100), which maps to a threshold percentage (nominally 1% to 50% of the palette length).
    * A tile is marked as an "edge" if the absolute difference in index (`Math.abs(currentK - neighborK)`) between it and its North/South/East/West neighbors is at least `LUMINANCE_THRESHOLD`.
* **Execution:**
    * It reads the entire board first (`indicesToChange`), then applies the contour line color (Darkest or Lightest index) simultaneously. This prevents cascading chain reactions within a single frame.

---

### 4. Erosion (Granular Physics)
**File:** `js/simulations/erosion.js`

A specialized downward-falling algorithm mimicking sediment settling and weathering.

* **Palette Mapping:**
    * The palette is virtually sliced into three states based on index percentages: `Earth` (Bottom 20%), `Air` (Middle 60%), and `Water` (Top 20%).
* **Physics Rules:**
    * Only `Water` tiles (the final palette entries) actively fall; ordering determines the material roles.
    * **Direct Fall:** Swaps with `Air` immediately below.
    * **Weathering:** If it lands on `Earth`, there is a chance (`erosionStrength`) it will "erode" the earth tile (incrementing its index by 1) before sliding.
    * **Sliding:** If the path directly below is blocked, it checks the bottom-left and bottom-right diagonals. A 75% bias is mathematically applied to correct for the left-to-right processing loop, ensuring a balanced, centered pile.

The Erosion button cycles through **Off → Original → Forward carving → Channel carving**. The original rules above are retained.

* **Channel carving:** The first 20% of palette indices are air, the middle 60% earth, and the last 20% water. These roles follow palette order, including custom sorting.
* Water erodes at most one adjacent earth cell (below or beside it) per generation, reducing its palette index until it becomes air. It prefers downward movement, then diagonals, then sideways movement into air.
* **Forward carving:** Shares channel-carving movement, but the first 20% of indices are earth and the middle 60% air. Earth erodes forward through palette indices until it becomes air. The final 20% remain water.
* Each water cell moves at most once per generation. Water remains at the floor; no water is injected or removed. Gold cells are protected in the channel modes; the legacy pass does not apply the same exclusion. The selected mode is included in project saves and action-log rules.

---

### 5. Spiral and radial sorting

**File:** `js/simulations/spiral.js`

Most modes calculate a target using angle and distance from the center, then swap colors with suitable neighbors. A square grid still constrains local movement, so radial motion can appear polygonal. Some modes track moved cells; this is not a universal rule for every branch.

| Internal ID | English label | Behavior / exposure |
| --- | --- | --- |
| `b` | Pinwheel | Inward neighbor flow with a small angular offset; first button mode |
| `left` | Turbine | Inward spinning flow with stronger angular variation; second button mode |
| `black_hole` | Circle | Inward swaps plus comb-sort passes over exact Euclidean radial order; third button mode |
| `radial` | Diamond | Inward targeting without spin; modal only |
| `down` | Hexagon | Inward targeting with its own spin parameters; modal only |
| `a` | Experiment A | Cached radial order with fixed-stride bidirectional passes; modal only |
| `vortex` | Vortex | Turbulent angular/radial targeting; modal only |

Circle caches geometry by board size and convergence progress by board reference. It preserves colors through swaps, can swap nonadjacent positions in its radial passes, and restarts convergence after edits or palette remapping. Its swaps include gold tiles. Experiment A's active branch is not the older commented-out time-budget implementation. Preserve these IDs when changing displayed names.

### 6. Chi Flow

**File:** `js/simulations/chi_flow.js` — internal evolution ID: `sandpile`.

Chi Flow is a color-index cellular automaton, rather than a classical Abelian sandpile with conserved grains:

1. Count the eight neighbors with index greater than zero. Neighbor lookup wraps at board edges.
2. For a cell at index zero, a matching `awakening` count changes it to index one.
3. For an active cell, count neighbors ahead of it within `reach` in cyclic palette order. A matching `flow` count advances its index by one, wrapping at the palette length.

`reach` is a distance in **palette indices**, not a spatial radius. Auto (`0`) uses `max(2, floor(numberOfColors / 6))`. The UI rule choices are 1–8.

An ignition pass operates when the input has between one and 149 active cells. It injects random palette entries in bounded 9×9 areas around those cells. It is stochastic and does not independently ignite a completely empty board. This engine does not apply a general `isGold` exclusion.

Default rules correspond to Harmony. Presets are centralized in `CHI_FLOW_PRESETS` in `constants.js`; the initial cycle is Yours → Ripples → Nova. The user can replace any of those positions without changing the engine ID.

---

### 7. Turing Patterns (Reaction-Diffusion)
**File:** `js/simulations/turing.js`

A highly optimized implementation of the Gray-Scott Reaction-Diffusion equations, simulating biological and chemical pattern formation (like animal stripes or coral).

* **Memory Architecture (Ping-Pong Buffers):** It uses pre-allocated `Float32Array` buffers for chemical A and B concentrations. It swaps current and `next` buffers to reduce allocation in the numerical loop; mapping chemicals back to board tiles still allocates.
* **Laplacian Convolution:** Computes diffusion using a 3x3 kernel with precise mathematical weights: Center (-1.0), Adjacent (0.2), and Diagonal (0.05).
* **Visual Mapping (Non-Linear):** Chemical float values aren't mapped linearly to the palette. 
    1. **Stretching:** The active chemical range `[0.05, 0.78]` is stretched to cover `[0.0, 1.0]` so no palette colors are lost.
    2. **Gamma Correction:** Applies a power curve (`Math.pow(visualValue, 1.5)`) to push the majority of the board into deeper, darker palette colors, leaving the bright colors for sharp, highly-concentrated edges.

---

### 8. Magnetism
**File:** `js/simulations/magnet.js`

A spatial attraction engine using anchors around the selected palette entry. `anchorColorIndex = -1` resolves to index zero in the current ordering. The main cycle is Cosmic → Regular → Time; Expand remains selectable through settings.

* **Buffer reuse and in-place updates:** This file deliberately trades modern syntactic sugar for raw speed:
    * Reuses a flat `Uint8Array` to track moved pixels instead of using `Set()`.
    * Uses classic variables for swapping (`temp = a; a = b; b = temp`) instead of array destructuring `[a,b] = [b,a]`.
    * Uses multiplication for squared distances in hot loops. Anchor coordinate objects can still be allocated; do not describe the whole engine as zero allocation.
* **Execution Modes:**
    * `magnet`: Organic attraction with alternative neighbor candidates.
    * `cosmic_magnet`: Strict/geometric attraction toward the best candidate neighbor.
    * `time_magnet`: Uses palette-relative modular ordering and alternative neighbor selection; its displayed name does not mean the code uses a wall-clock timer.
    * `expand`: Reverses the target logic, acting as a repulsive force radiating outward from the anchor.

---

### 9. Gravitational Sort
**File:** `js/simulations/gravitational_sort.js`

Spatially sorts current palette indices with direction-dependent comparisons. “Heavy” or “dark” describes palette order here, not an independently recomputed luminance.

* **In-place sorting and caching:** Operates entirely by mutating the `nextBoardState` in place, avoiding board copies during the sorting passes. Radial cache construction allocates when needed; this is not a blanket zero-allocation claim for the entire application.
* **Directional Vectors:**
    * `up` / `right`: Linear sorts using optimized, direction-specific `for` loops.
    * `center_x`: Pulls lower indices toward the center using four-neighbor distance checks.
    * `vortex`: Uses cached radial order and bidirectional fixed-stride sorting; available through settings, outside the three-mode button cycle.

---

### 10. Game of Life
**File:** `js/simulations/game_of_life.js`

An artistic adaptation of the classic cellular automaton. The default is Paint 4, not Conway's standard survival `[2, 3]` / birth `[3]`: Paint 4 uses survival 0–8 and birth 4–8. Presets are centralized in `GAME_OF_LIFE_PRESETS`; the initial cycle is Yours → Shuffle → Coral.

* **Live Cell Definition:** Instead of a binary state, a cell is considered "alive" if its color index is strictly greater than 0 (`notDarkest`). Gold tiles are strictly immune.
* **List-Based Rules:** Supports complex rulesets by checking if the live neighbor count is `.includes()` in the survival/birth arrays (e.g., survival: `[2, 3]`, birth: `[3]`).
* **Boundaries:** Game of Life checks neighbors within the board; it does not wrap edges like Chi Flow.
* **Color Genetics:** When a new cell is born, it doesn't just pick a random color. It calculates the *average RGB value* of its surrounding live "parent" cells and finds the closest matching color index in the active palette, creating beautiful gradients as the population evolves.

---

### 11. DLA (Diffusion-Limited Aggregation)

**File:** `js/simulations/dla.js`

Random walkers move until they touch an existing crystal, then add a colored cell. Initialization and respawning use available board positions, rather than always launching from edges. If necessary, initialization creates a center seed.

The button cycles Genetics → No genetics:

- Genetics averages valid neighboring crystal colors, finds the nearest palette entry and retains a successful-color fallback.
- No genetics derives the entry from crystal size modulo palette length.

Both avoid index zero when creating crystal cells. `emptyIndices` supports respawning on crowded boards. Crystal sets and walker data are persistent simulation state, so a live mode change must not reinitialize them. The `fastMode` branch currently returns the state unchanged; do not assume it is an implemented faster variant.

### 12. Nudge

**Implementation:** `js/app.js` (`applyNudgeLogic`, `getNudgeTiming`, `applyNudgeTiming`).

Nudge moves editable tile indices toward higher or lower entries of the current palette. Single step performs one shift; continuous playback uses the selected interval, default 100 ms. Zero selects a shift on each available frame, not an unbounded loop.

Timing preferences are saved under `colorGridNudge`. Recorded timing uses `nudgeTimingVersion: 1`; legacy recordings without this metadata retain their original frame-counting behavior. Replay timing is separate from the saved user preference. Avoid interpreting old generation tags with the new interval semantics.

---

## 7. Additional systems and maintenance


### Palette remapping

The application remaps palette indices to preserve visible colors. When a user changes the sorting method of a palette (e.g., from "Luminance" to "Reversed"):
1.  `applySortMethod` is triggered.
2.  The engine captures the exact Hex color of every tile on the board.
3.  The underlying palette arrays in `C.PALETTES` are sorted.
4.  **The Re-map:** The engine iterates through the board and finds the *new index* (`newK`) of the original color in the sorted palette. It updates the `k` property so the visual output remains identical while the internal logic adapts to the new order.

---

### Input and interactions
Input is handled via a unified Pointer Event system supporting mouse and touch:
* **`pointerState`**: Tracks dragging, source indices for copying, and timers.
* **Brush Mode**: `isBrushModeOn` selects painting; `isContinuousBrushOn` adds line completion between successive anchors. Copy mode tracks a dragged source and applies it at the destination. Gesture cancellation and suppressed compatibility clicks prevent duplicate actions.
* **Symmetry**: All manual interactions automatically trigger the `getSymmetricIndices` helper to apply changes across the Vertical, Horizontal, Mandala, or Kaleidoscope axes.


---

### Styling and animations (`styles.css`)
The app utilizes Tailwind CSS for utility classes, heavily customized with vanilla CSS in `styles.css`.
* **CSS Variables:** Global theme colors like `--gold` (`#FFD700`), `--sim-color`, and `--bg-color` are defined in the `:root`.
* **Glow Effects:** The `.glowing-border` and `.glowing-border-rainbow` classes use CSS `box-shadow` and `border-image` to create dynamic, breathing borders around the canvas based on the currently selected color.
* **Custom Animations:** Keyframes like `fadeInText`, `fadeOutText`, and `spin` are explicitly defined for splash screens and loading states, for interface transitions. Do not infer a fixed frame-rate guarantee from their presence.

---

## 8. Art logger and macro replay

### Recording and exports

`window.logArtEvent(eventName, details, forceLog)` appends session recipe events. A recipe begins with `INIT_STATE` containing board dimensions, palette, sorting, separators and compressed color indices. This compression is not a complete JSON project backup: it does not carry every tile field.

Events carry timestamps, and generation-based actions include `[GEN:n]`. The logger records board strokes/diffs, palette and sorting changes, play, pause, single steps, live mode changes, Nudge timing and history metadata. Logging has some overhead and does not make the entire application allocation-free.

`PLAY` and `STEP FORWARD` include actual evolution rules. Game of Life and Chi Flow mode events also snapshot all three rule slots, the personal rules and source identities (`cycleSources`). The player injects the recorded values, so later edits to named presets do not silently change old journeys.

Save the journey through the save modal, using `exportArtRecipeLog()`. Current TXT filenames use `Intuition_Path_<palette>_<line-count>.txt`. Save/Play long presses no longer export or reset the logger. `resetArtRecipeLog()` clears the recipe and captures the current board as a new start; its UI requires confirmation.

### Playback and history compatibility

`onProjectFileSelected` routes TXT to `parseMacroText` and JSON to board restoration. Loading a macro exposes a play overlay and optional initial-palette override.

- `parseHistoryMacro` handles `recipeVersion: 2`, using history action IDs/ranges to resolve Undo/Redo and restore the relevant settings.
- `parseLegacyMacroText` retains support for older recipes, including their UI-event folding and history behavior.
- `scheduleNextMacroStep` schedules time-based events; `gameLoop` consumes generation-based events when their target generation is reached.
- `applyMacroRules` restores rules before execution. `executeMacroAction` restores live mode transitions and logs replayed events without duplicating the underlying callback logs.

Game of Life and Chi Flow begin their macro-driven loop on an animation frame so the queue advances beyond PLAY before generation one. This preserves mode events recorded at that first generation. Ordinary manual Play remains immediate.

Macro playback must not persist recorded startup, cycle/Yours or Nudge choices into user preferences. Actual rules determine evolution behavior; preset names and source metadata support UI reconstruction. Old mode IDs, missing metadata and historical Off events must remain readable even though live cycles now skip Off.

The player preserves recorded operations and generation targets, not a deterministic random seed. Stochastic engines can produce different pixels. Stroke replay explicitly clears gold flags on its changed tiles; it is not a complete restoration of every historical tile property.

### Input and interruption

Canvas painting is blocked while `isMacroPlaying` is true. Board clicks during playback can switch fullscreen presentation. Loading a macro pauses an existing evolution first.

`armSimulation` can cancel a loaded macro when the user manually arms an evolution while paused. Playback sets `isExecutingMacroCommand` to bypass that kill switch and suppress duplicate logging. Do not assume every possible button interaction cancels a running macro; check the handler and its playback guards.

### Maintenance checklist

1. Keep internal IDs stable when renaming or redesigning controls. Chi Flow's ID is `sandpile`; spiral IDs such as `left` and `black_hole` retain compatibility despite their newer displayed names.
2. Record actual rules and relevant generation targets for behavior changes. Add a replay handler as well as the recording event.
3. Preserve separate user preferences and replay state; never persist a macro snapshot as a user preference.
4. Verify paused Off, live wraparound, single step, modal cancellation, source identities and Yours preservation for cycle changes.
5. Preserve tile/brush colors through sorting remaps and validate older JSON/TXT inputs.
6. Run relevant Node tests and check the affected touch/mouse path in a browser. Measure large-board performance before changing in-place swaps or buffer reuse.
7. Update both this guide and the [quick guide](README-QUICK.md) when changing an interaction or architectural contract. Update all four interface languages for user-facing text.

## FYI installation and offline use

Install FYI from Safari on iPhone (Share → Add to Home Screen) or Chrome on Android (Install app / Add to Home screen). Open it online once and allow its offline resources to finish downloading before disconnecting. No store or backend is required.

The home-screen icon uses the same green color-grid artwork as the sharing preview. Updates are offered with a small **Update** control; export your drawing before accepting, because the app reloads. Local preferences remain intact. Browser and installed-app storage may be separate on iOS; transfer preferences with the settings TXT and drawings with the project export.

Maintenance: styling and boot resources are local. After changing app assets or the worker, run `node tools/update-pwa-cache.mjs` and `node --test tests/*.test.mjs`. This generates a scoped offline resource list and content-based cache version. The worker installs a complete snapshot before offering an update and removes only older FYI caches for the same URL scope.

## Three settings profiles

At the top of technicians, 1 / 2 / 3 select three fixed profiles. Each profile keeps a saved baseline and an independent working draft. A star marks a draft that differs from its saved settings; switching away and back restores the draft, not the saved baseline. Stars on other profiles stay visible. All three drafts, baselines and the selection survive reopening in the same browser/site storage. On first use, profile 1 is selected and keeps the current effective preferences with a blue theme. Profile 1 opens with relative Large separators. Profile 2 starts with Golden Midnight Extended, an 11 × 11 board with relative Small separators, random fill, simulation mode and a gold theme; its sort cycle replaces Temperature and Outside in with Folded Rainbow and Zigzag. Profile 3 starts with Ancient 264, random fill on a 15 × 15 board without separators (relative level 0), brush size 1, simulation mode and a turquoise theme, with the same sort cycle as profile 1. Profiles 2 and 3 use Electric → Harmony → Alexis in Chi Flow, all at 400% Magnetic Reach. Opening brush sizes for profiles 1 / 2 / 3 are 1 / 1 / 1; simulation-entry hold sizes are 1 / 11 / 1. Opening uses the startup brush size rather than restoring the last live brush size; switching profiles still restores their drafts. Profile 2 uses symmetry Off and palette index 0 as its brush color; profile 3 uses the brightest palette color at startup, and a rainbow brush with left/right reflection (the two gold vertical icon edges) on the simulation-entry hold. Its first Game of Life slot is Paint 1. Initialization retains its legacy last-color/kaleidoscope behavior when those optional preferences are absent. Erosion acceleration defaults for Forward / Channel carving are I / I in profile 1, III / IV in profile 2, and IV / V in profile 3. Both the profile Reset and the erosion-panel Reset use these per-profile defaults. Unspecified settings inherit profile 1. Themes are saved in each profile and change immediately when switching profiles. The existing Reset action restores only the selected profile to its application defaults, including its theme, and establishes a clean saved baseline; the other profiles and current drawing stay unchanged. Existing untouched copies receive the new defaults once; edited profiles and drafts are preserved.

Only the selected profile's gold dot is enabled. Its compact action panel uses a down-arrow icon to save current settings into the profile and an up-arrow icon to load a settings file. Both icons have localized accessible labels and hover titles. It offers exactly two actions: save current settings into that profile, or load an existing settings TXT into it. Saving or successfully importing establishes a clean baseline and clears its star. Invalid files leave the profile and current settings alone. Existing export remains in Save. Profiles contain settings, not drawings: startup/init preferences retain their existing deferred behavior and switching does not replace the board. Clearing browser site data removes profiles.

Implementation: `js/profile-state.js` validates and persists the three saved/draft pairs and selection in `colorGridProfileDraftsV1`. `js/profile-controls.js` binds the compact buttons, stars and two-action panel. The app supplies settings capture/application through the existing importer; the JSON/TXT formats and evolution engines are unchanged. Internal profile snapshots additionally retain Game of Life/Chi Flow cycle source identities, personal rules and slot indices. Old reverted experimental profile storage keys are not reused.

Capture runs after committed UI events and logged actions, plus on page hide/visibility change. It does not poll or run in engine/render loops. Unsubmitted modal drafts and board pixels do not enter a profile. Dirty comparison ignores object key order and clears when settings return to their saved values. Capture applies changes relative to the last runtime observation, keeping temporary replay rules out of user drafts. Macro load suspends capture; completion/cancellation rebases that observation without saving replay values. Profile actions are blocked while a macro is loaded/playing. Storage failure keeps in-session operation available and reports that persistence is unavailable.

Verification: `node --test tests/*.test.mjs` includes profile state isolation, persistence, dirty reversal, file validation and replay separation. Browser checks should cover native checkbox/slider events, cancelled forms, stars on inactive profiles, switch/reopen, save/import, keyboard/RTL, unchanged board pixels and macro completion followed by a manual preference change. Run `node tools/update-pwa-cache.mjs` after asset changes.

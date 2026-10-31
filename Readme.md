# Follow Your Intuition — Extended User and Maintainer Guide

Follow Your Intuition is a browser-based canvas for meditative pixel art and evolving color patterns. Its two working modes are **creation** and **evolution**. Draw, copy, reorder colors and explore cellular or spatial behaviors on the same square board.

This is the complete guide to the application's current interactions, defaults, engine behavior and file compatibility. [README-QUICK.md](README-QUICK.md) is a shorter overview; use the details here when its older summaries differ. Internal identifiers are shown where they matter for maintenance; displayed names may differ.

## Contents

- [Using the app](#using-the-app)
- [Three settings profiles](#three-settings-profiles)
- [Project structure](#1-project-structure)
- [State management and rendering](#2-state-management-and-rendering)
- [Color engine and palettes](#3-color-engine-and-palettes)
- [UI, localization and modals](#4-ui-localization-and-modals)
- [Simulation integration](#5-simulation-integration)
- [Evolution engines](#6-evolution-engines)
- [Additional systems](#7-additional-systems)
- [Art logger and macro replay](#8-art-logger-and-macro-replay)
- [FYI installation and offline use](#fyi-installation-and-offline-use)
- [Local development and maintenance](#local-development-and-maintenance)

## Using the app

### Creation and color selection

The brush cycles **Paint → Continuous → Copy**. The gold continuous-mode indicator means that gaps between successive pointer positions are filled; it does not force the paint color to gold. Color, footprint size, shape and symmetry still apply. Continuous strokes connect samples within a gesture; leaving the canvas breaks the segment. Copy mode copies a dragged source tile onto the destination footprint.

The brush picker offers **Circle, Square, Diamond, Ring and a horizontal Line**, in sizes **1, 3, 5, 7, 9, 11, 13, 15 and XL (23 cells)**. Older XL=21 preferences migrate to 23. Footprints clip at board edges. With no selected color, tapping advances a tile's palette entry or removes its protected gold flag; painting a drag uses its source color. Rainbow chooses random palette entries while painting.

Brushes also work while a simulation runs: taps and drags change the current board, and the simulation continues from those edits. Wind and brushes are mutually exclusive board tools; switch Wind off to return to the brush. Loaded macros block manual painting.

### Controls and gestures

| Control | Tap/click | Swipe/drag up | Swipe/drag down | Hold or horizontal swipe |
| --- | --- | --- | --- | --- |
| Palette | Next palette in current group | Brush/color picker | Palette catalogue | 600 ms: next palette group with color adaptation; horizontal: brush size |
| Color/brush | Next color; in Wind, next effect | Brush picker; in Wind, settings | Toggle brush/Wind | 600/1,200 ms: first palette entry/rainbow; horizontal in brush mode: clear selection |
| Sort | Next enabled method | Sorting settings | — | 600 ms: first enabled method |
| Symmetry | Next symmetry | Symmetry Off | In simulation interface: swap utility control | No Wind hold shortcut |
| Separators | Next separator value | Separator settings | In simulation interface: swap utility control | — |
| Evolution entry | Switch control panels | Technicians | Go Dark | Horizontal: Go Dark; 600 ms: initialize board |
| Selected evolution | Cycle its modes | Supported settings | — | Hold: explanation above board |
| Resize +/− | Next preset size | Custom size dialog | — | — |

Touch and mouse use the same Pointer Events gestures; double click is not required. A recognized swipe suppresses the tap and cancels hold timers. A soft glow marks an available opening gesture. Settings open for the selected evolution while paused or running, without starting or pausing it. During Breathe, some color/palette/sort controls retain additional restrictions; the table does not override disabled controls.

Holding Color for **600 ms** selects index zero; continuing to **1,200 ms total** selects rainbow. Horizontal clearing retains brush size and symmetry and is inactive in Wind. The brush picker opens on the page containing the selected color, marks the selection and has a separate rainbow indicator. It includes shape/size choices, color-page navigation and access to Sort and the active Symmetry/Separators utility. The palette catalogue header combines Origin, Expansion, the current palette icon, Resonance and Basement in one row. The four tabs browse their categories; the center icon opens the brush picker. Below the row, the active category shows only 23, 64 or 264, or localized Under construction for Basement. The centered current palette name/color count in the footer also opens the brush picker. Color and palette pickers share a viewport-relative top edge and matching palette-icon centers/sizes; their panels crossfade without vertical movement. Panel heights remain content-dependent and scrolling stays inside the available viewport.

Keyboard shortcuts depend on the focused control: **Alt+ArrowDown** opens Sort settings on Sort, separator settings on Separators, and switches brush/Wind on Color. See [Help, accessibility and layout](#help-accessibility-and-layout) for the available keyboard paths and limits.

Sorting remaps tile indices and the selected brush color to preserve their visible colors. Selecting a different palette changes the available colors and clears the ordinary paint-color selection. Holding Palette advances to the next group and adapts indices to its color count as one history action. Palette positions named “darkest” or “lightest” in several engine controls mean the first or last entry of the **current ordering**; custom sorting can change their physical brightness. Startup's darkest/lightest choices instead resolve actual luminance.

### Board size and separators

Resize buttons step through preset sizes; their upward gesture opens a custom size dialog accepting **1–327**. Resizing crops or pads around the center rather than resampling the image. Startup and initialization preferences use the validated preset-size list in `constants.js`.

Relative separators use **Large, Medium, Small and None**, adapting width to board density and display size. Their logical values are 5/3/1/0, not literal pixel widths. Separator settings also offer an absolute-width cycle; unavailable widths are filtered to preserve tile space. Recordings and artwork snapshots retain resolved widths, including fractional values. A profile's Medium value of 3 therefore does not mean an unconditional 3-pixel gap.

### You are the wind (experiment)

Wind shares the **color/brush control** in either interface. Swipe down to enter Wind, tap to cycle **Local ripple → Paint color rings → Move existing colors**, swipe up for Wind settings, and swipe down again to return to the brush. Alt+ArrowDown on this focused control also switches tools. Every entry selects Local ripple with its saved parameters. Brush color/rainbow and size are retained. A short gold halo confirms the tool change; there is no Wind toast. Symmetry remains independent: tap cycles symmetry and swipe up turns it off, with no Wind hold shortcut. Escape exits Wind when no dialog takes precedence.

Switching tools or Wind modes does not pause a running simulation. Switching control-panel interfaces keeps Wind active. Controls retain their ordinary enabled/disabled rules; before another panel action edits the board, active ripples stop and commit without blocking that action. Loading a macro exits Wind. Touch/click the board to send an expanding colored ripple; drag to emit a trail. A second touch while ripples are active stops all fronts and commits the artwork painted so far; moving during that stopping gesture does not create new fronts. A subsequent touch starts painting again. The **Move existing colors** mode exchanges existing colors radially across the moving front, preserving color counts and protected gold cells. It deforms the artwork without generating palette colors; a uniform board therefore remains visually unchanged. The alternative **Paint color rings** mode retains the original behavior: colors follow ranks in the active sorted palette, rather than a fixed rainbow, and overwrite the touched areas including gold cells. The default option, **Local ripple**, moves existing colors a short radial distance and returns most pairs behind the moving front. Each cell can belong to only one pair per wave, so a color cannot repeatedly ride the front to the edge. Roughly three quarters of spatially selected pairs return; the rest leave a small permanent change. This mode preserves color counts and protected gold cells and does not use palette sorting. Overlapping waves can interact; interrupting a wave commits its current positions. All three modes work independently of the ordinary brush size and symmetry.

**Settings** opens a native dialog with three icon buttons in the same cycle order, selecting Local ripple (default), Paint color rings or Move existing colors, speed (25–300%), range (15–100%), displacement strength (25–300% for Move existing colors; 25–1,000% for Local ripple, default 300%), color density (0.25–3×, paint mode only), and a drag-trail toggle. Opening settings stops active fronts first. Changes are drafts until Save; Cancel, Escape and outside dismissal discard them, while Reset updates only the selected mode in the draft. Each mode retains its own speed, range, trail and applicable strength/density values; switching icon buttons restores that mode’s values without changing the others. Legacy shared settings are retained for both original modes when first migrated, and Local ripple starts at defaults. Each new entry into Wind selects Local ripple; its saved parameter values remain intact. New or missing preferences start at 300% strength. Settings persist separately in browser storage (`colorGridWindSettingsV1`); they are not profile or startup settings. Wind commands carry their own effective settings, so replay does not depend on or overwrite those preferences. New INIT_STATE recordings additionally retain protected gold-cell indices; older recordings without that optional field retain their original playback behavior. While the settings dialog is open, Escape closes that dialog and stays in Wind.

Swipe down on Color/Wind again or press **Escape** to return to ordinary drawing. Losing window focus or hiding the page also exits safely. Exiting keeps the artwork painted so far and stops pending fronts. No simulation restarts automatically. Each continuous group of overlapping ripples becomes one Undo/Redo action when the fronts settle; exit commits a group still in progress. If a simulation is running, its current history segment owns the combined Wind/simulation action instead of keeping overlapping snapshots. New recipes record versioned `WIND_WAVE` commands for accepted wave emissions (including sampled drag trails), with origin, relative milliseconds, paint-base rank and effective mode/settings, followed by `WIND_END` for a natural finish or explicit stop. The first wave anchors to the recorded generation when a discrete simulation is running; subsequent wave samples and the end use the batch’s relative clock. Playback runs the existing wave engine on the evolving board alongside the simulation, without a final `DRAW_STROKE` jump or per-frame board recordings. Pixel-exact replay is not promised. Exporting an active batch terminates only the exported copy at the current elapsed time. Old recipes using `DRAW_STROKE` retain their original final-result playback. Cancelling playback also pauses its simulation and cancels pending wave frames and command timers. Importing a replacement macro validates it first, then cancels the previous replay before installing the new queue; an invalid replacement leaves the current replay intact. Wind mode itself is temporary and is not saved as a startup/profile preference.

At most six fronts run concurrently; dragging is sampled at 100 ms or longer with a minimum spatial interval. Idle Wind requests no animation frames. Reduced-motion mode applies each ripple without an expanding animation. Symmetry remains independent of the active tool.

### Evolutions, play and cycles

Select an evolution, then use **Single step** for one generation or **Play/Pause** for continuous generations. Painting and copying remain available during playback. Swipe up on the selected evolution for supported settings; opening does not pause it. Live saves record effective rules at the current generation.

Tapping a different ordinary evolution ends the old run and immediately starts the new one on the same board, with its own generation counter and history segment. Cycling the current evolution changes its active mode without restarting and skips Off during playback. When paused, Off remains part of the cycle and disarms it. Switching into or out of **Breathe** requires manual Pause; cycling Breathe itself pauses it. Breathe animates rendering rather than discrete generations, so Single step is unavailable.

Button cycles intentionally expose a subset of the modes in settings. Magnet cycles Cosmic → Regular → Time, with Expand available in settings. Spiral cycles Pinwheel → Turbine → Circle, with other modes in settings. Details and compatibility rules are in [Evolution engines](#6-evolution-engines).

### Evolution map

A small theme-colored dot above the evolution overlay opens the Evolution map while paused in the simulation interface, outside macro loading/playback. It assigns ten unique controls from a catalogue of fifteen. Select one of the ten icon-only slots, then a control: **Outside the toolbar** replaces the slot and parks its previous control; **On the toolbar** swaps positions. Selecting the current control leaves the draft unchanged. Save applies, Cancel/Escape discard, and Reset restores the original ten slots. Names remain available as hover titles and accessible labels.

The default parked controls are **Breathe, Turing, Nudge brighter, Nudge darker and Resonance**. Cracks/Contours retains its shared mode-cycle button. The original DOM buttons, IDs, settings and gestures are retained. A running parked evolution is indicated by a gray dot; global Play/Pause still controls it. There is no drag-and-drop or layout editing during a run.

Layouts are optional `evolutionSlots` profile/settings preferences, separate from artwork history and recipes; legacy settings use the original ten slots. Saving a layout changes neither the board nor engine state. Each profile retains its layout across reloads.

### Undo and redo

Undo/Redo retains up to **20 artwork actions**. A standalone brush gesture is one action. During playback, the first painted sample of each new gesture checkpoints the simulation immediately before that stroke, without pausing or resetting its generation counter. Undo pauses the run and returns to the latest brush boundary, preserving earlier generations; further Undo can remove earlier segments. Redo restores the saved result. Wind batches join the current running segment instead of adding overlapping snapshots. Pointer cancellation and unrelated controls finalize active gestures without adding a release tap.

Artwork Undo/Redo retains current personal **Brightness, Cracks and Resonance** preferences; their settings saves are not ordinary drawing-history actions. Runtime artwork state still follows snapshots. Explicit project loads and macro commands use recorded values. Other evolution settings retain their own history behavior. Saving a settings dialog is distinct from **Save to profile** for persistence across openings.

### Presets, cycle membership and Yours

Game of Life and Chi Flow have three configurable cycle positions, represented by the evolution icon with **zero, one or two stars**. Factory choices are profile-specific:

| Evolution | First position | Second position | Third position |
| --- | --- | --- | --- |
| Game of Life, profiles 1/2 | Yours, initially Paint 4 rules | Shuffle | Coral |
| Game of Life, profile 3 | Paint 1 | Shuffle | Coral |
| Chi Flow, profile 1 | Harmony | Nova | Alexis |
| Chi Flow, profiles 2/3 | Electric | Harmony | Alexis |

The compact bronze preset panels have the cycle control **to the left** of each preset name. Rule counts are square grids: Game of Life uses 0–8; Chi Flow's existing rule choices are 1–8. Selected rule tiles are gold.

- **Unavailable:** a dim bronze icon when all three positions are occupied; it cannot be added.
- **Available:** a faint cool icon carrying the star count of the vacant position.
- **Assigned:** a lit gold icon carrying its existing position's star count.

Click an assigned icon to free its position, then an available icon to fill it. Only one position can be vacant at a time, and Save is disabled until it is filled. Membership does not apply a generation or immediately change the running app. Save commits the draft; Cancel discards it. Name selection and cycle membership are separate controls.

**Yours always appears first** and retains the last personal rules, even if it is removed from the cycle or another preset is displayed. It can occupy any cycle position. Ordinary saved rule edits update the personal choice; when Yours is assigned, its position receives those edited rules. Other custom snapshots already present in a cycle can appear as additional Yours entries. Rule snapshots and their source identities are saved separately so a personal choice can match a named preset without losing its identity.

Available/unavailable icons and stars transition softly over about half a second. Their enabled state changes immediately. Reduced-motion preferences disable these transitions.

The low-level Chi Flow fallback Yours → Ripples → Nova is not the fresh profile-1 cycle. Save to profile to retain session rule/cycle edits on reopening; dialog Save applies the working choices.

### Technician settings and initialization

Open technicians from the gold control inside **WTF/help**, or swipe up on the evolution-entry control. Startup preferences govern palette, sorting, board size, separators, fill, brush size/mode/color, symmetry and interface mode. They apply on a later opening, not by replacing the current drawing. Factory defaults and the opening-profile policy are documented under [Three settings profiles](#three-settings-profiles).

Hold the evolution-entry control for **600 ms** to enter the simulation interface and initialize with the selected profile's initialization preferences. Continuing the hold performs no additional action. The factory initialization board is 249×249; brush sizes are 1/11/1 for profiles 1/2/3. The action removes separators, fills the board with current palette index zero (Go Dark), applies the initialization brush and starts a new recipe. Optional color and symmetry choices apply; if absent, color uses the final current palette entry and symmetry is retained. Cracks and Resonance runtime is cleared even when board size is unchanged. This changes the artwork; it is separate from deferred Startup preferences and from the Save modal's backed-up recipe reset.

Nudge's interval defaults to 100 ms and can be set from 0 to 200 ms in its selected evolution settings. Zero means one shift per available frame, not an unbounded loop.

### Brightness, Breathe, Islands and DLA settings

Swipe/drag up on the **selected** evolution while paused or running. The gold swipe glow appears only when opening is available. Save commits the draft; Cancel, Escape and outside dismissal discard it. Reset restores original parameter values in the draft and retains the selected mode. Tuning is included in supported project snapshots and settings exports; Save to profile retains session tuning on reopening. Opening or saving does not start playback. Live changes are recorded at their generation without restarting the run; Brightness preferences are retained across artwork Undo/Redo as described above.

| Evolution | Parameter | Range | Original default |
| --- | --- | --- | --- |
| Brightness | Smoothing strength (Brightness mode) | 5–100% of the distance to the local average per generation | 50% |
| Brightness | Contrast strength (Contrast mode) | 1–100% of one palette-index step per generation | 10% |
| Breathe | Rate | 25–300% of the original rhythm | 100% |
| Breathe | Depth | 25–150% of the original brightness deviation | 100% |
| Islands | Copy attempts per generation | 1–50% of the board cell count | 5% |
| DLA | Particle steps per generation | 10–1,000 | 100 |

Brightness, Breathe and DLA also allow selection among their modes. Islands cycles Classic → Sort proximity → Off while paused and alternates its active modes while running. Its dotted leaf marks Sort proximity. Both use the same activity setting; increasing activity or DLA steps increases computational work as well as potential movement. See [Islands](#13-islands) for the copying rule and versioned replay state.

Old settings and recipes use the original tuning values when absent. Brightness/Breathe recipes retain mode and tuning; old `Mode:` records remain readable. Breathe's random rhythms and DLA's randomness are not made deterministic by recording tuning. This is an optional extension of the V1 settings format; compatibility defaults remain intact.

### Save, load and help

The Save modal distinguishes artwork, recipes and preferences:

| Export | Contents | Use |
| --- | --- | --- |
| Image / Moment (PNG) | Rendered image | Keep/share appearance |
| JSON / Idea | Board dimensions, palette identity/order, separator width, tile `k`/`v`/gold and supported optional evolution snapshots | Restore artwork |
| Macro / Journey (TXT) | `INIT_STATE` and recorded operations/timing | Replay the journey |
| Settings (TXT) | `FYI_SETTINGS_V1` and validated workspace preferences | Transfer configuration without replacing artwork |

**Load** identifies settings TXT by its header before parsing recipe TXT. Settings import validates the file, applies preferences and pauses the current simulation; Startup remains deferred and the board is not replaced. JSON restores artwork and clears Undo/Redo history. It is not a complete profile backup or an exact resumable checkpoint for every engine: DLA walkers and Turing chemical buffers, for example, are not serialized by `getCurrentState`. Browser preferences do not automatically save artwork.

**Reset recipe** requires confirmation, then first exports the existing journey as `backup_Intuition_Path_….txt`. Only after the share/download flow reports success does it clear the log and capture the current board as a new `INIT_STATE`. Cancelling native sharing or failing to initiate backup preserves the old log. The board is not cleared. A browser cannot verify the eventual operating-system save destination.

Export uses native file sharing when supported, with download behavior depending on the export path and browser. Finishing or dismissing the share sheet can close the Save modal. A loaded recipe offers macro play, an optional initial palette override and fullscreen presentation. Replay determinism is engine-specific; use JSON for a particular board and TXT for its operations. See [Recording and exports](#recording-and-exports) and [Rendering and image export](#rendering-and-image-export).

WTF/help groups guidance into Creation, Evolution and Tools. English is the primary interface language; Hebrew, Russian and Dutch are also supported. A separate interactive quick-start guide is available, and holding an evolution shows its explanation.

## Three settings profiles

Technicians offers three fixed settings profiles, each with an explicitly saved baseline and an in-session working draft. Switching profiles restores the current session draft. The **star means “different from this profile's factory defaults”**, not “unsaved”: saving a customized profile does not remove its star. Resetting or manually returning to equivalent defaults does. Stars on other profiles remain visible.

### Factory startup defaults

On a fresh installation, FYI opens profile 1 with luminance sorting and a size-1 continuous brush. Random startup resolves a non-archived palette once per opening and avoids the previous random palette when storage works and another palette exists. The preference remains Random; recordings receive the resolved palette. Saved personal Startup choices take precedence. Module defaults in `startup-settings.js` are validation fallbacks, not the complete profile-1 opening configuration.

| Profile | Opening palette | Board / fill | Relative separators | Opening brush color | Interface / resting theme | Initialization brush |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Random active palette | 21×21 / random | Medium | None | Creation / Blue | Size 1; final current entry, retain symmetry |
| 2 | Golden Midnight Extended | 11×11 / random | Small | Current palette index 0 | Simulation / Gold | Size 11; first entry, symmetry Off |
| 3 | Ancient 264 | 15×15 / random | None | Brightest by luminance | Simulation / Smoky turquoise | Size 1; rainbow, left/right reflection |

All three opening brush sizes are 1 and opening symmetry is Off. Opening uses Startup brush size/mode/symmetry instead of the last live brush; switching profiles within a session still restores their working choices. The separately configured **opening profile** defaults to 1, independent of the last profile selected during a session.

Profile 1's Chi Flow slots are Harmony → Nova → Alexis, with each preset's own reach. Profiles 2/3 use Electric → Harmony → Alexis at 400% Magnetic Reach. Profile 3's first Game of Life slot is Paint 1. Profile 2 replaces Temperature and Outside in in its sort cycle with Folded Rainbow and Zigzag; profile 3 shares profile 1's sort cycle. Forward/Channel erosion acceleration defaults are I/V, III/V and IV/V for profiles 1/2/3. Both profile Reset and erosion-dialog Reset use the selected profile's factory erosion values.

### Saving, exporting and copying profiles

Only the active profile's dot opens its action panel, with four actions: **Save**, **Export settings TXT**, **Copy to another profile**, and **Load settings TXT**. Copy and Load request confirmation before replacing their target. Copy preserves the source and current selection. Invalid imports leave the profile unchanged. Profile Reset restores only the selected profile's application defaults and saved baseline; other profiles and the current drawing remain unchanged. Matching former defaults migrate once without replacing unrelated personal values.

Simulation rules, rule cycles and personal/source identities, Nudge timing, evolution tuning, Game of Life genetics and brush shape survive reopening only after **Save to profile** or a confirmed import/copy. Other draft preferences, such as Startup and display settings, persist automatically. Per-map Resonance frequency/strength tables and toolbar layout are separate fields; `withSavedSessionPreferences` in `profile-state.js` defines exactly which fields revert to the saved baseline. Dialog Save applies a working preference; it is not the same as Save to profile.

Profiles contain settings, not drawings. Switching/importing applies preferences and pauses a run without replacing board pixels. Actions are blocked while a macro is loaded or playing. Clearing browser site data removes profiles; a storage failure leaves in-session operation available and reports that persistence is unavailable.

### Profile implementation and display preferences

`js/profile-state.js` validates and persists saved/draft pairs in `colorGridProfileDraftsV1`; `js/profile-controls.js` binds choices, stars and the action panel. Internal snapshots retain Game of Life/Chi Flow cycle sources, personal rules and slot indices. `startup-profile.js` stores the independent opening choice. Old reverted experimental profile keys are not reused.

Capture runs after committed UI events and logged actions, and on page hide/visibility change; it does not poll or run in engine/render loops. Unsubmitted modal fields and board pixels do not enter a profile. Comparisons ignore object key order. Capture merges changes relative to the last runtime observation, keeping temporary replay rules out of drafts. Macro load suspends capture; completion/cancellation rebases the observation without saving replay values.

Resting and running interface colors are separate profile preferences: Gold, Blue, Smoky turquoise, Smoky silver, Ice and Pink. The running default is Gold. Play/Pause selects the effective color without rewriting either preference or artwork. Interface zoom, Wind parameters, language and paused brush-motion recording have separate device-local policies; see [Preferences and modal drafts](#preferences-and-modal-drafts).

## 1. Project structure

The code is modularized to separate logic, state, and UI:

* **`index.html`**: The application skeleton. It contains the Tailwind configuration, the main canvas, all UI buttons, and modal definitions. It loads the logic as a module via `js/app.js`.
* **`js/app.js`**: The core "orchestrator." It manages the global board state, animation loops (`gameLoop`, `animationLoop`), user input handling (Pointer Events), and the Undo/Redo history system.
* **`js/constants.js`**: Central repository for application constants. Includes default simulation rules, grid sizes, history limits, and palette grouping logic.
* **`js/colors.js`**: The color engine. It handles color space conversions (RGB/HEX/HSV) and provides advanced sorting algorithms (Luminance, Dark Rainbow, Temperature, etc.).
* **`js/dom-elements.js`**: A central `dom` object mapping all required HTML elements. This avoids repetitive DOM lookups and keeps the code clean.
* **`js/simulations.js`**: Re-exports several engines from `simulations/`; Islands, Cracks and Resonance are imported directly by `app.js`. It is not the complete engine registry.
* **`js/simulations/*.js`**: Engine implementations. Some return copied state; others deliberately mutate the current board or retain reusable buffers.
* **`js/ui-modals.js`**: Coordinates many modal windows and delegates to specialized dialog modules (Settings, Color Picker, Help) using Dependency Injection.
* **`js/i18n.js`**: English, Hebrew, Russian and Dutch translations. Update all four when changing interface text.
* **`js/data/palettes.js`**: Palette colors, stable original names, icons and archive flags.
* **`js/picker-gestures.js`**: Shared pointer gestures, hold stages, click suppression and picker glow.
* **`js/preset-cycle-membership.js`**: Draft preset membership, vacancy rules and retained UI nodes for fades.
* **`js/evolution-cycle-settings.js`**: Rule snapshot validation, storage and preset/Yours source identities.
* **`js/startup-settings.js`**, **`js/sim-init-settings.js`**, **`js/sort-cycle-settings.js`**: Validated startup, initialization and sorting-cycle preferences.
* **`js/profile-state.js`**, **`js/profile-controls.js`**, **`js/workspace-settings.js`**: Saved/draft profiles, configuration validation and settings TXT import/export.
* **`js/brush-footprint.js`**, **`js/brush-picker*.js`**: Footprint geometry and brush-picker controls/navigation.
* **`js/evolution-drawer*.js`**, **`js/*-settings*.js`**: Toolbar assignment and specialized preference/dialog logic.
* **`js/display-canvas.js`**, **`js/soft-bloom.js`**, **`js/smooth-rendering-settings.js`**: Display bitmap, Glow and smoothing.
* **`js/pwa.js`**, **`service-worker.js`**: Offline installation and explicit update flow.
* **`tests/*.test.mjs`**: Node regression tests; see the [app-only test selection](#app-only-node-tests). Nudge's engine and timing remain in `app.js`.

## 2. State management and rendering

### Board State (`boardState`)

The grid is represented as a 1D array of length `n * n`. Each tile object contains:
* `k`: The current color index from the active palette.
* `v`: A numeric palette coordinate used by several engines; brightness can retain fractional values. Turing chemical concentrations are held in separate buffers.
* `prevK`: The previous color index (used for smooth color interpolation/lerp).
* `animStart`: Timestamp of when the current color transition started.
* `isGold`: Marks a gold tile. Protection is engine-specific: several engines skip gold, Contours explicitly overwrites it, and some spatial modes move it. Do not assume universal immunity.

### Rendering and image export

`renderBoard` in `app.js` has two paths, independent of whether the creation or evolution controls are shown:

1. **Separated tiles (`separatorPx > 0`)** use individual `fillRect` calls over a black background.
2. **Zero-gap cached raster (`separatorPx === 0`)** writes cached `ImageData` at `n × n`, then scales the offscreen canvas to the display. `imageSmoothingEnabled` follows the rendering argument rather than always being false.

Screen smoothing defaults on, but zero-gap boards smaller than 149 remain crisp without changing that preference. `display-canvas.js` aligns the backing bitmap with `devicePixelRatio` while drawing coordinates remain CSS pixels; canvas dimensions are not reset each frame. `soft-bloom.js` adds display Glow without changing tile indices. Fresh factory Glow is enabled at 32%; old V1 files with omitted fields retain the legacy off/35% fallback.

PNG export renders **4096×4096** with a black frame, rather than capturing the controls. Export smoothing and Glow can be overridden without changing display preferences. Each opening of Save initializes them from effective screen smoothing and display Glow. Separated PNGs scale the gap width to match on-screen proportions without changing stored board values.

### Artwork, runtime and preferences

`getCurrentState` supplies artwork/history/project snapshots: board dimensions, palette identity, order, resolved separator width, tile `k`/`v`/gold and supported evolution fields. It is not a copy of every runtime object or preference. Turing chemical buffers and DLA walkers are not included. Islands, Cracks and Resonance retain their versioned runtime snapshots when relevant.

Profiles and settings TXT represent configuration separately. Replay temporarily supplies recorded rules/runtime without making those values user preferences. Manual history retains personal Brightness, Cracks and Resonance preferences while restoring their artwork/runtime state. Keep these lifetimes distinct when extending exports or history.

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

The default tap cycle for profiles 1 and 3 is luminance → dark-rainbow → reversed → center-out → temperature → outside-in. Additional methods are available through the modal; Waves/Bioms are no longer available. `SORT_MODES` in `colors.js` is the actual registry, and sorting icons also have corresponding SVG definitions in `index.html`.

### Palette Data Structure (`js/data/palettes.js`)

Palettes are stored as static JSON-like objects in js/data/palettes.js.

Palette Structure:

```js
{
    originalName: "Golden Hour", // Stable source identity; display name is derived
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

Keep `originalName` when adding a palette. Palette icons use `iconHTML` for SVG or an emoji fallback. Display names can be translated while `originalName` preserves identity. Some older JSON/macro data uses array indices, so reordering palette data can affect compatibility; there is no separate persistent palette ID.

## 4. UI, localization and modals

### Internationalization (`js/i18n.js`)

The application uses a custom, lightweight i18n engine.
* **The Dictionary:** `translations` holds localized strings; some legacy labels/fallbacks remain in HTML. Use `getText` or the existing `data-debug-text` bindings for new text and provide all four languages.
* **Adding New Languages:** To add a language, update the `translations` dictionary with the new locale code (e.g., `es` for Spanish) and update the available-language registry returned by `getAvailableLangs()`. Always use `getText('key')` in the JS logic.

### Modal Management & Dependency Injection (`js/ui-modals.js`)

Because `app.js` controls the core state, importing it directly into `ui-modals.js` would create a circular dependency.
* **The Solution:** When `app.js` initializes, it bundles necessary state getters and action callbacks into a `contextForModals` object. `initializeModals(context)` receives this context, allowing the UI modals to safely read the board size, update rules, and trigger actions.

Adding a New Settings Modal:
HTML: Define the modal or dialog in `index.html`, using the appropriate existing visibility and focus lifecycle.

DOM Setup: Map the buttons and containers in dom-elements.js.

UI Setup: In `ui-modals.js`, connect an opener/closer to the injected context. Use `modal-visible` for overlays that already follow that transition pattern; native dialogs use their own lifecycle.

Save Logic: When the user clicks "Save" inside the modal, read the slider/button values, update the respective rule object via a setter provided in the context, and close the modal.

### Help, accessibility and layout

English, Hebrew, Russian and Dutch have localized labels, with RTL handling in relevant dialogs. `quick-start.js` implements a separate interactive guide; `evolution-explanation.js` shows held-evolution explanations. Buttons/selectors use accessible names and pressed/selected states. Several dialogs restore focus, handle Escape and provide keyboard navigation; the brush picker traps Tab at its boundary. Help/palette tabs support directional keys with RTL handling. This does not establish complete keyboard-only canvas drawing or audited accessibility compliance.

Interface size is a device-local **70–120%** preference, default **84%**, outside profiles/history/recipes. `updateLayout` adapts to viewport dimensions and control height; fullscreen macro presentation uses its own sizing. Supported transitions and Wind honor reduced motion. The current viewport and input handlers suppress browser pinch/double-tap zoom; interface sizing is a separate control, not evidence of unrestricted browser zoom support.

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

These compatibility storage keys do not override the profile saved/session policy. Not every default is in `constants.js`: startup/init defaults have dedicated modules, and Nudge's interval remains in `app.js`. Default rule arrays and both preset registries are in `constants.js`.

`preset-cycle-membership.js` maintains a modal draft with one possible vacancy. It retains rendered glyph/button nodes across refreshes, allowing opacity, color and star transitions to interpolate instead of abruptly rebuilding the UI. Functional enable/disable changes remain immediate. Dialog Save commits complete slots and personal identity to working preferences; Save to profile retains these session choices on reopening. Cancelling discards the modal draft.

Different modals use dialogs, visibility classes or inline display state. Follow the existing modal's lifecycle rather than applying one universal close/open recipe. Dependency-injected getters/setters from `initializeModals(context)` keep UI modules from importing `app.js`.

| Data | Lifetime / destination |
| --- | --- |
| Artwork / Undo stack | In memory; explicit PNG/JSON/recipe exports |
| Profile saved baseline | `colorGridProfileDraftsV1`; explicit Save/import/copy |
| Simulation rules/cycles/tuning, Nudge timing, genetics, brush shape | Working profile session; unsaved values revert on reopening |
| Other profile draft preferences | Automatically persisted according to `profile-state.js` |
| Opening profile | `colorGridStartupProfile`; independent of last-used profile |
| Workspace settings export | `FYI_SETTINGS_V1`; persisted compatibility copy in `colorGridWorkspaceSettings` |
| Wind settings | `colorGridWindSettingsV1`; device-local, outside profiles; tool activation temporary |
| Paused brush-motion recording | `colorGridBrushMotionRecording`; device-local, future recording only |
| Interface zoom | `colorGridInterfaceZoom`; device-local |
| Language | `userLanguage` |
| Replay overrides | Temporary; must not become profile preferences |

## 5. Simulation integration

Execution is controlled by the `armedSimulation` variable. When active, `togglePlayPauseLife()` starts the `gameLoop()`. Inside the `gameLoop`, a `switch(armedSimulation)` statement dispatches to the re-exported engines or directly imported engine wrappers and updates the `boardState`.

### Adding an evolution

1.  **Logic (for example, a new `js/simulations/chaos.js` file)**: Define an engine with explicit board/rule inputs and document whether it copies or mutates its board, and whether it keeps auxiliary state.
2.  **Import/export:** Wire the engine through `js/simulations.js` or an explicit import, following the relevant stateful-engine pattern.
3.  **Constants (`js/constants.js`)**: Define default rules: `export const defaultChaosRules = { ... };`.
4.  **UI (`index.html` & `dom-elements.js`)**: Add a button `<button id="btnChaos" ...>` and reference it in the `dom` object.
5.  **Wiring (`app.js`)**: Initialize rules, include the button in simulation reset lists, and add the click Event Listener.
6.  **Loop Integration (`app.js`)**: Add dispatch to both `gameLoop` and `stepForward`, unless it is a rendering-only animation like Breathe.
7.  **Toolbar:** Register the control in `evolution-drawer-settings.js` where appropriate and preserve unique slot assignments.
8.  **Compatibility:** Add rule recording/replay, settings/gesture wiring where relevant, four-language text and focused regression coverage.

## 6. Evolution engines

Engine contracts differ. Game of Life, Chi Flow, erosion, contours and brightness create copied board data. Gravity, magnet and spiral generally swap or update tiles in place. Islands updates cells in place; Resonance swaps pigment values in place, while Cracks returns updated artwork and versioned growth state. Turing retains chemical buffers; DLA retains crystal and walker state. Treat allocation, caches and gold handling as part of each engine's contract.

### 1. Breathe (Animation Engine)

**File:** `js/simulations/breathe.js`

Unlike other simulations that update discrete states per generation, `Breathe` operates directly inside the `animationLoop` to manipulate pixel brightness dynamically.

* **Mathematical Model:** Solo/Group use a continuous sine wave (`Math.sin()`) and elapsed animation time to calculate a luminosity multiplier; random modes use changing independent pulse rhythms.
* **Modes (`breatheEvoMode`):**
    * `solo`: Each tile pulses individually. The sine wave's phase is offset by an initial `startDelay` assigned when playback starts.
    * `group`: A synchronized organic pulse. The sine phase is offset by the tile's current color index (`tileData.k * 0.8`), causing adjacent colors to breathe in localized "waves".
    * `random-cell`: Each cell has an independent changing pulse rhythm.
    * `random-color`: Cells with the same palette index share a changing rhythm.
* **Rendering:** `getBreatheBrightnessFactor()` and random pulse sessions leave underlying color indices unchanged. Gold is not dimmed. Rate and Depth scale the effect.

The button cycles Solo → Group → Random cell → Random color → Off. Changing its mode with the button pauses it. Single step is unavailable. Random pulse sessions are recreated on Play and are not deterministic recipe state.

### 2. Brightness Evolution & Contrast

**File:** `js/simulations/brightness.js`

These models simulate cellular smoothing and contrasting by treating the color index (`v`) as a continuous float representing "brightness".

* **Brightness Evolution (Smoothing):**
    * Calculates the average `v` over the valid 3×3 neighborhood, including the cell itself and excluding gold tiles.
    * Smooths the current cell's value towards the local average using configurable `smoothingFactor` (default 0.5).
    * Mathematically mimics a blur or diffusion effect over time.
* **Contrast Generation (Sharpening):**
    * Calculates the valid neighboring average excluding the center and gold tiles.
    * Inverses the smoothing logic: If a cell is *brighter* than its neighbors, it adds configurable `strength` (default 0.1) to become brighter. If *darker*, it subtracts to become darker.
    * Mathematically mimics an unsharp mask or localized edge-enhancement.
* **Clamping:** Both simulations strictly clamp the resulting float (`newV`) between 0 and `maxIndex` before rounding it back into an integer `k` for rendering.

These values are palette ranks, not independently recomputed luminance.

Brightness/Contrast settings are session preferences rather than drawing-history actions. Saving their sliders or mode while paused adds no drawing Undo entry; ordinary Undo/Redo retains the current brightness and contrast values and mode, even across older strokes. Recipe history checkpoints include the retained values. Explicit project loading and macro history still use recorded settings, including legacy defaults; ending or cancelling a macro restores the brightness preferences held before loading it. Other evolutions keep their existing history behavior.

### 3. Contour Lines (Topography)

**File:** `js/simulations/contour.js`

An edge-detection algorithm that generates topological contour maps based on color gradients.

* **Threshold Logic:**
    * The user UI defines `sensitivity` (0-100), which maps to a threshold percentage (nominally 1% to 50% of the palette length). The current implementation uses `sensitivity || 30`, so a value of zero falls back to 30 rather than reaching the nominal zero-sensitivity endpoint.
    * A tile is marked as an "edge" if the absolute difference in index (`Math.abs(currentK - neighborK)`) between it and its North/South/East/West neighbors is at least `LUMINANCE_THRESHOLD`.
* **Execution:**
    * It reads the entire board first (`indicesToChange`), then applies the contour line color (Darkest or Lightest index) simultaneously. This prevents cascading chain reactions within a single frame.

### 4. Erosion (Granular Physics)

**File:** `js/simulations/erosion.js`

A downward-falling visual model of sediment settling and weathering. The following original rules describe Lateral carving (`legacy`); the channel modes use the separate rules below.

* **Palette Mapping:**
    * The palette is virtually sliced into three states based on index percentages: `Earth` (Bottom 20%), `Air` (Middle 60%), and `Water` (Top 20%).
* **Physics Rules:**
    * Only `Water` tiles (the final palette entries) actively fall; ordering determines the material roles.
    * **Direct Fall:** Swaps with `Air` immediately below.
    * **Weathering:** If it lands on `Earth`, there is a chance (`erosionStrength`) it will "erode" the earth tile (incrementing its index by 1) before sliding.
    * **Sliding:** If the path directly below is blocked, it checks the bottom-left and bottom-right diagonals. The legacy pass scans from the end of the board toward the start and chooses the right diagonal with 75% probability when both are available; this bias is not a physical balance guarantee.

The button cycles **Channel carving (`channels`) → Forward carving (`channels-solid`) → Lateral carving (`legacy`) → Off** while paused, skipping Off while running. The original rules above remain the legacy mode.

* **Channel carving:** The first 20% of palette indices are air, the middle 60% earth, and the last 20% water. These roles follow palette order, including custom sorting.
* Water erodes at most one adjacent earth cell (below or beside it) per generation, reducing its palette index until it becomes air. It prefers downward movement, then diagonals, then sideways movement into air.
* **Forward carving:** Shares channel-carving movement, but the first 20% of indices are earth and the middle 60% air. Earth erodes forward through palette indices until it becomes air. The final 20% remain water.
* Each water cell moves at most once per generation. Water remains at the floor; no water is injected or removed. Gold cells are protected in the channel modes; the legacy pass does not apply the same exclusion. The selected mode is included in project saves and action-log rules.

Channel/Forward carving have per-mode acceleration stages. Factory Forward/Channel values are I/V, III/V and IV/V for profiles 1/2/3. Acceleration controls the erosion contacts needed to cross the earth range; `erosion-settings.js` resolves relative stages against palette length. Recipes record the resolved `erosionEvents` count, preserving old runs independently of later UI stage definitions. Legacy pace/count fields retain their compatibility behavior.

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

`reach` is a distance in **palette indices**, not a spatial radius. Auto (`0`) uses `max(2, floor(numberOfColors / 6))`. The UI rule choices are 1–8. Magnetic Reach exposes 50%, 75%, 100%, 200% and 400% of Auto, rounded and clamped to the palette range. Older intermediate percentages, offsets and absolute reaches remain readable through `chi-reach.js`. Recipes store resolved absolute reach rather than reinterpreting the preference during playback.

An ignition pass operates when the input has between one and 149 active cells. It injects random palette entries in bounded 9×9 areas around those cells. It is stochastic and does not independently ignite a completely empty board. This engine does not apply a general `isGold` exclusion.

Default rules correspond to Harmony. Presets are centralized in `CHI_FLOW_PRESETS` in `constants.js`; the low-level fallback is Yours → Ripples → Nova. Factory profile 1 overrides it with Harmony → Nova → Alexis, while profiles 2/3 use Electric → Harmony → Alexis at 400% reach. The user can replace any of those positions without changing the engine ID.

### 7. Turing Patterns (Reaction-Diffusion)

**File:** `js/simulations/turing.js`

An implementation of the Gray-Scott reaction-diffusion equations for biological/chemical-style patterns such as stripes and coral.

* **Memory Architecture (Ping-Pong Buffers):** It uses pre-allocated `Float32Array` buffers for chemical A and B concentrations. It swaps current and `next` buffers to reduce allocation in the numerical loop; mapping chemicals back to board tiles still allocates.
* **Laplacian Convolution:** Computes diffusion using a 3x3 kernel with precise mathematical weights: Center (-1.0), Adjacent (0.2), and Diagonal (0.05).
* **Visual Mapping (Non-Linear):** Chemical float values aren't mapped linearly to the palette.
    1. **Stretching:** The active chemical range `[0.05, 0.78]` is stretched to cover `[0.0, 1.0]` so no palette colors are lost.
    2. **Gamma Correction:** Applies a power curve (`Math.pow(visualValue, 1.5)`) to push the majority of the board into deeper, darker palette colors, leaving the bright colors for sharp, highly-concentrated edges.

Turing initializes chemical buffers from nonzero, non-gold board cells; if none exist, it seeds the center internally. Subsequent board-index edits synchronize into chemical state before stepping. Chemical neighbors wrap at edges. One visible generation runs `max(3, floor(n / 25))` numerical iterations. Displayed gold cells are retained. JSON artwork exports omit the chemical buffers and are not exact resumable Turing checkpoints.

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

### 9. Gravitational Sort

**File:** `js/simulations/gravitational_sort.js`

Spatially sorts current palette indices with direction-dependent comparisons. “Heavy” or “dark” describes palette order here, not an independently recomputed luminance.

* **In-place sorting and caching:** Operates entirely by mutating the `nextBoardState` in place, avoiding board copies during the sorting passes. Radial cache construction allocates when needed; this is not a blanket zero-allocation claim for the entire application.
* **Directional Vectors:**
    * `up` / `right`: Linear sorts using optimized, direction-specific `for` loops.
    * `center_x`: Pulls lower indices toward the center using four-neighbor distance checks.
    * `vortex`: Uses cached radial order and bidirectional fixed-stride sorting; available through settings, outside the three-mode button cycle.

### 10. Game of Life

**File:** `js/simulations/game_of_life.js`

An artistic adaptation of the classic cellular automaton. The default in profiles 1/2 is Paint 4, not Conway's standard survival `[2, 3]` / birth `[3]`: Paint 4 uses survival 0–8 and birth 4–8. Presets are centralized in `GAME_OF_LIFE_PRESETS`; profiles 1/2 start with Yours → Shuffle → Coral, while profile 3 starts with Paint 1 in the first slot.

* **Live Cell Definition:** Instead of a binary state, a cell is considered "alive" if its color index is strictly greater than 0 (`notDarkest`). Gold tiles are strictly immune.
* **List-Based Rules:** Supports complex rulesets by checking if the live neighbor count is `.includes()` in the survival/birth arrays (e.g., survival: `[2, 3]`, birth: `[3]`).
* **Boundaries:** Game of Life checks neighbors within the board; it does not wrap edges like Chi Flow.
* **Color Genetics:** RGB genetics (default) finds the closest palette color to the live parents' average RGB. Palette order genetics instead uses their rounded average current palette rank, kept above zero when possible. Genetics affects newborn colors, not survival/birth lists, and is shared across all three rule slots. Sorting therefore changes Palette order inheritance. Save to profile to retain a session genetics choice on reopening.

### 11. DLA (Diffusion-Limited Aggregation)

**File:** `js/simulations/dla.js`

Random walkers move until they touch an existing crystal, then add a colored cell. Initialization and respawning use available board positions, rather than always launching from edges. Existing non-gold cells with index greater than zero are the only crystal seed. Entering on an empty board never paints a center seed; draw a nonzero seed to allow growth.

The button cycles Genetics → No genetics:

- Genetics averages valid neighboring crystal colors, finds the nearest palette entry and retains a successful-color fallback.
- No genetics derives the entry from crystal size modulo palette length.

Both avoid index zero when creating crystal cells. `emptyIndices` supports respawning on crowded boards. A fresh DLA entry rebuilds crystal and walkers from the current board; live Genetics/No genetics changes retain that runtime. Brush samples and replayed strokes synchronize crystal/empty-cell indexes. Gold is not universally protected: sticking can overwrite a gold cell. DLA uses `Math.random`, so recipes do not promise identical pixels, and JSON does not retain walkers. The `fastMode` branch currently returns the state unchanged; do not assume it is an implemented faster variant.

### 12. Nudge

**Implementation:** `js/app.js` (`applyNudgeLogic`, `getNudgeTiming`, `applyNudgeTiming`).

Nudge moves editable tile indices toward higher or lower entries of the current palette. Single step performs one shift; continuous playback uses the selected interval, default 100 ms. Zero selects a shift on each available frame, not an unbounded loop.

Timing preferences use `colorGridNudge`; use Save to profile to retain session timing changes on reopening. Recorded timing uses `nudgeTimingVersion: 1`; legacy recordings without this metadata retain their original frame-counting behavior. Replay timing is separate from the saved user preference. Avoid interpreting old generation tags with the new interval semantics.

### 13. Islands

**File:** `js/simulations/islands.js`

Islands is an asynchronous neighbor-copy process. Classic chooses a random cell and cardinal neighbor, skips edges without wrapping, and protects gold. Sort proximity additionally accepts copying with probability `1 / (1 + 4 × distance / span)`, where distance is the absolute difference in current palette ranks and `span = max(1, paletteLength - 1)`. Nearby ranks copy more often; the farthest pair still has a 20% chance. There is no weighted neighbor selection or adjustable proximity strength. Sorting changes the ranks while preserving visible board colors.

Each generation attempts `max(1, floor(cellCount × activity))` copies; activity defaults to 5% and ranges from 1–50%. Failed and same-color attempts need not change a cell. Classic → Sort proximity → Off is the paused cycle; live cycling skips Off without resetting the board, generation counter, random cursor or activity.

Classic uses engine version 1 and proximity version 2. Sessions serialize seed, PRNG cursor and steps; snapshots and recipes retain mode/activity for deterministic continuation. Legacy version-1 recordings remain Classic. New live mode changes are recorded at their generation, and Undo/Redo restores the corresponding runtime.

### 14. Cracks (experiment)

**File:** `js/simulations/cracks.js`

The Cracks/Contours button defaults to Cracks and cycles Cracks → Contours → Off while paused; running cycles alternate Contours/Cracks without pausing. Cracks grows thin branching fractures in colored material and stops at existing line-colored cells, protected gold and the board edges. Its four line-color choices are described below; sensitivity remains exclusive to Contours. Draw colored areas and press Play or Single step. Drawing remains available during playback. The branching icon marks Cracks. This is a visual experiment, not a physical stress model. Runtime tips and the deterministic random cursor are optional project/history/macro fields; old contour recordings still use the original engine. Profile preferences and file format versions are unchanged.

Cracks resumes growth after new brush painting, including Pause → paint over old cracks → Play. Painted material queues a local nucleus without painting during Pause, while surviving tips continue. New sessions use engine version 3; version-1 saved sessions and recipes retain finite-root behavior, and version 2 retains its original renewal behavior. Pending nuclei are included in existing snapshots for Undo/Redo, JSON and macro replay. Protected gold does not create a nucleus; in solid-color modes, painting the line color does not either.

Cracks has a separate native settings dialog (swipe its selected button up), available paused or running. Material response starts disabled, with 40% influence when enabled: early palette ranks are harder, later ranks softer. Hard areas remain intact, while tips slow down or turn toward softer neighbors. Sorting changes the material roles without changing the visible colors. Off or 0% restores the previous geometric growth exactly. Settings include material On/Off, influence and line color; Cancel, Escape and outside dismissal discard drafts, and Reset changes only the draft. Save is recorded at the current generation during a run, without pausing. Settings are included in settings TXT and relevant JSON/history snapshots; Save to profile retains session rule changes on reopening; recipe material overrides are temporary and do not replace user preferences. Older engine versions ignore the material feature unless settings are deliberately saved for a new version-3 run.

When all Cracks tips have stopped, pressing Play renews the finite nucleus budget if adjacent eligible material remains, even without new painting. Saving Cracks settings also prepares this renewal, including during playback. This action does not paint while paused, does not reset surviving tips or the random cursor, and preserves hard, line-colored and gold barriers. The renewed nucleus is recorded in the existing runtime snapshot for exact replay; version-1/2 sessions keep their original behavior.

Saved Cracks preferences (material On/Off, influence and line color) stay in effect across drawing Undo/Redo, including repeated Undo into strokes made under older settings. Saving preferences does not create a drawing-history action. Runtime tips and the random cursor still follow artwork history; explicit project loads and macro playback retain their recorded settings. New Undo/Redo recipe checkpoints record the effective retained preferences.

Cracks settings also expose the existing growth constants: branching chance (0–100%), steps between branching opportunities (1–40) and curvature (0–200% of the original drift). They work independently of material response. Save and Reset follow the same draft/profile behavior as other Cracks preferences; drawing Undo/Redo retains them, including saved defaults. The original 65% / 11 / 100% values preserve legacy growth; the current opening/Reset preset is Fibonacci Bloom as specified below. Version-1/2 runtimes ignore these controls until deliberately saved/upgraded; old version-3 recipes use the original constants when tuning is absent. Custom tuning is an optional `rules.contour.growth` extension and is recorded explicitly for new recipes.

Cracks settings group material, growth and line color in a scrollable dialog with fixed header/actions. The three growth controls have short localized explanations. Line color adds Original anchor: the first color of the palette’s original stable luminance ordering is resolved into the current ordering on each step, brush renewal and resume, so changing sort preserves that color. Legacy settings without a line-color choice retain Darkest (current index 0); Lightest remains current last index. Original-anchor settings and sort changes are retained in profiles, snapshots, drawing Undo/Redo and recipe playback.

Cracks growth presets are First Whisper (65% / 11 / 100%), Quiet Flow (40% / 22 / 100%), Crystal Paths (40% / 22 / 0%) and Fibonacci Bloom (55% / 8 / 130%), listed as branching chance / interval / curvature. The four buttons edit only the growth draft; Material and Line color stay unchanged. Exact values determine the selected preset; other values show Custom. Save persists numeric values without a preset identifier, and Cancel discards the draft. Reset restores Fibonacci Bloom with material Off at 40% and Brush color as the line source. Explicit material On values in files/recipes remain On; missing growth in old recipes retains the original 65% / 11 / 100% behavior.

Cracks opens with Fibonacci Bloom (55% branching / 8 steps / 130% curvature) and Brush color as its line source on every app entry, after applying stored startup/profile settings. Session edits and explicit profile, project and macro loads still use their own values. Legacy missing-growth recipes retain 65% / 11 / 100%; the opening default never rewrites those rules.

Line color uses four square buttons: Darkest, Lightest, Original anchor and Brush color. Brush color follows the live selected brush; an empty brush falls back to Darkest. Existing pixels keep their colors. Rainbow chooses a deterministic palette color per new cell and uses an optional sparse visited-trail map for collisions instead of color equality. The map is ignored for solid colors and survives project/history/recipe round trips. Painting over visited cells clears those marks without advancing a paused simulation. Returning from a solid color to rainbow retains the remaining rainbow trail; solid-color modes keep their original color-based collision behavior. Live brush-source changes are recorded as simulation rules independently of the brush chosen during replay. Saved Cracks settings remain independent of drawing Undo/Redo.

Holding the evolution-entry control to initialize the board also discards the Cracks runtime (tips, nuclei, random cursor and rainbow collision trail), including when the board size stays unchanged. Saved Cracks rules remain intact. Undo/Redo restores the respective old/new artwork runtime, and new post-initialization recordings start from the fresh run. Existing GO_DARK recipe behavior is unchanged. Material response still treats palette index 0 as a hard barrier at influence 50% or above; initialization does not bypass that rule.

Cracks now starts a freshly selected human run with a crypto-generated seed, including return from Brightness and the live Contours→Cracks cycle. Its initial random cursor exists before PLAY/STEP recording and the first history checkpoint. Pause/Play continues the same runtime; existing recording fields already serialize the cursor, so macros and restored snapshots retain the recorded sequence. `createCracksState` keeps its fixed legacy fallback; no growth rules or recording schema changed.

### 15. Resonance

**Files:** `js/simulations/cymatics*.js`, `js/cymatics-settings.js`

Resonance (internal ID `cymatics`, unchanged for existing files and toolbar assignments) is initially parked in Evolution map. Assign it to one of ten toolbar slots, select it and use Play or Single step. Swipe up for settings while selected, including during a run. Settings provide map buttons and Frequency, Phase motion and Strength controls. Strength defaults to 35% for fresh preferences and Reset; explicit saved values remain authoritative.

Six maps are available: Diagonal (version 1), Crosshatch (version 2), Circular (version 3), Interference (version 4), Clouds (version 5), and Cosmological empathy (version 6). Diagonal uses a single stroke; Crosshatch uses four linked diamond tiles, consistently in settings and on the toolbar. The toolbar cycles Interference → Circular → Diagonal → Crosshatch → Clouds → Cosmological empathy → Off while paused, skipping Off during a run. Activating the evolution retains any saved map; a legacy omitted map version means Diagonal. Off queues Interference for the next activation. It retains the active runtime, generation and phase on running map changes. Each map remembers its own frequency and Strength: fresh Interference is 800 Hz, Circular 20000 Hz, Diagonals/Crosshatch 11831 Hz, and both new maps 800 Hz. Phase motion starts on, follows the existing generation cursor and freezes on Pause. The frequency slider remains logarithmic from 20 to 20000 Hz. Clouds blends nine directional waves across three spatial scales; Cosmological empathy now blends smooth rounded islands with curved, soft bridges. Its deterministic site distribution spans the canvas without a repeated tile; frequency changes detail and phase gently moves and pulses the connections. Both use the recorded generation cursor; their field motion cycles after 1200 generations, with cached geometry and the four existing field calculations unchanged. These are artistic fields rather than acoustic or cosmological solvers. The field is an artistic approximation, without sound; adjacent color exchanges conserve pigments and protect gold cells.

Frequency and Strength use separate optional `cymaticsFrequencies` and `cymaticsStrengths` preference tables. Fresh/reset Strength is 35% in all six maps; old preferences without the Strength table initialize every map from their previous shared Strength. Only Phase remains shared. Dialog edits remain drafts until Save; Cancel/Escape discard them, and Reset restores all six frequencies, Strength and Phase together. Drawing Undo/Redo retains personal rules and the independent per-map frequency and Strength tables. Projects and recipes retain effective rules and deterministic runtime; macro overrides do not replace preferences. Missing map versions in old Resonance recordings retain Diagonals, and missing Phase remains off. The obsolete `pattern` field is accepted only as inert metadata in old Resonance rules. Other Resonance field calculations remain unchanged. Cosmological empathy has one implementation: the rounded field. The earlier Voronoi generator and version switch have been removed. Saved preferences discard the retired version metadata while retaining Strength, frequency and Phase. New project and recipe snapshots contain no cosmic-version field.

The experimental Patterns controls, four named templates, icon, translations and field generator have been removed. Old preferences for that experiment migrate to Resonance while retaining explicit Strength and other profile settings. Old artwork/recipe checkpoints that require the removed experiment fail validation instead of silently replaying a different result. Existing Resonance projects, recipes and Studio playback remain supported.

Dialog Save applies working rules; see the [profile saving policy](#saving-exporting-and-copying-profiles) for reopening. Per-map frequency/strength tables are separate preference fields.

## 7. Additional systems

### Palette remapping

The application remaps palette indices to preserve visible colors. When a user changes the sorting method of a palette (e.g., from "Luminance" to "Reversed"):
1.  `applySortMethod` is triggered.
2.  The engine captures the exact Hex color of every tile on the board.
3.  The underlying palette arrays in `C.PALETTES` are sorted.
4.  **The Re-map:** The engine iterates through the board and finds the *new index* (`newK`) of the original color in the sorted palette. It updates the `k` property so the visual output remains identical while the internal logic adapts to the new order.

Selecting a different palette changes colors rather than preserving them. A group change uses palette-size adaptation as one history action; keep it separate from the sorting remap above.

### Input and interactions

Input is handled via a unified Pointer Event system supporting mouse and touch:
* **`pointerState`**: Tracks dragging, source indices for copying, and timers.
* **Brush Mode**: `isBrushModeOn` selects painting; `isContinuousBrushOn` adds line completion between successive anchors. Copy mode tracks a dragged source and applies it at the destination. Gesture cancellation and suppressed compatibility clicks prevent duplicate actions.
* **Symmetry**: All manual interactions automatically trigger the `getSymmetricIndices` helper to apply changes across the Vertical, Horizontal, Mandala, or Kaleidoscope axes.
* **Live brushes**: Painting, continuous lines, copying, rainbow, brush radius and symmetry work during simulation playback. A running simulation is not paused by drawing. Holding the board while running does not reset the selected color or open a picker; those board shortcuts remain available when paused. This is separate from holds on the Color control. Macro playback retains its existing full-screen tap behavior and accepts no live painting.
* **Gesture boundaries**: A control action, Pause, pointer cancellation/capture loss, blur or hiding the page finalizes an active brush gesture without adding a release tap. Secondary pointers cannot replace its owner. Wind exclusively receives board input while enabled; disabling it stops and commits every pending front before brush input resumes.
* **History boundaries:** The first painted sample of each live brush gesture checkpoints earlier simulation generations; the current segment owns the subsequent stroke and evolution. See [Undo and redo](#undo-and-redo). DLA crystal/empty-cell indexes synchronize after live brush samples and replayed strokes.

### Styling and animations (`styles.css`)

The app utilizes Tailwind CSS for utility classes, heavily customized with vanilla CSS in `styles.css`.
* **CSS Variables:** Global theme colors like `--gold` (`#FFD700`), `--sim-color`, and `--bg-color` are defined in the `:root`.
* **Glow Effects:** The `.glowing-border` and `.glowing-border-rainbow` classes use CSS `box-shadow` and `border-image` to create dynamic, breathing borders around the canvas based on the currently selected color.
* **Custom Animations:** Keyframes like `fadeInText`, `fadeOutText`, and `spin` are explicitly defined for splash screens and loading states, for interface transitions. Do not infer a fixed frame-rate guarantee from their presence.

## 8. Art logger and macro replay

### Recording and exports

`window.logArtEvent(eventName, details, forceLog)` appends session recipe events. A recipe begins with `INIT_STATE` containing board dimensions, palette, sorting, separators and compressed color indices. This compression is not a complete JSON project backup: it does not carry every tile field.

Live brush input emits `DRAW_STROKE` packets as pointer events paint, using the existing generation tags during discrete simulations and timestamps during breathing. Each packet contains the complete brush footprint, including targeted cells whose color already matched. Simulation changes outside the footprint never enter a brush packet. Each packet visits only brush targets; the first painted sample separately captures the live simulation history boundary, rather than copying the board for every packet; DLA separately rebuilds its crystal indexes after a sample. The existing array format is retained; copied protected cells may additionally specify `isGold: true`. Missing `isGold` retains the legacy unprotected-cell behavior. With Brush stroke playback disabled, paused strokes emit one packet at completion; the default progressive mode is described below. Even a stroke that leaves the original board visually unchanged is recorded and receives a history entry, so its paint intent survives replay on a different board and can be removed/restored by Undo/Redo. Running sessions likewise retain their brush intent when paused, including visual-only breathing sessions. Replay applies packets to the evolving board and retains the simulation/brush history boundaries instead of creating overlapping per-packet entries.

**Brush stroke playback** defaults on and records progressive samples even while paused. Paused groups use `BRUSH_START` / `BRUSH_END` version 1 around `DRAW_STROKE` arrays and remain one Undo action. Disabling it affects future paused recordings only; running simulations always record progressive packets, and loaded recipes are unaffected. The preference is device-local, outside profiles. `BRUSH_CHECKPOINT` / `BRUSH_CONTINUE` preserve live brush boundaries without resetting the generation counter; replay resumes a retained boundary before waiting for later generations.

Events carry timestamps, and generation-based actions include `[GEN:n]`. The logger records board strokes/diffs, palette and sorting changes, play, pause, single steps, live mode changes, Nudge timing and history metadata. Logging has some overhead and does not make the entire application allocation-free.

`PLAY` and `STEP FORWARD` include actual evolution rules. Game of Life and Chi Flow mode events also snapshot all three rule slots, the personal rules and source identities (`cycleSources`). The player injects the recorded values, so later edits to named presets do not silently change old journeys.

Save the journey through the save modal, using `exportArtRecipeLog()`. Current TXT filenames use `Intuition_Path_<palette>_<line-count>.txt`. Save/Play long presses no longer export or reset the logger. `resetArtRecipeLog()` requires confirmation and a successful backup share/download flow before clearing the log and capturing a new start; cancelling sharing preserves the old log. See [Save, load and help](#save-load-and-help). New `INIT_STATE` records can also retain protected gold indices and a live simulation context (rules, generation and elapsed time).

### Playback and history compatibility

`onProjectFileSelected` recognizes settings TXT by its `FYI_SETTINGS_V1` header, routes other TXT to `parseMacroText`, and JSON to artwork restoration. Loading a macro exposes a play overlay and optional initial-palette override.

- `parseHistoryMacro` handles `recipeVersion: 2`, using history action IDs/ranges to resolve Undo/Redo and restore the relevant settings.
- `parseLegacyMacroText` retains support for older recipes, including their UI-event folding and history behavior.
- `scheduleNextMacroStep` schedules time-based events; `gameLoop` consumes generation-based events when their target generation is reached.
- `applyMacroRules` restores rules before execution. `executeMacroAction` restores live mode transitions and logs replayed events without duplicating the underlying callback logs.

Version-2 history playback removes undone actions and their elapsed time. `HISTORY_SETTINGS` checkpoints are instantaneous. Redo relocates original commands while preserving internal brush, Wind and simulation timing; time spent deciding before Undo/Redo is omitted. Normal idle caps, generation targets and legacy non-history parsing remain intact. The original logger text is not rewritten by this timeline resolution.

Game of Life and Chi Flow begin their macro-driven loop on an animation frame so the queue advances beyond PLAY before generation one. This preserves mode events recorded at that first generation. Ordinary manual Play remains immediate.

Macro playback must not persist recorded startup, cycle/Yours or Nudge choices into user preferences. Actual rules determine evolution behavior; preset names and source metadata support UI reconstruction. Old mode IDs, missing metadata and historical Off events must remain readable even though live cycles now skip Off.

Replay preserves operations, effective rules and generation targets. Determinism is engine-specific: Islands, versioned Cracks and Resonance serialize their random/runtime cursor; DLA, stochastic Chi ignition, erosion, spatial random choices and random Breathe rhythms do not share a universal saved seed. Wind is not promised pixel-identical. A recipe is not an exact image backup.

`DRAW_STROKE` can explicitly retain `isGold: true`; a missing gold flag means false for compatibility. Together with optional `INIT_STATE.gold`, this is richer than a color-index-only recording but is not a complete restoration of every historical tile field.

### Input and interruption

Manual canvas painting is blocked while a macro is loaded or playing. Board clicks during playback can switch fullscreen presentation. Loading a macro pauses an existing evolution first.

`armSimulation` can cancel a loaded macro when the user manually arms an evolution while paused. Playback sets `isExecutingMacroCommand` to bypass that kill switch and suppress duplicate logging. Do not assume every possible button interaction cancels a running macro; check the handler and its playback guards.

## FYI installation and offline use

Install FYI from Safari on iPhone (Share → Add to Home Screen) or Chrome on Android (Install app / Add to home screen), subject to browser support. Open it online once and allow offline resources to finish downloading before disconnecting. Service-worker registration requires a secure context such as HTTPS or a suitable local development origin. No store or application backend is required.

The checked-in manifest uses FYI eclipse icon assets. A Vercel build with `VERCEL_GIT_COMMIT_REF=work` produces **FYI Work** and substitutes the social-preview icon; social sharing metadata remains separate. Merely selecting a local Git branch does not choose the Work build variant.

Updates are offered through an **Update** control and wait for explicit acceptance before reloading. Export artwork first. Preferences remain stored; browser and installed-app storage may be separate on iOS, so use settings TXT and project exports for transfers. Offline cache stores app assets, not a backup of the current drawing.

The worker caches listed same-origin app assets, ignores unrelated requests and non-GET requests, and scopes old-cache cleanup to its URL path. Installation requires a complete snapshot; failed installation discards only the incomplete new cache. Styling and boot scripts are local. `js/pwa.js` controls the update prompt, while `tools/update-pwa-cache.mjs` generates the asset list and content-based version. See the maintenance instructions before regenerating it.

## Local development and maintenance

### Serving and build scope

The application is HTML/CSS with browser ES modules. There is no root `package.json` or `npm start` script. Serve the repository through a static HTTP server, for example `python3 -m http.server 8000` when Python is available, and open the root app page. Do not rely on `file://` for module/PWA development.

`node tools/build-vercel.mjs` writes `dist/` and builds both the app and Studio; it has no app-only flag. `vercel.json` selects this build/output directory. `VERCEL_GIT_COMMIT_REF=work` chooses the Work branding; an unspecified or other branch value uses production branding. Treat this as a shared build, not an app-only check.

After changing app assets or the worker, `node tools/update-pwa-cache.mjs` rewrites `service-worker.js` with a generated asset list and hash. It is a write operation. A README-only edit does not require regeneration because README files are not cached assets. Review generated changes and the PWA checks when assets change.

### App-only Node tests

`node --test tests/*.test.mjs` is the full root suite, not an app-only selection: `studio-link.test.mjs` covers the Studio integration and `deployment-icons.test.mjs` invokes the shared build. For app-focused Node checks excluding those paths, use Bash:

```bash
app_tests=()
for test_file in tests/*.test.mjs; do
  case "$test_file" in
    tests/studio-*|tests/deployment-icons.test.mjs) continue ;;
  esac
  app_tests+=("$test_file")
done
node --test "${app_tests[@]}"
```

Revisit the exclusions when new tests are added; do not rely on a fixed test-file count. PWA tests still inspect the app asset list, including its integration-link asset, without running the video system. Some tests exercise extracted source through a VM or inspect source structure; they are not all browser end-to-end tests.

### Focused browser checks

Browser scripts require Playwright and Chromium, support `PLAYWRIGHT_MODULE` / `CHROMIUM_PATH` overrides, and serve a prepared `dist/`. The existing build that supplies that directory is shared as described above. Choose the relevant check rather than treating every tool as an app-only build command:

| Area | Examples |
| --- | --- |
| Profiles and settings sessions | `tools/check-profile-sessions.mjs` |
| Brush geometry/navigation and live Undo | `tools/check-brush-picker.mjs`, `tools/check-brush-picker-navigation.mjs`, `tools/check-live-brush-undo.mjs` |
| Palette controls and transitions | `tools/check-palette-cards.mjs`, `tools/check-palette-hold-colors.mjs`, `tools/check-color-page-swipe.mjs`, `tools/check-picker-dialog-transition.mjs` |
| Game of Life genetics | `tools/check-gol-genetics.mjs` |
| Cracks growth, brush, reset and session seed | `tools/check-cracks.mjs`, `tools/check-cracks-brush.mjs`, `tools/check-cracks-reset.mjs`, `tools/check-cracks-session-seed.mjs` |
| Toolbar layout | `tools/check-evolution-drawer.mjs` |
| Brightness history and mid-run macros | `tools/check-brightness-undo.mjs`, `tools/check-midrun-macro.mjs` |
| Resonance maps and compatibility | `tools/check-cymatics.mjs` |

The Resonance browser check covers languages/viewports, live map changes, drawing, Undo/Redo, JSON and recipe replay. `CYMATICS_DEFAULT_ONLY=1`, `CYMATICS_FREQUENCY_ONLY=1` and `CYMATICS_CYCLE_ONLY=1` select focused flows; `CYMATICS_STRENGTH_ONLY=1` checks independent strengths, drafts/Reset, cycling, live saves, history, project/macro replay and profile reload. `CYMATICS_ORGANIC_ONLY=1` checks Clouds/Cosmological empathy, frequency changes and round trips; `CYMATICS_LANG` filters languages. The Cracks session-seed check also supports `CRACKS_SEED_LANG`.

These commands describe available checks, not a claim that they have passed on a particular checkout. Browser/API behavior, install/share flows, accessibility and physical-device performance need their own verification.

### Maintenance checklist and boundaries

1. Keep internal IDs stable when renaming controls: Chi Flow uses `sandpile`, Resonance uses `cymatics`, and spiral IDs such as `left`/`black_hole` retain compatibility despite newer labels.
2. Record actual rules and generation targets for behavior changes; add replay handling alongside recording. Preserve legacy defaults and versioned runtimes rather than silently replaying another engine.
3. Keep artwork, user preferences and replay state distinct. Never persist a macro snapshot as a profile preference.
4. Check paused Off, live wraparound/handoffs, single step, modal cancellation, profile Save/reopen, source identities and Yours retention when changing controls.
5. Preserve tile/brush colors during sorting remaps and validate older JSON/TXT inputs. Settings TXT has structured validation before import; do not infer universal strict-schema or atomic validation for every JSON artwork field.
6. Run relevant Node checks and the affected touch/mouse paths in a browser. Snapshots, copied boards, PRNG state and reusable buffers have different costs; measure large-board performance rather than promising zero allocation or a fixed FPS. Activity/steps, rendering effects and history add work.
7. Keep interaction and architecture documentation consistent, including the [quick guide](README-QUICK.md) when it is within the change's scope. Update all four languages for user-facing text. Preserve unrelated documentation.

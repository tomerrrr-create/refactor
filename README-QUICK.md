# Follow Your Intuition — Quick Guide

A browser-based canvas for meditative pixel art and evolving color patterns. Draw on a square grid, explore palettes, and run an evolution continuously or one generation at a time. Touch and mouse are supported, with English, Hebrew, Russian and Dutch interfaces.

For complete interactions, engine behavior, compatibility and maintenance instructions, read the [extended guide](Readme.md). This page is a short overview.

## Create and choose colors

- The brush cycles through **Paint → Continuous → Copy**. Continuous (white triangle, factory default) connects points while dragging; ordinary Paint uses a gold triangle. Copy keeps its outlined triangle and transfers a source color to the brush footprint.
- Tap the palette, color or sorting controls for their ordinary actions; swipe upward for their pickers/settings. Hold Color for 600 ms to select the first palette entry, or 1,200 ms total for rainbow.
- The color and palette pickers share a frame, backdrop and top navigation anchor. Their top palette icon switches between the two views. Palette categories are **23, 64, 264 and •**.
- Palette sorting preserves visible board colors and the selected paint color while changing their palette indices.
- A single board-size button starts at **+**. Tap to resize in its displayed direction; swipe down to toggle **+ / −** without resizing, or up for the exact-size dialog. It returns to + on a fresh app load.
- Holding Symmetry for 600 ms selects Kaleidoscope directly. Ordinary taps still cycle symmetry modes.

## Select and run an evolution

Select an evolution, then use **Single step** or **Play/Pause**. Selection alone does not advance the board. During playback, tapping a different ordinary evolution switches the running engine; switching into or out of Breathe requires manual Pause.

Tap a cycling evolution to change its mode. Paused cycles include Off; running cycles skip Off. Hold an evolution for its explanation, or swipe upward for supported settings while it is selected, including during playback. Breathe is a visual animation without Single step and pauses when its mode changes.

Game of Life and Chi Flow each have three configurable cycle positions, shown with zero, one or two stars. In their settings, select a position, then choose a preset or edit its rules. **Save** commits the draft; **Cancel** discards it. Ordinary taps cycle the assigned positions. When its evolution is selected, swipe right/left to commit the next/previous preset to the active cycle position, exactly like selecting it in settings and saving. The number of stars stays unchanged, and other positions retain their presets. The order follows the preset buttons in settings, wraps at either end and stays physically right/left in every language. Chi Flow loads the selected preset’s full Magnetic Reach. Paused swipes do not paint; running swipes retain playback and the generation counter. Swipes are blocked during macro loading/playback.

Brightness smoothing starts at 10%. Cracks defaults to whole-board growth; its button cycles between whole-board and dead-cell growth, with Off available while paused. Cracks always uses the selected brush color and starts with Fibonacci Bloom growth defaults. Its settings use manual controls followed by colored preset tiles.

Resonance starts in the second drawer. Its toolbar cycle is Circular → Interference, with Off while paused; all six maps, including Cosmological empathy, remain available in settings. A fixed audio-waveform icon has a small upper-right badge for the selected map. Each map remembers its own Frequency and Strength, while Phase motion is shared. Cosmological empathy uses a circular gradient across the board; older recordings retain their recorded map behavior.

Wind has a dedicated button in the simulation panel above Nudge. Tap to cycle Local ripple → Paint color rings → Move existing colors → Off; active Wind is gold. Swipe up while active for settings. Color/brush and Symmetry are strongly dimmed and unavailable during Wind; switching Wind off restores their previous choices. The former downward swipe on Color/brush is removed. Nudge now sits in the former minus position.

## Baby mode

Open **Baby mode** in the technician menu for seven controls: Play/Pause, Color/brush, Wind, Brightness evolution, Islands, Gravity and Nudge. Existing artwork is centered without resampling on a fixed **249×249** canvas; larger boards are cropped at the edges. Start with Continuous Rainbow painting, Dark Rainbow sorting, no separators and Brightness evolution selected but paused. Several fingers can draw independently at once, including during Play. Color/brush opens the color, palette and brush choices; Wind retains its usual cycles and temporarily disables Color/brush. There is no Single step.

To exit, hold the small gray lock for **three seconds** and confirm. Exit retains the resulting artwork at 249×249, pauses playback and restores the regular panel. The mode is session-only and does not automatically save artwork. The technician menu's **Branches** links open Production or Work in a separate tab.

## Two simulation drawers

The simulation overlay has **two drawers**, each with ten fixed places in two rows of five. All fourteen evolutions appear exactly once across them. Empty places are invisible on the control panel, and the frame keeps the same size.

- Tap the **two small gray dots** above the overlay to switch drawers. The current drawer has a filled dot; the other has an outlined dot.
- Switching changes visibility only. It does not select, pause, restart or step an evolution, change its cycle mode, or reset its generation counter.
- Global Play/Pause and Single step still control the selected evolution when its button is in the other drawer. A small gold marker and tooltip identify that situation.
- Navigation works during playback, including Breathe. The current drawer is retained during the session; a new app load starts at drawer one.
- The factory second drawer contains **Breathe, Turing and Resonance**, centered in top-row positions **2, 3 and 4**. Nudge starts in the bottom center (slot 8) of that drawer. Existing saved assignments retain their positions; a missing Nudge is added there if empty, or to another empty place. Existing personal layouts keep their original ten positions in drawer one; the missing evolutions are appended to drawer two.

Swipe upward on the drawer switch to open **Evolution map**, or use **Alt+ArrowUp** on a keyboard. Editing is available while paused, outside macro loading/playback.

The editor shows both grids, side by side on wide screens and stacked on mobile. Select a simulation, then its destination. An occupied destination swaps the two controls; an empty destination moves the control. Selecting the source again cancels the selection. Empty places show a subtle plus in the editor only.

**Save** applies both drawers. **Cancel**, Escape or closing without saving discards the draft. **Reset** restores the factory draft until saved. Each profile autosaves its drawer layout across reloads without requiring Save to profile. Layout changes do not alter artwork, engine state, Undo/Redo or recipes.

Nudge is a movable simulation inside the drawers with the same idle, armed and playback colors as the others. One-shot Contours stays below Symmetry outside the drawers. Nudge cycles Brighter → Darker → Off while paused, skips Off while running, and acts through Single step or Play. Contours applies one pass immediately; swipe upward for its settings. In Simulation, swipe/drag down on Contours to replace it with Separators; swipe down on Separators to return. Symmetry stays visible and no longer switches to Separators.

## Settings profiles

Technicians provides three fixed profiles with saved baselines and session drafts. Switching profiles restores the current draft. The star means **different from that profile's factory defaults**, not “unsaved”; saving a customized profile does not remove its star.

On a fresh installation, profile 1 opens with a random active palette, a 21×21 random board, Small relative separators, a size-1 continuous brush, creation mode and a blue theme. Profiles 2 and 3 provide different startup palettes, board sizes and themes. The opening profile is configured separately from the profile last selected during a session.

Use **Save to profile** to retain simulation-rule, cycle and brush-shape edits for future app openings. Dialog Save applies working settings; it is not the same as Save to profile. Startup/display preferences and drawer layouts follow their own autosave rules. Profile Reset restores the selected profile's factory preferences without replacing the drawing or the other profiles.

Swipe upward on the simulation-entry control to open Technicians. Holding that control enters simulation mode and initializes the board using the selected profile's initialization preferences.

## Save, replay and history

The Save modal exports **PNG images**, **JSON artwork projects** and **TXT action recipes/macros**. Settings TXT is exported through the profile actions. Loading distinguishes settings TXT from recipes. Settings imports apply preferences without replacing the board; JSON restores artwork and clears drawing history. Browser preferences do not automatically save artwork.

Reset recipe requires confirmation and a successful backup share/download flow before clearing the journey and capturing a new beginning. Cancelling sharing preserves the old log. It does not clear the board.

Undo/Redo retains up to twenty artwork actions. Undo during playback pauses the run and restores the relevant history checkpoint. Recipe replay uses recorded rules and timing/generation targets; deterministic behavior and resumable runtime support depend on the engine. Use JSON to preserve a particular board and TXT to preserve its journey.

## Code map and maintenance

| Area | Main files |
| --- | --- |
| Board, rendering, history and playback | `js/app.js` |
| Layout, icons and styles | `index.html`, `styles.css`, `js/dom-elements.js` |
| Drawers and layout migration | `js/evolution-drawer.js`, `js/evolution-drawer-settings.js` |
| Modals, gestures and preset editing | `js/ui-modals.js`, `js/picker-gestures.js`, `js/preset-cycle-editor.js` |
| Profiles and settings transfer | `js/profile-controls.js`, `js/profile-state.js`, `js/workspace-settings.js` |
| Palettes, ordering and defaults | `js/data/palettes.js`, `js/colors.js`, `js/constants.js` |
| Evolution engines | `js/simulations.js`, `js/simulations/` |
| Localization | `js/i18n.js` |

Preserve existing JSON/recipe compatibility and internal engine IDs: Chi Flow uses `sandpile`, Cracks uses the legacy `contour` identity, and Resonance uses `cymatics`. Drawer layout is a profile/settings preference, not an artwork command. New twenty-place layout exports require an app version that supports both drawers; older ten-place layouts remain readable.

Follow [AGENTS.md](AGENTS.md) and the extended guide before repository work. Apply relevant application/shared tests and browser checks for UI changes; exclude experimental Studio work unless requested. Update all four languages when changing interface text. For build, PWA cache maintenance and the validation matrix, use the [maintenance section](Readme.md#local-development-and-maintenance) of the extended guide.

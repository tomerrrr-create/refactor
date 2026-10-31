**# Follow Your Intuition — Quick Guide**

A browser-based canvas for meditative pixel art and evolving color patterns. Draw on a square grid, explore palettes and their ordering, then run an **\*\*evolution\*\*** continuously or one generation at a time. The interface supports touch and mouse; English is the primary language, alongside Hebrew, Russian and Dutch.

For interaction details, engine explanations and maintenance guidance, read the [extended guide]\(Readme.md).



**## Main interactions**

\- **\*\*Create:\*\*** paint, connect points with the gold brush mode, or drag to copy. Palette sorting preserves the board's visible colors and the selected paint color while changing their palette indices.
\- **\*\*Choose:\*\*** tap palette/color/sort controls to cycle; swipe or drag upward to open their pickers. Hold the color control for 600 ms to select the first palette entry, or 1,200 ms total for rainbow painting.
\- **\*\*Evolve:\*\*** select an evolution, then use Single step or Play/Pause. Hold any evolution button for a short explanation above the board; WTF opens help, while another tap or key dismisses the explanation. Swipe the selected, paused evolution upward for supported settings. Running discrete mode cycles skip Off; paused cycles include it. Breathe is a separate visual animation and pauses when its mode changes.
\- **\*\*Customize:\*\*** select and reorder the sorting cycle. Game of Life and Chi Flow each have three configurable cycle positions, distinguished by zero, one or two stars. Free one position, then fill it before saving. **\*\*Yours\*\*** keeps the last personal rules independently; Cancel discards modal edits.
\- **\*\*Configure:\*\*** the technician menu is available inside WTF/help or by swiping upward on the evolution-entry control. It configures startup preferences and the board/brush used by the initialization hold.
\- **\*\*Save:\*\*** the save modal exports PNG images, JSON board projects and TXT action recipes/macros, and loads JSON/TXT. Reset recipe clears the recorded journey and captures the current board as its new beginning.

Preferences live in \`localStorage\`; saved creations are explicit exports. Macro playback uses recorded rule values and generation targets, including mode changes. Random processes can produce different pixels; playback must not overwrite saved preferences.

**## Code map**

\| Area | Files |
\| --- | --- |
\| Board, rendering, history, playback, Nudge | \`js/app.js\` |
\| Layout, SVG icons and styles | \`index.html\`, \`styles.css\`, \`js/dom-elements.js\` |
\| Modals, gestures and preset membership | \`js/ui-modals.js\`, \`js/picker-gestures.js\`, \`js/preset-cycle-membership.js\` |
\| Palettes, sorting, defaults and presets | \`js/data/palettes.js\`, \`js/colors.js\`, \`js/constants.js\` |
\| Evolution engines | \`js/simulations.js\`, \`js/simulations/\` |
\| Preferences and languages | \`js/\*-settings.js\`, \`js/i18n.js\` |

**## Maintenance essentials**

Preserve internal IDs and compatibility with existing JSON projects and TXT recipes. UI names can differ from engine IDs: Chi Flow uses \`sandpile\`. Update all four languages when changing interface text. Defaults are distributed across constants, preference modules and \`app.js\`.

Engines have different mutation, allocation and gold-cell behavior. Preserve their existing buffer reuse and profile substantial engine changes on large boards. Changes to interactions or evolution rules need recording/playback checks as well as the relevant tests.

**## Three settings profiles**

At the top of technicians, 1 / 2 / 3 select three fixed profiles. Each profile keeps a saved baseline and an independent working draft. A star marks a draft that differs from its saved settings; switching away and back restores the draft, not the saved baseline. Stars on other profiles stay visible. All three drafts, baselines and the selection survive reopening in the same browser/site storage. On first use, profile 1 is selected and keeps the current effective preferences with a blue theme. Profile 1 opens with relative Large separators. Profile 2 starts with Golden Midnight Extended, an 11 × 11 board with relative Small separators, random fill, simulation mode and a gold theme; its sort cycle replaces Temperature and Outside in with Folded Rainbow and Zigzag. Profile 3 starts with Ancient 264, random fill on a 15 × 15 board without separators (relative level 0), brush size 1, simulation mode and a turquoise theme, with the same sort cycle as profile 1. Profiles 2 and 3 use Electric → Harmony → Alexis in Chi Flow, all at 400% Magnetic Reach. Opening brush sizes for profiles 1 / 2 / 3 are 1 / 1 / 1; simulation-entry hold sizes are 1 / 11 / 1. Opening uses the startup brush size rather than restoring the last live brush size; switching profiles still restores their drafts. Profile 2 uses symmetry Off and palette index 0 as its brush color; profile 3 uses the brightest palette color at startup, and a rainbow brush with left/right reflection (the two gold vertical icon edges) on the simulation-entry hold. Its first Game of Life slot is Paint 1. Initialization retains its legacy last-color/kaleidoscope behavior when those optional preferences are absent. Erosion acceleration defaults for Forward / Channel carving are I / V in profile 1, III / V in profile 2, and IV / V in profile 3. Both the profile Reset and the erosion-panel Reset use these per-profile defaults. Unspecified settings inherit profile 1. Themes are saved in each profile and change immediately when switching profiles. The existing Reset action restores only the selected profile to its application defaults, including its theme, and establishes a clean saved baseline; the other profiles and current drawing stay unchanged. Existing untouched copies receive the new defaults once; edited profiles and drafts are preserved.

Only the selected profile's gold dot is enabled. Its compact action panel uses a down-arrow icon to save current settings into the profile and an up-arrow icon to load a settings file. Both icons have localized accessible labels and hover titles. It offers exactly two actions: save current settings into that profile, or load an existing settings TXT into it. Saving or successfully importing establishes a clean baseline and clears its star. Invalid files leave the profile and current settings alone. Existing export remains in Save. Profiles contain settings, not drawings: startup/init preferences retain their existing deferred behavior and switching does not replace the board. Clearing browser site data removes profiles.


The technician switch **Brush stroke playback** (default on) records progressive brush motion also while the simulation is paused. Off preserves the existing paused final-stroke packet; running simulations always record progressive packets. It affects future recording only, not loaded macros. Full brush footprints are recorded even on matching colors. A paused stroke remains one Undo action, both live and during playback. New paused motion groups use `BRUSH_START` / `BRUSH_END` (version 1) around the existing `DRAW_STROKE` cell arrays; the parser preserves intra-stroke timing, including after Redo. Older array-based recordings remain supported. The preference is stored globally on this device, independently of profiles.


Wind shares the color/brush control: swipe **down** to enter Wind, tap to cycle Local Ripple → Paint color rings → Move existing colors, swipe **up** for Wind settings, and swipe **down** again to return to the brush. The brush color/rainbow selection and size survive this round trip. In brush mode, tap, upward swipe, and the two hold stages keep their existing meanings. Symmetry is independent again (tap cycles; swipe up turns symmetry off), with no Wind hold shortcut. Alt+ArrowDown on the focused color/Wind control also switches tools. A finite 1.1-second gold halo on that control confirms each tool change, replacing the Wind toast; reduced motion uses a shorter accent. Switching between brush and Wind, or cycling Wind modes, keeps a running simulation playing; use Pause to stop it. Wind recording, brush recording and macro formats are unchanged.


In brush mode, a horizontal swipe in either direction on the color control clears the selected color or rainbow, using the existing empty-brush state. It preserves brush size, symmetry and the running simulation. The gesture requires at least 24 px of horizontal travel and twice as much horizontal as vertical travel; it is inactive in Wind. Cancelling the gesture or returning to its start does not clear the selection. Up/down swipes and hold stages retain their existing behavior.

On the evolution-entry control, swipe left, right or down to run the existing Go Dark action (including recording and Undo). Tap still switches control panels, hold still initializes, and swipe up still opens technicians.

While an ordinary evolution is running, tapping another evolution ends the current run and immediately starts the selected one on the same board. Each run has its own generation count and Undo boundary; recording uses the existing PAUSE, selection and PLAY commands, including the new run's rules. Active-mode cycling stays unchanged. Only breathing is excluded: pause manually before switching into or out of breathing. DLA initializes its crystal and walkers from the current board on each entry. Empty boards receive no automatic center seed; draw a seed to start growth. Swipe up opens settings for the selected evolution while paused or running. Opening does not pause the engine. Saved live changes are recorded at their generation and stay within the current run’s Undo segment.

Running simulations temporarily use the existing Gold overlay and icon colors. Pause restores the selected resting theme (Blue by default); playback feedback never changes stored themes or profile drafts. Channel carving, the first erosion mode, defaults to acceleration V in all profiles. Previous untouched default stages upgrade once; custom stages and recorded erosion counts remain unchanged.

Erosion cycles through Channel carving (river), Forward carving (mountain ridges), then Lateral carving (original chevron). The settings mode buttons use the same order and icons.

For version-2 history recipes, Undo removes cancelled actions and their elapsed time from the playback timeline. History-settings checkpoints are instantaneous. Redo relocates the original action while preserving its internal stroke, Wind and simulation timing; deliberation before Undo/Redo is omitted. Normal idle caps and generation targets are unchanged, the original logger file is untouched, and older non-history recipes continue through the legacy parser.

## Video Studio (v6)

The person button opens `studio/` in a new tab and passes a read-only snapshot
of the current logger with an origin- and token-checked browser message. It no
longer resets the board. This is available on mobile too; encoding capabilities
and resource limits still depend on the device. English/Hebrew and LTR/RTL follow
the app's language at opening; Studio has no separate language picker.

Rendering and encoding run locally. No macro upload API is used. The normal app
loads only the small handoff module; Studio libraries are neither imported nor
pre-cached by the normal PWA. Engine preferences use disposable in-memory storage
and never write to the application's saved profiles or settings.

Run `node tools/build-vercel.mjs` to build the app and Studio into `dist/`, then
serve that directory. `node tools/build-studio.mjs` generates the isolated engine
for local testing directly in `studio/engine/` (gitignored). The engine is derived
from the current app source on every build, so simulations have one source of
truth. GitHub Pages hosting should publish the built `dist/` directory as well.

Studio retains v5's button choices, computed/real-time export, background support
for computed mode, defaults of 1080 square / 60 fps / high quality, and enabled
Smooth and 32% Glow. Recorded explicit display preferences override fallbacks.
MP4 uses H.264 WebCodecs; VP9 WebM or real-time MediaRecorder are supported
fallbacks. No preview is copied or displayed in computed mode. Keep the device
awake and the Studio tab open; background throttling can slow or suspend work.

PNG image saving has a small arrow beside the image action that reveals Smooth
and Glow options; the main image button saves immediately. Each opening
starts from the current display preferences; export-only overrides do not change
them. Glow uses the current intensity and the shared display formula. PNG output
remains 4096 square, with its black frame unaffected by the glow.

Technician Zoom ranges from 70% to 120%, with an 84% default; 100% restores the original layout. Lower
values reduce controls and surrounding spacing, freeing space for the board;
the button order and cell count are unchanged. The preference is saved locally
per browser, independently of profiles, recordings, image/video export and macro
fullscreen. The same zoom scales the opening slogan and menu surfaces, while backdrops
still cover the viewport. Menus keep viewport-aware bounds and scrolling.
Display zoom does not change the browser zoom setting.

Picker releases use browser hit-testing rather than CSS-zoom rectangles, so
desktop mouse taps and touch gestures remain aligned with the visible controls.

Zoomed board layout budgets use control layout height multiplied by zoom, so
older browsers reporting unscaled rectangles also release space to the board.

Profile 1 now starts with Hearts, a random 21×21 board, relative Medium
separators, creative mode and an unselected continuous size-1 brush. Its Life
cycle remains Yours/Paint 4, Shuffle, Coral; Chi Flow remains Harmony, Nova,
Alexis. Version 11 upgrades former factory startup values in profile 1 only;
different personal values and profiles 2/3 are retained. Factory reset uses
the new defaults.

The palette picker shows the current palette icon alone above the catalogue, with its name and color count centered below. Both areas open the color/brush picker using the existing handoff.

## Experimental cracks

The Cracks/Contours button defaults to Cracks and cycles Cracks → Contours → Off while paused; running cycles alternate Contours/Cracks without pausing. Cracks grows thin branching fractures in colored material and stops at existing line-colored cells, protected gold and the board edges. It uses the existing darkest/lightest line-color setting; sensitivity remains exclusive to Contours. Draw colored areas and press Play or Single step. Drawing remains available during playback. The branching icon marks Cracks. This is a visual experiment, not a physical stress model. Runtime tips and the deterministic random cursor are optional project/history/macro fields; old contour recordings still use the original engine. Profile preferences and file format versions are unchanged.

Check with `node --test tests/*.test.mjs`, `node tools/build-vercel.mjs` and `node tools/check-cracks.mjs` (Playwright/Chromium, with PLAYWRIGHT_MODULE and CHROMIUM_PATH overrides).

Cracks resumes growth after new brush painting, including Pause → paint over old cracks → Play. Painted material queues a local nucleus without painting during Pause, while surviving tips continue. New sessions use engine version 3; version-1 saved sessions and recipes retain finite-root behavior, and version 2 retains its original renewal behavior. Pending nuclei are included in existing snapshots for Undo/Redo, JSON and macro replay. Painting the line color or protected gold does not create a nucleus.

Cracks has a separate native settings dialog (swipe its selected button up), available paused or running. Material response starts disabled, with 40% influence when enabled: early palette ranks are harder, later ranks softer. Hard areas remain intact, while tips slow down or turn toward softer neighbors. Sorting changes the material roles without changing the visible colors. Off or 0% restores the previous geometric growth exactly. Settings include material On/Off, influence and line color; Cancel, Escape and outside dismissal discard drafts, and Reset changes only the draft. Save is recorded at the current generation during a run, without pausing. Settings persist with each profile and in settings TXT/JSON/history snapshots; recipe material overrides are temporary and do not replace user preferences. Older engine versions ignore the material feature unless settings are deliberately saved for a new version-3 run.

When all Cracks tips have stopped, pressing Play renews the finite nucleus budget if adjacent eligible material remains, even without new painting. Saving Cracks settings also prepares this renewal, including during playback. This action does not paint while paused, does not reset surviving tips or the random cursor, and preserves hard, line-colored and gold barriers. The renewed nucleus is recorded in the existing runtime snapshot for exact replay; version-1/2 sessions keep their original behavior.

Saved Cracks preferences (material On/Off, influence and line color) stay in effect across drawing Undo/Redo, including repeated Undo into strokes made under older settings. Saving preferences does not create a drawing-history action. Runtime tips and the random cursor still follow artwork history; explicit project loads and macro playback retain their recorded settings. New Undo/Redo recipe checkpoints record the effective retained preferences.

Cracks settings also expose the existing growth constants: branching chance (0–100%, default 65%), steps between branching opportunities (1–40, default 11) and curvature (0–200% of the original drift, default 100%). They work independently of material response. Save and Reset follow the same draft/profile behavior as other Cracks preferences; drawing Undo/Redo retains them, including saved defaults. Original growth remains pixel-identical at defaults. Version-1/2 runtimes ignore these controls until deliberately saved/upgraded; old version-3 recipes use the original constants when tuning is absent. Custom tuning is an optional `rules.contour.growth` extension and is recorded explicitly for new recipes.

Cracks settings group material, growth and line color in a scrollable dialog with fixed header/actions. The three growth controls have short localized explanations. Line color adds Original anchor: the first color of the palette’s original stable luminance ordering is resolved into the current ordering on each step, brush renewal and resume, so changing sort preserves that color. Legacy settings without a line-color choice retain Darkest (current index 0); Lightest remains current last index. Original-anchor settings and sort changes are retained in profiles, snapshots, drawing Undo/Redo and recipe playback.

Cracks growth presets are First Whisper (65% / 11 / 100%), Quiet Flow (40% / 22 / 100%), Crystal Paths (40% / 22 / 0%) and Fibonacci Bloom (55% / 8 / 130%), listed as branching chance / interval / curvature. The four buttons edit only the growth draft; Material and Line color stay unchanged. Exact values determine the selected preset; other values show Custom. Save persists numeric values without a preset identifier, and Cancel discards the draft. Reset restores Fibonacci Bloom with material Off at 40% and Brush color as the line source. Explicit material On values in files/recipes remain On; missing growth in old recipes retains the original 65% / 11 / 100% behavior.

## Evolution drawer MVP

A small theme-colored dot above the evolution overlay opens the Evolution map while paused, outside macro loading/playback. Choose one of ten icon-only toolbar slots, then choose an evolution from two square-tile groups: Outside the toolbar lists the four parked controls and replaces the selected slot, returning its previous control to that group; On the toolbar lists the ten assigned controls in slot order and swaps positions without removing either control. Names remain available as hover titles and accessible labels. Selecting the current control leaves the draft unchanged. Save applies the draft; Cancel/Escape discard it and Reset restores the original ten overlay controls. Breathe, Turing and both Nudge controls can occupy ordinary slots instead of remaining outside the overlay. Cracks/Contours retains its existing shared mode-cycle button. The original DOM buttons, IDs, settings and gestures are retained.

Layouts are optional `evolutionSlots` profile/settings preferences, independent of artwork history and recipes; legacy settings use the original ten positions. Each profile keeps its own layout across reloads. Saving layout changes neither board nor engine state. A running parked evolution is indicated by a gray dot; global Play/Pause continues to control it while the drawer stays unavailable during playback. This is a toolbar-selection MVP, with no drag-and-drop or editing during a run.

Verify with `node --test tests/*.test.mjs`, build `dist/`, then run `node tools/check-evolution-drawer.mjs` with Playwright/Chromium overrides as needed.

Cracks opens with Fibonacci Bloom (55% branching / 8 steps / 130% curvature) and Brush color as its line source on every app entry, after applying stored startup/profile settings. Session edits and explicit profile, project and macro loads still use their own values. Legacy missing-growth recipes retain 65% / 11 / 100%; the opening default never rewrites those rules.

Line color uses four square buttons: Darkest, Lightest, Original anchor and Brush color. Brush color follows the live selected brush; an empty brush falls back to Darkest. Existing pixels keep their colors. Rainbow chooses a deterministic palette color per new cell and uses an optional sparse visited-trail map for collisions instead of color equality. The map is ignored for solid colors and survives project/history/recipe round trips. Painting over visited cells clears those marks without advancing a paused simulation. Returning from a solid color to rainbow retains the remaining rainbow trail; solid-color modes keep their original color-based collision behavior. Live brush-source changes are recorded as simulation rules independently of the brush chosen during replay. Saved Cracks settings remain independent of drawing Undo/Redo.

Verify brush sources and opening defaults with `node tools/check-cracks-brush.mjs` after building, using the same Playwright/Chromium overrides as `check-cracks.mjs`.

Brightness/Contrast settings are session preferences rather than drawing-history actions. Saving their sliders or mode while paused adds no drawing Undo entry; ordinary Undo/Redo retains the current brightness and contrast values and mode, even across older strokes. Recipe history checkpoints include the retained values. Explicit project loading and macro history still use recorded settings, including legacy defaults; ending or cancelling a macro restores the brightness preferences held before loading it. Other evolutions keep their existing history behavior. Verify with `node tools/check-brightness-undo.mjs` after building `dist/`, using the usual Playwright/Chromium overrides.

Holding the evolution-entry control to initialize the board also discards the Cracks runtime (tips, nuclei, random cursor and rainbow collision trail), including when the board size stays unchanged. Saved Cracks rules remain intact. Undo/Redo restores the respective old/new artwork runtime, and new post-initialization recordings start from the fresh run. Existing GO_DARK recipe behavior is unchanged. Material response still treats palette index 0 as a hard barrier at influence 50% or above; initialization does not bypass that rule. Verify with `node tools/check-cracks-reset.mjs` after building `dist/`, using the usual Playwright/Chromium overrides.

## Resonance

Resonance (internal ID `cymatics`, unchanged for existing files and toolbar assignments) is initially parked in Evolution map. Assign it to one of ten toolbar slots, select it and use Play or Single step. Swipe up for settings while selected, including during a run. The settings contain only map buttons and labeled Frequency, Phase motion and Strength controls, without explanatory paragraphs. Strength defaults to 15% for fresh preferences and Reset; explicit saved values remain authoritative.

Six maps are available: Diagonal (version 1), Crosshatch (version 2), Circular (version 3), Interference (version 4), Clouds (version 5), and Cosmological empathy (version 6). Diagonal uses a single stroke; Crosshatch uses four linked diamond tiles, consistently in settings and on the toolbar. The toolbar cycles Interference → Circular → Diagonal → Crosshatch → Clouds → Cosmological empathy → Off while paused, skipping Off during a run. Activating the evolution retains any saved map; a legacy omitted map version means Diagonal. Off queues Interference for the next activation. It retains the active runtime, generation and phase on running map changes. Each map remembers its own frequency: fresh Interference is 800 Hz, Circular 20000 Hz, Diagonals/Crosshatch 11831 Hz, and both new maps 800 Hz. Phase motion starts on, follows the existing generation cursor and freezes on Pause. The frequency slider remains logarithmic from 20 to 20000 Hz. Clouds blends nine directional waves across three spatial scales; Cosmological empathy uses a warped, periodic Voronoi field whose equal-influence boundaries form filaments between moving sites. Both use the recorded generation cursor, close after 1200 generations, cache geometry, and leave the four existing field calculations unchanged. These are artistic fields rather than acoustic or cosmological solvers. The field is an artistic approximation, without sound; adjacent color exchanges conserve pigments and protect gold cells.

Dialog edits remain drafts until Save; Cancel/Escape discard them, and Reset restores all six frequencies, Strength and Phase together. Drawing Undo/Redo retains personal rules and the independent `cymaticsFrequencies` preference table. Projects and recipes retain effective rules and deterministic runtime; macro overrides do not replace preferences. Missing map versions in old Resonance recordings retain Diagonals, and missing Phase remains off. The obsolete `pattern` field is accepted only as inert metadata in old Resonance rules. All Resonance field calculations remain unchanged.

The experimental Patterns controls, four named templates, icon, translations and field generator have been removed. Old preferences for that experiment migrate to Resonance while retaining explicit Strength and other profile settings. Old artwork/recipe checkpoints that require the removed experiment fail validation instead of silently replaying a different result. Existing Resonance projects, recipes and Studio playback remain supported.

Run `node --test tests/*.test.mjs`, build with `node tools/build-vercel.mjs`, then `node tools/check-cymatics.mjs` using PLAYWRIGHT_MODULE/CHROMIUM_PATH as needed. The browser check covers all four languages/viewports, live map changes, drawing, Undo/Redo, JSON and recipe replay. `CYMATICS_DEFAULT_ONLY=1`, `CYMATICS_FREQUENCY_ONLY=1` and `CYMATICS_CYCLE_ONLY=1` select focused flows; `CYMATICS_ORGANIC_ONLY=1` checks both new maps, live frequency changes, history, project/recipe round trips and profile reload; `CYMATICS_LANG` filters languages.

Cracks now starts a freshly selected human run with a crypto-generated seed, including return from Brightness and the live Contours→Cracks cycle. Its initial random cursor exists before PLAY/STEP recording and the first history checkpoint. Pause/Play continues the same runtime; existing recording fields already serialize the cursor, so macros and restored snapshots retain the recorded sequence. `createCracksState` keeps its fixed legacy fallback; no growth rules or recording schema changed. Verify the selection/brightness/resume/history/recipe round trip with `node tools/check-cracks-session-seed.mjs` after building (supports PLAYWRIGHT_MODULE, CHROMIUM_PATH and CRACKS_SEED_LANG).

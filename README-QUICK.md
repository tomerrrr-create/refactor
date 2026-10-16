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

At the top of technicians, 1 / 2 / 3 select three fixed profiles. Each profile keeps a saved baseline and an independent working draft. A star marks a draft that differs from its saved settings; switching away and back restores the draft, not the saved baseline. Stars on other profiles stay visible. All three drafts, baselines and the selection survive reopening in the same browser/site storage. On first use, profile 1 is selected and keeps the current effective preferences with a blue theme. Profile 1 opens with relative Large separators. Profile 2 starts with Golden Midnight Extended, an 11 × 11 board with relative Small separators, random fill, simulation mode and a gold theme; its sort cycle replaces Temperature and Outside in with Folded Rainbow and Zigzag. Profile 3 starts with Ancient 264, dark fill, brush size 3, simulation mode and a turquoise theme, with the same sort cycle as profile 1. Profiles 2 and 3 use Electric → Harmony → Alexis in Chi Flow, all at 400% Magnetic Reach. Brush sizes for profiles 1 / 2 / 3 are 1 / 11 / 3, both at startup and on the simulation-entry hold. Profile 2 uses symmetry Off and palette index 0 as its brush color; profile 3 uses the brightest palette color. Initialization retains its legacy last-color/kaleidoscope behavior when those optional preferences are absent. Erosion acceleration defaults for Forward / Channel carving are I / I in profile 1, III / IV in profile 2, and IV / V in profile 3. Both the profile Reset and the erosion-panel Reset use these per-profile defaults. Unspecified settings inherit profile 1. Themes are saved in each profile and change immediately when switching profiles. The existing Reset action restores only the selected profile to its application defaults, including its theme, and establishes a clean saved baseline; the other profiles and current drawing stay unchanged. Existing untouched copies receive the new defaults once; edited profiles and drafts are preserved.

Only the selected profile's gold dot is enabled. Its compact action panel uses a down-arrow icon to save current settings into the profile and an up-arrow icon to load a settings file. Both icons have localized accessible labels and hover titles. It offers exactly two actions: save current settings into that profile, or load an existing settings TXT into it. Saving or successfully importing establishes a clean baseline and clears its star. Invalid files leave the profile and current settings alone. Existing export remains in Save. Profiles contain settings, not drawings: startup/init preferences retain their existing deferred behavior and switching does not replace the board. Clearing browser site data removes profiles.

# App Overview & Architecture (AI Context Document)

## 1. High-Level Overview
This application is a highly interactive, web-based digital canvas that seamlessly blends manual drawing tools (with advanced symmetry modes) and complex procedural generation/cellular automata. Users can manually paint on a grid, and then "arm" various mathematical simulations (Conway's Game of Life, Diffusion-Limited Aggregation (DLA), Turing Patterns, Sandpile/Chi Flow, Erosion, Gravitational Sort, etc.) to evolve the canvas organically based on the current color palette.

The app is highly optimized for mobile and desktop touch interactions, utilizing fluid animations for color transitions and a dedicated "Simulation Mode" UI.

## 2. Tech Stack
* **Core:** Vanilla JavaScript (ES6 Modules). No heavy frameworks (like React, Vue, or Angular) are used. State is managed natively.
* **Rendering:** HTML5 `<canvas>` API (2D Context) optimized for device pixel ratio (`dpr`).
* **Styling:** Tailwind CSS (via CDN) combined with a custom `styles.css` for animations, mobile stability (`touch-action: none`), and complex dynamic UI states.

## 3. File Structure & Module Responsibilities
The codebase is strictly modularized into distinct files, separating DOM references, static data, pure logic, and state management.

* **`index.html`**
    The main entry point. It contains the application shell, the canvas container (`#board`), all control buttons (using inline SVGs for icons), and the HTML structure for all settings modals. Loads Tailwind CSS via script tag.

* **`styles.css`**
    Contains custom properties (CSS variables), mobile viewport fixes to prevent zooming/scrolling, complex animations (e.g., glowing borders, breathing effects), and CSS classes that dictate the UI layout based on app state (specifically `.sim-mode-active` which completely rearranges the CSS Grid layout of the controls).

* **`js/app.js` (The Orchestrator & State Manager)**
    The core controller of the application. 
    * Holds the global `boardState` (the grid's data).
    * Manages the `<canvas>` rendering (`renderBoard`).
    * Handles all pointer interactions (`pointerdown`, `pointermove`, `pointerup`) for drawing and tool usage.
    * Manages the dual-loop system: `animationLoop` (for smooth color transitions/breathing) and `gameLoop` (for step-by-step cellular automata generation).
    * Maintains the `history` and `future` arrays for the Undo/Redo system.

* **`js/simulations.js` (The Math & Logic Engine)**
    Contains pure or semi-pure functions responsible for the cellular automata and physics algorithms. 
    * Takes the current `boardState`, grid size (`n`), rules, and palettes as arguments, and returns the *next* `boardState` (and occasionally updated simulation states, like `dlaState` or `turingState`).
    * *Includes:* Game of Life, Brightness/Contrast Evolution, Gravitational Sort, Erosion, DLA (Fractal Growth), Contour Generation, Sandpile (Chi Flow), and Reaction-Diffusion (Turing Patterns).

* **`js/ui-modals.js` (The UI & Settings Controller)**
    Handles the logic for all overlays and pop-ups. 
    * Listens to slider inputs, chip selections (e.g., Game of Life birth/survival rules), and preset buttons.
    * Generates the Color Picker UI and Palette selection grid dynamically.
    * Communicates back to `app.js` by calling exposed getter/setter functions (e.g., `app.setGameOfLifeRules()`).

* **`js/constants.js` (Static Data)**
    Stores configuration constants and magic numbers.
    * Contains the massive `PALETTES` array (names, emojis, hex codes).
    * Holds `SYMMETRY_MODES`, grid `SIZES`, `SEPARATORS`, and all default rule objects for the simulations (e.g., `defaultTuringRules`, `defaultChiFlowRules`).

* **`js/dom-elements.js` (DOM Registry)**
    A centralized file that performs `document.getElementById` and `querySelector` for all interactive elements. It exports a single `dom` object, keeping `app.js` and `ui-modals.js` clean from repetitive DOM queries.

* **`js/i18n.js` (Internationalization)**
    A simple dictionary-based translation system supporting English (`en`), Hebrew (`he`), Russian (`ru`), and Dutch (`nl`). Handles language toggling and fetching localized text.



## 4. State Management (The Grid & History)

### 4.1 `boardState` (The Core Data Structure)
The application avoids treating the `<canvas>` as the source of truth. Instead, all visual data is driven by a 1D array called `boardState`. The grid is strictly `n * n` in size.
Each item in `boardState` is a tile object representing a specific cell:
* `k` (Integer): The current color index mapping to the active palette.
* `v` (Float): A continuous float value representing the exact state of the cell. Primarily used in analog/continuous simulations like Brightness Evolution or Turing Patterns to maintain precision before snapping to a discrete palette index (`k`).
* `isGold` (Boolean): A special flag for immutable/special tiles (usually the center starting point).
* `prevK` (Integer | null): The previous color index. Used exclusively for triggering smooth visual transitions.
* `animStart` (Timestamp): The exact `performance.now()` timestamp when the cell's color changed.

### 4.2 Undo/Redo System
The app uses a snapshot-based history system (`history` and `future` arrays in `app.js`). 
* Actions are wrapped in a `performAction(actionFn)` higher-order function.
* `getCurrentState()` captures the active palette, grid size, separator size, and a deep copy of the `boardState`.
* If the state changes after `actionFn` executes, the before-state is pushed to `history`.
* The history stack is capped at `C.HISTORY_LIMIT` (20) to prevent memory leaks.

## 5. The Dual-Loop Rendering Engine

To maintain high performance and smooth UI interactions alongside heavy mathematical calculations, the app employs two distinct loops using `requestAnimationFrame`.

### 5.1 `animationLoop` (Visuals & Transitions)
This loop is responsible for smooth color interpolation and continuous visual effects.
* **Smart Polling:** It only runs when necessary. If any tile has `prevK !== null`, the loop continues. Once all transitions exceed `ANIMATION_DURATION` (200ms), the loop gracefully halts to save CPU/Battery.
* **RGB Lerping:** In `renderBoard()`, if a tile is animating, the engine converts `prevK` and `k` HEX values to RGB, and performs linear interpolation (`lerp`) based on the elapsed time.
* **Breathe Mode:** The "Breathe" simulation operates entirely within this loop. It dynamically shifts the brightness of cells using a sine wave formula `Math.sin(elapsed * SPEED)` directly in the render cycle, without mutating the underlying `boardState.k` values.

### 5.2 `gameLoop` (Discrete Simulations)
This loop is activated only when a cellular automaton or procedural generation simulation is "armed" and played (e.g., Game of Life, Sandpile, DLA).
* **Execution:** It constantly reads the current `boardState`, passes it to the corresponding pure function in `simulations.js`, and replaces `boardState` with the mutated returned array.
* **Separation of Concerns:** `gameLoop` does NOT handle interpolation. It instantly snaps the data to the next generation and calls `renderToScreen()`.


## 6. Core Tools & Interactions

### 6.1 Pointer Handling & `pointerState`
The app unifies mouse and touch interactions using the standard Pointer Events API (`pointerdown`, `pointermove`, `pointerup`).
* **`pointerState` Object:** Tracks the active pointer ID, coordinates, dragging status, and long-press timers.
* **Long Press Detection:** If a pointer is held down for `LONG_PRESS_SHOW_MS` (600ms) without moving beyond a small threshold (8px), it triggers a long-press event (e.g., opening the Color Picker) and sets `suppressClick = true` to prevent a standard paint action upon release.

### 6.2 Brush Dynamics (Paint vs. Copy Mode)
The `isBrushModeOn` boolean dictates how pointer interactions manipulate `boardState`.
* **Paint Mode (`true`):** Dragging calls `handleDragPaint()`. It applies the `selectedColorIndex` to the target tiles. If `isRainbowModeActive` is true, it assigns a random color index from the palette to each painted tile.
* **Copy Mode (`false`):** The first touch sets `pointerState.dragSourceIndex`. Dragging or releasing the pointer then applies the exact color (`k`) from the source tile to the new destination tiles.
* **Brush Size:** Handled via `getTilesInRadius(centerIndex, radius)`. It converts the 1D center index to 2D `(row, col)`, iterates outward, and calculates geometric distance using the Pythagorean theorem (`Math.sqrt(rowOffset^2 + colOffset^2) <= r`) to gather a circular cluster of tiles.

### 6.3 The Symmetry Engine
All spatial calculations are performed on a 1D array (`boardState`), representing a 2D grid. The `getSymmetricIndices(index)` function calculates mirrored indices.
* Converts 1D to 2D: `row = Math.floor(index / n)`, `col = index % n`. Let `N = n - 1`.
* **Vertical:** Adds index at `row * n + (N - col)`.
* **Horizontal:** Adds index at `(N - row) * n + col`.
* **Mandala:** Applies both Vertical and Horizontal mirroring.
* **Kaleidoscope:** Transposes coordinates across the diagonal (`col * n + row`) alongside Mandala mirroring, generating 8-way symmetry.

### 6.4 Global Board Actions
Several functions apply instantaneous, global transformations to the `boardState`, wrapped in `performAction()` to register in the undo history:
* **`fillRandom()` & `shuffleExistingColors()`:** Assigns random indices or shuffles currently painted colors on the board, triggering `animStart` for a smooth fade.
* **`goDark()`:** Snaps all non-gold tiles to index `0` (the darkest color in the sorted palette).
* **`invertGrid()`:** Maps each tile's index to its opposite in the palette array using `(paletteLen() - 1) - tile.k`.
* **`adaptColors()`:** When switching palettes, colors may look "broken" if the new palette has fewer colors. This loops through `boardState` and applies `norm(tile.k)` to map old indices cleanly into the new palette bounds.


## 7. The Simulations Engine (`simulations.js`)

The `simulations.js` file contains pure functions responsible for executing procedural generation and cellular automata algorithms. Each function receives a context object containing the grid size (`n`), `currentBoardState`, `currentPalette`, and relevant rule objects, returning the `nextBoardState` (and sometimes a mutated internal state).

### 7.1 Multi-State Game of Life
Unlike the traditional binary Conway's Game of Life, this implementation supports multi-colored survival. 
* **State Definition:** "Dead" cells are index `0` (darkest). Any index `> 0` is considered "Alive".
* **Rules Validation:** Uses array inclusion (`gameOfLifeRules.survival.includes(liveNeighbors)`) rather than fixed ranges, allowing non-linear rule presets (e.g., survive on 1, 3, or 8).
* **Color Genetics:** When a new cell is born, it inherits its color from its live neighbors. `getGeneticColor(neighborColors, 'average')` converts hex values to RGB, averages the components, and finds the closest matching index in the current palette using 3D Euclidean distance (`findClosestColorIndex`).

### 7.2 Turing Patterns (Reaction-Diffusion)
Simulates chemical reactions creating natural patterns (like coral or animal spots).
* **Data Structures:** Uses high-performance Ping-Pong buffers (`Float32Array`) for chemical `A` and `B` concentrations to avoid garbage collection overhead during rapid iterations.
* **Algorithm:** Implements a discrete Laplacian operator (calculating spatial diffusion) and standard reaction-diffusion formulas (`A + ((dA * sumA) - reaction + (feed * (1 - A))) * timeStep`). Loops multiple times per frame dynamically based on grid size (`iterations = Math.max(3, Math.floor(n / 25))`) to scale calculation speed.
* **Color Mapping:** Maps the chemical concentration of `A` back to palette colors using non-linear gamma stretching (`Math.pow(visualValue, 1.5)`) to push most of the visual weight towards darker colors, preventing the screen from becoming overly bright.

### 7.3 Diffusion-Limited Aggregation (DLA)
Simulates fractal and organic crystal growth.
* **Engine:** Uses random walkers (`walkers` array). Walkers move randomly in a Moore neighborhood until they touch an officially established `crystal` (tracked via a JavaScript `Set` of 1D indices for constant-time lookup).
* **Optimization:** Pre-calculates `emptyIndices` to ensure walkers only spawn in available spaces.
* **Genetics:** If `colorGenetics` is active, sticking walkers check neighbors in the `crystal` Set and average their colors. It features an intelligent fallback mechanism (`lastSuccessfulColorIndex`) to prevent black cells from corrupting the fractal.

### 7.4 Sandpile / Chi Flow Dynamics
An Abelian sandpile-inspired simulation controlling "energy" flow.
* **Awakening:** Dark cells "ignite" (become index `1`) if the count of non-dark neighbors matches the `awakening` rules array.
* **Magnetic Reach (Flow):** Active cells advance their color index if pulled by neighbors that are ahead in the palette order, defined by `pullReach`.
* **Ignition Fallback:** If the total active cells drop below a threshold (150), it triggers random localized explosions to keep the simulation alive.

### 7.5 Gravity, Erosion, & Image Processing
* **Gravitational Sort:** Reads the palette index as "weight". A directional loop (Up, Down, Left, Right) pushes lighter/heavier pixels using a probability variable (`strength`), creating a melting or layered effect.
* **Erosion:** A falling-sand automata variant. Assigns states based on palette percentage (0-20% Earth, 20-80% Air, 80-100% Water). Water falls through air, pushes diagonally if blocked, and increments Earth's color index (eroding it) based on an `erosionStrength` probability.
* **Brightness / Contrast Evolution:** Smooths or sharpens the board by calculating the average luminance (index `v`) of neighbors, pulling the cell towards the average (Brightness mode) or pushing it away (Contrast mode).
* **Contour Generation:** Edge detection algorithm. Compares orthogonal neighbors' indices (`k`) against a threshold percentage calculated from a `sensitivity` (0-100) variable. Overwrites distinct boundaries with the predefined `lineColor` (darkest or lightest index).



## 8. User Interface, Modals & Internationalization

### 8.1 The Modals Controller (`ui-modals.js`)
To keep `app.js` clean, all pop-ups, menus, and settings overlays are managed by `ui-modals.js`.
* **Dependency Injection:** During initialization, `app.js` passes a tightly scoped `appContext` object to `initializeModals(appContext)`. This allows the modals to call specific core functions (like `app.setGameOfLifeRules()` or `app.downloadImage()`) without polluting the global scope or creating circular dependencies.
* **Simulation Settings:** Each simulation has a dedicated settings modal with specific UI paradigms:
    * **Chips/Arrays:** Game of Life and Chi Flow (Sandpile) use clickable "chips" to toggle integer values inside arrays (e.g., `survival: [2, 3]`).
    * **Sliders/Floats:** Gravitational Sort, Contour, and Turing Patterns use range sliders to set continuous variables (`strength`, `sensitivity`, `feed`/`kill` rates).
    * **Presets:** Pre-defined objects (e.g., `PRESET_RULES`, `TURING_PRESETS`) map standard names to specific mathematical parameter configurations. The UI dynamically detects if current settings match a preset and highlights the corresponding button.

### 8.2 Single Source of Truth (`constants.js`)
This file defines all immutable configurations and initial states, making it easy to tweak the app's overall behavior.
* **`PALETTES` Array:** Contains objects with an `originalName`, `emoji`/`iconHTML`, and an array of hex colors. Note: Colors are dynamically sorted by luminance (`getLuminance`) in `app.js` to ensure tools like `goDark()` and contour logic function predictably.
* **Default Rules:** Exports objects like `defaultGameOfLifeRules`, `defaultChiFlowRules`, and `defaultTuringRules` to ensure simulations have a safe fallback when the user hits "Reset".
* **Magic Numbers:** Defines grid constraints (`SIZES`, `SEPARATORS`), `HISTORY_LIMIT`, and `LONG_PRESS_SHOW_MS`.

### 8.3 Internationalization (`i18n.js`)
A lightweight, custom multi-language system tailored for immediate UI updates.
* **Dictionary Structure:** Uses a centralized `translations` object where keys map to language objects (e.g., `help_tip1: { en: "...", he: "...", ru: "...", nl: "..." }`).
* **State & Storage:** Tracks the `currentLang` and persists the user's choice to `localStorage` (`userLanguage`).
* **Reactivity:** Exposes an `onLanguageChange(callback)` subscriber pattern. When the language toggles, it fires the callback (linked to `updateAllUIText()` in `app.js`), forcing every DOM element to fetch its new string via `getText(key)`.
* **RTL Support:** Dynamically applies the `.rtl-mode` CSS class to specific containers (like the Help Modal) when Hebrew (`he`) is selected to fix layout alignment.

## 9. Best Practices for Modifying This Codebase (AI Instructions)
If you (the AI) are asked to modify this application, adhere to the following architectural rules:
1. **Never mutate `boardState` directly outside of `performAction()`** unless inside a `gameLoop` simulation. If it's a manual user tool, wrap it in `performAction` to preserve the Undo/Redo history.
2. **If adding a new Simulation:** - Add the mathematical logic to `simulations.js`.
   - Add default parameters to `constants.js`.
   - Add the button and modal elements to `index.html` and `dom-elements.js`.
   - Wire the UI controls in `ui-modals.js`.
   - Add a new `case` in `app.js` inside both `gameLoop()` and `stepForward()`.
3. **Always use 1D Array Math:** The grid is 1D. Always use `row = Math.floor(i / n)` and `col = i % n` for 2D calculations, and check array boundaries (`if (row >= 0 && row < n ...)`).
4. **Color Mapping:** Keep in mind that `tile.k` is just an integer index pointing to `C.PALETTES[activePaletteIndex].colors`. Modifying `tile.k` changes the color.


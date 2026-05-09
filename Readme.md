# 🎨 Follow Your Intuition - Complete Developer Documentation

Welcome to the comprehensive technical documentation for the "Follow Your Intuition" application. 
This application is built using **Vanilla JavaScript (ES6 Modules)** without external frameworks (except Tailwind CSS for styling and html2canvas for image export). It is powered by a high-performance **HTML5 Canvas** engine designed to run cellular automata and physics-based simulations.

---

## 📑 Table of Contents
1. [Project Structure](#1--project-structure)
2. [State Management & Rendering](#2--state-management--rendering)
3. [The Color Engine & Palettes](#3--the-color-engine--palettes)
4. [UI, Localization & Modals](#4--ui-localization--modals)
5. [Simulation Engine: Getting Started](#5-%EF%B8%8F-simulation-engine-getting-started)
6. [Advanced Simulations Architecture](#6--advanced-simulations-architecture)
7. [Additional Systems & Extension Guides](#7--additional-systems--extension-guides)
---

## 1. 📁 Project Structure

The code is modularized to separate logic, state, and UI:

* **`index.html`**: The application skeleton. It contains the Tailwind configuration, the main canvas, all UI buttons, and modal definitions. It loads the logic as a module via `js/app.js`.
* **`js/app.js`**: The core "orchestrator." It manages the global board state, animation loops (`gameLoop`, `animationLoop`), user input handling (Pointer Events), and the Undo/Redo history system.
* **`js/constants.js`**: Central repository for application constants. Includes default simulation rules, grid sizes, history limits, and palette grouping logic.
* **`js/colors.js`**: The color engine. It handles color space conversions (RGB/HEX/HSV) and provides advanced sorting algorithms (Luminance, Dark Rainbow, Temperature, etc.).
* **`js/dom-elements.js`**: A central `dom` object mapping all required HTML elements. This avoids repetitive DOM lookups and keeps the code clean.
* **`js/simulations.js`**: A router file that imports and re-exports simulation logic from the `simulations/` directory.
* **`js/simulations/*.js`**: Pure logic for each simulation. These functions are functional: they take a state and return a new state.
* **`js/ui-modals.js`**: Manages the lifecycle and rendering of all modal windows (Settings, Color Picker, Help) using Dependency Injection.
* **`js/i18n.js`**: Internationalization module supporting multiple languages.
* **`js/data/palettes.js`**: The raw data containing all color palettes used in the app.

---

## 2. 🧠 State Management & Rendering

### Board State (`boardState`)
The grid is represented as a 1D array of length `n * n`. Each tile object contains:
* `k`: The current color index from the active palette.
* `v`: An internal float value (often used for physics simulations like Turing or Sandpile).
* `prevK`: The previous color index (used for smooth color interpolation/lerp).
* `animStart`: Timestamp of when the current color transition started.
* `isGold`: A boolean flag protecting the tile from being modified by simulations.

### Rendering Engine (`renderBoard` in `app.js`)
There are two optimized rendering paths:
1.  **Classic Path (`separatorPx > 0`)**: Renders individual tiles using `fillRect`. Optimized for the creative/drawing mode.
2.  **Ultra-Fast Path (`separatorPx === 0`)**: Specifically for simulations. It renders directly to an `OffscreenCanvas` at `n x n` resolution by manipulating `ImageData` (pixel-level manipulation). The resulting image is then stretched over the main canvas with `imageSmoothingEnabled = false` for maximum performance at 60FPS.

---

## 3. 🎨 The Color Engine & Palettes

### Color Mathematics (`js/colors.js`)
This module strictly handles "pure" functional color processing. It calculates Luminance, Hue, and HSV directly from Hex strings without touching the DOM.
* **Advanced Sorting Algorithms:** The `sortColorsArray` function powers the creative visual modes. Beyond simple luminance, it calculates complex arrays:
    * `dark-rainbow`: Splits colors by saturation and groups darks/lights, sorting the colorful mid-tones by Hue buckets.
    * `biomes`: Groups colors into 90-degree Hue buckets and sorts by luminance within them.
    * `temperature`: Compares the Red and Blue channels to map colors from "warmest" to "coolest".
    * `zen-void`, `waves`, `outside-in`: Spatial and geometric array sorting.

### Palette Data Structure (`data/palettes.js`)
Palettes are stored as static JSON-like objects in js/data/palettes.js.

Palette Structure:

{
    name: "Golden Hour",   // Display name
    emoji: "🌅",           // Fallback icon
    colors: [              // Array of Hex strings
        "#2b2b2b", 
        "#f5a25d", 
        "#ffd700"
    ],
    isArchived: false      // Set to true to hide from the UI
}
Auto-Grouping:
You do not need to manually assign a palette to a UI group (Origin, Expansion, Resonance). In constants.js, the PALETTE_GROUPS constant automatically categorizes palettes based on their colors.length. Just add your palette to the array, and the UI will handle the rest.

---

## 4. 🌍 UI, Localization & Modals

### Internationalization (`js/i18n.js`)
The application uses a custom, lightweight i18n engine.
* **The Dictionary:** The `translations` object acts as the single source of truth. Every text element is mapped to a key.
* **Adding New Languages:** To add a language, update the `translations` dictionary with the new locale code (e.g., `es` for Spanish) and update the `getAvailableLangs()` array. Always use `getText('key')` in the JS logic.

### Modal Management & Dependency Injection (`js/ui-modals.js`)
Because `app.js` controls the core state, importing it directly into `ui-modals.js` would create a circular dependency.
* **The Solution:** When `app.js` initializes, it bundles necessary state getters and action callbacks into a `contextForModals` object. `initializeModals(context)` receives this context, allowing the UI modals to safely read the board size, update rules, and trigger actions.


Adding a New Settings Modal:
HTML: Create the modal structure in index.html with a .hidden class.

DOM Setup: Map the buttons and containers in dom-elements.js.

UI Setup: In ui-modals.js, write an openMyNewModal() function. Use modal.classList.add('modal-visible') to trigger the CSS transition.

Save Logic: When the user clicks "Save" inside the modal, read the slider/button values, update the respective rule object via a setter provided in the context, and close the modal.

---

## 5. ⚙️ Simulation Engine: Getting Started

Execution is controlled by the `armedSimulation` variable. When active, `togglePlayPauseLife()` starts the `gameLoop()`. Inside the `gameLoop`, a `switch(armedSimulation)` statement calls the respective logic from the `Simulations` module and updates the `boardState`.

### 🛠️ Guide: Adding a New Simulation (e.g., "Chaos")
1.  **Logic (`js/simulations/chaos.js`)**: Create a functional block that receives `n`, `currentBoardState`, `currentPalette`, and rules, then returns a new `nextBoardState` array.
2.  **Exporting (`js/simulations.js`)**: Export your function.
3.  **Constants (`js/constants.js`)**: Define default rules: `export const defaultChaosRules = { ... };`.
4.  **UI (`index.html` & `dom-elements.js`)**: Add a button `<button id="btnChaos" ...>` and reference it in the `dom` object.
5.  **Wiring (`app.js`)**: Initialize rules, include the button in simulation reset lists, and add the click Event Listener.
6.  **Loop Integration (`app.js`)**: Add the case to the `gameLoop` switch statement.

---

## 6. 🔬 Advanced Simulations Architecture


All simulations adhere to a strictly functional, immutable paradigm: they read the `currentBoardState`, process the specialized logic using their respective rules, and return a *new* `nextBoardState` array.

---

### 1. Breathe (Animation Engine)
**File:** `js/simulations/breathe.js`

Unlike other simulations that update discrete states per generation, `Breathe` operates directly inside the `animationLoop` to manipulate pixel brightness dynamically.

* **Mathematical Model:** Uses a continuous sine wave (`Math.sin()`) tied to the global `timestamp` to calculate a luminosity multiplier.
* **Modes (`breatheEvoMode`):**
    * `solo`: Each tile pulses individually. The sine wave's phase is offset by an initial `startDelay` assigned to the tile when the simulation arms.
    * `group`: A synchronized organic pulse. The sine phase is offset by the tile's current color index (`tileData.k * 0.8`), causing adjacent colors to breathe in localized "waves".
* **Performance:** Extracts the calculation into `getBreatheBrightnessFactor()` to keep the core rendering pipeline ultra-fast.

---

### 2. Brightness Evolution & Contrast
**File:** `js/simulations/brightness.js`

These models simulate cellular smoothing and contrasting by treating the color index (`v`) as a continuous float representing "brightness".

* **Brightness Evolution (Smoothing):**
    * Calculates the average `v` of the 8 surrounding neighbors (Moore neighborhood).
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
    * The user UI defines `sensitivity` (0-100), which maps to a threshold percentage (0.5% to 50% of the total palette length).
    * A tile is marked as an "edge" if the absolute difference in index (`Math.abs(currentK - neighborK)`) between it and its North/South/East/West neighbors exceeds the `LUMINANCE_THRESHOLD`.
* **Execution:**
    * It reads the entire board first (`indicesToChange`), then applies the contour line color (Darkest or Lightest index) simultaneously. This prevents cascading chain reactions within a single frame.

---

### 4. Erosion (Granular Physics)
**File:** `js/simulations/erosion.js`

A specialized downward-falling algorithm mimicking sediment settling and weathering.

* **Palette Mapping:**
    * The palette is virtually sliced into three states based on index percentages: `Earth` (Bottom 20%), `Air` (Middle 60%), and `Water` (Top 20%).
* **Physics Rules:**
    * Only `Water` tiles (the lightest colors) actively fall.
    * **Direct Fall:** Swaps with `Air` immediately below.
    * **Weathering:** If it lands on `Earth`, there is a chance (`erosionStrength`) it will "erode" the earth tile (incrementing its index by 1) before sliding.
    * **Sliding:** If the path directly below is blocked, it checks the bottom-left and bottom-right diagonals. A 75% bias is mathematically applied to correct for the left-to-right processing loop, ensuring a balanced, centered pile.

---

### 5. Spiral & Vortex Physics
**File:** `js/simulations/spiral.js`

A complex physics engine that manipulates tiles using polar coordinates (angle and radius) rather than standard Cartesian (X/Y) movement.

* **Core Mathematics:**
    * Calculates the tile's distance (`distToCenter`) and angle (`Math.atan2(dy, dx)`) from the exact center.
    * Applies a rotational force (`spinStrength`) and a gravitational pull (`pullStrength`).
    * Re-converts the new polar coordinates back into a Cartesian target `(targetR, targetC)`.
* **Collision & Movement:**
    * Instead of jumping directly, the tile evaluates its 8 immediate neighbors and swaps with the one that minimizes the squared distance (`neighborDistSq`) to the theoretical target.
    * Employs a `movedThisFrame` tracking Set to lock pixels after they move, preventing "lightspeed" skipping across the board in a single frame.
* **Modes (`spiralRules.method`):**
    * `b` (Experiment B): A clean, fluid spiral with high `baseSpinStrength`, low pull, and 0% turbulence.
    * `vortex`: Introduces sinusoidal turbulence (`Math.sin() * Math.cos()`) modulated by a global time phase to create chaotic, unpredictable eddies.
    * `left` / `down`: Overrides the dynamic targets with fixed directional vectors to simulate black holes or side-drafts.
    * `radial`: Pure, spinless inward gravity (`spinStrength = 0`).
    * `a` (Experiment A): A unique time-boxed algorithm. It pre-calculates a perfect radial sorting array, then executes bubble-sort passes inward and outward. It terminates early if execution exceeds a `timeBudgetMs` (12ms) to guarantee frame rates.

---


### 6. Chi Flow (Sandpile Model)
**File:** `js/simulations/chi_flow.js`

Based on the Abelian sandpile model, this simulation treats cell values as physical "energy" or "sand grains". It is highly dynamic and includes self-sustaining logic.

* **The Core Mechanism:** Iterates over the grid checking neighbors. When a cell's accumulated energy crosses a specific threshold (defined by the `awakening` rule array), it becomes unstable and "topples", distributing its energy to surrounding cells.
* **Dynamic Reach (Radius):** The `reach` parameter determines the magnetic pull of the distribution. If the user sets it to `0` (Auto), the algorithm dynamically calculates the reach based on the palette size (`Math.max(2, Math.floor(numColors / 6))`).
* **The Ignition System:** To prevent the simulation from dying out (reaching a static equilibrium), an internal `applyIgnition` mechanism monitors the board. If the active cell count drops below 150, it artificially injects random "sparks" of color in a 9x9 grid around existing active cells, simulating spontaneous combustion or localized energy surges.

---

### 7. Turing Patterns (Reaction-Diffusion)
**File:** `js/simulations/turing.js`

A highly optimized implementation of the Gray-Scott Reaction-Diffusion equations, simulating biological and chemical pattern formation (like animal stripes or coral).

* **Memory Architecture (Ping-Pong Buffers):** To maintain 60FPS with heavy floating-point math, it uses pre-allocated `Float32Array` buffers for chemical A and B concentrations. It swaps between current and `next` buffers, avoiding Garbage Collection spikes.
* **Laplacian Convolution:** Computes diffusion using a 3x3 kernel with precise mathematical weights: Center (-1.0), Adjacent (0.2), and Diagonal (0.05).
* **Visual Mapping (Non-Linear):** Chemical float values aren't mapped linearly to the palette. 
    1. **Stretching:** The active chemical range `[0.05, 0.78]` is stretched to cover `[0.0, 1.0]` so no palette colors are lost.
    2. **Gamma Correction:** Applies a power curve (`Math.pow(visualValue, 1.5)`) to push the majority of the board into deeper, darker palette colors, leaving the bright colors for sharp, highly-concentrated edges.

---

### 8. Magnetism
**File:** `js/simulations/magnet.js`

A complex spatial attraction engine optimized for mobile devices. It forces colors to flow toward or away from a defined `anchorColorIndex`.

* **Extreme Optimizations (Zero Allocation):** This file deliberately trades modern syntactic sugar for raw speed:
    * Reuses a flat `Uint8Array` to track moved pixels instead of using `Set()`.
    * Uses classic variables for swapping (`temp = a; a = b; b = temp`) instead of array destructuring `[a,b] = [b,a]`.
    * Replaces `Math.pow(x, 2)` with raw multiplication `(x * x)` inside hot loops to prevent CPU throttling.
* **Execution Modes:**
    * `magnet`: Standard linear attraction towards the anchor.
    * `cosmic_magnet`: Applies a stronger, non-linear gravity well effect.
    * `time_magnet`: Uses the palette length (`% pLen`) to offset the attraction, creating visual ripples and phase-delayed waves.
    * `expand`: Reverses the target logic, acting as a repulsive force radiating outward from the anchor.

---

### 9. Gravitational Sort
**File:** `js/simulations/gravitational_sort.js`

Simulates density and weight, forcing darker colors to sink and lighter colors to rise based on specific geometric vectors.

* **Zero-Allocation Sorting:** Operates entirely by mutating the `nextBoardState` in place, avoiding any new object creation during the bubble-sort-like passes.
* **Directional Vectors:**
    * `up` / `right`: Linear sorts using optimized, direction-specific `for` loops.
    * `center_x`: Collapses the board horizontally toward the middle column.
    * `radial`: Uses a pre-calculated, cached array (`cachedRadialOrder`) of indices sorted by their distance to the center, pulling "heavy" colors inward.
    * `vortex`: Combines the radial pull with a rotational offset, creating a swirling drain effect.

---

### 10. Conway's Game of Life
**File:** `js/simulations/game_of_life.js`

A specialized, artistic adaptation of the classic cellular automaton.

* **Live Cell Definition:** Instead of a binary state, a cell is considered "alive" if its color index is strictly greater than 0 (`notDarkest`). Gold tiles are strictly immune.
* **List-Based Rules:** Supports complex rulesets by checking if the live neighbor count is `.includes()` in the survival/birth arrays (e.g., survival: `[2, 3]`, birth: `[3]`).
* **Color Genetics:** When a new cell is born, it doesn't just pick a random color. It calculates the *average RGB value* of its surrounding live "parent" cells and finds the closest matching color index in the active palette, creating beautiful gradients as the population evolves.

---

### 11. DLA (Diffusion-Limited Aggregation)
**File:** `js/simulations/dla.js`

Simulates fractal growth processes like lightning, crystal formation, or fungal branching using random walkers.

* **The Walkers:** Spawns invisible "walkers" at random edge locations. These wander the board randomly until they touch the existing "crystal" structure.
* **Crystal Sticking & Coloring:** When a walker touches the crystal, it locks in place. Its new color is derived sequentially from the crystal neighbor it touched (`(neighborColorIndex + 1) % pLen`), creating a time-mapped rainbow effect along the branches.
* **Performance Tracking:** Maintains an `emptyIndices` array to efficiently spawn new walkers only in available spaces, rather than randomly guessing empty coordinates on a nearly full board.




## 7. 🔄 Additional Systems & Extension Guides


### 🎨 Palette Re-mapping System

The application features a unique re-mapping system. When a user changes the sorting method of a palette (e.g., from "Luminance" to "Reversed"):
1.  `applySortMethod` is triggered.
2.  The engine captures the exact Hex color of every tile on the board.
3.  The underlying palette arrays in `C.PALETTES` are sorted.
4.  **The Re-map:** The engine iterates through the board and finds the *new index* (`newK`) of the original color in the sorted palette. It updates the `k` property so the visual output remains identical while the internal logic adapts to the new order.

---

### 🖱️ Input & Interactions
Input is handled via a unified Pointer Event system supporting mouse and touch:
* **`pointerState`**: Tracks dragging, source indices for copying, and timers.
* **Brush Mode**: When `isBrushModeOn` is active, it paints colors. When inactive, it performs a "Drag & Copy" where a source tile's properties are spread across the path.
* **Symmetry**: All manual interactions automatically trigger the `getSymmetricIndices` helper to apply changes across the Vertical, Horizontal, Mandala, or Kaleidoscope axes.




----

### 🎨 Styling & Animations (`styles.css`)
The app utilizes Tailwind CSS for utility classes, heavily customized with vanilla CSS in `styles.css`.
* **CSS Variables:** Global theme colors like `--gold` (`#FFD700`), `--sim-color`, and `--bg-color` are defined in the `:root`.
* **Glow Effects:** The `.glowing-border` and `.glowing-border-rainbow` classes use CSS `box-shadow` and `border-image` to create dynamic, breathing borders around the canvas based on the currently selected color.
* **Custom Animations:** Keyframes like `fadeInText`, `fadeOutText`, and `spin` are explicitly defined for splash screens and loading states, ensuring smooth 60FPS UI transitions.

---

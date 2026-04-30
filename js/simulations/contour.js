export function runContourGeneration({ n, currentBoardState, currentPalette, contourRules }) {
    // 1. Create a copy to write to. We will only read from currentBoardState.
    const nextBoardState = currentBoardState.map(tile => ({ ...tile }));
    
    // 2. Define contour settings based on rules
    const pLen = currentPalette.length;
    const maxIndex = pLen - 1;

    // Use selected line color from rules
    const contourIndex = (contourRules.lineColor === 'lightest') ? maxIndex : 0; // Default to 0 (darkest)

    // Calculate threshold based on sensitivity (0-100)
    // 0 = Low Sensitivity -> High Threshold (50%)
    // 100 = High Sensitivity -> Low Threshold (1%)
    const MAX_THRESHOLD_PERCENT = 0.5; // 50%
    const MIN_THRESHOLD_PERCENT = 0.01; // 1%
    const sensitivity = contourRules.sensitivity || 30; // Default to 30 if undefined
    
    // Map sensitivity (0-100) to a threshold percentage (0.5-0.01)
    const thresholdPercent = MAX_THRESHOLD_PERCENT - ((sensitivity / 100) * (MAX_THRESHOLD_PERCENT - MIN_THRESHOLD_PERCENT));
    
    // Convert percentage to an absolute index step count
    const LUMINANCE_THRESHOLD = Math.max(1, Math.floor(pLen * thresholdPercent));
    
    // 3. Find all edge tiles by reading from the original state
    const indicesToChange = [];
    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        
        // If this tile is *already* a contour line, skip it.
        // This allows the contour to "grow" from its edges on the next generation.
        if (cell.k === contourIndex) {
            continue;
        }

        const currentK = cell.k;
        const row = Math.floor(i / n);
        const col = i % n;
        let isEdge = false;

        // Check North
        if (row > 0 && Math.abs(currentK - currentBoardState[i - n].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check South
        if (!isEdge && row < n - 1 && Math.abs(currentK - currentBoardState[i + n].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check West
        if (!isEdge && col > 0 && Math.abs(currentK - currentBoardState[i - 1].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }
        // Check East
        if (!isEdge && col < n - 1 && Math.abs(currentK - currentBoardState[i + 1].k) >= LUMINANCE_THRESHOLD) {
            isEdge = true;
        }

        if (isEdge) {
            indicesToChange.push(i);
        }
    }

    // 4. Apply all changes simultaneously to the next state
    // This prevents a chain reaction within a single generation
    for (const index of indicesToChange) {
        nextBoardState[index].k = contourIndex;
        nextBoardState[index].v = contourIndex;
        nextBoardState[index].isGold = false; // Contour lines overwrite gold tiles
    }

    return nextBoardState;
}

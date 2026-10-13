export function runErosionGeneration({ n, currentBoardState, currentPalette, erosionRules }) {
    if (['channels', 'channels-solid'].includes(erosionRules.mode)) {
        return runChannelErosion({ n, currentBoardState, currentPalette, erosionRules });
    }
    const pLen = currentPalette.length;
    const earthEndIndex = Math.floor(pLen * 0.20);
    const airEndIndex = Math.floor(pLen * 0.80);

    const isEarth = (k) => k < earthEndIndex;
    const isAir = (k) => k >= earthEndIndex && k < airEndIndex;
    const isWater = (k) => k >= airEndIndex;
    
    const currentStateIndices = currentBoardState.map(tile => tile.k);

    // חזרנו ללולאה המקורית והרציפה שיוצרת תנועת גל חלקה (תמיד רצה מהסוף להתחלה)
    for (let i = n * n - 1; i >= 0; i--) {
        const k = currentStateIndices[i];
        if (!isWater(k)) continue;

        const row = Math.floor(i / n);
        const col = i % n;

        if (row < n - 1) {
            const belowIdx = i + n;
            const belowK = currentStateIndices[belowIdx];

            // נפילה ישרה למטה
            if (isAir(belowK)) {
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [belowK, k];
                continue;
            }
            
            // שחיקת אדמה
            if (isEarth(belowK) && Math.random() < erosionRules.erosionStrength) {
                currentStateIndices[belowIdx]++; 
                [currentStateIndices[i], currentStateIndices[belowIdx]] = [currentStateIndices[belowIdx], k];
                continue;
            }
            
            // בדיקת אלכסונים
            const canGoLeft = col > 0 && isAir(currentStateIndices[belowIdx - 1]);
            const canGoRight = col < n - 1 && isAir(currentStateIndices[belowIdx + 1]);

            if (canGoLeft && canGoRight) {
                // הפתרון: הסריקה דוחפת שמאלה, לכן ניתן פה משקל יתר לימינה כדי לאזן את הערימה!
                const moveIdx = (Math.random() < 0.75) ? belowIdx + 1 : belowIdx - 1;
                [currentStateIndices[i], currentStateIndices[moveIdx]] = [currentStateIndices[moveIdx], k];
            } else if (canGoLeft) {
                [currentStateIndices[i], currentStateIndices[belowIdx - 1]] = [currentStateIndices[belowIdx - 1], k];
            } else if (canGoRight) {
                [currentStateIndices[i], currentStateIndices[belowIdx + 1]] = [currentStateIndices[belowIdx + 1], k];
            }
        }
    }
    
    const nextBoardState = currentBoardState.map((tile, i) => {
        const newK = currentStateIndices[i];
        return {...tile, k: newK, v: newK };
    });

    return nextBoardState;
}

// Separate rules for channel carving; legacy erosion above stays unchanged.
function runChannelErosion({ n, currentBoardState, currentPalette, erosionRules }) {
    const airEnd = Math.floor(currentPalette.length * 0.2);
    const earthEnd = Math.floor(currentPalette.length * 0.8);
    const earthFirst = erosionRules.mode === 'channels-solid';
    const indices = currentBoardState.map(tile => tile.k);
    const moved = new Uint8Array(indices.length);
    const isAir = i => !currentBoardState[i].isGold && (earthFirst
        ? indices[i] >= airEnd && indices[i] < earthEnd : indices[i] < airEnd);
    const isEarth = i => !currentBoardState[i].isGold && (earthFirst
        ? indices[i] < airEnd : indices[i] >= airEnd && indices[i] < earthEnd);
    const strength = erosionRules.erosionStrength;

    // Bottom-up updates, with a random row direction to avoid a lateral bias.
    for (let row = n - 1; row >= 0; row--) {
        const reverse = Math.random() < 0.5;
        for (let step = 0; step < n; step++) {
            const col = reverse ? n - 1 - step : step;
            const i = row * n + col;
            if (moved[i] || currentBoardState[i].isGold || indices[i] < earthEnd) continue;
            // Water reaching the floor stays there, without reinjection.
            if (row === n - 1) continue;

            const below = i + n;
            const contacts = [below];
            if (col > 0) contacts.push(i - 1);
            if (col < n - 1) contacts.push(i + 1);
            const earth = contacts.filter(isEarth);
            if (earth.length && Math.random() < strength) {
                // One gradual erosion event per water particle and generation.
                const contact = earth[Math.floor(Math.random() * earth.length)];
                indices[contact] = earthFirst ? indices[contact] + 1 : Math.max(0, indices[contact] - 1);
            }

            let target = -1;
            if (isAir(below)) target = below;
            else {
                const diagonals = [];
                if (col > 0 && isAir(below - 1)) diagonals.push(below - 1);
                if (col < n - 1 && isAir(below + 1)) diagonals.push(below + 1);
                if (diagonals.length) target = diagonals[Math.floor(Math.random() * diagonals.length)];
                else {
                    const sides = [];
                    if (col > 0 && isAir(i - 1)) sides.push(i - 1);
                    if (col < n - 1 && isAir(i + 1)) sides.push(i + 1);
                    if (sides.length) target = sides[Math.floor(Math.random() * sides.length)];
                }
            }
            if (target !== -1) {
                [indices[i], indices[target]] = [indices[target], indices[i]];
                moved[target] = 1; // A sideways move must not move again in this generation.
            }
        }
    }
    return currentBoardState.map((tile, i) => ({ ...tile, k: indices[i], v: indices[i] }));
}

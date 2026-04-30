export function runBrightnessEvolution({ n, currentBoardState, currentPalette }) {
    const smoothingFactor = 0.5;
    const nextBoardState = currentBoardState.map(tile => ({ ...tile })); // Create a mutable copy
    const maxIndex = currentPalette.length - 1; // קביעת האינדקס המקסימלי המותר

    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        if (cell.isGold) continue;
        
        const row = Math.floor(i / n);
        const col = i % n;

        let totalBrightness = 0;
        let neighborCount = 0;

        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = row + di;
                const nj = col + dj;
                if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                    const neighbor = currentBoardState[ni * n + nj];
                    if (!neighbor.isGold) {
                        totalBrightness += neighbor.v;
                        neighborCount++;
                    }
                }
            }
        }

        if (neighborCount > 0) {
            const averageBrightness = totalBrightness / neighborCount;
            const currentV = cell.v;
            let newV = currentV + (averageBrightness - currentV) * smoothingFactor;

            // --- התיקון המרכזי ---
            // תחימת הערך החדש בין 0 לאינדקס המקסימלי של הפלטה
            newV = Math.max(0, Math.min(newV, maxIndex)); 
            // ---------------------

            nextBoardState[i].v = newV;
            nextBoardState[i].k = Math.round(newV);
        }
    }

    return nextBoardState;
}


export function runContrastGeneration({ n, currentBoardState, currentPalette }) {
    const nextBoardState = currentBoardState.map(tile => ({...tile}));
    const strength = 0.1; // אפשר להפוך את זה להגדרה שהמשתמש יכול לשלוט בה בעתיד
    const maxIndex = currentPalette.length - 1;

    for (let i = 0; i < n * n; i++) {
        const cell = currentBoardState[i];
        if (cell.isGold) continue;
        
        const row = Math.floor(i / n);
        const col = i % n;

        let totalBrightness = 0;
        let neighborCount = 0;

        // נחשב את ממוצע הבהירות של השכנים בלבד (לא כולל התא עצמו)
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue; // מדלגים על התא המרכזי
                
                const ni = row + di;
                const nj = col + dj;
                if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                    const neighbor = currentBoardState[ni * n + nj];
                    if (!neighbor.isGold) {
                        totalBrightness += neighbor.v;
                        neighborCount++;
                    }
                }
            }
        }

        if (neighborCount > 0) {
            const avgBrightness = totalBrightness / neighborCount;
            const currentBrightness = cell.v;
            let newBrightness;

            // --- לב הלוגיקה של הקונטרסט ---
            if (currentBrightness > avgBrightness) {
                // אם אני בהיר יותר מהממוצע, אני אהפוך לעוד יותר בהיר
                newBrightness = currentBrightness + strength;
            } else if (currentBrightness < avgBrightness) {
                // אם אני כהה יותר מהממוצע, אני אהפוך לעוד יותר כהה
                newBrightness = currentBrightness - strength;
            } else {
                // אם אני שווה לממוצע, אני לא משתנה
                newBrightness = currentBrightness;
            }
            
            // נוודא שהערך החדש לא חורג מגבולות הפלטה
            newBrightness = Math.max(0, Math.min(newBrightness, maxIndex));

            nextBoardState[i].k = Math.round(newBrightness);
            nextBoardState[i].v = newBrightness;
        }
    }
    return nextBoardState;
}


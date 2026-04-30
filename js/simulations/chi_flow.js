export function generateSandpile(currentBoardState, currentPalette, chiFlowRules) {
    const n = Math.sqrt(currentBoardState.length);
    const nextBoardState = currentBoardState.map(cell => ({ ...cell }));
    let hasChanged = false;
    const numColors = currentPalette.length;

    // מגנטיות - עכשיו נשלטת על ידי המשתמש (reach) במקום חישוב קשיח
let pullReach = chiFlowRules.reach;
// אם המשתמש בחר 0 (Auto), נשתמש בנוסחה הדינמית החכמה מהקוד הישן שלך
if (pullReach === 0) {
    pullReach = Math.max(2, Math.floor(numColors / 6));
}

    for (let i = 0; i < currentBoardState.length; i++) {
        const row = Math.floor(i / n);
        const col = i % n;
        const currentK = currentBoardState[i].k;
        
        let neighborsWithEnergy = 0;
        let pullingNeighborsCount = 0;

        // בדיקת 8 שכנים (כולל עטיפת הלוח)
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                
                const wrapRow = (row + r + n) % n;
                const wrapCol = (col + c + n) % n;
                const neighborIdx = wrapRow * n + wrapCol;
                const neighborK = currentBoardState[neighborIdx].k;

                if (neighborK > 0) neighborsWithEnergy++;

                let dist = neighborK - currentK;
                if (dist < 0) dist += numColors;

                if (dist > 0 && dist <= pullReach) {
                    pullingNeighborsCount++;
                }
            }
        }

        // חוק 1: התעוררות - נבדק מול מערך החוקים הדינמי (awakening)
        if (currentK === 0 && chiFlowRules.awakening.includes(neighborsWithEnergy)) {
            nextBoardState[i].k = 1;
            nextBoardState[i].v = 1;
            hasChanged = true;
        } 
        // חוק 2: זרימה ממוקדת - נבדק מול מערך החוקים הדינמי (flow)
        else if (currentK > 0 && chiFlowRules.flow.includes(pullingNeighborsCount)) {
            const nextK = (currentK + 1) % numColors;
            nextBoardState[i].k = nextK;
            nextBoardState[i].v = nextK;
            hasChanged = true;
        }
    }

    // --- התחלת מנגנון ההצתה (Ignition) ---
    // (הקוד שהוספנו קודם נשאר כאן ללא שינוי, הוא עדיין רלוונטי)
    let activeCellsCount = 0;
    const activeCellsIndices = [];

    for (let i = 0; i < currentBoardState.length; i++) {
        if (currentBoardState[i].k > 0) {
            activeCellsCount++;
            activeCellsIndices.push(i);
        }
    }

    if (activeCellsCount > 0 && activeCellsCount < 150) {
        for (const index of activeCellsIndices) {
            const row = Math.floor(index / n);
            const col = index % n;

            for (let r = -4; r <= 4; r++) {
                for (let c = -4; c <= 4; c++) {
                    const newRow = row + r;
                    const newCol = col + c;

                    if (newRow >= 0 && newRow < n && newCol >= 0 && newCol < n) {
                        if (Math.random() > 0.3) {
                            const newIndex = newRow * n + newCol;
                            const randomColorK = Math.floor(Math.random() * numColors);
                            
                            nextBoardState[newIndex].k = randomColorK;
                            nextBoardState[newIndex].v = randomColorK;
                            hasChanged = true;
                        }
                    }
                }
            }
        }
        return { nextBoardState, hasChanged };
    }
    // --- סוף מנגנון ההצתה ---

    return { nextBoardState, hasChanged };
}

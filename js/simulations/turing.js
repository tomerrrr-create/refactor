export function runTuringGeneration({ n, currentBoardState, currentPalette, turingState, turingRules }) {
    let state = turingState;
    const pLen = currentPalette.length;
    
    // מכפיל להמרה ויזואלית
    const STRETCH_FACTOR = 1.6; 
    
    // 1. אתחול ראשוני (Ping-Pong Buffers - מניעת יצירת מערכים חדשים בכל פריים)
    if (!state || !state.isInitialized || state.A.length !== n * n) {
        state = { 
            A: new Float32Array(n * n).fill(1.0), 
            B: new Float32Array(n * n).fill(0.0),
            nextA: new Float32Array(n * n), // באפר חלופי לחישובים
            nextB: new Float32Array(n * n), // באפר חלופי לחישובים
            lastBoardK: new Uint16Array(n * n), 
            isInitialized: true 
        };
        
        let hasDrawing = false;
        
        for (let i = 0; i < n * n; i++) {
            const currentK = currentBoardState[i].k;
            state.lastBoardK[i] = currentK;
            
            if (currentK > 0 && !currentBoardState[i].isGold) {
                hasDrawing = true;
                // מיפוי לא-ליניארי (חזקה) כדי שצבעים בהירים לא יישרפו מהר מדי
                const bLevel = Math.pow(currentK / pLen, 1.5); 
                state.B[i] = Math.min(1.0, bLevel); 
                state.A[i] = Math.max(0.0, 1.0 - state.B[i]);
            }
        }
        
        if (!hasDrawing) {
            const center = Math.floor(n / 2);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const idx = (center + dy) * n + (center + dx);
                    if(idx >= 0 && idx < n * n) {
                        state.B[idx] = 1.0;
                        state.A[idx] = 0.0;
                    }
                }
            }
        }
    } else {
        // סנכרון חי לציור של המשתמש
        for (let i = 0; i < n * n; i++) {
            const currentK = currentBoardState[i].k;
            if (currentK !== state.lastBoardK[i]) {
                if (currentK > 0 && !currentBoardState[i].isGold) {
                    const bLevel = Math.pow(currentK / pLen, 1.5);
                    state.B[i] = Math.min(1.0, bLevel);
                    state.A[i] = Math.max(0.0, 1.0 - state.B[i]);
                } else if (currentK === 0) {
                    state.B[i] = 0.0;
                    state.A[i] = 1.0;
                }
                state.lastBoardK[i] = currentK;
            }
        }
    }

    const { feed, kill, dA, dB, timeStep } = turingRules;
    
    // קביעת מספר האיטרציות דינמית לפי גודל הלוח (פותר את בעיית ה-Scale ואת איטיות הסימולציה)
    const iterations = Math.max(3, Math.floor(n / 25)); 

    let currA = state.A;
    let currB = state.B;
    let nextA = state.nextA;
    let nextB = state.nextB;
    
    // 2. חישוב הריאקציה-דיפוזיה בלולאה פנימית מרובה
    for (let step = 0; step < iterations; step++) {
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const i = y * n + x;
                const a = currA[i];
                const b = currB[i];
                
                // --- חישוב לפלסיאן (Inlined) ללא פעולות Modulo יקרות ---
                const yUp = (y === 0) ? n - 1 : y - 1;
                const yDown = (y === n - 1) ? 0 : y + 1;
                const xLeft = (x === 0) ? n - 1 : x - 1;
                const xRight = (x === n - 1) ? 0 : x + 1;

                const top = yUp * n;
                const bottom = yDown * n;
                const row = y * n;

                const sumA = (a * -1.0) +
                             (currA[top + x] * 0.2) + (currA[bottom + x] * 0.2) +
                             (currA[row + xLeft] * 0.2) + (currA[row + xRight] * 0.2) +
                             (currA[top + xLeft] * 0.05) + (currA[top + xRight] * 0.05) +
                             (currA[bottom + xLeft] * 0.05) + (currA[bottom + xRight] * 0.05);

                const sumB = (b * -1.0) +
                             (currB[top + x] * 0.2) + (currB[bottom + x] * 0.2) +
                             (currB[row + xLeft] * 0.2) + (currB[row + xRight] * 0.2) +
                             (currB[top + xLeft] * 0.05) + (currB[top + xRight] * 0.05) +
                             (currB[bottom + xLeft] * 0.05) + (currB[bottom + xRight] * 0.05);
                // --- סוף חישוב לפלסיאן ---
                
                const reaction = a * b * b;
                
                let newA = a + ((dA * sumA) - reaction + (feed * (1 - a))) * timeStep;
                let newB = b + ((dB * sumB) + reaction - ((kill + feed) * b)) * timeStep;
                
                nextA[i] = Math.max(0, Math.min(1, newA));
                nextB[i] = Math.max(0, Math.min(1, newB));
            }
        }
        
        // החלפת מערכים (Ping-Pong) לקראת האיטרציה הבאה
        let tempA = currA; currA = nextA; nextA = tempA;
        let tempB = currB; currB = nextB; nextB = tempB;
    }
    
    // עדכון הסטייט הקבוע במערכים המעודכנים ביותר
    state.A = currA;
    state.B = currB;
    state.nextA = nextA;
    state.nextB = nextB;

// 3. תרגום הריכוזים הכימיים לצבעים
    const nextBoardState = currentBoardState.map((tile, i) => {
        if (tile.isGold) {
            state.lastBoardK[i] = tile.k;
            return tile;
        }
        
        const concentrationA = state.A[i];
        


// 1. הפיכת הכיוון 
        let visualValue = 1.0 - concentrationA; 

        // 2. פריסה על כל הפלטה (החזרנו את המתיחה החסרה!)
        // זה מבטיח שהטווח הכימי (0.05 עד 0.78) נמתח על פני 100% מהצבעים, 
        // כך ששום צבע בפלטה לא ילך לאיבוד.
        visualValue = (visualValue - 0.05) / (0.78 - 0.05);
        visualValue = Math.max(0.0, Math.min(1.0, visualValue));

// 3. העברת המשקל לכהים (Gamma > 1.0): 
        // במקום 0.85, אנחנו משתמשים ב-1.5. 
        // זה "ישקע" את רוב הלוח לתוך הצבעים העמוקים והכהים,
        // וישאיר את הבהירים רק לקצוות המודגשים.
        visualValue = Math.pow(visualValue, 1.5);

        // 4. קונטרסט מותנה (השארנו את מה שמונע את כאב הראש)
        if (visualValue > 0.5) {
            let t = (visualValue - 0.5) * 2.0; 
            t = 1.0 - Math.pow(1.0 - t, 2.0);  
            visualValue = 0.5 + (t * 0.5);     
        }

        
        // מיפוי מדויק לאינדקס הצבע
        const colorIndex = Math.round(visualValue * (pLen - 1));
        
        state.lastBoardK[i] = colorIndex;
        
        return { ...tile, k: colorIndex, v: colorIndex };
    });

    return { 
        nextBoardState, 
        nextTuringState: state 
    };
   }


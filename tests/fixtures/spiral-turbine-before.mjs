// Historical Turbine branch from 7aea788, retained as an independent reference.
export function runLegacyTurbine({ n, currentBoardState }) {
    const nextBoardState = currentBoardState;
    const strength = 0.6;
    switch ('left') {
case 'left': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;

            // --- משתני שליטה: ספירלה נוזלית עם טורבולנציה ---
            const baseSpinStrength = 0.10; // כוח סיבוב בסיסי (בהיקף החיצוני)
            const pullStrength = 0.8;      // כוח השאיבה פנימה

            // המשתנים החדשים שיוצרים את הזרמים הסמויים:
            const eddyFrequency = 0.03;    // תדירות המערבולות הקטנות (צפיפות הגלים). ככל שגדול יותר - הזרמים צפופים יותר.
            const eddyStrength = 0.25;     // העוצמה שבה הזרם מסיט את הפיקסל מהמסלול המעגלי.

            // מוסיפים פאזת זמן עדינה כדי ששדה הזרימה הבלתי נראה "ינשום" ויזוז בעצמו
            const timePhase = Date.now() * 0.0005;

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;

                    if (nextBoardState[i].isGold) continue;

                    const dy = row - centerR;
                    const dx = col - centerC;
                    const distToCenter = Math.sqrt(dx * dx + dy * dy);

                    if (distToCenter === 0) continue;

                    // 1. טורבולנציה וזרמי משנה (Eddies)
                    // יצירת מפת זרימה מבוססת גלי סינוס עם קוסינוס (מייצר תבניות אורגניות כמו שיש עץ או שיש)
                    const turbulence = Math.sin((row * eddyFrequency) + timePhase) * Math.cos((col * eddyFrequency) - timePhase);

                    // 2. פיזיקה של פתח ניקוז (ככל שקרובים למרכז הסיבוב מהיר יותר)
                    const dynamicSpin = baseSpinStrength + (2.0 / Math.max(distToCenter, 1));

                    const currentAngle = Math.atan2(dy, dx);

                    // הטורבולנציה מתערבת ו"מעקמת" את הזווית קדימה ואחורה, ומרחיבה/מכווצת את הרדיוס קלות
                    const targetRadius = Math.max(0, distToCenter - pullStrength + (turbulence * 1.5));
                    const targetAngle = currentAngle + dynamicSpin + (turbulence * eddyStrength);

                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);

                    const neighbors = [
                        {dr: -1, dc: 0}, {dr: 1, dc: 0},
                        {dr: 0, dc: -1}, {dr: 0, dc: 1},
                        {dr: -1, dc: -1}, {dr: -1, dc: 1},
                        {dr: 1, dc: -1}, {dr: 1, dc: 1}
                    ];

                    const validNeighbors = [];

                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;

                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const distToIdeal = Math.pow(nr - targetR, 2) + Math.pow(nc - targetC, 2);
                            validNeighbors.push({ nr, nc, dist: distToIdeal });
                        }
                    }

                    validNeighbors.sort((a, b) => a.dist - b.dist);

                    if (validNeighbors.length > 0) {
                        // 3. החלקה הסתברותית לשבירת פינות ויצירת מראה עגול לעין
                        let chosen = validNeighbors[0];
                        if (validNeighbors.length > 1 && Math.random() < 0.60) {
                            chosen = validNeighbors[1];
                        }

                        const target_i = chosen.nr * n + chosen.nc;

                        if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k && Math.random() < strength) {
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                        }
                    }
                }
            }
            break;
        }
    }
    return nextBoardState;
}

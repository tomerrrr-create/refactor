
let cachedRadialOrder = null;
let cachedRadialN = null;

// --- START: Spiral Simulation (מבנה switch-case בדיוק כמו Gravitational Sort) ---
export function runSpiralGeneration({ n, currentBoardState, currentPalette, spiralRules }) {

const nextBoardState = currentBoardState; // Zero Allocation! מוטציה על המקום

    const method = spiralRules.method || 'classic';
let strength = 0.9; // עוצמת ברירת המחדל המקורית של הספירלה
    
    // החזרת העוצמה המקורית (0.6) עבור המצבים שהגיעו ממיון גרביטציה
    if (spiralRules.method === 'down' || spiralRules.method === 'left' || spiralRules.method === 'radial') {
        strength = 0.6;
    }

    switch (method) {





case 'vortex': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;

            const baseSpinStrength = 0;
            const pullStrength     = 0.8;
            const eddyFrequency    = 0;
            const eddyStrength     = 0;
            const timePhase        = Date.now() * 0.0005;

            // יצירת רשימה למעקב אחרי פיקסלים שכבר זזו בפריים הנוכחי
            const movedThisFrame = new Set();

            for (let row = 0; row < n; row++) {

for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    // אם הפיקסל כבר זז בפריים הזה, דלג עליו מיד
                    if (movedThisFrame.has(i)) continue;
                    
                    if (nextBoardState[i].isGold) continue;

                    const dy = row - centerR;
                    const dx = col - centerC;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 0.5) continue;

                    const turbulence = Math.sin((row * eddyFrequency) + timePhase) *
                                       Math.cos((col * eddyFrequency) - timePhase);

                    const dynamicSpin = baseSpinStrength + (1.0 / Math.max(dist, 1));
                    const currentAngle = Math.atan2(dy, dx);

                    const targetRadius = Math.max(0, dist - pullStrength + turbulence * 1.5);
                    const targetAngle  = currentAngle + dynamicSpin + turbulence * eddyStrength;

                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);

// תנועה קפדנית מבוססת מרחק כדי למנוע ריצודים
                    let bestDistSq = Math.pow(targetR - row, 2) + Math.pow(targetC - col, 2);
                    let bestNr = row, bestNc = col;

                    const neighbors = [
                        {dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1},
                        {dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}
                    ];

                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

                        const neighborDistSq = Math.pow(targetR - nr, 2) + Math.pow(targetC - nc, 2);

                        if (neighborDistSq < bestDistSq) {
                            bestDistSq = neighborDistSq;
                            bestNr = nr;
                            bestNc = nc;
                        }
                    }

                    if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {


                        const target_i = bestNr * n + bestNc;
                        
                        // הוספנו פה את הבדיקה שהיעד לא ברשימה
                        if (!nextBoardState[target_i].isGold &&
                            nextBoardState[i].k < nextBoardState[target_i].k &&
                            !movedThisFrame.has(target_i)) { 
                            
                            // ביצוע ההחלפה (התנועה)
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                            
                            // הוספת שני הפיקסלים לרשימה כדי לנעול אותם עד הפריים הבא
                            movedThisFrame.add(i);
                            movedThisFrame.add(target_i);
                        }
                    }

                }
            }
            break;



                }
    




case 'down': {
    const centerR = (n - 1) / 2;
    const centerC = (n - 1) / 2;
    
    // פרמטרים קבועים ומושלמים למראה חור שחור הרמוני ומדהים
    // (strength מבחוץ שולט רק במהירות – כמה פיקסלים זזים בכל פריים)
    const baseSpinStrength = 0.105;   // סיבוב עדין אך ברור – יוצר ספירלות יפהפיות
    const pullStrength     = 0.78;    // שאיבה חזקה ומאוזנת – נבלע פנימה בלי להתפרק

    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const i = row * n + col;
            if (nextBoardState[i].isGold) continue;
            
            const dy = row - centerR;
            const dx = col - centerC;
            const distToCenter = Math.sqrt(dx * dx + dy * dy);
            if (distToCenter < 0.5) continue; // מרכז יציב
            
            // חישוב מיקום יעד ספירלי מדויק (פולאר)
            const currentAngle = Math.atan2(dy, dx);
            const targetRadius = Math.max(0.3, distToCenter - pullStrength);
            const targetAngle  = currentAngle + baseSpinStrength;
            
            const targetR = centerR + targetRadius * Math.sin(targetAngle);
            const targetC = centerC + targetRadius * Math.cos(targetAngle);
            
            // וקטור התנועה הרצוי (מה שנותן תנועה חלקה וסיבובית אמיתית)
            const desiredDX = targetC - col;
            const desiredDY = targetR - row;
            const desiredLen = Math.sqrt(desiredDX * desiredDX + desiredDY * desiredDY) || 1;
            
            // 8 שכנים + בדיקת "כמה הכיוון מתאים" (cosine similarity)
            const neighbors = [
                {dr: -1, dc: 0}, {dr: 1, dc: 0},
                {dr: 0, dc: -1}, {dr: 0, dc: 1},
                {dr: -1, dc: -1}, {dr: -1, dc: 1},
                {dr: 1, dc: -1}, {dr: 1, dc: 1}
            ];
            
            let bestScore = -1;
            let bestNr = row;
            let bestNc = col;
            
            for (const {dr, dc} of neighbors) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                
                // וקטור התנועה של השכן
                const moveLen = Math.sqrt(dc * dc + dr * dr) || 1;
                const score = (dc * desiredDX + dr * desiredDY) / (moveLen * desiredLen);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestNr = nr;
                    bestNc = nc;
                }
            }
            
            // תנועה רק אם הכיוון טוב מספיק + בהסתברות strength (מהירות מבחוץ)
            if (bestScore > 0.15 && Math.random() < strength) {
                const target_i = bestNr * n + bestNc;
                
                if (!nextBoardState[target_i].isGold &&
                    nextBoardState[i].k < nextBoardState[target_i].k) {
                    
                    [nextBoardState[i], nextBoardState[target_i]] = 
                     [nextBoardState[target_i], nextBoardState[i]];
                }
            }
        }
    }
    break;
}




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



      case 'radial': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            
            // --- משתני שליטה על הספירלה ---
            // שחק עם המספרים האלה כדי לשנות את אופי המערבולת!
            const spinStrength = 0.25; // כוח הסיבוב (ברדיאנים). ככל שגדול יותר, הספירלה "שטוחה" ומסתחררת יותר.
            const pullStrength = 0.8;  // כוח השאיבה למרכז (בפיקסלים). ככל שגדול יותר, הפיקסלים יישאבו מהר יותר פנימה.
            
            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    // הגנת זהב: פיקסלים מזהב לא נשאבים ולא זזים
                    if (nextBoardState[i].isGold) continue; 
                    
                    const dy = row - centerR;
                    const dx = col - centerC;
                    const distToCenter = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToCenter === 0) continue; // אנחנו כבר בדיוק במרכז
                    
                    // 1. חישוב הזווית הנוכחית של הפיקסל ביחס למרכז
                    const currentAngle = Math.atan2(dy, dx);
                    
                    // 2. חישוב נקודת המטרה האידיאלית (קצת יותר קרוב, קצת מסובב)
                    const targetRadius = Math.max(0, distToCenter - pullStrength);
                    const targetAngle = currentAngle + spinStrength; 
                    
                    // המרה חזרה מקואורדינטות פולריות למיקום X,Y על הלוח
                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);
                    
                    let bestDr = 0;
                    let bestDc = 0;
                    let minDistToTarget = Infinity;
                    
                    const neighbors = [
                        {dr: -1, dc: 0}, {dr: 1, dc: 0},
                        {dr: 0, dc: -1}, {dr: 0, dc: 1},
                        {dr: -1, dc: -1}, {dr: -1, dc: 1},
                        {dr: 1, dc: -1}, {dr: 1, dc: 1}
                    ];
                    
                    // 3. מציאת השכן שיושב הכי קרוב לנקודת המטרה האידיאלית
                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                            const distToIdeal = Math.pow(nr - targetR, 2) + Math.pow(nc - targetC, 2);
                            if (distToIdeal < minDistToTarget) {
                                minDistToTarget = distToIdeal;
                                bestDr = dr;
                                bestDc = dc;
                            }
                        }
                    }
                    
                    // 4. ביצוע ההחלפה (עם הסתברות ובדיקת חסימת זהב של השכן)
                    if (bestDr !== 0 || bestDc !== 0) {
                        const target_i = (row + bestDr) * n + (col + bestDc);
                        if (!nextBoardState[target_i].isGold && nextBoardState[i].k < nextBoardState[target_i].k && Math.random() < strength) {
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                        }
                    }
                }
            }
            break;
        }


// ────────────────────────────── EXPERIMENT A (מיון גיאומטרי טהור מהמרכז החוצה) ──────────────────────────────
       
 case 'a': {

            // מחשבים את המרחק העגול המושלם רק פעם אחת כדי לחסוך ביצועים
            if (cachedRadialN !== n) {
                const centerR = (n - 1) / 2;
                const centerC = (n - 1) / 2;
                const indices = Array.from({length: n * n}, (_, i) => i);
                indices.sort((a, b) => {
                    const rA = Math.floor(a / n), cA = a % n;
                    const rB = Math.floor(b / n), cB = b % n;
                    const distA = Math.pow(rA - centerR, 2) + Math.pow(cA - centerC, 2);
                    const distB = Math.pow(rB - centerR, 2) + Math.pow(cB - centerC, 2);
                    
                    // התיקון: שובר שוויון אקראי מונע את הפרדת הלוח לחצאים!
                    return (distA - distB) || (Math.random() - 0.5); 
                });
                cachedRadialOrder = indices;
                cachedRadialN = n;
            }

            // 1. מחזירים את מספר המעברים למינימום כדי לשמור על 60FPS חלק ונעים לעין!
            const passes = 6; 
            
            // 2. ה"קפיצה" נשארת קבועה כדי לשמור על הכאוטיות שאתה אוהב!
            const stride = Math.max(1, Math.floor(n / 4));

            for (let p = 0; p < passes; p++) {
                
                // כוח משיכה ששואב למרכז (בקפיצות)
                for (let j = 0; j < cachedRadialOrder.length - stride; j++) {
                    const idx1 = cachedRadialOrder[j];          
                    const idx2 = cachedRadialOrder[j + stride]; 
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
let temp = nextBoardState[idx1];
nextBoardState[idx1] = nextBoardState[idx2];
nextBoardState[idx2] = temp;
                        }
                    }
                }
                
                // כוח הדיפה שדוחף החוצה (בקפיצות, מהסוף להתחלה כדי לשחרר פקקים)
                for (let j = cachedRadialOrder.length - 1; j >= stride; j--) {
                    const idx1 = cachedRadialOrder[j - stride];
                    const idx2 = cachedRadialOrder[j];
                    
                    if (nextBoardState[idx1].isGold || nextBoardState[idx2].isGold) continue;

                    if (nextBoardState[idx1].k > nextBoardState[idx2].k) {
                        if (Math.random() < strength) {
let temp = nextBoardState[idx1];
nextBoardState[idx1] = nextBoardState[idx2];
nextBoardState[idx2] = temp;
                        }
                    }
                }
            }
            break;
        }



/* case 'a': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;
            const spin = 0; 

            // 1. בניית המסלול המתמטי (מבוצע פעם אחת בלבד ונשמר בזיכרון)
            if (!window.perfectRadialOrderA || window.perfectRadialOrderA_n !== n) {
                let coords = [];
                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        const dy = r - centerR;
                        const dx = c - centerC;
                        const dist = Math.hypot(dx, dy);
                        const angle = Math.atan2(dy, dx);
                        const mathematicalValue = dist + (angle * spin);
                        
                        coords.push({ i: r * n + c, val: mathematicalValue });
                    }
                }
                
                coords.sort((a, b) => a.val - b.val);
                window.perfectRadialOrderA = coords.map(c => c.i);
                window.perfectRadialOrderA_n = n;
            }

            const order = window.perfectRadialOrderA;

            // --- הפתרון: תקציב זמן (Time-Boxing) ---
            // במקום speed מוגזם שתוקע הכל, אנחנו נותנים לקוד 4 מילישניות עבודה נטו
            const timeBudgetMs = 12; 
            const startTime = performance.now();
            
            // אנחנו מאפשרים לו לרוץ עד 50 פעמים, אבל הוא יחתוך הרבה לפני ברגע שהזמן ייגמר
            let passes = 0;
            while (passes < 50) {
                let madeAnySwap = false;

                // א. תנועה פנימה
                for (let j = order.length - 1; j > 0; j--) {
                    const idxInner = order[j - 1];
                    const idxOuter = order[j];
                    
                    if (nextBoardState[idxInner].isGold || nextBoardState[idxOuter].isGold) continue;

                    if (nextBoardState[idxInner].k > nextBoardState[idxOuter].k) {
                        let tempTile = nextBoardState[idxInner];
                        nextBoardState[idxInner] = nextBoardState[idxOuter];
                        nextBoardState[idxOuter] = tempTile;
                        madeAnySwap = true;
                    }
                }

                // ב. תנועה החוצה
                for (let j = 0; j < order.length - 1; j++) {
                    const idxInner = order[j];
                    const idxOuter = order[j + 1];
                    
                    if (nextBoardState[idxInner].isGold || nextBoardState[idxOuter].isGold) continue;

                    if (nextBoardState[idxInner].k > nextBoardState[idxOuter].k) {
                        let tempTile = nextBoardState[idxInner];
                        nextBoardState[idxInner] = nextBoardState[idxOuter];
                        nextBoardState[idxOuter] = tempTile;
                        madeAnySwap = true;
                    }
                }

                // אם אין החלפות, הלוח סודר לחלוטין!
                if (!madeAnySwap) break; 
                
                // --- בדיקת מד הזמן! ---
                // אם עברנו את התקציב (4ms), עוצרים מיד ומשחררים את הדפדפן לצייר
                if (performance.now() - startTime > timeBudgetMs) {
                    break;
                }
                
                passes++;
            }

            break;
        }
        */




        // ────────────────────────────── EXPERIMENT B ──────────────────────────────
        case 'b': {
            const centerR = (n - 1) / 2;
            const centerC = (n - 1) / 2;

            // הסוד לספירלה בלי רוח: כוח סיבוב גבוה, שאיבה עדינה, ואפס טורבולנציה
            const baseSpinStrength = 0.005; // זה מה שיוצר את זרועות הספירלה! (אפשר להגדיל ל-0.25 לספירלה צפופה יותר)
            const pullStrength     = 1.5;  // שאיבה עדינה ואיטית פנימה

            // רשימת נוכחות למניעת "גלישת" פיקסלים
            const movedThisFrame = new Set();

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (movedThisFrame.has(i)) continue;
                    if (nextBoardState[i].isGold) continue;

                    const dy = row - centerR;
                    const dx = col - centerC;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 0.5) continue;

                    // מתמטיקה טהורה וסטטית של ספירלה - ללא זמן וללא רעש
                    const dynamicSpin = baseSpinStrength + (0 / Math.max(dist, 1));
                    const currentAngle = Math.atan2(dy, dx);

                    // יעד יציב לחלוטין
                    const targetRadius = Math.max(0, dist - pullStrength);
                    const targetAngle  = currentAngle + dynamicSpin;

                    const targetR = centerR + targetRadius * Math.sin(targetAngle);
                    const targetC = centerC + targetRadius * Math.cos(targetAngle);



// תנועה קפדנית מבוססת מרחק כדי למנוע ריצודים
                    let bestDistSq = Math.pow(targetR - row, 2) + Math.pow(targetC - col, 2); // המרחק הנוכחי ליעד
                    let bestNr = row, bestNc = col;

                    const neighbors = [
                        {dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1},
                        {dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}
                    ];

                    for (const {dr, dc} of neighbors) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

                        const neighborDistSq = Math.pow(targetR - nr, 2) + Math.pow(targetC - nc, 2);

                        // מתעדכן אך ורק אם השכן ממש מקרב אותנו באופן מוחלט ליעד
                        if (neighborDistSq < bestDistSq) {
                            bestDistSq = neighborDistSq;
                            bestNr = nr;
                            bestNc = nc;
                        }
                    }

                    // תנועה: רק אם מצאנו שכן שמקרב אותנו + הוספת 20% פספוס לזרימה נוזלית וחלקה
                    if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {

                        const target_i = bestNr * n + bestNc;
                        
                        if (!nextBoardState[target_i].isGold &&
                            nextBoardState[i].k < nextBoardState[target_i].k &&
                            !movedThisFrame.has(target_i)) { 
                            
                            [nextBoardState[i], nextBoardState[target_i]] = [nextBoardState[target_i], nextBoardState[i]];
                            
                            movedThisFrame.add(i);
                            movedThisFrame.add(target_i);
                        }
                    }
                }
            }
            break;
        }


}

    return nextBoardState;
}
// --- END: Spiral Simulation ---



// --- START: Magnet Simulation (Independent Domain) ---

/**
 * ==========================================
 * OPTIMIZED MAGNET SIMULATION ENGINE
 * ==========================================
 * * NOTE FOR FUTURE MAINTENANCE: 
 * This function has been heavily optimized to run smoothly at 60FPS on mobile devices.
 * It deliberately trades modern JavaScript "syntactic sugar" for raw execution speed
 * and minimal memory allocation. Do not refactor back to modern syntax without 
 * profiling mobile performance first.
 * * Key Optimizations Applied:
 * * 1. MEMORY RECYCLING (Zero Allocation):
 * `cachedAnchors` and `cachedMovedThisFrame` are defined outside this function scope.
 * Instead of creating `new Array()` or `new Set()` every frame (which chokes the 
 * mobile Garbage Collector), we clear them using `.length = 0` or `.fill(0)`.
 * * 2. TYPED ARRAYS vs SETS:
 * We use a flat `Uint8Array` to track which pixels moved this frame. Direct index 
 * assignment (array[i] = 1) is astronomically faster than `Set.add()` and `Set.has()`.
 * * 3. NO MATH.POW:
 * `Math.pow(x, 2)` inside a hot loop (running millions of times per frame) causes 
 * CPU throttling. We use simple multiplication `(x * x)` for distance calculations.
 * * 4. CLASSIC SWAPPING (No Destructuring):
 * Using `[a, b] = [b, a]` creates temporary arrays in memory that trigger the GC. 
 * We use a classic `temp` variable to swap pixels safely.
 * * Logic Modes:
 * - 'magnet': Fluid/organic. Finds the top 3 optimal neighbors and allows 
 * path-bending/traffic-bypass.
 * - 'cosmic_magnet': Strict/geometric. Only evaluates the single absolute best 
 * neighbor. If blocked, it waits.
 * * Anchor Logic:
 * Targets only the *perimeter* of empty (black) space. Anchors are aggressively 
 * downsampled to a maximum of 300 points to prevent O(N^2) complexity explosions.
 */





// משתנים גלובליים ברמת המודול - ממוחזרים בכל פריים
const magnetNeighborsCoords = [
    {dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1},
    {dr: -1, dc: -1}, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}
];
const cachedAnchors = [];
let cachedMovedThisFrame = new Uint8Array(0);
let cachedAnchorFallback = null;

export function runMagnetGeneration({ n, currentBoardState, magnetRules, currentPalette }) {

    const nextBoardState = currentBoardState; // Zero Allocation!
    const method = magnetRules.method || 'magnet';
    const strength = 0.9; 

    // === תוספת שלנו: שליפת משתני הפלטה והעוגן להתחלה ===
    const pLen = currentPalette ? currentPalette.length : 256;
// אם המשתמש בחר ב-DARKEST (-1) או שעדיין לא נבחר כלום, נתייחס לזה כאינדקס 0
const anchorIndex = (magnetRules.anchorColorIndex === undefined || magnetRules.anchorColorIndex === -1) ? 0 : magnetRules.anchorColorIndex;

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const anchorLimit = magnetRules.anchorLimit || (isMobile ? 300 : 300);
        // הגדרת מגבלה: 100 למובייל, 300 למחשב

    //const anchorLimit = magnetRules.anchorLimit || (isMobile ? 150 : 300);


    if (cachedMovedThisFrame.length !== n * n) {
        cachedMovedThisFrame = new Uint8Array(n * n);
    } else {
        cachedMovedThisFrame.fill(0);
    }

  // === 1. בדיקה חכמה: האם היעד חסר, או שהופיע יעד טוב יותר? ===
  let shouldRecalculate = false;

  if (!cachedAnchorFallback || cachedAnchorFallback.originalAnchorIndex !== anchorIndex) {
      shouldRecalculate = true; // אין מטמון או שהמשתמש שינה בחירה בממשק
  } else {
      let targetFound = false;
      
      for (let i = 0; i < n * n; i++) {
          if (nextBoardState[i].isGold) continue;
          
          const currentK = nextBoardState[i].k;
          
          // בדיקה א': האם היעד הנוכחי שלנו עדיין קיים?
          if (currentK === cachedAnchorFallback.targetColorIndex) {
              targetFound = true;
          }
          
          // בדיקה ב': אם אנחנו כרגע מתפשרים על יעד, האם פתאום הופיע צבע קרוב יותר לאידיאל?
          if (cachedAnchorFallback.targetShiftedK > 0) {
              const shiftedK = (currentK - anchorIndex + pLen) % pLen;
              if (shiftedK < cachedAnchorFallback.targetShiftedK) {
                  shouldRecalculate = true; // הופיע צבע עדיף! חייבים לחשב מחדש
                  break; 
              }
          }
      }
      
      // אם סיימנו לסרוק והיעד שלנו לא נמצא - צריך לחשב מחדש
      if (!targetFound) {
          shouldRecalculate = true; 
      }
  }

  // === 2. חישוב מחדש (רק אם צריך) ===
  if (shouldRecalculate) {
      let darkestPresentShifted = Infinity;
      let targetRealK = anchorIndex;

      for (let i = 0; i < n * n; i++) {
          if (nextBoardState[i].isGold) continue;
          const currentK = nextBoardState[i].k;
          
          const shiftedK = (currentK - anchorIndex + pLen) % pLen;
          
          if (shiftedK < darkestPresentShifted) {
              darkestPresentShifted = shiftedK;
              targetRealK = currentK;
          }
          if (darkestPresentShifted === 0) break; // מצאנו התאמה מושלמת
      }
      
      if (darkestPresentShifted === Infinity) targetRealK = anchorIndex;
      
      cachedAnchorFallback = {
          targetColorIndex: targetRealK,
          targetShiftedK: darkestPresentShifted,
          originalAnchorIndex: anchorIndex
      };
  }

  // שליפה מיידית מהזיכרון
  const targetColorIndex = cachedAnchorFallback.targetColorIndex; 
  const targetShiftedK = cachedAnchorFallback.targetShiftedK; 
  // ==============================================================

    switch (method) {
        case 'magnet': {
            cachedAnchors.length = 0; 

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                // המרת השכן לערך הווירטואלי שלו לפני השוואה
                                if (((nextBoardState[nr * n + nc].k - anchorIndex + pLen) % pLen) > targetShiftedK) {                                    
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > anchorLimit) {
                const step = Math.ceil(cachedAnchors.length / anchorLimit);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    let minDist = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDist) {
                            minDist = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDist > 0 && minDist !== Infinity) {
                        const tr_row = targetR - row;
                        const tc_col = targetC - col;
                        const currentDistSq = (tr_row * tr_row) + (tc_col * tc_col);

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const tr_nr = targetR - nr;
                                const tc_nc = targetC - nc;
                                const neighborDistSq = (tr_nr * tr_nr) + (tc_nc * tc_nc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        if (b1Dist !== Infinity && Math.random() < 0.8) {
                            for (let attempt = 0; attempt < 3; attempt++) {
                                let optNr = -1, optNc = -1;
                                if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                                else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                                else { optNr = b3Nr; optNc = b3Nc; }

                                if (optNr === -1) continue; 

                                const target_i = optNr * n + optNc;
                                
                                // ממירים גם פה לערכים הווירטואליים לפני שמבצעים את תנאי ההחלפה
                                if (!nextBoardState[target_i].isGold &&
                                    ((nextBoardState[i].k - anchorIndex + pLen) % pLen) < ((nextBoardState[target_i].k - anchorIndex + pLen) % pLen) && 
                                    cachedMovedThisFrame[target_i] === 0) {
                                    
                                    const tempTile = nextBoardState[i];
                                    nextBoardState[i] = nextBoardState[target_i];
                                    nextBoardState[target_i] = tempTile;
                                    
                                    cachedMovedThisFrame[i] = 1;
                                    cachedMovedThisFrame[target_i] = 1;
                                    
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            break;
        }

        case 'cosmic_magnet': {
            cachedAnchors.length = 0; 

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (((nextBoardState[nr * n + nc].k - anchorIndex + pLen) % pLen) > targetShiftedK) {
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > anchorLimit) {
                const step = Math.ceil(cachedAnchors.length / anchorLimit);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    let minDist = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDist) {
                            minDist = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDist > 0 && minDist !== Infinity) {
                        const tr_row = targetR - row;
                        const tc_col = targetC - col;
                        let bestDistSq = (tr_row * tr_row) + (tc_col * tc_col);
                        let bestNr = row;
                        let bestNc = col;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const tr_nr = targetR - nr;
                                const tc_nc = targetC - nc;
                                const neighborDistSq = (tr_nr * tr_nr) + (tc_nc * tc_nc);
                                
                                if (neighborDistSq < bestDistSq) {
                                    bestDistSq = neighborDistSq;
                                    bestNr = nr;
                                    bestNc = nc;
                                }
                            }
                        }

                        if ((bestNr !== row || bestNc !== col) && Math.random() < 0.8) {
                            const target_i = bestNr * n + bestNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                ((nextBoardState[i].k - anchorIndex + pLen) % pLen) < ((nextBoardState[target_i].k - anchorIndex + pLen) % pLen) && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                            }
                        }
                    }
                }
            }
            break;
        }
 
        case 'time_magnet': {
            if (cachedMovedThisFrame.length !== n * n) {
                cachedMovedThisFrame = new Uint8Array(n * n);
            } else {
                cachedMovedThisFrame.fill(0);
            }
            cachedAnchors.length = 0; 

            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (((nextBoardState[nr * n + nc].k - anchorIndex + pLen) % pLen) > targetShiftedK) {
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > anchorLimit) {
                const step = Math.ceil(cachedAnchors.length / anchorLimit);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    // חישוב המשקל לפי הערך הווירטואלי החדש!
                    const colorWeight = ((nextBoardState[i].k - anchorIndex + pLen) % pLen) / pLen; 
                    const moveProbability = 0.15 + (colorWeight * 0.80);
                    
                    if (Math.random() >= moveProbability) continue;

                    let minDistSq = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDistSq > 0 && minDistSq !== Infinity) {
                        const currentDistSq = minDistSq;

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const t_dr = targetR - nr;
                                const t_dc = targetC - nc;

                                const neighborDistSq = (t_dr * t_dr) + (t_dc * t_dc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        for (let attempt = 0; attempt < 3; attempt++) {
                            let optNr = -1, optNc = -1;
                            if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                            else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                            else { optNr = b3Nr; optNc = b3Nc; }

                            if (optNr === -1) continue; 

                            const target_i = optNr * n + optNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                ((nextBoardState[i].k - anchorIndex + pLen) % pLen) < ((nextBoardState[target_i].k - anchorIndex + pLen) % pLen) && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                                
                                break; 
                            }
                        }
                    }
                }
            }
            break;
        }

        case 'expand': {
            if (cachedMovedThisFrame.length !== n * n) {
                cachedMovedThisFrame = new Uint8Array(n * n);
            } else {
                cachedMovedThisFrame.fill(0);
            }
            cachedAnchors.length = 0; 
            
            for (let i = 0; i < n * n; i++) {
                if (nextBoardState[i].k === targetColorIndex && !nextBoardState[i].isGold) {
                    const r = Math.floor(i / n);
                    const c = i % n;
                    let isEdge = false;

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                if (((nextBoardState[nr * n + nc].k - anchorIndex + pLen) % pLen) > targetShiftedK) {                                    
                                    isEdge = true;
                                    break;
                                }
                            }
                        }
                        if (isEdge) break;
                    }

                    if (isEdge) {
                        cachedAnchors.push({ r, c });
                    }
                }
            }

            if (cachedAnchors.length === 0) break;

            if (cachedAnchors.length > anchorLimit) {
                const step = Math.ceil(cachedAnchors.length / anchorLimit);
                let writeIndex = 0;
                for (let i = 0; i < cachedAnchors.length; i += step) {
                    cachedAnchors[writeIndex++] = cachedAnchors[i];
                }
                cachedAnchors.length = writeIndex;
            }

            for (let row = 0; row < n; row++) {
                for (let col = 0; col < n; col++) {
                    const i = row * n + col;
                    
                    if (cachedMovedThisFrame[i] === 1) continue;
                    if (nextBoardState[i].isGold) continue;
                    if (nextBoardState[i].k === targetColorIndex) continue;

                    // חישוב המשקל ההפוך (expand) לפי הערך הווירטואלי החדש
                    const colorWeight = 1.0 - (((nextBoardState[i].k - anchorIndex + pLen) % pLen) / pLen); 
                    const moveProbability = 0.15 + (colorWeight * 0.80);
                    
                    if (Math.random() >= moveProbability) continue;

                    let minDistSq = Infinity;
                    let targetR = row;
                    let targetC = col;

                    for (let a = 0; a < cachedAnchors.length; a++) {
                        const dr = cachedAnchors[a].r - row;
                        const dc = cachedAnchors[a].c - col;
                        
                        const distSq = (dr * dr) + (dc * dc); 
                        
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            targetR = cachedAnchors[a].r;
                            targetC = cachedAnchors[a].c;
                        }
                    }

                    if (minDistSq > 0 && minDistSq !== Infinity) {
                        const currentDistSq = minDistSq;

                        let b1Dist = Infinity, b1Nr = -1, b1Nc = -1;
                        let b2Dist = Infinity, b2Nr = -1, b2Nc = -1;
                        let b3Dist = Infinity, b3Nr = -1, b3Nc = -1;

                        for (let idx = 0; idx < magnetNeighborsCoords.length; idx++) {
                            const n_dr = magnetNeighborsCoords[idx].dr;
                            const n_dc = magnetNeighborsCoords[idx].dc;
                            
                            const nr = row + n_dr;
                            const nc = col + n_dc;
                            
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                                const t_dr = targetR - nr;
                                const t_dc = targetC - nc;

                                const neighborDistSq = (t_dr * t_dr) + (t_dc * t_dc);
                                
                                if (neighborDistSq < currentDistSq) {
                                    if (neighborDistSq < b1Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = b1Dist; b2Nr = b1Nr; b2Nc = b1Nc;
                                        b1Dist = neighborDistSq; b1Nr = nr; b1Nc = nc;
                                    } else if (neighborDistSq < b2Dist) {
                                        b3Dist = b2Dist; b3Nr = b2Nr; b3Nc = b2Nc;
                                        b2Dist = neighborDistSq; b2Nr = nr; b2Nc = nc;
                                    } else if (neighborDistSq < b3Dist) {
                                        b3Dist = neighborDistSq; b3Nr = nr; b3Nc = nc;
                                    }
                                }
                            }
                        }

                        for (let attempt = 0; attempt < 3; attempt++) {
                            let optNr = -1, optNc = -1;
                            if (attempt === 0) { optNr = b1Nr; optNc = b1Nc; }
                            else if (attempt === 1) { optNr = b2Nr; optNc = b2Nc; }
                            else { optNr = b3Nr; optNc = b3Nc; }

                            if (optNr === -1) continue; 

                            const target_i = optNr * n + optNc;
                            
                            if (!nextBoardState[target_i].isGold &&
                                ((nextBoardState[i].k - anchorIndex + pLen) % pLen) < ((nextBoardState[target_i].k - anchorIndex + pLen) % pLen) && 
                                cachedMovedThisFrame[target_i] === 0) {
                                
                                const tempTile = nextBoardState[i];
                                nextBoardState[i] = nextBoardState[target_i];
                                nextBoardState[target_i] = tempTile;
                                
                                cachedMovedThisFrame[i] = 1;
                                cachedMovedThisFrame[target_i] = 1;
                                
                                break; 
                            }
                        }
                    }
                }
            }
            break;
        }
    }

    return nextBoardState;
}



// === MINIMAL FIX: איפוס caches של מגנט (זה מה שגורם לאיטיות) ===
export function resetMagnetCaches() {
    if (typeof cachedMovedThisFrame !== 'undefined') {
        cachedMovedThisFrame = new Uint8Array(0);
    }
    if (typeof cachedAnchors !== 'undefined') {
        cachedAnchors.length = 0;
    }
    cachedAnchorFallback = null; // מנקה את הזיכרון כשהמגנט עוצר או משנה מצב
}

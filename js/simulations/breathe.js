// js/simulations/breathe.js

/**
 * מחשב את פקטור הבהירות עבור אנימציית הנשימה.
 * מוציא את החישוב המתמטי מתוך פונקציית הרינדור לביצועים טובים יותר.
 */
export function getBreatheBrightnessFactor(tileData, timestamp, breatheStartTime, breatheEvoMode) {
    const BREATHE_SPEED = 0.0015;
    const elapsed = timestamp - breatheStartTime;
    let wave;

    if (breatheEvoMode === 'solo') {
        const cycleDuration = (2 * Math.PI) / BREATHE_SPEED;
        const effectiveElapsed = (elapsed - tileData.startDelay + cycleDuration) % cycleDuration;
        wave = Math.sin(effectiveElapsed * BREATHE_SPEED);
    } else {
        wave = Math.sin(elapsed * BREATHE_SPEED + tileData.k * 0.8);
    }
    
    const fadeInProgress = Math.min(elapsed / 2000, 1.0);
    const animatedFactor = 0.7 + wave * 0.3; 
    
    return (1.0 * (1 - fadeInProgress)) + (animatedFactor * fadeInProgress);
}
// A small display-only schedule: prepare candidates once, then track at most two pulses.
export function createRandomBreatheSession(board, mode, random = Math.random) {
    const candidates = mode === 'random-color'
        ? [...new Set(board.filter(tile => !tile.isGold).map(tile => tile.k))]
        : board.flatMap((tile, index) => tile.isGold ? [] : [index]);
    let pulses = [], nextAt = 0, previous, currentElapsed = 0;
    return {
        update(elapsed) {
            currentElapsed = elapsed;
            pulses = pulses.filter(pulse => elapsed < pulse.start + pulse.duration);
            if (elapsed < nextAt || !candidates.length) return;
            let index = Math.floor(random() * candidates.length);
            if (candidates.length > 1 && candidates[index] === previous) index = (index + 1) % candidates.length;
            previous = candidates[index];
            pulses.push({ key: previous, start: elapsed, duration: 4000 + random() * 1200 });
            nextAt = elapsed + 2900 + random() * 1000;
        },
        factor(index) {
            const tile = board[index];
            if (!tile || tile.isGold) return 1;
            const key = mode === 'random-color' ? tile.k : index;
            let brightness = 1;
            for (const pulse of pulses) {
                if (pulse.key !== key) continue;
                const progress = (currentElapsed - pulse.start) / pulse.duration;
                if (progress >= 0 && progress < 1) brightness -= 0.35 * Math.sin(Math.PI * progress) ** 2;
            }
            return brightness;
        }
    };
}

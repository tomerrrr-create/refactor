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
// Each cell/color joins within four seconds and keeps an independent, changing rhythm.
// All animation state stays outside the board and is discarded on the next Play.
export function createRandomBreatheSession(board, mode, random = Math.random) {
    const rhythms = new Map();
    const newPulse = start => ({ start, duration: 3000 + random() * 3000,
        depth: 0.35 + random() * 0.25, brightness: 1 });
    board.forEach((tile, index) => {
        if (tile.isGold) return;
        const key = mode === 'random-color' ? tile.k : index;
        if (!rhythms.has(key)) rhythms.set(key, newPulse(random() * 4000));
    });
    const ease = (from, to, progress) => from + (to - from) * (1 - Math.cos(Math.PI * progress)) / 2;
    return {
        update(elapsed) {
            for (const [key, pulse] of rhythms) {
                const progress = (elapsed - pulse.start) / pulse.duration;
                if (progress < 0) continue;
                if (progress >= 1) {
                    rhythms.set(key, newPulse(elapsed + random() * 1000));
                    continue;
                }
                // Smooth lift to 105%, exhale to the varying low point, then return to rest.
                pulse.brightness = progress < 0.3
                    ? ease(1, 1.05, progress / 0.3)
                    : progress < 0.7
                        ? ease(1.05, 1 - pulse.depth, (progress - 0.3) / 0.4)
                        : ease(1 - pulse.depth, 1, (progress - 0.7) / 0.3);
            }
        },
        factor(index) {
            const tile = board[index];
            if (!tile || tile.isGold) return 1;
            return rhythms.get(mode === 'random-color' ? tile.k : index)?.brightness ?? 1;
        }
    };
}

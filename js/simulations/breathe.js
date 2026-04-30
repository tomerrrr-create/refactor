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
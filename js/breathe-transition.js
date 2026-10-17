// Display-only crossfade. State changes stay synchronous for controls and recipes.
export function createBreatheTransition(board, { duration = 600, maxSide = 1024 } = {}) {
    let active = null;

    function remove(entry) {
        if (!entry || entry.removed) return;
        entry.removed = true;
        if (active === entry) active = null;
        clearTimeout(entry.timer);
        entry.animation?.cancel();
        entry.frame.remove();
        entry.frame.width = entry.frame.height = 1;
    }
    function clear() { remove(active); }

    function capture() {
        const source = board.querySelector('#boardCanvas');
        if (!source?.width || !source.height) return null;
        const frame = document.createElement('canvas');
        const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
        frame.width = Math.max(1, Math.round(source.width * scale));
        frame.height = Math.max(1, Math.round(source.height * scale));
        frame.className = 'breathe-transition-frame';
        frame.setAttribute('aria-hidden', 'true');
        const ctx = frame.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(source, 0, 0, frame.width, frame.height);

        const bloom = board.querySelector('#boardBloom');
        if (bloom && !bloom.hidden && bloom.width && bloom.height) {
            const style = getComputedStyle(bloom);
            ctx.save();
            ctx.globalAlpha = Number(style.opacity);
            ctx.globalCompositeOperation = 'screen';
            // CSS blur is measured in display pixels, not source canvas pixels.
            const blur = Number.parseFloat(style.filter.match(/blur\(([^)]+)px\)/)?.[1]) || 0;
            ctx.filter = `blur(${blur * frame.width / (source.clientWidth || source.width)}px)`;
            ctx.drawImage(bloom, 0, 0, frame.width, frame.height);
            ctx.restore();
        }
        if (active) {
            // Retarget rapid clicks from the currently visible composite, not a stale frame.
            ctx.globalAlpha = Number(getComputedStyle(active.frame).opacity);
            ctx.drawImage(active.frame, 0, 0, frame.width, frame.height);
        }
        return frame;
    }

    function run(action) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clear();
            return action();
        }
        const frame = capture();
        clear();
        if (!frame || typeof frame.animate !== 'function') return action();
        board.appendChild(frame);
        const entry = { frame, animation: null, timer: null };
        active = entry;
        let result;
        try { result = action(); }
        catch (error) { remove(entry); throw error; }
        entry.animation = frame.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration, easing: 'ease-in-out', fill: 'forwards'
        });
        entry.animation.finished.then(() => remove(entry), () => remove(entry));
        entry.timer = setTimeout(() => remove(entry), duration + 150);
        return result;
    }
    window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    return { run, clear, isActive: () => active !== null };
}

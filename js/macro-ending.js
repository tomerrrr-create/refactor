// Presentation-only tail. No recipe, simulation or logger state lives here.
export function createMacroEnding({onExit, onFinish, onCancel = onFinish,
    setTimer = setTimeout, clearTimer = clearTimeout, holdMs = 1500, returnMs = 400}) {
    let active = false, timer = null, version = 0;
    function cancel() {
        version++;
        if (timer !== null) clearTimer(timer);
        timer = null;
        if (!active) return;
        active = false;
        onCancel();
    }
    return {
        active: () => active,
        cancel,
        start() {
            cancel();
            active = true;
            const run = ++version;
            timer = setTimer(() => {
                if (!active || run !== version) return;
                timer = null;
                onExit();
                if (!active || run !== version) return;
                timer = setTimer(() => {
                    if (!active || run !== version) return;
                    active = false; timer = null;
                    onFinish();
                }, returnMs);
            }, holdMs);
        }
    };
}

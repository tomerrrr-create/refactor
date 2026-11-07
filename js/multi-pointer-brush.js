// A simultaneous set of touches is one brush/history gesture. Each pointer
// retains its own line anchor; lifting/cancelling one never finishes the others.
export function createMultiPointerBrush({ canDraw, indexAt, begin, paint, finish }) {
    const pointers = new Map();
    function up(event) {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        if (event.type === 'pointerup' && canDraw()) {
            const index = indexAt(event.clientX, event.clientY);
            if (index >= 0) paint(pointer, index);
        }
        pointers.delete(event.pointerId);
        if (pointer.target.hasPointerCapture(event.pointerId)) pointer.target.releasePointerCapture(event.pointerId);
        if (!pointers.size) finish();
    }
    return {
        get active() { return pointers.size > 0; },
        down(event) {
            if (!canDraw() || event.button !== 0 || pointers.has(event.pointerId)) return;
            const index = indexAt(event.clientX, event.clientY);
            if (index < 0) return;
            if (!pointers.size) begin(event, index);
            const pointer = { target: event.target, anchor: index, source: index, last: -1 };
            pointers.set(event.pointerId, pointer);
            event.target.setPointerCapture(event.pointerId);
            event.preventDefault();
            paint(pointer, index);
        },
        move(event) {
            const pointer = pointers.get(event.pointerId);
            if (!pointer) return;
            const index = indexAt(event.clientX, event.clientY);
            if (!canDraw() || index < 0) { up(event); return; }
            paint(pointer, index);
            pointer.anchor = index;
            event.preventDefault();
        },
        up,
        finish() {
            if (!pointers.size) return;
            const active = [...pointers];
            pointers.clear();
            for (const [id, pointer] of active) {
                if (pointer.target.hasPointerCapture(id)) pointer.target.releasePointerCapture(id);
            }
            finish();
        }
    };
}

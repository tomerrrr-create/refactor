// Small live preview: asynchronous neighbor copying, without new colors or buffers.
export function runIslandsPreview({ n, currentBoardState, random = Math.random }) {
    if (n < 2 || currentBoardState.length === 0) return currentBoardState;
    const count = Math.max(1, Math.floor(currentBoardState.length * .05));
    for (let attempt = 0; attempt < count; attempt++) {
        const index = Math.floor(random() * currentBoardState.length);
        const row = Math.floor(index / n), col = index % n;
        const direction = Math.floor(random() * 4);
        let neighbor;
        if (direction === 0 && row > 0) neighbor = index - n;
        else if (direction === 1 && row < n - 1) neighbor = index + n;
        else if (direction === 2 && col > 0) neighbor = index - 1;
        else if (direction === 3 && col < n - 1) neighbor = index + 1;
        else continue;
        const target = currentBoardState[index], source = currentBoardState[neighbor];
        if (!target || !source || target.isGold || source.isGold) continue;
        target.k = source.k;
        target.v = source.k;
        target.prevK = null;
    }
    return currentBoardState;
}

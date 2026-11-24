import test from 'node:test';
import assert from 'node:assert/strict';
import { createFractalState, validateFractalState, runFractalGeneration, steerJulia } from '../js/simulations/fractals.js';

function setup(n, mode) {
    const state = createFractalState(n, mode);
    const context = {
        currentBoardState: Array.from({ length: n ** 2 }, () => ({ k: 0, v: 0, isGold: false })),
        currentPalette: Array(23)
    };
    const step = () => runFractalGeneration(context, state);
    const active = () => context.currentBoardState.flatMap((cell, index) => cell.k ? [index] : []);
    return { state, context, step, active };
}

test('2D XOR seeds a blank board, then produces the cross and two-step scaled cross', () => {
    const { state, step, active } = setup(7, 'xor');
    const center = 24;
    step();
    assert.deepEqual(active(), [center]);
    step();
    assert.deepEqual(active(), [center - 7, center - 1, center, center + 1, center + 7]);
    step();
    assert.deepEqual(active(), [center - 14, center - 2, center, center + 2, center + 14]);
    assert.equal(state.frame, 3);
});

test('multiple XOR seeds cancel shared cells and grow across edges while preserving gold', () => {
    const { context, step, active } = setup(7, 'xor');
    const board = context.currentBoardState;
    board[0].k = board[2].k = 7;
    board[49 - 1] = { k: 9, v: 9, isGold: true };
    step();
    assert(!active().includes(1));
    assert(active().includes(6) && active().includes(42));
    assert.deepEqual(board[48], { k: 9, v: 9, isGold: true });
});

test('Julia evolves with the active palette, can be steered and resumes exactly from its checkpoint', () => {
    const { state, context, step } = setup(61);
    assert.equal(state.mode, 'julia');
    context.currentBoardState[0] = { k: 5, v: 5, isGold: true };
    step();
    const colorCount = new Set(context.currentBoardState.map(cell => cell.k)).size;
    assert(colorCount > 12);
    const previous = state.real;
    steerJulia(state, 0);
    step();
    assert(state.real < previous && state.real > state.targetReal);
    const checkpoint = validateFractalState(JSON.parse(JSON.stringify(state)));
    const restored = structuredClone(context);
    for (let i = 0; i < 12; i++) {
        step();
        runFractalGeneration(restored, checkpoint);
    }
    assert.deepEqual(restored.currentBoardState, context.currentBoardState);
    assert.deepEqual(checkpoint, state);
    assert.deepEqual(context.currentBoardState[0], { k: 5, v: 5, isGold: true });
    assert.throws(() => validateFractalState({ ...checkpoint, targetReal: 2 }));
});

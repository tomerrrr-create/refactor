// Practice runs in a separate same-origin document. Its preferences never reach disk.
export const isFtuePractice = typeof window !== 'undefined' && window.parent !== window && new URLSearchParams(location.search).get('ftue-practice') === '1';
if (isFtuePractice) {
    document.documentElement.dataset.ftuePractice='1';
    const language = new URLSearchParams(location.search).get('lang') || 'en';
    const values = new Map([['userLanguage', language]]);
    const memory = {
        get length() { return values.size; },
        key: index => [...values.keys()][index] ?? null,
        getItem: key => values.get(String(key)) ?? null,
        setItem: (key, value) => values.set(String(key), String(value)),
        removeItem: key => values.delete(String(key)), clear: () => values.clear()
    };
    Object.defineProperty(window, 'localStorage', { value: memory, configurable: true });
}

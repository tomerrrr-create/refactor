// The application loads only this small handoff. Encoders and the replay engine
// are loaded exclusively by the Studio tab, on an explicit click.
export function openStudio({ capture, language, onBlocked = () => {}, onError = () => {} }, host = window) {
    const bytes = new Uint8Array(16);
    host.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const url = new URL('./studio/', host.location.href);
    url.searchParams.set('lang', language);
    url.hash = 'transfer=' + token;
    const child = host.open(url.href, '_blank');
    if (!child) { onBlocked(); return null; }
    let file;
    try {
        file = capture();
        if (!(file instanceof File) || file.size > 32 * 1024 * 1024) throw new Error('Studio accepts files up to 32 MiB');
    }
    catch (error) { child.close(); onError(error); return null; }
    const cleanup = () => { host.removeEventListener('message', receive); host.clearTimeout(timeout); };
    const receive = event => {
        if (event.origin !== url.origin || event.source !== child || event.data?.token !== token) return;
        if (event.data.type === 'FYI_STUDIO_READY') {
            child.postMessage({ type: 'FYI_STUDIO_RECIPE', token, file }, url.origin);
        } else if (event.data.type === 'FYI_STUDIO_RECEIVED') cleanup();
    };
    host.addEventListener('message', receive);
    const timeout = host.setTimeout(() => { cleanup(); if (!child.closed) onError(new Error('Studio handoff timed out')); }, 60000);
    return child;
}

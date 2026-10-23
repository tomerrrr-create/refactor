export function receiveRecipe(accept, host = window) {
    const token = new URLSearchParams(host.location.hash.slice(1)).get('transfer');
    const opener = host.opener;
    if (!token || !/^[a-f0-9]{32}$/.test(token) || !opener) return;
    let accepted = false;
    const receive = event => {
        if (accepted || event.origin !== host.location.origin || event.source !== opener ||
            event.data?.type !== 'FYI_STUDIO_RECIPE' || event.data.token !== token) return;
        const file = event.data.file;
        if (!(file instanceof File) || file.size > 32 * 1024 * 1024) return;
        accepted = true;
        host.removeEventListener('message', receive);
        host.clearInterval(retry);
        host.clearTimeout(timeout);
        opener.postMessage({ type: 'FYI_STUDIO_RECEIVED', token }, host.location.origin);
        host.history.replaceState(null, '', host.location.pathname + host.location.search);
        host.opener = null;
        accept(file);
    };
    host.addEventListener('message', receive);
    const ready = () => opener.postMessage({ type: 'FYI_STUDIO_READY', token }, host.location.origin);
    const retry = host.setInterval(ready, 500);
    const timeout = host.setTimeout(() => { host.clearInterval(retry); host.removeEventListener('message', receive); }, 60000);
    ready();
}

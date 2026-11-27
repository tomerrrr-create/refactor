import { getText, onLanguageChange } from './i18n.js';

// Keep updates separate from drawing state: activation/reload needs an explicit tap.
let registration;
let registrationPromise;
let checkingManually = false;
let banner;
let acceptingUpdate = false;
let dismissedWorker;
let lastCheck = 0;
function updateLabels() {
    if (!banner) return;
    banner.querySelector('p').textContent = getText('pwa_update_ready');
    banner.querySelector('[data-update]').textContent = getText('pwa_update');
    banner.querySelector('[data-dismiss]').setAttribute('aria-label', getText('saveModal_close'));
}
function offerUpdate() {
    if (checkingManually || !navigator.serviceWorker.controller || !registration?.waiting || registration.waiting === dismissedWorker) return;
    if (!banner) {
        banner = document.createElement('aside');
        banner.className = 'pwa-update';
        banner.setAttribute('role', 'status');
        banner.innerHTML = '<p></p><button type="button" data-update></button><button type="button" data-dismiss>×</button>';
        document.body.appendChild(banner);
        banner.querySelector('[data-update]').addEventListener('click', () => {
            if (checkingManually || !registration.waiting) return;
            acceptingUpdate = true;
            registration.waiting.postMessage({ type: 'FYI_APPLY_UPDATE' });
        });
        banner.querySelector('[data-dismiss]').addEventListener('click', () => {
            dismissedWorker = registration.waiting;
            banner.hidden = true;
        });
    }
    updateLabels();
    banner.hidden = false;
}
function waitForChange(target, event, isReady, hasFailed = () => false) {
    return new Promise((resolve, reject) => {
        function finish(error) {
            clearTimeout(timer);
            target.removeEventListener(event, check);
            if (error) reject(error);
            else resolve();
        }
        function check() {
            if (hasFailed()) finish(new Error('Update installation failed'));
            else if (isReady()) finish();
        }
        const timer = setTimeout(() => finish(new Error('Update timed out')), 20000);
        target.addEventListener(event, check);
        check();
    });
}

// Check the current deployment even if a background check just ran.
export async function applyLatestVersion(beforeActivation) {
    if (checkingManually || acceptingUpdate || !navigator.onLine || !('serviceWorker' in navigator) || !window.isSecureContext) {
        throw new Error('Update unavailable');
    }
    checkingManually = true;
    if (banner) banner.hidden = true;
    try {
        const workers = navigator.serviceWorker;
        const reg = await startRegistration();
        if (!reg) throw new Error('Update unavailable');
        const previous = workers.controller;
        await reg.update();
        const worker = reg.installing || reg.waiting ||
            (previous && reg.active !== previous ? reg.active : null);
        if (!worker) return false;
        const failed = () => worker.state === 'redundant';
        await waitForChange(worker, 'statechange',
            () => worker.state !== 'installing' && worker.state !== 'parsed', failed);
        beforeActivation();
        if (worker.state === 'installed') worker.postMessage({ type: 'FYI_APPLY_UPDATE' });
        await waitForChange(worker, 'statechange', () => worker.state === 'activated', failed);
        await waitForChange(workers, 'controllerchange', () => workers.controller === worker, failed);
        return true;
    } finally {
        checkingManually = false;
        offerUpdate();
    }
}

function startRegistration() {
    return registrationPromise ??= register();
}

onLanguageChange(updateLabels);
async function register() {
    try {
        registration = await navigator.serviceWorker.register(new URL('../service-worker.js', import.meta.url), { updateViaCache: 'none' });
        offerUpdate();
        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(); });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (acceptingUpdate) window.location.reload();
        });
        async function check() {
            if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 30000) return;
            lastCheck = Date.now();
            try { await registration.update(); } catch { /* Offline: keep the installed version. */ }
            offerUpdate();
        }
        document.addEventListener('visibilitychange', check);
        window.addEventListener('online', check);
        check();
        return registration;
    } catch (error) {
        console.warn('FYI offline installation unavailable:', error.message);
    }
}
if ('serviceWorker' in navigator && window.isSecureContext) {
    if (document.readyState === 'complete') startRegistration();
    else window.addEventListener('load', startRegistration, { once: true });
}

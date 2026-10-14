import { getText, onLanguageChange } from './i18n.js';

// Keep updates separate from drawing state: activation/reload needs an explicit tap.
let registration;
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
    if (!navigator.serviceWorker.controller || !registration?.waiting || registration.waiting === dismissedWorker) return;
    if (!banner) {
        banner = document.createElement('aside');
        banner.className = 'pwa-update';
        banner.setAttribute('role', 'status');
        banner.innerHTML = '<p></p><button type="button" data-update></button><button type="button" data-dismiss>×</button>';
        document.body.appendChild(banner);
        banner.querySelector('[data-update]').addEventListener('click', () => {
            if (!registration.waiting) return;
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
    } catch (error) {
        console.warn('FYI offline installation unavailable:', error.message);
    }
}
if ('serviceWorker' in navigator && window.isSecureContext) {
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
}

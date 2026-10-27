// Generated asset list/version: run node tools/update-pwa-cache.mjs after app changes.
const VERSION = '880a725d99f4be5da147';
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.webmanifest",
    "./js/app.js",
    "./js/brush-footprint.js",
    "./js/brush-picker.js",
    "./js/brush-recording-settings.js",
    "./js/chi-reach.js",
    "./js/color-page-swipe.js",
    "./js/colors.js",
    "./js/constants.js",
    "./js/data/palettes.js",
    "./js/display-canvas.js",
    "./js/dom-elements.js",
    "./js/erosion-modal.js",
    "./js/erosion-settings.js",
    "./js/evolution-cycle-settings.js",
    "./js/evolution-explanation.js",
    "./js/evolution-tuning-modals.js",
    "./js/evolution-tuning.js",
    "./js/guide-ripples.js",
    "./js/i18n.js",
    "./js/interface-zoom.js",
    "./js/palette-color-transition.js",
    "./js/palette-display-names.js",
    "./js/palette-group-transition.js",
    "./js/palette-picker.js",
    "./js/picker-gestures.js",
    "./js/preset-cycle-editor.js",
    "./js/preset-cycle-membership.js",
    "./js/profile-controls.js",
    "./js/profile-state.js",
    "./js/pwa.js",
    "./js/quick-start.js",
    "./js/rainbow-frame.js",
    "./js/relative-separators.js",
    "./js/separator-cycle-modal.js",
    "./js/separator-cycle.js",
    "./js/separator-recording.js",
    "./js/settings-import-transition.js",
    "./js/sim-init-settings.js",
    "./js/simulation-theme.js",
    "./js/simulations.js",
    "./js/simulations/breathe.js",
    "./js/simulations/brightness.js",
    "./js/simulations/chi_flow.js",
    "./js/simulations/contour.js",
    "./js/simulations/dla.js",
    "./js/simulations/erosion.js",
    "./js/simulations/game_of_life.js",
    "./js/simulations/gravitational_sort.js",
    "./js/simulations/islands.js",
    "./js/simulations/magnet.js",
    "./js/simulations/spiral.js",
    "./js/simulations/turing.js",
    "./js/smooth-rendering-settings.js",
    "./js/soft-bloom.js",
    "./js/sort-cycle-settings.js",
    "./js/startup-profile.js",
    "./js/startup-settings.js",
    "./js/studio-link.js",
    "./js/tool-mode-glow.js",
    "./js/ui-modals.js",
    "./js/wind-paint.js",
    "./js/wind-recording.js",
    "./js/wind-settings.js",
    "./js/workspace-settings.js",
    "./vendor/tailwind-runtime.js",
    "./icons/fyi-eclipse-180.png",
    "./icons/fyi-eclipse-192.png",
    "./icons/fyi-eclipse-512.png",
    "./icons/fyi-eclipse-maskable-512.png",
    "./icons/fyi-social-preview.png"
];
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = 'fyi-pwa-' + encodeURIComponent(SCOPE.pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, SCOPE).href));

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            await cache.addAll(ASSETS.map(path => new Request(new URL(path, SCOPE), { cache: 'reload' })));
        } catch (error) {
            await caches.delete(CACHE_NAME);
            throw error;
        }
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'FYI_APPLY_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== SCOPE.origin) return;
    url.search = '';
    url.hash = '';
    if (!ASSET_URLS.has(url.href)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(url.href) || fetch(event.request);
    })());
});

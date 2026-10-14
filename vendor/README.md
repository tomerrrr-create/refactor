# Local styling runtime

`tailwind-runtime.js` is the cached Tailwind CSS v3 Play CDN runtime previously loaded from `https://cdn.tailwindcss.com`. It is kept locally so the existing dynamically generated utility classes continue to work offline without changing layout. Tailwind CSS is MIT licensed; bundled third-party notices are retained in the file. Update this file deliberately and run the PWA asset builder afterward.

The previous html2canvas CDN script was unused; image export uses the app's canvas directly.

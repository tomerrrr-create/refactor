// A bounded decorative canvas. It never reads or writes the artwork or simulations.
export function createGuideRipples(canvas) {
  const ctx = canvas.getContext('2d');
  const colors = [[227,198,119],[213,170,72],[191,146,50],[255,231,160]];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let waves = [], frame = 0, lastPaint = 0, color = 0;
  function draw(now = performance.now()) {
    const {width, height} = canvas.getBoundingClientRect();
    if (!ctx || !width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    ctx.fillStyle = '#100e09'; ctx.fillRect(0, 0, width, height);
    const columns = 25, rows = Math.max(1, Math.round(columns * height / width));
    const cell = width / columns;
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const base = .11 + .045 * Math.sin(x * .43 + y * .31);
      let red = 227 * base, green = 198 * base, blue = 119 * base;
      for (const wave of waves) {
        const age = (now - wave.time) / 2400;
        const distance = Math.hypot((x + .5) / columns - wave.x, ((y + .5) / rows - wave.y) * height / width);
        const ridge = Math.exp(-Math.pow((distance - age * 1.65) / .065, 2));
        const echo = .45 * Math.exp(-Math.pow((distance - age * 1.65 + .15) / .05, 2));
        const strength = Math.max(0, 1 - age) * (ridge + echo) * .95;
        red += wave.color[0] * strength; green += wave.color[1] * strength; blue += wave.color[2] * strength;
      }
      ctx.fillStyle = `rgb(${Math.min(255, red)},${Math.min(255, green)},${Math.min(255, blue)})`;
      ctx.fillRect(x * cell + .6, y * height / rows + .6, Math.max(0, cell - 1.2), Math.max(0, height / rows - 1.2));
    }
  }
  function tick(now) {
    frame = 0;
    waves = waves.filter(w => now - w.time < 2400);
    if (now - lastPaint >= 32 || !waves.length) { draw(now); lastPaint = now; }
    if (waves.length) frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame); frame = 0; waves = []; lastPaint = 0; draw();
  }
  function burst(x, y) {
    if (!ctx) return;
    const now = performance.now();
    waves.push({x, y, time: now, color: colors[color++ % colors.length]});
    waves = waves.slice(-6);
    if (reducedMotion.matches) { waves = [waves.at(-1)]; draw(now + 400); waves = []; }
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  new ResizeObserver(() => draw()).observe(canvas);
  return { burst, stop, draw };
}

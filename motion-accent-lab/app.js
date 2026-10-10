const $ = id => document.getElementById(id);
const pose = { sheet: 0, mark: 0, seal: 0, settle: 0 };
const tl = anime.createTimeline({ autoplay: false, defaults: { ease: 'out(3)' } })
  .add(pose, { sheet: [0, 1], duration: 700 }, 0)
  .add(pose, { mark: [0, 1], duration: 500, ease: 'inOut(2)' }, 540)
  .add(pose, { seal: [0, 1], duration: 430, ease: 'outBack' }, 950)
  .add(pose, { settle: [0, 1], duration: 450 }, 1350);
let current = 0, playing = false, last = null, raf = 0, inView = true, demoExport = false;
const media = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => media.matches || $('reduce').checked;
const miniature = $('station').cloneNode(true);
miniature.removeAttribute('id'); miniature.removeAttribute('role'); miniature.removeAttribute('aria-label');
for (const node of miniature.querySelectorAll('[id]')) node.id = 'mini-' + node.id;
miniature.querySelector('rect').setAttribute('fill', 'url(#mini-dots)');
$('mini').append(miniature);
const themes = {
  paper: { light: '#fffcf2', mid: '#dddccc', shade: '#a9b1a1', ink: '#252820', accent: '#c24e34', screen: '#536d5e', paper: '#f2efe7' },
  oxide: { light: '#d8d6c8', mid: '#b6bdb1', shade: '#6c7872', ink: '#282c2a', accent: '#99534b', screen: '#343e39', paper: '#e4e4db' },
  blueprint: { light: '#c1e3f2', mid: '#547997', shade: '#28465e', ink: '#142c40', accent: '#cf703f', screen: '#254257', paper: '#d4e2e8' }
};
function renderSVG() {
  const s = pose.sheet, seal = Math.max(.001, pose.seal);
  $('paper').setAttribute('transform', 'translate(' + (s * 38) + ',' + (s * 18 - Math.sin(s * Math.PI) * 10) + ')');
  $('paper').style.opacity = .3 + s * .7;
  $('drawline').style.strokeDasharray = '1';
  $('drawline').style.strokeDashoffset = 1 - pose.mark;
  $('stamp').setAttribute('transform', 'translate(440,206) scale(' + seal + ') translate(-440,-206)');
  $('stamp').style.opacity = Math.min(1, pose.seal * 2);
  $('rays').style.opacity = Math.max(0, Math.sin(Math.min(1, pose.seal) * Math.PI));
  const bounce = Math.sin(pose.settle * Math.PI * 2) * (1 - pose.settle) * 4;
  $('tower').setAttribute('transform', 'translate(0,' + bounce + ')');
  for (const id of ['paper', 'stamp', 'rays', 'tower', 'drawline']) {
    const source = $(id), copy = $('mini-' + id);
    for (const attribute of ['transform', 'style']) {
      if (source.hasAttribute(attribute)) copy.setAttribute(attribute, source.getAttribute(attribute));
    }
  }
  $('time').textContent = Math.round(current) + ' / ' + DURATION + ' ms';
  $('seek').value = current;
  $('playhead').style.left = 'calc(64px + (100% - 64px) * ' + (current / DURATION) + ')';
  $('phase').textContent = current === 0 ? 'Ready to dispatch' : current < 540 ? '01 / Send the sheet' : current < 950 ? '02 / Draw the mark' : current < 1350 ? '03 / Pop the seal' : current < DURATION ? '04 / Settle' : 'Dispatch complete';
  $('frame-label').textContent = $('stepped').checked ? '12 FPS POSE SAMPLES' : 'CONTINUOUS POSE';
  $('values').textContent = JSON.stringify({ timelineMs: Math.round(current), sampledMs: Math.round(sampleTime(current, $('stepped').checked)), ...pose }, (key, value) => typeof value === 'number' ? Math.round(value * 1000) / 1000 : value, 2);
}
function seek(time) {
  current = Math.max(0, Math.min(DURATION, time));
  tl.seek(sampleTime(current, $('stepped').checked), true);
  renderSVG();
}
function controls() {
  $('pause').disabled = !playing;
  $('play').textContent = playing ? 'Restart accent ↗' : current > 0 && current < DURATION ? 'Resume accent ↗' : 'Play accent ↗';
}
function stopClock() { cancelAnimationFrame(raf); raf = 0; last = null; }
function schedule() {
  if (playing && !document.hidden && inView && !raf) raf = requestAnimationFrame(tick);
}
function finish() {
  playing = false; stopClock(); controls();
  if (demoExport) { $('product-status').textContent = 'Demo complete · export ready'; demoExport = false; }
}
function tick(now) {
  raf = 0;
  if (!playing || document.hidden || !inView) { last = null; return; }
  const delta = last === null ? 0 : Math.min(50, Math.max(0, now - last));
  last = now;
  seek(current + delta);
  if (current >= DURATION) finish(); else schedule();
}
function play(restart = false) {
  stopClock();
  if (restart || playing || current >= DURATION) seek(0);
  if (reduced()) { seek(DURATION); finish(); return; }
  playing = true; controls(); schedule();
}
$('play').addEventListener('click', () => play());
$('pause').addEventListener('click', () => { playing = false; stopClock(); controls(); });
$('reset').addEventListener('click', () => {
  playing = false; demoExport = false; stopClock(); seek(0); controls();
  $('product-status').textContent = 'Ready for a demo export';
});
$('seek').addEventListener('input', e => {
  playing = false; stopClock(); seek(+e.target.value); controls();
  if (demoExport) { demoExport = false; $('product-status').textContent = 'Previewing the accent · demo stopped'; }
});
$('stepped').addEventListener('change', () => seek(current));
$('ink').addEventListener('change', () => $('art').classList.toggle('no-ink', !$('ink').checked));
$('regions').addEventListener('change', () => $('art').classList.toggle('no-regions', !$('regions').checked));
function updateMotion() {
  $('motion-note').textContent = reduced() ? 'Reduced motion: playback shows the final state immediately. Manual seeking remains available.' : 'A one-shot accent settles after 1.8 seconds. No idle loop.';
  if (reduced() && playing) { seek(DURATION); finish(); }
}
$('reduce').addEventListener('change', updateMotion);
media.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', () => { stopClock(); schedule(); });
const visibleSurfaces = new Set();
const visibilityObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visibleSurfaces.add(entry.target); else visibleSurfaces.delete(entry.target);
  }
  inView = visibleSurfaces.size > 0;
  stopClock(); schedule();
}, { threshold: 0 });
visibilityObserver.observe($('art')); visibilityObserver.observe($('product-card'));
$('export').addEventListener('click', () => {
  demoExport = true; $('product-status').textContent = 'Demo export in progress…'; play(true);
});
for (const button of document.querySelectorAll('[data-theme]')) button.addEventListener('click', () => {
  for (const [key, value] of Object.entries(themes[button.dataset.theme])) $('art').style.setProperty('--' + key, value);
  for (const other of document.querySelectorAll('[data-theme]')) other.setAttribute('aria-pressed', String(other === button));
});
function drawLighting() {
  const canvas = $('spheres'), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const image = ctx.createImageData(w, h), angle = +$('angle').value * Math.PI / 180, bands = +$('bands').value;
  const centers = [w * .25, w * .75], radius = 107, cy = 140;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const which = x < w / 2 ? 0 : 1, nx = (x - centers[which]) / radius, ny = (cy - y) / radius;
    const r2 = nx * nx + ny * ny;
    if (r2 > 1) continue;
    const nz = Math.sqrt(1 - r2), level = illumination(nx, ny, nz, angle, which ? bands : 0);
    const i = (y * w + x) * 4;
    image.data[i] = Math.round(188 * level); image.data[i + 1] = Math.round(113 * level); image.data[i + 2] = Math.round(72 * level); image.data[i + 3] = 255;
  }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#25282018';
  for (const cx of centers) { ctx.beginPath(); ctx.ellipse(cx, cy + radius + 13, 89, 14, 0, 0, 2 * Math.PI); ctx.fill(); }
  // putImageData overwrites transparent pixels, so composite through an offscreen image canvas.
  const buffer = document.createElement('canvas'); buffer.width = w; buffer.height = h; buffer.getContext('2d').putImageData(image, 0, 0); ctx.drawImage(buffer, 0, 0);
  if ($('sphere-ink').checked) {
    ctx.strokeStyle = '#252820'; ctx.lineWidth = 3;
    for (const cx of centers) { ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); }
  }
  $('angle-value').textContent = $('angle').value + '°'; $('bands-value').textContent = bands;
}
for (const id of ['angle', 'bands', 'sphere-ink']) $(id).addEventListener('input', drawLighting);
seek(0); controls(); updateMotion(); drawLighting();

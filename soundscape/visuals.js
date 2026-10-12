// Original Canvas 2D terrain; ASCII motif adapted from our oxide-header-lab.
// No dashboard code, terrain files, shaders, or images are bundled.
class SurveyVisuals {
  constructor({ canvas, field, stations, profileAt, onSelect, onView }) {
    this.canvas = canvas; this.field = field; this.stations = stations;
    this.onSelect = onSelect; this.onView = onView;
    this.yaw = -.55; this.zoom = 1; this.selected = 0; this.motion = false;
    this.time = 0; this.last = 0; this.frame = null; this.drag = null;
    this.visible = { terrain: true, header: true };
    this.routeZ = x => .19 * Math.sin(x * 3.5);
    const caldera = (x, z) => {
      const radius = Math.hypot(x, z * 1.12), angle = Math.atan2(z, x);
      const rim = .7 + .045 * Math.sin(angle * 6) + .025 * Math.cos(angle * 11);
      return 410 * Math.exp(-(((radius - rim) / .19) ** 2)) - 130 * Math.exp(-((radius / .37) ** 2))
        + 26 * Math.sin(x * 11 + z) * Math.cos(z * 10);
    };
    // The survey path shares the profile's elevations exactly; extend across it
    // with an illustrative crater bowl and rim rather than geographic data.
    this.height = (x, z) => profileAt(40 + Math.max(0, Math.min(1, (x + 1) / 2)) * 540)
      + caldera(x, z) - caldera(x, this.routeZ(x));
    this.points = [];
    for (let iz = 0; iz <= 72; iz++) for (let ix = 0; ix <= 88; ix++) {
      const x = -1.2 + ix / 88 * 2.4, z = -1.12 + iz / 72 * 2.24;
      if (Math.hypot(x / 1.2, z / 1.12) > 1) continue;
      const altitude = this.height(x, z), slope = this.height(x + .02, z) - altitude;
      const shade = Math.max(0, Math.min(3, Math.floor(2 - slope / 35 + (altitude - 2000) / 320)));
      this.points.push({ x, z, altitude, shade });
    }
    this.contours = this.makeContours();
    this.markers = stations.map(s => {
      const x = (s.x - 40) / 540 * 2 - 1;
      return { x, z: this.routeZ(x), altitude: s.altitude };
    });
    this.bindPointer();
    new ResizeObserver(() => this.draw()).observe(canvas);
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) this.visible[entry.target === canvas ? 'terrain' : 'header'] = entry.isIntersecting;
      this.schedule();
    }, { threshold: 0 });
    this.observer.observe(canvas); this.observer.observe(field);
    document.addEventListener('visibilitychange', () => this.schedule());
    window.addEventListener('resize', () => { this.drawHeader(); this.draw(); });
    this.drawHeader(); this.draw();
  }
  makeContours() {
    const result = [], columns = 64, rows = 52;
    const grid = Array.from({ length: rows + 1 }, (_, iz) => Array.from({ length: columns + 1 }, (_, ix) => {
      const x = -1.2 + ix / columns * 2.4, z = -1.12 + iz / rows * 2.24;
      return { x, z, altitude: this.height(x, z) };
    }));
    // Marching squares: interpolate threshold crossings on each cell edge.
    for (const level of [1750, 1900, 2050, 2200, 2350, 2500]) {
      for (let iz = 0; iz < rows; iz++) for (let ix = 0; ix < columns; ix++) {
        const corners = [grid[iz][ix], grid[iz][ix + 1], grid[iz + 1][ix + 1], grid[iz + 1][ix]];
        if (corners.some(p => Math.hypot(p.x / 1.2, p.z / 1.12) > 1)) continue;
        const hits = [];
        for (let edge = 0; edge < 4; edge++) {
          const a = corners[edge], b = corners[(edge + 1) % 4];
          if ((a.altitude >= level) === (b.altitude >= level)) continue;
          const t = (level - a.altitude) / (b.altitude - a.altitude);
          hits.push({ x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z), altitude: level });
        }
        // Four-edge saddles use a consistent local pairing for this illustration.
        for (let i = 0; i + 1 < hits.length; i += 2) result.push([hits[i], hits[i + 1]]);
      }
    }
    return result;
  }
  setSelected(index) { this.selected = index; this.draw(); }
  setMotion(value) { this.motion = value; this.last = 0; this.schedule(); }
  orbit(amount) { this.yaw += amount; this.draw(); }
  resetView() { this.yaw = -.55; this.zoom = 1; this.draw(); }
  schedule() {
    cancelAnimationFrame(this.frame); this.frame = null; this.last = 0;
    if (this.motion && !document.hidden && (this.visible.terrain || this.visible.header)) this.frame = requestAnimationFrame(now => this.tick(now));
  }
  tick(now) {
    this.frame = null;
    if (!this.motion || document.hidden || (!this.visible.terrain && !this.visible.header)) { this.last = 0; return; }
    if (!this.last || now - this.last >= 1000 / 24) {
      this.time += this.last ? Math.min((now - this.last) / 1000, .1) : 0;
      this.last = now;
      if (this.visible.header) this.drawHeader();
      if (this.visible.terrain) this.draw();
    }
    this.frame = requestAnimationFrame(time => this.tick(time));
  }
  drawHeader() {
    const columns = innerWidth <= 700 ? 72 : 144, rows = 12;
    const ease = 1 - Math.exp(-this.time * 1.1), lines = [];
    const noise = x => Math.sin(x * .09 + 17) * 2 + Math.sin(x * .23 + 17) * 1.1 + Math.sin(x * .61) * .4;
    // Rising Contour's three-frequency edge, compressed into a header band.
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < columns; x++) {
        const edge = 8 - x / columns * 8 + noise(x + ease * 22 + this.time * .45) * .58;
        const d = y - edge;
        line += Math.abs(d) < .55 ? '▄' : d > 0 ? '#:·'[Math.min(2, Math.floor(d * .65))] : ' ';
      }
      lines.push(line);
    }
    this.field.textContent = lines.join('\n');
  }
  draw() {
    const box = this.canvas.getBoundingClientRect(), width = box.width, height = box.height;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    // Resize only when needed; avoid reallocating the backing store each frame.
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    }
    const ctx = this.canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / 3.05, height / 1.72) * this.zoom;
    const cos = Math.cos(this.yaw), sin = Math.sin(this.yaw);
    const project = p => ({ x: width / 2 + (p.x * cos - p.z * sin) * scale,
      y: height * .65 + (p.x * sin + p.z * cos) * scale * .43 - (p.altitude - 1600) / 1000 * scale * .68 });
    ctx.lineWidth = .65; ctx.strokeStyle = '#55675130'; ctx.beginPath();
    for (let v = -1.2; v <= 1.21; v += .3) {
      for (const [a, b] of [[{ x: v, z: -1.2, altitude: 1580 }, { x: v, z: 1.2, altitude: 1580 }],
        [{ x: -1.2, z: v, altitude: 1580 }, { x: 1.2, z: v, altitude: 1580 }]]) {
        const aa = project(a), bb = project(b); ctx.moveTo(aa.x, aa.y); ctx.lineTo(bb.x, bb.y);
      }
    } ctx.stroke();
    const scan = 1900 + (Math.sin(this.time * .45) * .5 + .5) * 600;
    const colors = ['#b8cbb52e', '#c2d0bd5c', '#d4dcc88a', '#e7eadaab'];
    for (let shade = 0; shade < 4; shade++) {
      ctx.fillStyle = colors[shade]; ctx.beginPath();
      for (const p of this.points) if (p.shade === shade) {
        const screen = project(p), size = Math.abs(p.altitude - scan) < 24 ? 1.5 : .8;
        ctx.rect(screen.x, screen.y, size, size);
      } ctx.fill();
    }
    ctx.strokeStyle = '#e1e5d649'; ctx.lineWidth = .65; ctx.beginPath();
    for (const [a, b] of this.contours) { const aa = project(a), bb = project(b); ctx.moveTo(aa.x, aa.y); ctx.lineTo(bb.x, bb.y); } ctx.stroke();
    ctx.strokeStyle = '#ffa65b'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = -1 + i / 50, z = this.routeZ(x), p = project({ x, z, altitude: this.height(x, z) + 6 });
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    } ctx.stroke();
    this.projectedMarkers = this.markers.map(project);
    ctx.font = '9px monospace';
    this.projectedMarkers.forEach((p, i) => {
      const active = i === this.selected;
      ctx.strokeStyle = active ? '#ffa65b' : '#bbc7b4'; ctx.fillStyle = '#0d1111'; ctx.lineWidth = active ? 1.7 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, active ? 5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const labelX = Math.max(10, Math.min(width - 38, p.x + 7)), labelY = Math.max(40, p.y - (active ? 20 : 9));
      if (active) { ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, labelY - 2); ctx.lineTo(labelX - 2, labelY - 2); ctx.stroke(); }
      ctx.fillStyle = active ? '#ffa65b' : '#bdc9b5'; ctx.fillText(this.stations[i].id, labelX, labelY);
    });
    this.onView({ yaw: this.yaw, zoom: this.zoom });
  }
  bindPointer() {
    this.canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const delta = event.clientX - this.drag.x;
      if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 5) this.drag.moved = true;
      if (this.drag.moved) { this.yaw += delta * .006; this.draw(); }
      this.drag.x = event.clientX; this.drag.y = event.clientY;
    });
    this.canvas.addEventListener('pointerup', event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const click = !this.drag.moved; this.drag = null;
      this.canvas.releasePointerCapture(event.pointerId);
      if (!click) return;
      const box = this.canvas.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top;
      let nearest = -1, distance = 18;
      this.projectedMarkers.forEach((p, i) => { const d = Math.hypot(x - p.x, y - p.y); if (d < distance) { nearest = i; distance = d; } });
      if (nearest >= 0) this.onSelect(nearest);
    });
    this.canvas.addEventListener('pointercancel', () => { this.drag = null; });
    this.canvas.addEventListener('wheel', event => {
      // Require intentional focus on the field; the rest of the page scrolls normally.
      if (!event.ctrlKey) return;
      event.preventDefault(); this.zoom = Math.max(.7, Math.min(1.4, this.zoom - event.deltaY * .001)); this.draw();
    }, { passive: false });
  }
}

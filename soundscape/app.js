(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stations = [
    { id: 'S01', name: 'WEST RIM', altitude: 2140, thermal: 38.2, gas: 124, x: 66 },
    { id: 'S02', name: 'BASALT FIELD', altitude: 1975, thermal: 47.6, gas: 208, x: 175 },
    { id: 'S03', name: 'INNER VENT', altitude: 1820, thermal: 82.4, gas: 642, x: 310 },
    { id: 'S04', name: 'EAST RIDGE', altitude: 2350, thermal: 56.1, gas: 305, x: 445 },
    { id: 'S05', name: 'RELAY POINT', altitude: 2215, thermal: 31.8, gas: 96, x: 567 }
  ];
  const families = { POINTER: ['tick', 'hover', 'glide', 'pop'], PRESS: ['press', 'release', 'tap', 'thock'],
    TOGGLE: ['on', 'off', 'switch', 'latch'], FEEDBACK: ['success', 'error', 'warning', 'denied'],
    NOTIFY: ['chime', 'ping', 'bell', 'bubble'], MOTION: ['swoosh', 'whoosh', 'drop', 'rise'],
    STATE: ['loading', 'ready', 'complete', 'sparkle'] };
  let selected = 0, online = true, completed = new Set(), events = [], task = null, eventTotal = 0;
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches, lastCue = null, lastAt = 0;
  let animationFrame = null, warningTimer = null;
  const audio = new SpriteAudio(SOUND_DATA, { onPlay: inspectCue, onChange: updateMetrics });
  const panFor = el => {
    if (!el) return 0;
    const box = el.getBoundingClientRect();
    return ((box.left + box.width / 2) / innerWidth * 2 - 1) * 0.65;
  };
  const sound = (name, category, el) => audio.play(name, { category, pan: panFor(el) });
  const elapsed = () => Math.floor(performance.now() / 1000);
  const timestamp = () => { const n = elapsed(); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; };
  function log(message, kind = 'info') {
    events.unshift({ message, kind, time: timestamp() }); events = events.slice(0, 8); eventTotal++;
    $('event-count').textContent = `${String(eventTotal).padStart(2, '0')} EVENTS`;
    $('event-log').replaceChildren(...events.map(item => {
      const row = document.createElement('li'); row.dataset.kind = item.kind;
      const time = document.createElement('time'); time.textContent = item.time;
      const text = document.createElement('span'); text.textContent = item.message;
      row.append(time, text); return row;
    }));
  }
  // Profile is a deliberately synthetic 2D instrument, not a terrain reconstruction.
  const yFor = altitude => 163 - (altitude - 1500) / 900 * 135;
  const anchors = [{ x: 40, altitude: 1990 }, ...stations, { x: 580, altitude: 2130 }];
  function profileAt(x) {
    let index = 0;
    while (index < anchors.length - 2 && anchors[index + 1].x < x) index++;
    const a = anchors[index], b = anchors[index + 1], t = (x - a.x) / (b.x - a.x);
    return a.altitude * (1 - t) + b.altitude * t + Math.sin(t * Math.PI) * (Math.sin(x * .14) * 43 + Math.cos(x * .043) * 74);
  }
  const points = Array.from({ length: 271 }, (_, i) => { const x = 40 + i * 2; return `${x},${yFor(profileAt(x)).toFixed(2)}`; });
  $('elevation-line').setAttribute('d', `M${points.join('L')}`);
  $('elevation-area').setAttribute('d', `M40,163L${points.join('L')}L580,163Z`);
  const NS = 'http://www.w3.org/2000/svg';
  stations.forEach((s, i) => {
    const row = document.createElement('button'); row.className = 'station-row'; row.dataset.focus = 'hover';
    row.setAttribute('aria-pressed', String(i === selected)); row.setAttribute('aria-label', `${s.id} ${s.name}, ${s.altitude} meters`);
    for (const text of [s.id + ' / ' + s.name.split(' ')[0], String(s.altitude), 'READY']) {
      const span = document.createElement('span'); span.textContent = text; row.append(span);
    }
    row.addEventListener('click', () => selectStation(i, row)); $('stations').append(row);
    const text = document.createElementNS(NS, 'text'); text.setAttribute('x', s.x); text.setAttribute('y', 19);
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('class', 'station-marker'); text.textContent = s.id;
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', s.x); dot.setAttribute('cy', yFor(s.altitude));
    dot.setAttribute('r', 2); dot.setAttribute('class', 'station-dot'); $('profile-stations').append(text, dot);
  });
  const visuals = new SurveyVisuals({ canvas: $('terrain'), field: $('rising-contour'), stations, profileAt,
    onSelect: index => selectStation(index, $('terrain')), onView: ({ yaw, zoom }) => {
      const label = `AZ ${Math.round(yaw * 180 / Math.PI)}° / ${zoom.toFixed(1)}×`;
      if ($('terrain-view').textContent !== label) $('terrain-view').textContent = label;
    } });
  for (const [id, amount] of [['orbit-left', -.18], ['orbit-right', .18]]) {
    $(id).addEventListener('click', () => { visuals.orbit(amount); sound('switch', 'selection', $(id)); });
  }
  $('terrain-reset').addEventListener('click', () => { visuals.resetView(); sound('latch', 'selection', $('terrain-reset')); });
  for (const [family, names] of Object.entries(families)) {
    const row = document.createElement('div'); row.className = 'cue-family';
    const label = document.createElement('span'); label.textContent = family; row.append(label);
    for (const name of names) {
      const button = document.createElement('button'); button.textContent = name; button.dataset.cue = name;
      button.setAttribute('aria-label', `Audition ${name}`); button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (!audio.enabled) { $('sound-status').textContent = 'Enable sound above to audition the supplied cues.'; return; }
        audio.play(name, { audition: true, pan: panFor(button), category: 'audition' });
      }); row.append(button);
    }
    $('cue-families').append(row);
  }
  for (const [name, cue] of Object.entries(SOUND_DATA.cues)) {
    const segment = document.createElement('i'); segment.style.flexGrow = cue.duration; segment.dataset.segment = name;
    segment.title = `${name} / ${(cue.duration * 1000).toFixed(1)} ms`; $('sprite-strip').append(segment);
  }
  function renderSelection() {
    const s = stations[selected];
    visuals.setSelected(selected);
    $('terrain-selection').textContent = `${s.id} / ${s.name}`;
    [...$('stations').children].forEach((row, i) => {
      row.setAttribute('aria-pressed', String(i === selected)); row.lastElementChild.textContent = completed.has(i) ? 'SAMPLED' : task?.station === i ? 'BUSY' : 'READY';
    });
    $('station-label').replaceChildren(document.createTextNode(`${s.id} `));
    const small = document.createElement('small'); small.textContent = `/ ${s.name}`; $('station-label').append(small);
    $('elevation-value').replaceChildren(document.createTextNode(`${s.altitude.toLocaleString('en-US').replace(',', ' ')} `));
    const unit = document.createElement('small'); unit.textContent = 'M'; $('elevation-value').append(unit);
    $('profile-cursor').setAttribute('d', `M${s.x},28V163`);
    $('profile-point').setAttribute('cx', s.x); $('profile-point').setAttribute('cy', yFor(s.altitude));
    [...$('profile-stations').querySelectorAll('text')].forEach((el, i) => el.classList.toggle('selected', i === selected));
    $('thermal-value').textContent = s.thermal.toFixed(1); $('gas-value').textContent = s.gas;
    for (const [id, value] of [['thermal-bars', s.thermal / 100], ['gas-bars', s.gas / 750]]) {
      const bars = Array.from({ length: 18 }, (_, i) => {
        const bar = document.createElement('i'), strength = Math.max(.1, value * (.7 + .25 * Math.sin(i * .8) + .07 * Math.cos(i * 2)));
        bar.style.height = `${strength * 100}%`; bar.className = strength > .6 ? 'hot' : ''; return bar;
      }); $(id).replaceChildren(...bars);
    }
    if (!task) {
      $('sample-fill').style.width = completed.has(selected) ? '100%' : '0%';
      setSampleStatus(completed.has(selected) ? `${s.id} sample stored` : `${s.id} ready to sample`, completed.has(selected) ? 'COMPLETE' : 'STANDBY');
    }
    updateThreshold(false);
  }
  function selectStation(index, el) {
    sound(index === selected ? 'tap' : 'switch', 'selection', el);
    if (index === selected) return;
    selected = index; renderSelection();
    log(`Inspection → ${stations[selected].id} / ${stations[selected].name}`);
  }
  function setSampleStatus(message, progress) {
    // Avoid re-announcing identical live-region text on every progress tick.
    if ($('sample-status').textContent !== message) $('sample-status').textContent = message;
    $('sample-progress').textContent = progress;
  }
  function updateMission() {
    const percent = completed.size * 20; $('mission-percent').textContent = percent;
    $('mission-ring').style.strokeDashoffset = 100 - percent; $('sample-count').textContent = `${completed.size} / 5`;
  }
  function updateThreshold(notify) {
    const value = +$('threshold').value; $('threshold-value').textContent = `${value} °C`;
    const hot = stations[selected].thermal >= value;
    const status = $('threshold-status'), wasHot = status.dataset.hot === 'true';
    status.dataset.hot = String(hot); status.classList.toggle('error-text', hot);
    status.textContent = hot ? 'THERMAL ABOVE THRESHOLD' : 'THERMAL BELOW THRESHOLD';
    if (notify && hot !== wasHot) {
      sound(hot ? 'warning' : 'ready', 'result', $('threshold'));
      log(`${stations[selected].id} ${hot ? 'exceeds' : 'below'} thermal threshold / ${value} °C`, hot ? 'error' : 'result');
    }
  }
  function cancelTask(reason = 'Acquisition canceled', audible = true) {
    if (!task) return;
    clearInterval(task.timer); task = null; audio.stopAll();
    $('sample').disabled = false; $('cancel').disabled = true; $('sample-fill').style.width = '0%';
    renderSelection(); setSampleStatus(reason, 'CANCELED'); log(reason);
    if (audible) sound('whoosh', 'motion', $('cancel'));
  }
  function startSample(el = $('sample')) {
    if (task) return;
    if (!online) { setSampleStatus('Relay offline — reconnect before sampling', 'BLOCKED'); log('Acquisition blocked / relay offline', 'error'); sound('denied', 'result', el); return; }
    if (completed.has(selected)) { setSampleStatus('Sample already stored — select another station', 'STORED'); sound('latch', 'result', el); return; }
    const station = selected, start = performance.now();
    task = { station, start, lastPulse: -1, timer: null }; $('sample').disabled = true; $('cancel').disabled = false;
    renderSelection(); log(`${stations[station].id} acquisition started`); sound('press', 'interaction', el);
    const tick = () => {
      if (!task) return;
      if (document.hidden) { cancelTask('Acquisition canceled / console backgrounded', false); return; }
      const progress = Math.min(1, (performance.now() - start) / 3200);
      $('sample-fill').style.width = `${progress * 100}%`;
      setSampleStatus(`${stations[station].id} acquiring sample`, `${Math.floor(progress * 100)}%`);
      const pulse = Math.floor(progress * 4);
      if (pulse !== task.lastPulse && progress < 1) { task.lastPulse = pulse; sound('loading', 'state', el); }
      if (progress === 1) {
        clearInterval(task.timer); task = null; audio.stopAll(); completed.add(station); updateMission();
        $('sample').disabled = false; $('cancel').disabled = true; renderSelection();
        setSampleStatus(`${stations[station].id} sample stored successfully`, 'COMPLETE');
        log(`${stations[station].id} sample stored / ${completed.size} of 5`, 'result');
        sound(completed.size === 5 ? 'sparkle' : 'complete', 'result', el);
      }
    };
    task.timer = setInterval(tick, 80); tick();
  }
  function resetSurvey() {
    cancelTask('Acquisition canceled / survey reset', false); completed.clear(); selected = 0;
    $('sample-fill').style.width = '0%'; updateMission(); renderSelection();
    log('Survey reset / sample memory cleared'); sound('drop', 'motion', $('reset'));
  }
  function setOnline(value) {
    if (!value && task) cancelTask('Acquisition canceled / relay disconnected', false);
    online = value; $('relay').setAttribute('aria-pressed', String(online));
    $('relay-label').textContent = online ? 'ONLINE' : 'OFFLINE';
    $('link-quality').replaceChildren(document.createTextNode(online ? '98.4' : '0.0'));
    const unit = document.createElement('small'); unit.textContent = '%'; $('link-quality').append(unit);
    if (online && !task) renderSelection();
    sound(online ? 'on' : 'off', 'state', $('relay')); log(`Survey uplink ${online ? 'connected' : 'disconnected'}`, online ? 'result' : 'error');
  }
  $('sample').addEventListener('click', () => startSample());
  $('cancel').addEventListener('click', () => cancelTask());
  $('reset').addEventListener('click', resetSurvey);
  $('relay').addEventListener('click', () => setOnline(!online));
  $('ping').addEventListener('click', () => { sound(online ? 'ping' : 'denied', 'result', $('ping')); log(online ? 'Relay acknowledged / 24 ms simulated RTT' : 'Relay ping rejected / no uplink', online ? 'result' : 'error'); });
  $('fault').addEventListener('click', () => {
    cancelTask('Acquisition canceled / sensor fault', false);
    setSampleStatus('Sensor fault — reset or retry acquisition', 'FAULT');
    sound('error', 'result', $('fault')); log('Injected sensor fault / checksum mismatch', 'error');
  });
  $('warning').addEventListener('click', () => {
    const value = $('threshold').value; log(`Test alert / thermal threshold ${value} °C`, 'error');
    sound('warning', 'result', $('warning')); $('threshold-status').textContent = 'TEST ALERT / ACKNOWLEDGED';
    clearTimeout(warningTimer); warningTimer = setTimeout(() => { updateThreshold(false); warningTimer = null; }, 2200);
  });
  $('threshold').addEventListener('input', () => { clearTimeout(warningTimer); updateThreshold(true); sound('tick', 'interaction', $('threshold')); });
  $('command-form').addEventListener('submit', event => {
    event.preventDefault(); const command = $('command').value.trim().toUpperCase();
    if (command === 'SCAN') { startSample($('command')); $('command-result').textContent = online ? 'SCAN → acquisition requested.' : 'SCAN blocked / relay offline.'; }
    else if (command === 'STATUS') { $('command-result').textContent = `${stations[selected].id} / ${online ? 'ONLINE' : 'OFFLINE'} / ${completed.size} SAMPLES`; sound('chime', 'result', $('command')); log('Status requested / diagnostics nominal'); }
    else if (command === 'RESET') { resetSurvey(); $('command-result').textContent = 'RESET → survey memory cleared.'; }
    else { $('command-result').textContent = 'Unknown command. Try SCAN, STATUS, or RESET.'; sound('error', 'result', $('command')); log('Command rejected / unknown instruction', 'error'); }
    $('command').value = '';
  });
  $('command').addEventListener('keydown', event => {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) sound('thock', 'interaction', $('command'));
  });
  $('clear-log').addEventListener('click', () => { events = []; eventTotal = 0; log('Event log cleared'); sound('tap', 'interaction', $('clear-log')); });
  // One delegated focus path for both pointer and keyboard. No Foley bind() installed.
  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const el = event.target.closest('[data-focus]');
    if (el && !el.disabled && !el.contains(event.relatedTarget)) sound(el.dataset.focus, 'focus', el);
  });
  document.addEventListener('focusin', event => {
    const el = event.target.closest('[data-focus]'); if (el && !el.disabled) sound(el.dataset.focus, 'focus', el);
  });
  $('sound-toggle').addEventListener('click', async () => {
    if (audio.enabled) { audio.mute(); $('sound-status').textContent = 'Sound muted. Visual feedback remains active.'; return; }
    $('sound-toggle').disabled = true; $('sound-status').textContent = 'Decoding the audio sprite…';
    try { await audio.enable(); $('sound-status').textContent = 'Sound enabled. Try sampling a station or auditioning a cue.'; sound('ready', 'state', $('sound-toggle')); }
    catch (error) { audio.mute(); $('sound-status').textContent = `Audio could not start: ${error.message}`; }
    finally { $('sound-toggle').disabled = false; }
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    audio.setMode(button.dataset.mode); document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    const explanation = { silent: 'Silent: the instrument UI is quiet. Cue auditions still work while sound is enabled.',
      essential: 'Essential: selections, state changes, and results. Focus and continuous slider sounds stay quiet.',
      full: 'Full: focus, controls, transitions, state changes, and results. Compare the same task at a richer density.' };
    $('policy-explanation').textContent = explanation[audio.mode];
    sound('switch', 'interaction', button);
  }));
  $('volume').addEventListener('input', () => audio.setVolume(+$('volume').value / 100));
  $('spatial').addEventListener('click', () => { audio.spatial = !audio.spatial; $('spatial').setAttribute('aria-pressed', String(audio.spatial)); $('spatial').querySelector('span').textContent = audio.spatial ? 'ON' : 'OFF'; sound('switch', 'interaction', $('spatial')); });
  function setMotion(value) {
    motion = value; document.body.dataset.motion = motion ? 'on' : 'off';
    $('motion').setAttribute('aria-pressed', String(motion)); $('motion').querySelector('span').textContent = motion ? 'ON' : 'OFF';
    visuals.setMotion(motion);
    cancelAnimationFrame(animationFrame); animationFrame = null; drawScope();
  }
  $('motion').addEventListener('click', () => setMotion(!motion));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) setMotion(false); });
  $('notes-toggle').addEventListener('click', () => {
    const open = $('study-notes').hidden; $('study-notes').hidden = !open;
    $('notes-toggle').setAttribute('aria-expanded', String(open)); $('notes-toggle').textContent = open ? 'STUDY NOTES −' : 'STUDY NOTES +';
    sound(open ? 'rise' : 'whoosh', 'motion', $('notes-toggle'));
  });
  function updateMetrics() {
    $('sound-toggle').setAttribute('aria-pressed', String(audio.enabled));
    $('sound-toggle').textContent = audio.enabled ? 'Mute sound ⏸' : audio.buffer ? 'Enable sound ↗' : 'Enable sound ↗';
    $('volume-value').textContent = `${Math.round(audio.volume * 100)}%`;
    if (audio.buffer) {
      $('decode-metric').textContent = `${audio.decodeMs.toFixed(1)} ms`;
      $('buffer-metric').textContent = `${(audio.decodedBytes / 1048576).toFixed(2)} MiB`;
    }
  }
  function inspectCue(event) {
    lastCue = event; lastAt = performance.now();
    $('last-cue').textContent = event.name; $('cue-duration').textContent = `${(event.cue.duration * 1000).toFixed(1)} MS`;
    $('cue-range').textContent = `${event.cue.start.toFixed(3)} → ${(event.cue.start + event.cue.duration).toFixed(3)} s`;
    $('cue-category').textContent = `${event.category.toUpperCase()} / ${event.pan < -.1 ? 'LEFT' : event.pan > .1 ? 'RIGHT' : 'CENTER'}`;
    $('play-metric').textContent = audio.playCount;
    document.querySelectorAll('[data-cue]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cue === event.name)));
    document.querySelectorAll('[data-segment]').forEach(segment => segment.classList.toggle('active', segment.dataset.segment === event.name));
    cancelAnimationFrame(animationFrame); animationFrame = null; drawScope();
  }
  function drawScope() {
    animationFrame = null;
    const canvas = $('scope'), box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.width * dpr)); canvas.height = Math.round(99 * dpr);
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    const width = box.width, height = 99;
    ctx.strokeStyle = '#2a382e'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < width; x += width / 8) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += height / 4) { ctx.moveTo(0, y); ctx.lineTo(width, y); } ctx.stroke();
    if (!lastCue || !audio.buffer) {
      ctx.fillStyle = '#98a399'; ctx.font = '10px monospace'; ctx.fillText('AWAITING AUDIO SIGNAL', 14, 52); return;
    }
    const data = audio.buffer.getChannelData(0), rate = audio.buffer.sampleRate;
    const start = Math.round(lastCue.cue.start * rate), length = Math.round(lastCue.cue.duration * rate);
    ctx.strokeStyle = '#d8ddcd'; ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const from = start + Math.floor(x / width * length), to = Math.min(data.length, start + Math.floor((x + 1) / width * length));
      let low = 0, high = 0;
      for (let i = from; i < to; i++) { low = Math.min(low, data[i]); high = Math.max(high, data[i]); }
      ctx.moveTo(x, height / 2 - high * 43); ctx.lineTo(x, height / 2 - low * 43);
    } ctx.stroke();
    const progress = (performance.now() - lastAt) / (lastCue.cue.duration * 1000);
    if (motion && progress < 1 && audio.enabled && !document.hidden) {
      ctx.strokeStyle = '#ffa65b'; ctx.beginPath(); ctx.moveTo(progress * width, 0); ctx.lineTo(progress * width, height); ctx.stroke();
      animationFrame = requestAnimationFrame(drawScope);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.stopAll(); cancelTask('Acquisition canceled / console backgrounded', false);
      clearTimeout(warningTimer); warningTimer = null; updateThreshold(false);
      cancelAnimationFrame(animationFrame); animationFrame = null;
    } else drawScope();
  });
  window.addEventListener('pagehide', () => { cancelTask('Acquisition stopped', false); audio.mute(); clearTimeout(warningTimer); cancelAnimationFrame(animationFrame); visuals.setMotion(false); });
  window.addEventListener('resize', () => { cancelAnimationFrame(animationFrame); drawScope(); });
  renderSelection(); updateMission(); updateMetrics(); setMotion(motion); log('CALDERA initialized / awaiting operator');
})();

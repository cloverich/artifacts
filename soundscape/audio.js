// Original sprite player. Foley's synthesized exports are used under MIT.
class SpriteAudio {
  constructor(data, { Context = globalThis.AudioContext || globalThis.webkitAudioContext, hidden = () => document.hidden,
    onPlay = () => {}, onChange = () => {} } = {}) {
    this.data = data; this.Context = Context; this.hidden = hidden;
    this.onPlay = onPlay; this.onChange = onChange;
    this.enabled = false; this.mode = 'essential'; this.volume = 0.25; this.spatial = true;
    this.voices = new Set(); this.last = new Map(); this.playCount = 0;
  }
  async enable() {
    if (!this.Context) throw new Error('Web Audio is unavailable in this browser.');
    if (!this.context) {
      this.context = new this.Context({ latencyHint: 'interactive' });
      const c = this.context;
      this.master = c.createGain(); this.master.gain.value = this.volume;
      this.compressor = c.createDynamicsCompressor();
      this.compressor.threshold.value = -8; this.compressor.knee.value = 8;
      this.compressor.ratio.value = 12; this.compressor.attack.value = 0.003; this.compressor.release.value = 0.12;
      this.analyser = c.createAnalyser(); this.analyser.fftSize = 256;
      this.master.connect(this.compressor); this.compressor.connect(this.analyser); this.analyser.connect(c.destination);
    }
    // resume is invoked synchronously within the enabling click, before decode awaits.
    const resumed = this.context.resume();
    if (!this.decodePromise) {
      const bytes = Uint8Array.from(atob(this.data.base64), c => c.charCodeAt(0));
      const start = performance.now();
      this.decodePromise = this.context.decodeAudioData(bytes.buffer).then(buffer => {
        this.buffer = buffer; this.decodeMs = performance.now() - start;
        this.decodedBytes = buffer.length * buffer.numberOfChannels * 4;
        return buffer;
      }).catch(error => { this.decodePromise = null; throw error; });
    }
    await Promise.all([resumed, this.decodePromise]);
    this.enabled = true; this.last.clear(); this.onChange();
  }
  mute() { this.enabled = false; this.stopAll(); this.onChange(); }
  setMode(mode) { this.mode = mode; this.stopAll(); this.last.clear(); this.onChange(); }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(0.6, Number(value)));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.012);
    this.onChange();
  }
  stopAll() { for (const voice of [...this.voices]) voice.stop(); }
  play(name, { category = 'interaction', pan = 0, audition = false } = {}) {
    const cue = this.data.cues[name], c = this.context;
    if (!cue || !this.enabled || !this.buffer || this.hidden() || c.state !== 'running') return false;
    if (!audition && (this.mode === 'silent' || (this.mode === 'essential' && ['interaction', 'focus', 'motion'].includes(category)))) return false;
    const now = c.currentTime, key = category === 'focus' ? '__focus' : name;
    if (now - (this.last.get(key) ?? -Infinity) < (category === 'focus' ? 0.1 : 0.065)) return false;
    this.last.set(key, now);
    // A small hard voice budget prevents hover/slider storms accumulating nodes.
    if (this.voices.size >= 6) this.voices.values().next().value.stop();
    const source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner();
    source.buffer = this.buffer;
    panner.pan.value = this.spatial ? Math.max(-0.65, Math.min(0.65, pan)) : 0;
    const level = category === 'focus' ? 0.24 : ['interaction', 'selection'].includes(category) ? 0.52 : 0.8;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.002);
    gain.gain.setValueAtTime(level, now + Math.max(0.002, cue.duration - 0.004));
    gain.gain.linearRampToValueAtTime(0, now + cue.duration);
    source.connect(gain); gain.connect(panner); panner.connect(this.master);
    let stopped = false;
    const cleanup = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); panner.disconnect(); };
    const voice = { stop: () => {
      if (stopped) return;
      stopped = true;
      source.stop(); cleanup();
    } };
    source.onended = () => { stopped = true; cleanup(); };
    this.voices.add(voice);
    source.start(now, cue.start, cue.duration);
    this.playCount++;
    this.onPlay({ name, category: audition ? 'audition' : category, cue, pan: panner.pan.value, scheduledAt: now });
    return true;
  }
}

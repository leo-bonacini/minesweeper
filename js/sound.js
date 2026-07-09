export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  tone({ freq = 440, duration = 0.1, type = 'sine', gain = 0.15, sweepTo = null, delay = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    const startTime = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, startTime);
    if (sweepTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), startTime + duration);
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  noiseBurst({ duration = 0.3, gain = 0.2, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    source.connect(filter).connect(gainNode).connect(ctx.destination);
    source.start(startTime);
  }

  reveal() {
    this.tone({ freq: 480, duration: 0.06, type: 'triangle', gain: 0.08 });
  }

  flag() {
    this.tone({ freq: 700, duration: 0.08, type: 'square', gain: 0.07, sweepTo: 900 });
  }

  unflag() {
    this.tone({ freq: 500, duration: 0.08, type: 'square', gain: 0.06, sweepTo: 350 });
  }

  explosion() {
    this.noiseBurst({ duration: 0.5, gain: 0.3 });
    this.tone({ freq: 120, duration: 0.4, type: 'sawtooth', gain: 0.2, sweepTo: 30 });
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.tone({ freq, duration: 0.25, type: 'triangle', gain: 0.12, delay: i * 0.12 });
    });
  }

  lose() {
    [400, 300, 200].forEach((freq, i) => {
      this.tone({ freq, duration: 0.3, type: 'sawtooth', gain: 0.12, delay: i * 0.15 });
    });
  }

  click() {
    this.tone({ freq: 300, duration: 0.04, type: 'square', gain: 0.05 });
  }
}

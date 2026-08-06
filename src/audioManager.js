/**
 * DRYBLING Mapping Module — AudioManager
 * Motor de audio procedural basado en Web Audio API.
 *
 * Genera una banda sonora cinematográfica sintética de ~18 segundos
 * con osciladores, ruido procedural, delay, reverb (convolver) y
 * compresor dinámico. Expone un AnalyserNode para sincronización
 * audiovisual en tiempo real.
 *
 * Sin dependencias externas. Compatible con todos los navegadores modernos.
 */

export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} */
    this.master = null;
    /** @type {GainNode|null} */
    this.preGain = null;
    /** @type {GainNode|null} */
    this.dryGain = null;
    /** @type {GainNode|null} */
    this.wetGain = null;
    /** @type {BiquadFilterNode|null} */
    this.filter = null;
    /** @type {DelayNode|null} */
    this.delay = null;
    /** @type {GainNode|null} */
    this.delayFeedback = null;
    /** @type {ConvolverNode|null} */
    this.convolver = null;
    /** @type {DynamicsCompressorNode|null} */
    this.compressor = null;
    /** @type {AnalyserNode|null} */
    this.analyser = null;
    /** @type {Uint8Array|null} */
    this.data = null;
    /** @type {AudioScheduledSourceNode[]} */
    this.nodes = [];
    this.startedAt = 0;
    this.duration  = 0;
  }

  /**
   * Inicializa el grafo de audio.
   * Debe llamarse desde un gesto del usuario (click/touch) para cumplir
   * la política de autoplay de los navegadores modernos.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this.ctx) return true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Este navegador no admite Web Audio API');
    }

    this.ctx = new AudioContextClass();

    // ── Nodo de salida principal (con fade in/out) ──────────────────────────
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // ── Ganancia previa al procesado ────────────────────────────────────────
    this.preGain = this.ctx.createGain();
    this.preGain.gain.value = 1;

    // ── Mezcla seca / húmeda ────────────────────────────────────────────────
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.72;

    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0.28;

    // ── Analizador de espectro ──────────────────────────────────────────────
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);

    // ── Filtro paso bajo (automatizado durante la secuencia) ────────────────
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1500;
    this.filter.Q.value = 0.72;

    // ── Delay con retroalimentación ─────────────────────────────────────────
    this.delay = this.ctx.createDelay(2);
    this.delay.delayTime.value = 0.24;

    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.24;

    // ── Reverb sintético (impulso generado proceduralmente) ─────────────────
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createImpulse(1.15, 2.6);

    // ── Compresor dinámico ──────────────────────────────────────────────────
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -22;
    this.compressor.knee.value      = 22;
    this.compressor.ratio.value     = 3.2;
    this.compressor.attack.value    = 0.006;
    this.compressor.release.value   = 0.24;

    // ── Grafo de señal ──────────────────────────────────────────────────────
    // fuente → analyser → preGain
    //   preGain → dryGain → compressor → master → destination
    //   preGain → filter → delay ⇄ delayFeedback
    //                    → wetGain → compressor
    //                    → convolver → wetGain
    this.analyser.connect(this.preGain);
    this.preGain.connect(this.dryGain);
    this.dryGain.connect(this.compressor);

    this.preGain.connect(this.filter);
    this.filter.connect(this.delay);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.delay.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.compressor);

    this.compressor.connect(this.master);

    return true;
  }

  /**
   * Genera un buffer de impulso para el reverb sintético.
   * @param {number} duration  Duración en segundos
   * @param {number} decay     Exponente de decaimiento
   * @returns {AudioBuffer}
   */
  createImpulse(duration = 1.15, decay = 2.6) {
    if (!this.ctx) throw new Error('AudioContext no inicializado');
    const length  = Math.floor(this.ctx.sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const samples = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const envelope = Math.pow(1 - i / length, decay);
        samples[i] = (Math.random() * 2 - 1) * envelope;
      }
    }
    return impulse;
  }

  /**
   * Inicia la secuencia de audio procedural.
   * @param {number} duration  Duración total en segundos (por defecto 18)
   * @returns {Promise<void>}
   */
  async start(duration = 18) {
    if (!this.ctx) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stop();

    this.duration  = duration;
    this.startedAt = this.ctx.currentTime;
    const now      = this.ctx.currentTime;

    // ── Automatización del volumen maestro (fade in / fade out) ────────────
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(0.62, now + 0.7);
    this.master.gain.setValueAtTime(0.62, now + Math.max(0.8, duration - 1.2));
    this.master.gain.linearRampToValueAtTime(0, now + duration);

    // ── Automatización del filtro (apertura espectral cinematográfica) ──────
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(520, now);
    this.filter.frequency.exponentialRampToValueAtTime(3600, now + 4.8);
    this.filter.frequency.exponentialRampToValueAtTime(1500, now + duration);

    // ── Automatización de la mezcla wet/dry ────────────────────────────────
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(0.16, now);
    this.wetGain.gain.linearRampToValueAtTime(0.42, now + 4.5);
    this.wetGain.gain.linearRampToValueAtTime(0.26, now + duration);

    this.dryGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.setValueAtTime(0.84, now);
    this.dryGain.gain.linearRampToValueAtTime(0.58, now + 4.5);
    this.dryGain.gain.linearRampToValueAtTime(0.74, now + duration);

    // ── Osciladores ────────────────────────────────────────────────────────
    const bass     = this.ctx.createOscillator();
    bass.type      = 'sine';
    bass.frequency.value = 55;
    const bassGain = this.ctx.createGain();
    bassGain.gain.value  = 0.22;

    const mid      = this.ctx.createOscillator();
    mid.type       = 'triangle';
    mid.frequency.value  = 164.81;
    const midGain  = this.ctx.createGain();
    midGain.gain.value   = 0.075;

    const high     = this.ctx.createOscillator();
    high.type      = 'sine';
    high.frequency.value = 392;
    const highGain = this.ctx.createGain();
    highGain.gain.value  = 0.028;

    // LFO para modulación del bajo
    const lfo     = this.ctx.createOscillator();
    lfo.frequency.value  = 1.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value   = 0.17;
    lfo.connect(lfoGain);
    lfoGain.connect(bassGain.gain);

    [[bass, bassGain], [mid, midGain], [high, highGain]].forEach(([oscillator, gain]) => {
      oscillator.connect(gain);
      gain.connect(this.analyser);
      oscillator.start(now);
      oscillator.stop(now + duration);
    });
    lfo.start(now);
    lfo.stop(now + duration);

    // ── Ruido procedural con envolvente rítmica ────────────────────────────
    const buffer  = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) {
      const t         = i / this.ctx.sampleRate;
      const hit       = Math.pow(Math.max(0, Math.sin(Math.PI * 2 * 1.08 * t)), 18);
      const distantAir = (Math.random() * 2 - 1) * 0.012;
      samples[i] = (Math.random() * 2 - 1) * 0.05 * hit + distantAir;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(this.analyser);
    noise.start(now);
    noise.stop(now + duration);

    this.nodes = [bass, mid, high, lfo, noise];
  }

  /**
   * Obtiene los niveles de energía por banda de frecuencia.
   * Devuelve valores normalizados en [0, 1].
   * @returns {{ bass: number, mid: number, high: number }}
   */
  getBands() {
    if (!this.analyser || !this.data) return { bass: 0, mid: 0, high: 0 };
    this.analyser.getByteFrequencyData(this.data);
    const average = (start, end) => {
      let sum = 0;
      const limit = Math.min(end, this.data.length);
      for (let i = start; i < limit; i += 1) sum += this.data[i];
      return limit > start ? sum / (limit - start) / 255 : 0;
    };
    return {
      bass: average(1, 16),
      mid:  average(16, 65),
      high: average(65, 180),
    };
  }

  /**
   * Ajusta la mezcla wet/dry en tiempo real.
   * @param {number} wet  Proporción de señal procesada [0, 1]
   */
  setWetDry(wet = 0.28) {
    if (!this.ctx || !this.wetGain || !this.dryGain) return;
    const safeWet = Math.max(0, Math.min(1, wet));
    const now     = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(safeWet, now, 0.08);
    this.dryGain.gain.setTargetAtTime(1 - safeWet, now, 0.08);
  }

  /**
   * Ajusta la frecuencia de corte del filtro en tiempo real.
   * @param {number} frequency  Frecuencia en Hz [80, 12000]
   */
  setFilterFreq(frequency = 1500) {
    if (!this.ctx || !this.filter) return;
    const safeFrequency = Math.max(80, Math.min(12000, frequency));
    this.filter.frequency.setTargetAtTime(safeFrequency, this.ctx.currentTime, 0.08);
  }

  /**
   * Ajusta el tiempo de delay en tiempo real.
   * @param {number} seconds  Tiempo en segundos [0, 1.2]
   */
  setDelayTime(seconds = 0.24) {
    if (!this.ctx || !this.delay) return;
    const safeTime = Math.max(0, Math.min(1.2, seconds));
    this.delay.delayTime.setTargetAtTime(safeTime, this.ctx.currentTime, 0.06);
  }

  /**
   * Ajusta la retroalimentación del delay en tiempo real.
   * @param {number} amount  Cantidad [0, 0.75]
   */
  setDelayFeedback(amount = 0.24) {
    if (!this.ctx || !this.delayFeedback) return;
    const safeAmount = Math.max(0, Math.min(0.75, amount));
    this.delayFeedback.gain.setTargetAtTime(safeAmount, this.ctx.currentTime, 0.06);
  }

  /**
   * Detiene todos los nodos de audio activos.
   */
  stop() {
    for (const node of this.nodes) {
      try { node.stop(); }      catch { /* nodo ya detenido */ }
      try { node.disconnect(); } catch { /* nodo ya desconectado */ }
    }
    this.nodes = [];
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  /**
   * Libera todos los recursos de audio.
   * Debe llamarse al desmontar el módulo.
   */
  dispose() {
    this.stop();
    for (const node of [
      this.analyser, this.preGain, this.dryGain, this.filter, this.delay,
      this.delayFeedback, this.convolver, this.wetGain, this.compressor, this.master,
    ]) {
      try { node?.disconnect(); } catch { /* ignorar */ }
    }
    try { this.ctx?.close(); } catch { /* ignorar */ }
    this.ctx = null;
  }
}

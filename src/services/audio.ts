// Web Audio API ambient noise generator & sound effects

class SoundManager {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private currentAmbientType: string | null = null;
  private masterVolume: number = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a soft high-end luxury bell/chime on task or session completion
  playCompletionChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, now); // 528 Hz "Transformation" tone
      osc1.frequency.exponentialRampToValueAtTime(1056, now + 1.2);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(792, now);
      osc2.frequency.exponentialRampToValueAtTime(1584, now + 1.2);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Soft tactile tick for buttons / switches
  playTick() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.04 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // ignore
    }
  }

  // Set ambient volume
  setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);
    }
  }

  getVolume() {
    return this.masterVolume;
  }

  getCurrentAmbient() {
    return this.currentAmbientType;
  }

  // Start ambient sound: 'rain', 'binaural', 'brown_noise', 'waves', 'cafe', 'fireplace', or 'none'
  startAmbient(type: 'rain' | 'binaural' | 'brown_noise' | 'waves' | 'cafe' | 'fireplace' | 'none') {
    this.stopAmbient();
    if (type === 'none') {
      this.currentAmbientType = null;
      return;
    }

    try {
      this.initContext();
      if (!this.ctx) return;

      this.currentAmbientType = type;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      if (type === 'binaural') {
        const oscL = this.ctx.createOscillator();
        const oscR = this.ctx.createOscillator();
        const merger = this.ctx.createChannelMerger(2);

        oscL.type = 'sine';
        oscL.frequency.value = 196; // G3
        oscR.type = 'sine';
        oscR.frequency.value = 236; // 40Hz difference Gamma flow
        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);
        merger.connect(this.ambientGain);

        oscL.start();
        oscR.start();
        this.ambientSource = merger;
      } else {
        // Synthesis buffer for noise sounds
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'brown_noise' || type === 'fireplace') {
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          } else {
            output[i] = (lastOut + 0.06 * white) / 1.06;
            lastOut = output[i];
            output[i] *= 2.0;
          }
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        if (type === 'rain') {
          filter.type = 'lowpass';
          filter.frequency.value = 850;
        } else if (type === 'waves') {
          filter.type = 'bandpass';
          filter.frequency.value = 450;
          filter.Q.value = 0.5;
        } else if (type === 'cafe') {
          filter.type = 'lowpass';
          filter.frequency.value = 1200;
        } else {
          filter.type = 'lowpass';
          filter.frequency.value = 380;
        }

        whiteNoise.connect(filter);
        filter.connect(this.ambientGain);

        whiteNoise.start();
        this.ambientSource = whiteNoise;
      }
    } catch (e) {
      console.warn('Ambient sound error:', e);
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        (this.ambientSource as any).stop?.();
        this.ambientSource.disconnect();
      } catch (e) {
        // ignore
      }
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
    this.currentAmbientType = null;
  }
}

export const soundManager = new SoundManager();

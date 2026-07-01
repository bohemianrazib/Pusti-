/**
 * Web Audio API synthesizer for the Pushti Tea experience.
 * Synthesizes sound effects entirely in code for 100% stability and zero asset load delays.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientNode: GainNode | null = null;
  private boilNode: GainNode | null = null;
  private steamNode: GainNode | null = null;
  private currentBoilVolume = 0;
  private currentSteamVolume = 0;
  private isMuted = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    }
  }

  public getMute() {
    return this.isMuted;
  }

  // Play a beautiful metallic bell/pop click
  public playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // Stove igniter: click click whoosh!
  public playStoveIgnition() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Create 3 spark clicks
    for (let i = 0; i < 3; i++) {
      const clickTime = now + i * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2500, clickTime);
      osc.frequency.exponentialRampToValueAtTime(8000, clickTime + 0.02);

      gain.gain.setValueAtTime(0.1, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.04);
    }

    // Whoosh of gas catching fire
    const whooshTime = now + 0.45;
    const bufferSize = this.ctx.sampleRate * 0.8; // 0.8 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, whooshTime);
    filter.frequency.exponentialRampToValueAtTime(300, whooshTime + 0.1);
    filter.frequency.exponentialRampToValueAtTime(80, whooshTime + 0.8);
    filter.Q.setValueAtTime(4.0, whooshTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, whooshTime);
    gain.gain.linearRampToValueAtTime(0.4, whooshTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, whooshTime + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(whooshTime);
    noise.stop(whooshTime + 0.8);
  }

  // Play a splash / pour sound when placing ingredients or pouring tea
  public playPour() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.5;
    
    // Low frequency rumble + filtered noise
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + duration);
    
    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);

    // Filtered pink-ish noise splash
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + duration);
    filter.Q.setValueAtTime(2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // Spoon clink
  public playSpoonClink() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Start persistent kitchen ambience: low warm hum and tiny synthesised bird chirps!
  public startAmbience() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ambientNode) return; // Already running

    this.ambientNode = this.ctx.createGain();
    this.ambientNode.gain.setValueAtTime(0.06, this.ctx.currentTime);
    this.ambientNode.connect(this.ctx.destination);

    // Create a low room-tone oscillator
    const roomTone = this.ctx.createOscillator();
    roomTone.type = 'sine';
    roomTone.frequency.setValueAtTime(90, this.ctx.currentTime); // 90 Hz hum
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.ctx.currentTime);

    roomTone.connect(filter);
    filter.connect(this.ambientNode);
    roomTone.start();

    // Trigger random bird chirps every 8-15 seconds
    const scheduleBird = () => {
      if (this.isMuted || !this.ctx || !this.ambientNode) return;
      const delay = 5000 + Math.random() * 8000;
      setTimeout(() => {
        this.playBirdChirp();
        scheduleBird();
      }, delay);
    };
    scheduleBird();
  }

  private playBirdChirp() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // A sweet 3-part chirp
    for (let i = 0; i < 3; i++) {
      const chirpTime = now + i * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800 + Math.random() * 400, chirpTime);
      osc.frequency.exponentialRampToValueAtTime(4200, chirpTime + 0.08);

      gain.gain.setValueAtTime(0.015, chirpTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(chirpTime);
      osc.stop(chirpTime + 0.13);
    }
  }

  // Start water boiling noise generator
  public startBoiling() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.boilNode) return;

    this.boilNode = this.ctx.createGain();
    this.boilNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.boilNode.connect(this.ctx.destination);

    // Boiling sound is created with a bandpass-filtered noise + low frequency rumbler
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 sec loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.boilNode);
    noise.start();
  }

  // Update boiling sound volume and frequency based on temperature (0 to 100)
  public updateBoiling(temp: number) {
    if (this.isMuted || !this.ctx) return;
    if (!this.boilNode) {
      this.startBoiling();
    }
    if (!this.boilNode) return;

    // Volume starts around 40C, maxes out at 100C
    let vol = 0;
    let frequency = 120; // Lower frequency at first
    if (temp >= 40) {
      vol = Math.min((temp - 40) / 60 * 0.25, 0.25);
      frequency = 120 + ((temp - 40) / 60) * 150; // Pitch rises
    }

    // Smoothed transition
    this.boilNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.2);

    // Also play random bubble pops at boiling temps
    if (temp > 60 && Math.random() < (temp - 50) / 100 * 0.15) {
      this.playBubblePop(temp);
    }
  }

  private playBubblePop(temp: number) {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Higher temp -> faster, smaller popping bubbles (higher pitch)
    const baseFreq = 80 + (temp / 100) * 80;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.08);

    const vol = (temp / 100) * 0.08;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Steam hiss
  public startSteam() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.steamNode) return;

    this.steamNode = this.ctx.createGain();
    this.steamNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.steamNode.connect(this.ctx.destination);

    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.steamNode);
    noise.start();
  }

  public updateSteam(temp: number) {
    if (this.isMuted || !this.ctx) return;
    if (!this.steamNode) {
      this.startSteam();
    }
    if (!this.steamNode) return;

    // Steam starts hissing at 80C, maxes at 100C
    let vol = 0;
    if (temp >= 80) {
      vol = Math.min((temp - 80) / 20 * 0.12, 0.12);
    }
    this.steamNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.3);
  }

  public stopAll() {
    if (this.boilNode) {
      this.boilNode.gain.setTargetAtTime(0, this.ctx ? this.ctx.currentTime : 0, 0.2);
    }
    if (this.steamNode) {
      this.steamNode.gain.setTargetAtTime(0, this.ctx ? this.ctx.currentTime : 0, 0.2);
    }
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;

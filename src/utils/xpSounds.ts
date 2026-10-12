// Utility for generating authentic Windows XP System Sounds and handling audio playback

class XpSoundGenerator {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Synthesize classic XP Critical Error "Chord"
  public playErrorSound(volume = 0.8) {
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Deep chord frequencies for classic XP error
      osc1.frequency.setValueAtTime(150, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);

      osc2.frequency.setValueAtTime(220, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.55);
      osc2.stop(ctx.currentTime + 0.55);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Synthesize classic XP Balloon Notification Sound (Ding)
  public playNotificationSound(volume = 0.7) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }

  // Synthesize classic XP Startup Harmony
  public playStartupChord(volume = 0.8) {
    try {
      const ctx = this.getContext();
      this.scheduleStartupChord(ctx, ctx.destination, volume, 0);
    } catch {}
  }

  // --- Export-mix variants: render into a given context/destination at an
  // --- optional start offset (seconds). Used by the video export so builtin
  // --- SFX clips land in the recorded mix with volume automation applied.
  public scheduleErrorSound(ctx: BaseAudioContext, dest: AudioNode, volume = 0.8, when = 0) {
    const t0 = ctx.currentTime + Math.max(0, when);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(150, t0);
    osc1.frequency.exponentialRampToValueAtTime(80, t0 + 0.4);
    osc2.frequency.setValueAtTime(220, t0);
    osc2.frequency.exponentialRampToValueAtTime(110, t0 + 0.4);
    gain.gain.setValueAtTime(Math.max(0.001, volume * 0.5), t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.55);
    osc2.stop(t0 + 0.55);
  }

  public scheduleNotificationSound(ctx: BaseAudioContext, dest: AudioNode, volume = 0.7, when = 0) {
    const t0 = ctx.currentTime + Math.max(0, when);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, t0); // E5
    osc.frequency.setValueAtTime(880.00, t0 + 0.1); // A5
    gain.gain.setValueAtTime(Math.max(0.001, volume * 0.4), t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  public scheduleStartupChord(ctx: BaseAudioContext, dest: AudioNode, volume = 0.8, when = 0) {
    const t0 = ctx.currentTime + Math.max(0, when);
    const freqs = [329.63, 440.0, 554.37, 659.25]; // E major chord
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.08);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(Math.max(0.001, volume * 0.25), t0 + 0.1 + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.8);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t0 + idx * 0.08);
      osc.stop(t0 + 2.0);
    });
  }
}

export const xpSoundGen = new XpSoundGenerator();

/**
 * Schedules a builtin: SFX id into an export mix. Unknown ids fall back to
 * the notification ding. Volume should already include keyframe/fade curves.
 */
export function scheduleBuiltinSound(
  ctx: BaseAudioContext,
  dest: AudioNode,
  audioSrc: string,
  volume: number,
  when = 0
): void {
  if (audioSrc === 'builtin:error') {
    xpSoundGen.scheduleErrorSound(ctx, dest, volume, when);
  } else if (audioSrc === 'builtin:startup') {
    xpSoundGen.scheduleStartupChord(ctx, dest, volume, when);
  } else {
    // builtin:balloon and anything unknown
    xpSoundGen.scheduleNotificationSound(ctx, dest, volume, when);
  }
}

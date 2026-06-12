export class RingtonePlayer {
  private ctx: any | null = null;
  private oscillators: any[] = [];
  private gainNode: any | null = null;
  private isPlaying = false;
  private intervalId: any = null;

  startRinging(type: 'incoming' | 'outgoing') {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // Check if AudioContext is supported (will work on Expo Web, fallback gracefully on native)
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (!AudioContextClass) {
      console.log('AudioContext not supported on this platform. Ringtone bypassed.');
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    const playRingCycle = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      
      this.stopOscillators();
      
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      
      if (type === 'outgoing') {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        
        osc1.connect(this.gainNode);
        osc2.connect(this.gainNode);
        
        this.oscillators = [osc1, osc2];
        
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
        
        osc1.start();
        osc2.start();
        
        setTimeout(() => {
          if (this.isPlaying && this.gainNode && this.ctx && this.ctx.state !== 'closed') {
            try {
              this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
              setTimeout(() => this.stopOscillators(), 100);
            } catch {}
          }
        }, 2000);
      } else {
        const now = this.ctx.currentTime;
        const notes = [659.25, 880, 659.25, 880, 987.77, 880, 659.25];
        const noteDur = 0.18;
        
        this.oscillators = [];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.gainNode) return;
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          
          osc.frequency.value = freq;
          osc.connect(noteGain);
          noteGain.connect(this.gainNode);
          
          const startTime = now + idx * noteDur;
          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur - 0.02);
          
          osc.start(startTime);
          osc.stop(startTime + noteDur);
          
          this.oscillators.push(osc);
        });
      }
    };
    
    playRingCycle();
    const intervalTime = type === 'outgoing' ? 6000 : 3500;
    this.intervalId = setInterval(playRingCycle, intervalTime);
  }

  private stopOscillators() {
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
    });
    this.oscillators = [];
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopOscillators();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

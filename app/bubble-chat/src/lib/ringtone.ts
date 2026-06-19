import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type Player = ReturnType<typeof createAudioPlayer>;

const SOURCES = {
  incoming: require('../../assets/sounds/ringtone-incoming.wav'),
  outgoing: require('../../assets/sounds/ringtone-outgoing.wav'),
};

let audioModeConfigured = false;
const configureAudioMode = async () => {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  // Ring through the speaker even when the device is on silent.
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}
};

export class RingtonePlayer {
  private player: Player | null = null;
  private isPlaying = false;

  startRinging(type: 'incoming' | 'outgoing') {
    if (this.isPlaying) return;
    this.isPlaying = true;
    configureAudioMode();

    try {
      const player = createAudioPlayer(SOURCES[type]);
      player.loop = true;
      player.volume = 1;
      player.play();
      this.player = player;
    } catch (e) {
      console.log('Ringtone playback unavailable on this platform:', e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.player) {
      try { this.player.pause(); } catch {}
      try { this.player.remove(); } catch {}
      this.player = null;
    }
  }
}

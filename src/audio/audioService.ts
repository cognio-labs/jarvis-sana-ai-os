// src/audio/audioService.ts

import logger from '@utils/logger';

interface AudioServiceOptions {
  startupSound?: string; // Path to startup sound file
  activationSound?: string; // Path to activation sound file
  ambientSound?: string; // Path to ambient futuristic sound file
}

export class AudioService {
  private audioContext: AudioContext | null = null;
  private startupBuffer: AudioBuffer | null = null;
  private activationBuffer: 2 | null = null;
  private ambientBuffer: AudioBuffer | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set(); // To manage active sounds

  private readonly options: Required<AudioServiceOptions>;

  constructor(options?: AudioServiceOptions) {
    this.options = {
      startupSound: options?.startupSound || '/sounds/startup_futuristic.mp3', // Default paths
      activationSound: options?.activationSound || '/sounds/activation_alert.mp3',
      ambientSound: options?.ambientSound || '/sounds/ambient_tech_loop.mp3',
    };
    logger.info('AudioService initialized.', { options: this.options });
  }

  /**
   * Initializes the AudioContext and preloads sounds.
   */
  public async initialize(): Promise<void> {
    if (!('AudioContext' in window)) {
      logger.error('AudioContext API is not supported in this browser.');
      alert('Audio features require a modern browser with AudioContext support.');
      return;
    }
    this.audioContext = new AudioContext();
    logger.info('AudioContext created.');

    // Preload sounds
    await this.preloadSound(this.options.startupSound, 'startup');
    await this.preloadSound(this.options.activationSound, 'activation');
    await this.preloadSound(this.options.ambientSound, 'ambient');
  }

  /**
   * Preloads a sound file into an AudioBuffer.
   * @param url URL of the sound file.
   * @param type Type of sound ('startup', 'activation', 'ambient').
   */
  private async preloadSound(url: string, type: 'startup' | 'activation' | 'ambient'): Promise<void> {
    if (!this.audioContext) {
      logger.error('AudioContext not initialized. Cannot preload sound.');
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      switch (type) {
        case 'startup': this.startupBuffer = audioBuffer; break;
        case 'activation': this.activationBuffer = audioBuffer; break;
        case 'ambient': this.ambientBuffer = audioBuffer; break;
      }
      logger.info(`Sound preloaded: ${url} (${type})`, { duration: audioBuffer.duration.toFixed(2) });
    } catch (error: any) {
      logger.error(`Failed to preload sound: ${url}`, { type, message: error.message });
    }
  }

  /**
   * Plays a sound from an AudioBuffer.
   * @param buffer The AudioBuffer to play.
   * @param loop Whether to loop the sound.
   * @param volume The volume (0.0 to 1.0).
   * @returns The AudioBufferSourceNode, or null if playback failed.
   */
  private playBuffer(buffer: AudioBuffer | null, loop: boolean = false, volume: number = 1.0): AudioBufferSourceNode | null {
    if (!this.audioContext || !buffer) {
      logger.warn('Cannot play sound: AudioContext or buffer not available.', { bufferAvailable: !!buffer });
      return null;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination); // Connect to speakers

    source.start(0); // Play immediately
    this.activeSources.add(source);

    source.onended = () => {
      this.activeSources.delete(source);
      if (loop && this.isListeningForAmbient) { // If ambient sound is supposed to loop
         this.playAmbient(); // Restart ambient sound if it was looping
      }
    };

    logger.debug('Playing sound buffer.', { loop, volume });
    return source;
  }

  /**
   * Plays the startup sound once.
   */
  public async playStartupSound(): Promise<void> {
    logger.info('Playing startup sound.');
    this.playBuffer(this.startupBuffer, false, 0.8); // Play startup sound slightly lower volume
    // Wait for sound to finish if needed for sequence
    // await new Promise(resolve => setTimeout(resolve, this.startupBuffer?.duration * 1000));
  }

  /**
   * Plays the activation alert sound once.
   */
  public async playActivationSound(): Promise<void> {
    logger.info('Playing activation sound.');
    this.playBuffer(this.activationBuffer, false, 1.0); // Play activation sound at full volume
  }

  private isListeningForAmbient: boolean = false;

  /**
   * Starts playing the ambient futuristic sound loop.
   */
  public playAmbientSound(): void {
    logger.info('Playing ambient futuristic sound loop.');
    this.isListeningForAmbient = true;
    this.playAmbient();
  }

  private playAmbient(): void {
      const source = this.playBuffer(this.ambientBuffer, true, 0.2); // Ambient sound at low volume, looping
      if (source) {
         // Ensure it's tracked if it terminates unexpectedly
         source.onended = () => {
           this.activeSources.delete(source);
           if (this.isListeningForAmbient) {
             this.playAmbient(); // Re-trigger ambient sound if loop is expected
           }
         };
      }
  }


  /**
   * Stops all currently playing sounds, including ambient loops.
   */
  public stopAllSounds(): void {
    logger.info('Stopping all sounds.');
    this.isListeningForAmbient = false; // Stop ambient loop
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        logger.warn('Error stopping audio source.', e);
      }
    });
    this.activeSources.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
       // Optionally, pause the context if it contains many sounds and needs to be temporarily silenced
       // this.audioContext.suspend();
    }
  }

  /**
   * Stops the audio context entirely (use when terminating the service).
   */
  public async closeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
        this.audioContext = null;
        logger.info('AudioContext closed.');
      } catch (error: any) {
        logger.error('Error closing AudioContext.', error);
      }
    }
  }
}

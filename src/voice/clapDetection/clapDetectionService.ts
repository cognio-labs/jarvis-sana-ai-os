// src/voice/clapDetection/clapDetectionService.ts

import logger from '@utils/logger';

interface ClapDetectionServiceOptions {
  minAmplitude?: number; // Minimum amplitude to consider a sound as a potential clap
  clapDurationMs?: number; // Max duration for a single clap sound
  clapGapMs?: number; // Max gap between two claps to be considered a double clap
  minGapBetweenDoubleClapsMs?: number; // Min time before detecting another double clap
  sampleRate?: number; // Audio sample rate
  bufferSize?: number; // Size of audio buffer for analysis
}

export class ClapDetectionService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isListening: boolean = false;
  private lastTimestamp: number = 0;
  private clapState: 'idle' | 'first_clap' | 'gap_detected' = 'idle';
  private doubleClapTimeout: any = null;
  private gapTimeout: any = null;

  private readonly options: Required<ClapDetectionServiceOptions>;
  private onDoubleClap: (() => void) | null = null;

  constructor(options?: ClapDetectionServiceOptions) {
    this.options = {
      minAmplitude: options?.minAmplitude ?? 0.6, // Adjust based on testing
      clapDurationMs: options?.clapDurationMs ?? 100, // Max duration of a single clap
      clapGapMs: options?.clapGapMs ?? 150, // Max gap between claps
      minGapBetweenDoubleClapsMs: options?.minGapBetweenDoubleClapsMs ?? 1000, // Cooldown after detection
      sampleRate: options?.sampleRate ?? 44100,
      bufferSize: options?.bufferSize ?? 2048,
    };
    logger.info('ClapDetectionService initialized.', { options: this.options });
  }

  /**
   * Starts listening for claps. Requires microphone access.
   * @param onDoubleClap Callback function when a double clap is detected.
   */
  public async start(onDoubleClap: () => void): Promise<void> {
    if (this.isListening) {
      logger.warn('Clap detection is already active.');
      return;
    }

    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      logger.error('getUserMedia is not supported in this browser. Cannot use microphone.');
      alert('Microphone access is required for clap detection.');
      return;
    }

    this.onDoubleClap = onDoubleClap;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: this.options.sampleRate });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.bufferSize;
      this.analyser.minDecibels = -60; // Sensitivity adjustment
      this.analyser.maxDecibels = 0;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.microphone = source; // Keep reference if needed
      this.isListening = true;
      logger.info('Clap detection started. Listening for double claps.');

      this.analyzeAudio(); // Start the analysis loop
    } catch (error: any) {
      logger.error('Error starting clap detection.', error);
      alert(`Failed to access microphone: ${error.message}. Please grant permissions.`);
      this.stop(); // Ensure cleanup if started partially
    }
  }

  /**
   * Stops listening for claps.
   */
  public stop(): void {
    if (!this.isListening) {
      return;
    }
    this.isListening = false;
    clearTimeout(this.doubleClapTimeout);
    clearTimeout(this.gapTimeout);
    this.clapState = 'idle';
    this.lastTimestamp = 0;

    if (this.analyser) {
      // Disconnect nodes and stop stream if possible
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.microphone) {
       // Stop microphone track if accessible
       const stream = this.microphone.mediaStream;
       if (stream) {
            stream.getTracks().forEach(track => track.stop());
       }
       this.microphone = null;
    }
    if (this.audioContext) {
      this.audioContext.close(); // Close AudioContext
      this.audioContext = null;
    }
    logger.info('Clap detection stopped.');
  }

  /**
   * Analyzes audio stream for clap patterns.
   */
  private analyzeAudio(): void {
    if (!this.isListening || !this.analyser) {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume or peak volume in the buffer
    let maxVolume = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxVolume) {
        maxVolume = dataArray[i];
      }
    }

    const amplitude = maxVolume / 255; // Normalize to 0-1

    const currentTime = performance.now();
    const timeSinceLastClap = currentTime - this.lastTimestamp;

    // --- Clap Detection Logic ---
    if (amplitude > this.options.minAmplitude) {
      // Potential clap detected
      if (this.clapState === 'idle') {
        // This is the first clap
        logger.debug('Potential first clap detected.', { amplitude, timeSinceLastClap });
        this.clapState = 'first_clap';
        this.lastTimestamp = currentTime;

        // If a clap is too long, reset state
        setTimeout(() => {
          if (this.clapState === 'first_clap') {
            logger.debug('First clap too long, resetting state.');
            this.resetClapState();
          }
        }, this.options.clapDurationMs);

      } else if (this.clapState === 'first_clap' && timeSinceLastClap < this.options.clapGapMs) {
        // This is the second clap within the allowed gap
        logger.info('Double clap detected!', { timeSinceLastClap });
        this.clapState = 'gap_detected'; // Transition to gap state to prevent immediate re-trigger
        this.lastTimestamp = currentTime;

        if (this.onDoubleClap) {
          this.onDoubleClap(); // Trigger the callback
        }

        // Start cooldown for detecting another double clap
        this.doubleClapTimeout = setTimeout(() => {
          this.resetClapState();
        }, this.options.minGapBetweenDoubleClapsMs);
      }
    } else if (this.clapState === 'first_clap' && timeSinceLastClap > this.options.clapGapMs) {
      // If gap is too large after first clap, reset
      logger.debug('Gap too large after first clap, resetting state.');
      this.resetClapState();
    }

    // Continually request animation frames for analysis
    requestAnimationFrame(() => this.analyzeAudio());
  }

  /**
   * Resets the clap detection state machine.
   */
  private resetClapState(): void {
    this.clapState = 'idle';
    this.lastTimestamp = 0;
    clearTimeout(this.gapTimeout); // Clear any scheduled resets
    logger.debug('Clap detection state reset.');
  }

  public isSupported(): boolean {
     // Check for necessary browser APIs
     return !!(window.AudioContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

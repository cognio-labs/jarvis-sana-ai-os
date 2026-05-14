// src/speech/speechSynthesisService.ts

import logger from '@utils/logger';

interface SpeechSynthesisServiceOptions {
  voiceName?: string; // Preferred voice name
  rate?: number; // Speech rate (0.1 to 10)
  pitch?: number; // Speech pitch (0 to 2)
  volume?: number; // Speech volume (0 to 1)
}

export class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private options: Required<SpeechSynthesisServiceOptions>;
  private isSpeaking: boolean = false;

  constructor(options?: SpeechSynthesisServiceOptions) {
    this.options = {
      voiceName: options?.voiceName || 'Google Deutsch' || 'Microsoft Zira - English (United States)' || 'Microsoft David - English (United States)', // Example voices, adjust based on platform availability
      rate: options?.rate ?? 1.0, // Default rate
      pitch: options?.pitch ?? 1.0, // Default pitch
      volume: options?.volume ?? 1.0, // Default volume
    };
    logger.info('SpeechSynthesisService initialized.', { options: this.options });

    // Check for SpeechSynthesis support
    if (!('speechSynthesis' in window)) {
      logger.error('SpeechSynthesis API is not supported in this browser.');
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    this.synth = window.speechSynthesis;
    this.loadVoices(); // Load available voices

    // Optionally, pause speech if page is hidden to save resources
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isSpeaking) {
        this.synth?.pause();
        logger.debug('Page hidden, pausing speech synthesis.');
      } else if (!document.hidden && this.isSpeaking) {
        this.synth?.resume();
        logger.debug('Page visible, resuming speech synthesis.');
      }
    });
  }

  /**
   * Loads available voices and updates the voice list.
   * Voices might not be available immediately, so we might need to wait.
   */
  private loadVoices(): void {
    this.voices = window.speechSynthesis.getVoices();

    if (this.voices.length === 0) {
      // Voices may not be available immediately, especially in some browsers.
      // We listen for the 'voiceschanged' event.
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
        logger.info(`Speech synthesis voices loaded (${this.voices.length} voices found).`);
        // Attempt to find the preferred voice after voices are loaded
        this.setPreferredVoice(this.options.voiceName);
      };
    } else {
      logger.info(`Speech synthesis voices loaded (${this.voices.length} voices found).`);
      this.setPreferredVoice(this.options.voiceName);
    }
  }

  /**
   * Sets the preferred voice for speech synthesis.
   * @param voiceName The name of the voice to use.
   */
  public setPreferredVoice(voiceName?: string): boolean {
    const targetVoiceName = voiceName || this.options.voiceName;
    if (!targetVoiceName) {
      logger.warn('No voice name provided or set. Using default system voice.');
      return false;
    }

    const voice = this.voices.find(v => v.name.toLowerCase().includes(targetVoiceName.toLowerCase()));
    if (voice) {
      this.options.voiceName = voice.name; // Update to the exact found name
      logger.info(`Preferred voice set to: ${this.options.voiceName}`);
      return true;
    } else {
      logger.warn(`Preferred voice "${targetVoiceName}" not found. Using default system voice.`);
      // Fallback to a common default if available, or just let the system use its default.
      // Example fallback: find a female voice if possible
      const femaleVoice = this.voices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('female') || name.includes('zira') || name.includes('ava');
      });
      if (femaleVoice) {
        this.options.voiceName = femaleVoice.name;
        logger.info(`Falling back to female voice: ${this.options.voiceName}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Speaks a given text using the configured voice and options.
   * @param text The text to speak.
   * @param onEnd Callback function when speech finishes.
   * @param onError Callback function on speech error.
   */
  public speak(text: string, onEnd?: () => void, onError?: (error: SpeechSynthesisErrorEvent) => void): void {
    if (!this.synth) {
      logger.error('SpeechSynthesis not available. Cannot speak.');
      onError?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
      return;
    }

    if (this.isSpeaking) {
      logger.warn('Speech synthesis is already in progress. Cancelling previous speech.');
      this.cancel(); // Cancel previous speech to start new one
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.options.rate;
    utterance.pitch = this.options.pitch;
    utterance.volume = this.options.volume;

    // Attempt to set the preferred voice
    const voice = this.voices.find(v => v.name === this.options.voiceName);
    if (voice) {
      utterance.voice = voice;
    } else {
      // If preferred voice not found, try to find a fallback (e.g., female voice)
      const fallbackVoice = this.voices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('female') || name.includes('zira') || name.includes('ava');
      });
      if (fallbackVoice) {
        utterance.voice = fallbackVoice;
        logger.debug(`Using fallback voice: ${fallbackVoice.name}`);
      } else {
        logger.warn(`Preferred voice "${this.options.voiceName}" not found. Using system default.`);
        // Keep utterance.voice as null to use system default
      }
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      logger.debug('Speech synthesis finished.');
      onEnd?.();
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      logger.error('Speech synthesis error.', event);
      onError?.(event);
    };

    utterance.onboundary = (event) => {
      // Useful for debugging, e.g. log word boundaries
      // logger.verbose(`Speech boundary: ${event.name} at char ${event.charIndex}`);
    };

    // Apply voice effects - Note: Native browser SpeechSynthesis has limited effects.
    // "Futuristic robotic effects" would typically require external audio processing libraries
    // or specific browser/OS voices that offer such effects. We'll simulate basic rate/pitch.
    // For true robotic effects, consider libraries like Web Audio API filters or custom voice models.

    this.synth.speak(utterance);
    this.isSpeaking = true;
    logger.info(`Speaking: "${text.substring(0, 100)}..."`);
  }

  /**
   * Pauses speech synthesis.
   */
  public pause(): void {
    if (this.isSpeaking && this.synth) {
      this.synth.pause();
      logger.debug('Speech synthesis paused.');
    }
  }

  /**
   * Resumes speech synthesis.
   */
  public resume(): void {
    if (this.isSpeaking && this.synth) {
      this.synth.resume();
      logger.debug('Speech synthesis resumed.');
    }
  }

  /**
   * Cancels speech synthesis and clears the queue.
   */
  public cancel(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      logger.info('Speech synthesis cancelled.');
    }
  }

  /**
   * Checks if speech synthesis is currently speaking.
   */
  public isSpeakingStatus(): boolean {
    // Check synth status for more accurate ongoing speech detection
    return this.isSpeaking || (this.synth?.speaking ?? false);
  }
}

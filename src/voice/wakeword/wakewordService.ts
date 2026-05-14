// src/voice/wakeword/wakewordService.ts

import logger from '@utils/logger';

interface WakewordServiceOptions {
  threshold?: number; // Sensitivity threshold for recognition
  continuous?: boolean; // Whether to listen continuously
  lang?: string; // Language for recognition (e.g., 'en-US')
}

export class WakewordService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private readonly wakewords: string[];
  private options: Required<WakewordServiceOptions>;
  private onActivate: ((keyword: string) => void) | null = null;

  constructor(wakewords: string[] = ['hey saniya', 'hey jarvis'], options?: WakewordServiceOptions) {
    this.wakewords = wakewords.map(kw => kw.toLowerCase());
    this.options = {
      threshold: options?.threshold ?? 0.7, // Default sensitivity
      continuous: options?.continuous ?? false,
      lang: options?.lang ?? 'en-US',
    };
    logger.info('WakewordService initialized.', { wakewords, options: this.options });

    // Check for SpeechRecognition support
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      logger.error('SpeechRecognition API is not supported in this browser.');
      // Optionally, provide fallback or throw error
      return;
    }

    // Initialize SpeechRecognition
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.recognition.continuous = this.options.continuous;
    this.recognition.lang = this.options.lang;
    this.recognition.interimResults = true; // Get interim results for faster feedback
    this.recognition.maxAlternatives = 3; // Get a few alternatives
    this.recognition.grammars = this.createGrammar(); // Set up grammar for specific keywords

    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);
    this.recognition.onstart = () => logger.debug('Wakeword recognition started.');
  }

  /**
   * Creates a SpeechRecognitionGrammarList for specific wakewords.
   */
  private createGrammar(): SpeechGrammarList {
    const speechRecognitionList = (window as any).SpeechRecognitionList || (window as any).webkitSpeechRecognitionList;
    const list = new speechRecognitionList();
    const grammar = `#JSGF V1.0; grammar keywords; public <keywords> = ${this.wakewords.join(' | ')} ;`;
    list.addFromString(grammar, 1);
    return list;
  }

  /**
   * Starts listening for wakewords.
   * @param onActivate Callback function when a wakeword is detected.
   */
  public start(onActivate: (keyword: string) => void): void {
    if (!this.recognition) {
      logger.error('SpeechRecognition not available. Cannot start wakeword listening.');
      return;
    }
    if (this.isListening) {
      logger.warn('Wakeword recognition is already active.');
      return;
    }
    this.onActivate = onActivate;
    try {
      this.recognition.start();
      this.isListening = true;
      logger.info(`Wakeword service started. Listening for: ${this.wakewords.join(', ')}`);
    } catch (error: any) {
      logger.error('Error starting wakeword recognition.', error);
      // Handle specific errors like microphone permissions denied
      if (error.name === 'securityError' || error.name === 'permissionDenied') {
        alert('Microphone access is required for voice activation. Please grant microphone permissions.');
      }
    }
  }

  /**
   * Stops listening for wakewords.
   */
  public stop(): void {
    if (!this.isListening || !this.recognition) {
      return;
    }
    this.recognition.stop();
    this.isListening = false;
    logger.info('Wakeword service stopped.');
  }

  /**
   * Handles the results from SpeechRecognition.
   */
  private handleResult(event: SpeechRecognitionEvent): void {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.toLowerCase(); // Get the most likely alternative

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }

      // Check if any of the detected phrases match our wakewords
      for (const wakeword of this.wakewords) {
        if (transcript.includes(wakeword)) {
          logger.info(`Wakeword detected: "${wakeword}" in "${transcript}"`);
          if (this.onActivate) {
            this.onActivate(wakeword);
          }
          // Optionally stop listening after activation if not continuous, or reset for next detection
          if (!this.options.continuous) {
            this.stop();
          }
          return; // Found a wakeword, no need to process further for this event
        }
      }
    }
    // Log interim results if helpful for debugging
    if (interimTranscript) {
      logger.verbose(`Wakeword interim: ${interimTranscript}`);
    }
  }

  /**
   * Handles errors during SpeechRecognition.
   */
  private handleError(event: SpeechRecognitionErrorEvent): void {
    logger.error(`Wakeword recognition error: ${event.error}`);
    this.isListening = false;
    // Handle specific errors, e.g., no-speech, network errors
    if (event.error === 'no-speech') {
      logger.warn('No speech detected. Please try again.');
      // Optionally re-start listening if continuous is true
      if (this.options.continuous) {
         setTimeout(() => this.start(this.onActivate!), 1000); // Restart after a delay
      }
    } else if (event.error === 'network') {
      logger.error('Network error during speech recognition. Please check your connection.');
      // Handle network issues
    } else {
      // Generic error, stop listening
      this.stop();
    }
  }

  /**
   * Handles the end of SpeechRecognition session.
   */
  private handleEnd(): void {
    logger.debug('Wakeword recognition session ended.');
    this.isListening = false;
    // Optionally restart listening if continuous mode is enabled and no error occurred
    if (this.options.continuous && this.onActivate) {
      logger.info('Restarting wakeword recognition in continuous mode.');
      // Use a timeout to avoid immediate restart loops if there's a persistent issue
      setTimeout(() => this.start(this.onActivate!), 2000);
    }
  }

  /**
   * Checks if the speech recognition API is available.
   */
  public isSupported(): boolean {
    return !!this.recognition;
  }
}

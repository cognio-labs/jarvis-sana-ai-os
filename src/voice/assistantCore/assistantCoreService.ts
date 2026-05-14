// src/voice/assistantCore/assistantCoreService.ts

import logger from '@utils/logger';
import { WakewordService } from '../wakeword/wakewordService';
import { ClapDetectionService } from '../clapDetection/clapDetectionService';
import { AudioService } from '../../audio/audioService';
import { SpeechSynthesisService } from '../../speech/speechSynthesisService';
import { UiService } from '../../ui/uiService'; // Assuming a UI service exists for updates
import { CommandHandler } from '../../commands/commandHandler'; // Assuming a command handler exists

// --- Configuration ---
const ASSISTANT_NAME = 'JARVIS SANA';
const OWNER_NAME = 'Aryan Boss'; // Example owner name

// Model settings primarily driven by AgentManager config
const AI_SETTINGS = {
  // Default models used by AgentManager, passed for context if needed
  primaryModel: process.env.OPENROUTER_PRIMARY_MODEL || 'openrouter/google/gemini-2.5-flash-preview',
  fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL || 'openrouter/meta-llama/llama-3.3-70b-instruct',
  backupModel: process.env.OPENROUTER_BACKUP_MODEL || 'openrouter/deepseek/deepseek-chat-v3',
  // Other AI relevant settings like timeouts etc. are handled by AgentManager
};

export enum AssistantState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  ACTIVATED = 'activated',
  ERROR = 'error',
}

export class AssistantCoreService {
  private state: AssistantState = AssistantState.IDLE;
  private wakewordService: WakewordService | null = null;
  private clapDetectionService: ClapDetectionService | null = null;
  private audioService: AudioService | null = null;
  private speechSynthesisService: SpeechSynthesisService | null = null;
  private uiService: UiService | null = null; // Reference to UI service
  private commandHandler: CommandHandler | null = null; // Reference to command handler

  private readonly wakewords: string[];
  private readonly activationTriggers: ('wakeword' | 'clap' | 'command')[];
  private availableCommands: string[] = []; // List of available voice commands

  constructor(
    wakewordService: WakewordService,
    clapDetectionService: ClapDetectionService,
    audioService: AudioService,
    speechSynthesisService: SpeechSynthesisService,
    uiService: UiService,
    commandHandler: CommandHandler
  ) {
    this.wakewordService = wakewordService;
    this.clapDetectionService = clapDetectionService;
    this.audioService = audioService;
    this.speechSynthesisService = speechSynthesisService;
    this.uiService = uiService;
    this.commandHandler = commandHandler;

    // Configure activation triggers based on user request and available services
    this.wakewords = ['hey saniya', 'hey jarvis']; // Specified wakewords
    this.activationTriggers = ['wakeword', 'clap', 'command']; // Explicitly listed triggers

    // Populate available commands from CommandHandler
    if (this.commandHandler) {
       this.availableCommands = this.commandHandler.getAvailableCommands();
    }

    logger.info('AssistantCoreService initialized.');
  }

  /**
   * Initializes all services and starts listening for activation triggers.
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing Assistant Core...');

    // Initialize all dependent services
    await this.audioService?.initialize(); // Preload sounds
    // Wakeword and Clap services start listening on demand upon activation trigger

    // Set initial state and update UI
    this.setState(AssistantState.IDLE);
    this.uiService?.updateStatus('Ready');
    this.uiService?.updateAvailableCommands(this.availableCommands);

    // Start listening for manual activation commands (e.g., "Activate System")
    // This might be handled by a general input listener or command handler.
    // For now, speech activation covers the primary triggers.

    // Example: Play startup sound on core initialization
    this.audioService?.playStartupSound();
    this.speak(`Welcome back ${OWNER_NAME}. ${ASSISTANT_NAME} systems online.`);
  }

  /**
   * Activates the assistant.
   * @param trigger The method of activation (wakeword, clap, command).
   */
  public async activate(trigger: 'wakeword' | 'clap' | 'command', detectedKeyword?: string): Promise<void> {
    if (this.state === AssistantState.ACTIVATED || this.state === AssistantState.LISTENING || this.state === AssistantState.PROCESSING) {
      logger.debug(`Assistant already active or listening. Current state: ${this.state}. Ignoring activation.`);
      return;
    }

    logger.info(`Assistant activation requested via: ${trigger}`);
    this.setState(AssistantState.ACTIVATED);
    this.uiService?.updateStatus('Activated');

    // Play activation sound and greeting
    await this.audioService?.playActivationSound();

    // Greeting message
    const welcomeMessage = this.generateGreeting();
    await this.speak(welcomeMessage);

    // Start continuous listening for voice commands after activation
    this.startVoiceListening();

    // If activated by a specific command (e.g., "Activate System"), process it
    if (trigger === 'command' && detectedKeyword) {
      this.processVoiceCommand(detectedKeyword);
    }
  }

  /**
   * Generates a dynamic greeting message.
   */
  private generateGreeting(): string {
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = '';
    if (hour < 12) timeOfDay = 'Good morning';
    else if (hour < 18) timeOfDay = 'Good afternoon';
    else timeOfDay = 'Good evening';

    const messages = [
      `${timeOfDay} ${OWNER_NAME}. ${ASSISTANT_NAME} systems online.`,
      `Welcome back ${OWNER_NAME}. Awaiting your command.`,
      `Voice systems activated. How can I assist you, ${OWNER_NAME}?`,
      `${ASSISTANT_NAME} ready.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Starts listening for voice commands after activation.
   */
  private startVoiceListening(): void {
    if (!this.wakewordService || !this.clapDetectionService) {
      logger.error('Core services not initialized. Cannot start voice listening.');
      this.setState(AssistantState.ERROR);
      return;
    }

    // Re-initialize recognition if needed, or ensure services are listening
    // Wakeword service handles its own start/stop and continuous listening logic
    // Clap detection needs to be started whenever voice listening is active
    this.clapDetectionService.start(() => {
       logger.info('Double clap detected during voice listening.');
       // Optionally trigger activation again or handle as a specific command
       this.activate('clap'); // Re-activate or confirm
    }).catch(err => logger.error('Failed to start clap detection.', err));


    // Ensure wakeword service is listening continuously if set
    // In a typical flow, wakeword service might stop after activation,
    // and a different speech recognition instance is used for commands.
    // For simplicity here, we assume wakeword service can continue listening or is replaced.

    // We need a separate SpeechRecognition instance for general commands
    // Let's use a placeholder for now and assume CommandHandler deals with it.
    logger.info('Voice command listening started.');
    this.setState(AssistantState.LISTENING);
    this.uiService?.updateStatus('Listening...');

    // Example: Use SpeechRecognition for command input
    // This part requires a robust SpeechRecognition setup for commands,
    // potentially different from the wakeword instance.
    // Let's simulate it by assuming 'commandHandler.processSpeechInput' handles it.
  }

  /**
   * Processes a recognized voice command.
   * @param commandText The recognized command text.
   */
  public processVoiceCommand(commandText: string): void {
    if (!this.commandHandler) {
      logger.error('Command handler not available.');
      this.speak('I am unable to process commands currently.');
      return;
    }

    logger.info(`Processing voice command: "${commandText}"`);
    this.setState(AssistantState.PROCESSING);
    this.uiService?.updateStatus(`Processing: ${commandText}`);

    try {
      const commandResult = this.commandHandler.execute(commandText);

      if (commandResult && commandResult.response) {
        this.speak(commandResult.response);
        this.uiService?.updateStatus(`Command executed: ${commandText}`);
      } else {
        this.speak(`Command "${commandText}" executed, but I have no response to provide.`);
      }
    } catch (error: any) {
      logger.error(`Error executing voice command "${commandText}".`, { error });
      this.speak(`I encountered an error while trying to execute "${commandText}". ${error.message}`);
      this.setState(AssistantState.ERROR);
      this.uiService?.updateStatus('Error processing command.');
    } finally {
      // Return to listening state after processing, unless it's a command that deactivates
       if (commandText.toLowerCase().includes('shutdown') || commandText.toLowerCase().includes('deactivate')) {
           this.deactivate();
       } else {
           this.setState(AssistantState.LISTENING); // Back to listening for next command
           this.uiService?.updateStatus('Listening...');
       }
    }
  }

  /**
   * Speaks a text message using the SpeechSynthesisService.
   * @param text The message to speak.
   */
  public async speak(text: string): Promise<void> {
    if (!this.speechSynthesisService) {
      logger.error('Speech synthesis service not available.');
      return;
    }
    this.setState(AssistantState.SPEAKING);
    this.uiService?.updateStatus('Speaking...');

    return new Promise((resolve) => {
      this.speechSynthesisService?.speak(
        text,
        () => {
          // Speech finished
          this.setState(this.state === AssistantState.SPEAKING ? AssistantState.LISTENING : this.state); // Return to previous state, usually LISTENING
          this.uiService?.updateStatus(this.state === AssistantState.LISTENING ? 'Listening...' : this.state);
          resolve();
        },
        (error) => {
          // Speech error
          this.setState(AssistantState.ERROR);
          this.uiService?.updateStatus('Speech error.');
          logger.error('Speech synthesis failed.', error);
          resolve(); // Resolve even on error to prevent blocking
        }
      );
    });
  }

  /**
   * Deactivates the assistant and stops all listening services.
   */
  public deactivate(): void {
    logger.info('Deactivating assistant.');
    this.setState(AssistantState.IDLE);
    this.uiService?.updateStatus('Idle');

    this.wakewordService?.stop();
    this.clapDetectionService?.stop();
    // Stop general command listening if a separate instance is used
    // e.g., speechRecognizerForCommands?.stop();

    this.audioService?.stopAllSounds();
    this.speechSynthesisService?.cancel(); // Ensure any ongoing speech is stopped

    logger.info('Assistant deactivated. Services stopped.');
  }

  /**
   * Sets the current state of the assistant and updates UI.
   */
  private setState(newState: AssistantState): void {
    if (this.state !== newState) {
      this.state = newState;
      logger.debug(`Assistant state changed to: ${this.state}`);
      this.uiService?.updateAssistantState(this.state); // Update UI with new state
    }
  }

  /**
   * Starts the core listening loop for activation triggers.
   */
  public startListeningForActivation(): void {
     logger.info('Starting listening for activation triggers...');

     // Request microphone permissions upfront if not already granted
     navigator.mediaDevices.getUserMedia({ audio: true })
       .then((stream) => {
         stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just need permission

         // Start Wakeword service
         if (this.wakewordService?.isSupported()) {
            this.wakewordService.start((keyword) => {
               logger.info(`Wakeword "${keyword}" detected.`);
               this.activate('wakeword', keyword).catch(err => logger.error('Error during activation after wakeword.', err));
            });
         } else {
            logger.warn('Wakeword service is not supported or initialized.');
         }

         // Clap detection will be started upon activation or during voice listening

         logger.info('Microphone permissions granted. Ready for activation.');
       })
       .catch((err) => {
         logger.error('Microphone permission denied or error occurred.', err);
         alert('Microphone access is required for Jarvis SANA voice features. Please grant permissions in your browser settings.');
         this.setState(AssistantState.ERROR);
         this.uiService?.updateStatus('Microphone access denied.');
       });
  }

  // Example method to handle command input from UI or other sources
  public handleInput(input: string, type: 'text' | 'voice' | 'clap' = 'text'): void {
      if (type === 'text' || type === 'command') {
          // Process text commands directly
          this.processVoiceCommand(input);
      } else if (type === 'voice') {
          // Assume input is speech, process it as a command
          this.processVoiceCommand(input);
      } else if (type === 'clap') {
          // Handle clap activation
          this.activate('clap');
      }
  }
}

// Helper to create placeholder services if not provided in constructor
// This allows the core to be instantiated even if UI/Command parts aren't fully ready
function createPlaceholderService(name: string, instance: any) {
   if (!instance) {
      logger.warn(`Placeholder service created for: ${name}. Real implementation needed.`);
      // Return a dummy object with mock methods
      return {
         initialize: async () => {},
         start: () => {},
         stop: () => {},
         speak: async (text: string) => console.log(`[${name} - SPEAKING]: ${text}`),
         updateStatus: (status: string) => {},
         updateAssistantState: (state: AssistantState) => {},
         getAvailableCommands: () => [],
         execute: (command: string) => ({ response: `[${name} mock response] ${command}` }),
         // Add other methods as needed
      };
   }
   return instance;
}

// --- Initialization ---
// This part assumes services are instantiated elsewhere and passed to the constructor.
// Example of how you might instantiate and pass them:

/*
// In your main application setup (e.g., _app.tsx or main.tsx)
import { WakewordService } from './voice/wakeword/wakewordService';
import { ClapDetectionService } from './voice/clapDetection/clapDetectionService';
import { AudioService } from './audio/audioService';
import { SpeechSynthesisService } from './speech/speechSynthesisService';
import { UiService } from './ui/uiService'; // Create UiService
import { CommandHandler } from './commands/commandHandler'; // Create CommandHandler

const wakewordService = new WakewordService();
const clapDetectionService = new ClapDetectionService();
const audioService = new AudioService();
const speechSynthesisService = new SpeechSynthesisService();
const uiService = new UiService(); // Instantiate your UI service
const commandHandler = new CommandHandler(); // Instantiate your Command Handler

// Ensure all services are initialized before passing to AssistantCoreService
await audioService.initialize();
// Wakeword and Clap services start listening on demand

const assistantCore = new AssistantCoreService(
  wakewordService,
  clapDetectionService,
  audioService,
  speechSynthesisService,
  uiService,
  commandHandler
);

// Start the listening loop
assistantCore.startListeningForActivation();
*/

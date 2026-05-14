// src/commands/commandHandler.ts

import logger from '@utils/logger';
import { AntigravtyService } from '@services/antigravty.service'; // For AI processing
import { AiAgentManager } from '@agents/aiAgentManager'; // For agent orchestration
import { UiService } from '../ui/uiService'; // For UI updates
import { AudioService } from '../audio/audioService'; // For sound effects
import { SpeechSynthesisService } from '../speech/speechSynthesisService'; // For speaking responses
import { AssistantCoreService, AssistantState } from '../voice/assistantCore/assistantCoreService'; // For assistant control

interface CommandResult {
  response: string; // Text response to speak back to the user
  state?: AssistantState; // Optional: change assistant state
  effects?: (() => void)[]; // Optional: side effects to perform (e.g., sound playback)
}

export class CommandHandler {
  private antigravtyService: AntigravtyService;
  private aiAgentManager: AiAgentManager;
  private uiService: UiService;
  private audioService: AudioService;
  private speechSynthesisService: SpeechSynthesisService;
  private assistantCoreService: AssistantCoreService;

  private availableCommands: { [key: string]: (args?: string[]) => CommandResult } = {};

  constructor(
    antigravtyService: AntigravtyService,
    aiAgentManager: AiAgentManager,
    uiService: UiService,
    audioService: AudioService,
    speechSynthesisService: SpeechSynthesisService,
    assistantCoreService: AssistantCoreService
  ) {
    this.antigravtyService = antigravtyService;
    this.aiAgentManager = aiAgentManager;
    this.uiService = uiService;
    this.audioService = audioService;
    this.speechSynthesisService = speechSynthesisService;
    this.assistantCoreService = assistantCoreService;

    this.initializeCommands();
    logger.info('CommandHandler initialized.');
  }

  /**
   * Initializes the map of available commands.
   */
  private initializeCommands(): void {
    this.availableCommands = {
      // System Commands
      'system status': this.handleSystemStatus.bind(this),
      'shutdown system': this.handleShutdownSystem.bind(this),
      'activate hacker mode': this.handleHackerMode.bind(this), // Example of a "mode" command

      // Navigation & UI Commands
      'open dashboard': this.handleOpenDashboard.bind(this),
      'show logs': this.handleShowLogs.bind(this),

      // AI & Agent Commands
      'run AI agent': this.handleRunAIAgent.bind(this),
      'search web': this.handleWebSearch.bind(this),
      'ask AI': this.handleAskAI.bind(this), // Generic AI query
      'process task': this.handleProcessTask.bind(this), // Example for background tasks

      // Audio Commands
      'play startup sound': this.handlePlayStartupSound.bind(this),
      'play activation sound': this.handlePlayActivationSound.bind(this),
      'play ambient sound': this.handlePlayAmbientSound.bind(this),
      'stop sounds': this.handleStopSounds.bind(this),

      // Example for specific agent interaction
      'send message': this.handleSendMessage.bind(this),
    };
    logger.info(`Initialized ${Object.keys(this.availableCommands).length} commands.`);
  }

  /**
   * Returns a list of available command keywords.
   */
  public getAvailableCommands(): string[] {
    return Object.keys(this.availableCommands);
  }

  /**
   * Executes a command based on the input text.
   * @param inputText The raw command string recognized from speech or text.
   * @returns A CommandResult object.
   */
  public execute(inputText: string): CommandResult {
    const lowerCaseInput = inputText.toLowerCase().trim();
    logger.info(`Executing command: "${lowerCaseInput}"`);

    for (const command in this.availableCommands) {
      if (lowerCaseInput.startsWith(command)) {
        const args = lowerCaseInput.substring(command.length).trim().split(' ');
        try {
          const result = this.availableCommands[command](args);
          logger.info(`Command "${command}" executed successfully.`);
          return result;
        } catch (error: any) {
          logger.error(`Error executing command "${command}": ${error.message}`, error);
          return {
            response: `I encountered an error while trying to execute that command. ${error.message}`,
            state: AssistantState.ERROR,
            effects: [() => this.uiService.updateStatus('Command execution failed.')],
          };
        }
      }
    }

    // If no command matches
    logger.warn(`Unknown command received: "${inputText}"`);
    return {
      response: `Sorry, I don't recognize the command "${inputText}".`,
      state: AssistantState.LISTENING,
      effects: [() => this.uiService.updateStatus('Unknown command.')],
    };
  }

  // --- Command Handler Methods ---

  private handleSystemStatus(args?: string[]): CommandResult {
    // Placeholder: Implement actual system status check
    return { response: 'System status is currently nominal.', state: AssistantState.LISTENING };
  }

  private handleShutdownSystem(args?: string[]): CommandResult {
    // This would typically trigger a confirmation or a graceful shutdown process
    return { response: 'Shutting down JARVIS SANA. Goodbye.', state: AssistantState.IDLE, effects: [() => this.assistantCoreService.deactivate()] };
  }

  private handleHackerMode(args?: string[]): CommandResult {
    // Example command: activate a special mode
    return { response: 'Hacker mode activated. Proceed with caution.', state: AssistantState.LISTENING };
  }

  private handleOpenDashboard(args?: string[]): CommandResult {
    // This command would ideally trigger navigation or UI changes.
    // For now, it returns a textual response. In a React app, you'd likely use React Router or similar.
    return { response: 'Opening the main dashboard.', effects: [() => this.uiService.updateStatus('Opening Dashboard...')] };
  }

  private handleShowLogs(args?: string[]): CommandResult {
    // This would trigger a UI action to display logs
    return { response: 'Displaying live logs.', effects: [() => this.uiService.updateStatus('Showing logs...')] };
  }

  private handleRunAIAgent(args?: string[]): CommandResult {
    const agentName = args?.[0] || 'default'; // Example: "run AI agent chat"
    const prompt = args?.slice(1).join(' ') || '';

    // This would trigger agent orchestration logic
    return { response: `Initiating AI agent: ${agentName}.`, state: AssistantState.PROCESSING };
  }

  private handleWebSearch(args?: string[]): CommandResult {
    const query = args?.join(' ') || '';
    if (!query) return { response: 'Please specify what you want to search for.', state: AssistantState.LISTENING };

    // Trigger web search via AntigravtyService or a dedicated search module
    // Example: this.antigravtyService.performWebSearch(query);
    return { response: `Searching the web for: ${query}`, state: AssistantState.PROCESSING };
  }

  private handleAskAI(args?: string[]): CommandResult {
    const question = args?.join(' ') || '';
    if (!question) return { response: 'Please ask me something.', state: AssistantState.LISTENING };

    // Use AntigravtyService to process the query
    this.antigravtyService.sendMessage(question).then(response => {
      // Response from AI might be streamed or final. Handle accordingly.
      this.speak(response.message); // Speak the AI's response
       this.uiService.updateStatus(response.status === 'success' ? 'AI Responded' : 'AI Error');
    }).catch(error => {
      logger.error('Error asking AI:', error);
      this.speak('I could not get a response from the AI.');
      this.uiService.updateStatus('AI request failed');
    });

    return { response: 'Thinking...', state: AssistantState.PROCESSING }; // Initial response
  }

  private handleProcessTask(args?: string[]): CommandResult {
    const taskDetails = args?.join(' ') || 'default task';
    // Trigger the asynchronous task system
    this.antigravtyService.enqueueAsyncTask({ task: taskDetails, type: 'voice_command' }).then(result => {
      if (result.success) {
        this.speak(`Task "${taskDetails}" has been enqueued. I will process it in the background.`);
        this.uiService.updateStatus('Task enqueued.');
      } else {
        this.speak(`Failed to enqueue task "${taskDetails}".`);
        this.uiService.updateStatus('Task enqueue failed.');
      }
    });
    return { response: 'Enqueuing task...', state: AssistantState.PROCESSING };
  }

  private handlePlayStartupSound(args?: string[]): CommandResult {
    this.audioService.playStartupSound();
    return { response: 'Playing startup sound.' };
  }

  private handlePlayActivationSound(args?: string[]): CommandResult {
    this.audioService.playActivationSound();
    return { response: 'Playing activation sound.' };
  }

  private handlePlayAmbientSound(args?: string[]): CommandResult {
    this.audioService.playAmbientSound();
    return { response: 'Playing ambient futuristic sound.' };
  }

  private handleStopSounds(args?: string[]): CommandResult {
    this.audioService.stopAllSounds();
    return { response: 'All sounds stopped.' };
  }

  private handleSendMessage(args?: string[]): CommandResult {
    // Example: "send message to Aryan 'hello there'"
    const recipient = args?.[0] || 'default'; // e.g., 'Aryan'
    const messageContent = args?.slice(1).join(' ') || '';

    if (!messageContent) return { response: 'Please specify the message content.', state: AssistantState.LISTENING };

    // Placeholder for sending messages (e.g., through a messaging service or agent communication)
    return { response: `Sending message to ${recipient}: "${messageContent}"`, state: AssistantState.PROCESSING };
  }

  // Add more command handlers as needed...
}

// Example usage (instantiation would happen in the main setup file):
/*
// Assuming services are initialized and available
const commandHandler = new CommandHandler(
  antigravtyService,
  aiAgentManager,
  uiService,
  audioService,
  speechSynthesisService,
  assistantCoreService
);
// Then pass commandHandler instance to AssistantCoreService constructor
*/

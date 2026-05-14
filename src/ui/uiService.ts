// src/ui/uiService.ts

import logger from '@utils/logger';
import { AssistantState } from '../voice/assistantCore/assistantCoreService'; // Import state enum

export class UiService {
  private listeners: Set<Function> = new Set(); // Callbacks for UI updates

  constructor() {
    logger.info('UiService initialized.');
  }

  /**
   * Subscribe a UI component or function to receive updates.
   * @param listener Callback function to be called on update.
   */
  public subscribe(listener: Function): void {
    this.listeners.add(listener);
    logger.debug(`UI listener subscribed. Total listeners: ${this.listeners.size}`);
  }

  /**
   * Unsubscribe a listener.
   * @param listener Callback function to remove.
   */
  public unsubscribe(listener: Function): void {
    this.listeners.delete(listener);
    logger.debug(`UI listener unsubscribed. Total listeners: ${this.listeners.size}`);
  }

  /**
   * Notify all subscribed listeners about an update.
   * @param update Payload containing update information.
   */
  private notify(update: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        logger.error('Error notifying UI listener.', error);
      }
    });
  }

  /**
   * Updates the overall status message displayed in the UI.
   * @param status The new status string (e.g., "Listening...", "Processing...").
   */
  public updateStatus(status: string): void {
    logger.info(`UI Status Update: ${status}`);
    this.notify({ type: 'status', payload: status });
  }

  /**
   * Updates the current state of the AI assistant (e.g., IDLE, LISTENING, SPEAKING).
   * @param state The new AssistantState.
   */
  public updateAssistantState(state: AssistantState): void {
    logger.debug(`UI Assistant State Update: ${state}`);
    this.notify({ type: 'assistantState', payload: state });
  }

  /**
   * Updates the list of available commands the AI can process.
   * @param commands Array of command strings.
   */
  public updateAvailableCommands(commands: string[]): void {
    logger.debug(`UI Available Commands Update: ${commands.join(', ')}`);
    this.notify({ type: 'availableCommands', payload: commands });
  }

  /**
   * Updates the UI with a new message from the AI or system.
   * @param message The message content.
   * @param sender The sender of the message (e.g., 'AI', 'System').
   */
  public displayMessage(message: string, sender: string = 'AI'): void {
    logger.info(`UI Message Display: [${sender}] ${message.substring(0, 100)}...`);
    this.notify({ type: 'message', payload: { message, sender } });
  }

  /**
   * Updates the UI with processing status (e.g., "sending", "success", "failed").
   * @param processingStatus The status of the current operation.
   * @param details Additional details about the processing status.
   */
  public updateProcessingStatus(processingStatus: string, details?: any): void {
    logger.debug(`UI Processing Status Update: ${processingStatus}`, details);
    this.notify({ type: 'processingStatus', payload: { status: processingStatus, details } });
  }

  // Add more methods here to update specific UI elements (e.g., voice activity, animations)
}

// Example initialization (assuming it's instantiated somewhere globally or passed down)
// const uiService = new UiService();

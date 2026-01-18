'use client';

import { AGORA_APP_ID } from './agoraConfig';
import type { GameMessage } from './gameTypes';

// RTM SDK types (dynamically imported)
type RTMClient = {
  login: (options: { token?: string }) => Promise<void>;
  logout: () => Promise<void>;
  subscribe: (channelName: string, options?: { withMessage?: boolean }) => Promise<void>;
  unsubscribe: (channelName: string) => Promise<void>;
  publish: (channelName: string, message: string, options?: { channelType?: string }) => Promise<void>;
  addEventListener: (event: string, callback: (event: unknown) => void) => void;
  removeEventListener: (event: string, callback: (event: unknown) => void) => void;
};

type RTMModule = {
  default: {
    RTM: new (appId: string, userId: string) => RTMClient;
  };
};

// Message event from RTM
interface RTMMessageEvent {
  channelName: string;
  channelType: string;
  message: string;
  publisher: string;
  messageType: string;
}

export type MessageHandler = (message: GameMessage, fromUserId: string) => void;

export class RTMManager {
  private client: RTMClient | null = null;
  private currentChannel: string | null = null;
  private messageHandler: MessageHandler | null = null;
  private boundMessageListener: ((event: unknown) => void) | null = null;
  private userId: string | null = null;

  // Load RTM SDK dynamically
  private async loadRTM(userId: string): Promise<RTMClient> {
    const module = (await import('agora-rtm-sdk')) as unknown as RTMModule;
    const RTM = module.default.RTM;
    return new RTM(AGORA_APP_ID, userId);
  }

  // Connect to RTM network
  async login(userId: number): Promise<void> {
    const userIdStr = userId.toString();
    this.userId = userIdStr;

    // Clean up existing client if any
    if (this.client) {
      try {
        await this.logout();
      } catch (e) {
        console.warn('[RTM] Cleanup error (ignored):', e);
      }
    }

    this.client = await this.loadRTM(userIdStr);

    // Set up message listener
    this.boundMessageListener = (event: unknown) => {
      this.handleMessageEvent(event as RTMMessageEvent);
    };
    this.client.addEventListener('message', this.boundMessageListener);

    // Login without token (for testing/development)
    // In production, you'd generate a token server-side
    await this.client.login({ token: undefined });
    console.log('[RTM] Logged in as:', userIdStr);
  }

  // Subscribe to a channel
  async subscribe(channelName: string): Promise<void> {
    if (!this.client) {
      throw new Error('RTM client not initialized. Call login() first.');
    }

    // Unsubscribe from previous channel if any
    if (this.currentChannel && this.currentChannel !== channelName) {
      try {
        await this.client.unsubscribe(this.currentChannel);
      } catch (e) {
        console.warn('[RTM] Unsubscribe error (ignored):', e);
      }
    }

    await this.client.subscribe(channelName, { withMessage: true });
    this.currentChannel = channelName;
    console.log('[RTM] Subscribed to channel:', channelName);
  }

  // Publish a message to the current channel
  async publish(message: GameMessage): Promise<void> {
    if (!this.client || !this.currentChannel) {
      console.warn('[RTM] Cannot publish: not connected to a channel');
      return;
    }

    try {
      const jsonStr = JSON.stringify(message);
      await this.client.publish(this.currentChannel, jsonStr, { channelType: 'MESSAGE' });
      console.log('[RTM] Published message:', message.type);
    } catch (error) {
      console.error('[RTM] Publish error:', error);
    }
  }

  // Register a message handler
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  // Handle incoming message events
  private handleMessageEvent(event: RTMMessageEvent): void {
    if (!this.messageHandler) return;
    if (event.channelName !== this.currentChannel) return;

    try {
      const message = JSON.parse(event.message) as GameMessage;
      console.log('[RTM] Received message:', message.type, 'from:', event.publisher);
      this.messageHandler(message, event.publisher);
    } catch (error) {
      console.error('[RTM] Failed to parse message:', error);
    }
  }

  // Disconnect from RTM
  async logout(): Promise<void> {
    if (!this.client) return;

    // Remove event listener
    if (this.boundMessageListener) {
      this.client.removeEventListener('message', this.boundMessageListener);
      this.boundMessageListener = null;
    }

    // Unsubscribe from channel
    if (this.currentChannel) {
      try {
        await this.client.unsubscribe(this.currentChannel);
      } catch (e) {
        console.warn('[RTM] Unsubscribe error (ignored):', e);
      }
      this.currentChannel = null;
    }

    // Logout
    try {
      await this.client.logout();
    } catch (e) {
      console.warn('[RTM] Logout error (ignored):', e);
    }

    this.client = null;
    this.userId = null;
    this.messageHandler = null;
    console.log('[RTM] Logged out');
  }

  // Check if connected
  isConnected(): boolean {
    return this.client !== null && this.currentChannel !== null;
  }

  // Get current user ID
  getUserId(): string | null {
    return this.userId;
  }
}

// Singleton instance
let rtmManagerInstance: RTMManager | null = null;

export function getRTMManager(): RTMManager {
  if (!rtmManagerInstance) {
    rtmManagerInstance = new RTMManager();
  }
  return rtmManagerInstance;
}

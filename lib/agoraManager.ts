'use client';

import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
  AGORA_APP_ID,
  CHANNEL_PREFIX,
  QUICK_MATCH_CHANNEL,
  FACE_COLORS,
  SECRET_WORDS,
  generateRoomCode,
  channelName,
} from './agoraConfig';
import {
  RoomState,
  Player,
  GameMessage,
  createRoomState,
  addPlayer,
  removePlayer,
  nextAvailableSlot,
} from './gameTypes';
import { getRTMManager, RTMManager } from './rtmManager';

// Event types for state changes
export type AgoraEvent =
  | { type: 'connected'; roomState: RoomState }
  | { type: 'disconnected' }
  | { type: 'error'; message: string }
  | { type: 'playerJoined'; player: Player }
  | { type: 'playerLeft'; userId: number }
  | { type: 'gameStarted'; secretWord: string; imposterUserId: number }
  | { type: 'stateSync'; state: Partial<RoomState> }
  | { type: 'volumeUpdate'; volumes: Map<number, number> };

// Dynamically imported AgoraRTC module
let AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;

export class AgoraManager {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private rtmManager: RTMManager; // RTM for messaging
  private localPlayerName = '';
  private localFaceColorHex = '';
  private isHosting = false;
  private isQuickMatching = false;
  private isConnecting = false; // Prevent multiple simultaneous connection attempts
  private allConnectedUIDs = new Set<number>();
  private roomState: RoomState | null = null;
  private listeners: ((event: AgoraEvent) => void)[] = [];
  private volumeIntervalId: number | null = null;
  private playerVolumes = new Map<number, number>();
  private dataStreamId: number | null = null;

  constructor() {
    // Initialize RTM manager
    this.rtmManager = getRTMManager();
  }

  // Load AgoraRTC dynamically
  private async loadAgora() {
    if (!AgoraRTC) {
      const module = await import('agora-rtc-sdk-ng');
      AgoraRTC = module.default;
      AgoraRTC.setLogLevel(3); // Warnings only
    }
    return AgoraRTC;
  }

  // Subscribe to state changes
  subscribe(listener: (event: AgoraEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: AgoraEvent) {
    this.listeners.forEach(l => l(event));
  }

  getRoomState(): RoomState | null {
    return this.roomState;
  }

  getPlayerVolumes(): Map<number, number> {
    return new Map(this.playerVolumes);
  }

  // Initialize Agora client
  private async initClient() {
    // If client exists, always destroy it and create fresh
    if (this.client) {
      console.log('Cleaning up existing client...');
      try {
        // Remove all event listeners first
        this.client.removeAllListeners();

        const state = (this.client as unknown as { connectionState: string }).connectionState;
        console.log('Client state before cleanup:', state);

        if (state === 'CONNECTED' || state === 'CONNECTING') {
          await this.client.leave();
          // Wait a moment for state to settle
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.log('Cleanup error (ignored):', e);
      }
      this.client = null;
    }

    const agora = await this.loadAgora();
    this.client = agora.createClient({
      mode: 'rtc',
      codec: 'vp8',
    });

    // Set up event handlers
    this.client.on('user-published', async (user, mediaType) => {
      await this.client!.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        user.audioTrack?.stop();
      }
    });

    this.client.on('user-joined', (user) => {
      const uid = user.uid as number;
      console.log('[Agora] user-joined:', uid);
      this.playerVolumes.set(uid, 0);

      if (this.isQuickMatching) {
        this.allConnectedUIDs.add(uid);
        this.recalculateQuickMatchHost();
      }

      // Add placeholder player for ALL modes (including Quick Match)
      // This ensures cross-platform players appear even without data stream sync
      if (this.roomState) {
        const existingPlayer = this.roomState.players.find(p => p.id === uid);
        if (!existingPlayer) {
          const slot = nextAvailableSlot(this.roomState);
          if (slot !== null) {
            const colorHex = FACE_COLORS[slot % FACE_COLORS.length];
            const player: Player = {
              id: uid,
              slotIndex: slot,
              name: `Player ${slot + 1}`, // Placeholder name until sync
              isConnected: true,
              faceColorHex: colorHex,
            };
            console.log('[Agora] Adding placeholder player:', player);
            this.roomState = addPlayer(this.roomState, player);
            this.emit({ type: 'playerJoined', player });

            // If we're the host, broadcast state sync
            if (this.roomState.hostUserId === this.roomState.localUserId) {
              this.sendStateSync();
            }
          }
        }
      }

      // Check auto-start AFTER adding the player
      if (this.isQuickMatching) {
        this.checkAutoStartQuickMatch();
      }
    });

    this.client.on('user-left', (user) => {
      const uid = user.uid as number;
      console.log('[Agora] user-left:', uid);
      this.playerVolumes.delete(uid);

      if (this.roomState) {
        this.roomState = removePlayer(this.roomState, uid);
        this.emit({ type: 'playerLeft', userId: uid });
      }

      if (this.isQuickMatching) {
        this.allConnectedUIDs.delete(uid);
        this.recalculateQuickMatchHost();
      }

      // Broadcast player left via RTM
      this.sendMessage({ type: 'playerLeft', userId: uid });
    });

    // Listen for data stream messages (for cross-platform with iOS)
    this.client.on('stream-message', (uid: number, data: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(data);
        const message = JSON.parse(jsonStr) as GameMessage;
        console.log('[Agora] Received data stream message:', message.type, 'from:', uid);
        this.handleIncomingMessage(message, uid);
      } catch (e) {
        console.error('[Agora] Failed to parse data stream message:', e);
      }
    });

    // Start volume monitoring
    this.startVolumeMonitoring();
  }

  // Set up RTM message handler
  private setupRTMMessageHandler(): void {
    this.rtmManager.onMessage((message: GameMessage, fromUserId: string) => {
      this.handleIncomingMessage(message, parseInt(fromUserId, 10));
    });
  }

  private startVolumeMonitoring() {
    if (this.volumeIntervalId) return;

    this.volumeIntervalId = window.setInterval(() => {
      if (!this.client || !this.roomState) return;

      const newVolumes = new Map<number, number>();

      // Get local volume
      if (this.localAudioTrack) {
        const localLevel = this.localAudioTrack.getVolumeLevel();
        newVolumes.set(this.roomState.localUserId, localLevel);
      }

      // Get remote volumes
      this.client.remoteUsers.forEach(user => {
        const audioTrack = user.audioTrack;
        if (audioTrack) {
          newVolumes.set(user.uid as number, audioTrack.getVolumeLevel());
        }
      });

      // Apply smoothing for silent players
      this.playerVolumes.forEach((_, uid) => {
        if (!newVolumes.has(uid)) {
          const current = this.playerVolumes.get(uid) || 0;
          newVolumes.set(uid, current * 0.7);
        }
      });

      this.playerVolumes = newVolumes;
      this.emit({ type: 'volumeUpdate', volumes: newVolumes });
    }, 100);
  }

  private stopVolumeMonitoring() {
    if (this.volumeIntervalId) {
      clearInterval(this.volumeIntervalId);
      this.volumeIntervalId = null;
    }
  }

  // Create a new room as host
  async createRoom(playerName: string): Promise<string> {
    // Prevent multiple simultaneous connection attempts (idempotent for React Strict Mode)
    if (this.isConnecting) {
      console.warn('[Agora] createRoom called while already connecting, ignoring duplicate call');
      // Return existing room code if available, otherwise wait for connection
      return this.roomState?.roomCode || 'WAIT';
    }
    this.isConnecting = true;

    try {
      await this.initClient();
    } catch (e) {
      this.isConnecting = false;
      throw e;
    }

    const roomCode = generateRoomCode();
    const channel = channelName(roomCode);

    this.isHosting = true;
    this.localPlayerName = playerName;
    this.localFaceColorHex = FACE_COLORS[0]; // Host gets first color

    try {
      // Create microphone track
      this.localAudioTrack = await (await this.loadAgora()).createMicrophoneAudioTrack();

      // Join the channel
      const uid = await this.client!.join(AGORA_APP_ID, channel, null, null);
      const localUid = uid as number;

      // Publish audio track
      await this.client!.publish(this.localAudioTrack);

      // Create data stream for cross-platform messaging (iOS uses data streams)
      try {
        const clientAny = this.client as unknown as { createDataStream: (config: { ordered: boolean; reliable: boolean }) => Promise<number> };
        this.dataStreamId = await clientAny.createDataStream({ ordered: true, reliable: true });
        console.log('[Agora] Created data stream with ID:', this.dataStreamId);
      } catch (e) {
        console.warn('[Agora] Failed to create data stream:', e);
      }

      // Set up RTM for messaging
      await this.rtmManager.login(localUid);
      await this.rtmManager.subscribe(channel);
      this.setupRTMMessageHandler();

      // Create room state
      this.roomState = createRoomState(roomCode, localUid);
      this.roomState.localUserId = localUid;

      // Add self as first player
      const player: Player = {
        id: localUid,
        slotIndex: 0,
        name: playerName,
        isConnected: true,
        faceColorHex: this.localFaceColorHex,
      };
      this.roomState = addPlayer(this.roomState, player);

      this.isConnecting = false;
      this.emit({ type: 'connected', roomState: this.roomState });
      return roomCode;
    } catch (error) {
      this.isConnecting = false;
      this.emit({ type: 'error', message: `Failed to create room: ${error}` });
      throw error;
    }
  }

  // Join an existing room
  async joinRoom(code: string, playerName: string): Promise<void> {
    // Prevent multiple simultaneous connection attempts (idempotent for React Strict Mode)
    if (this.isConnecting) {
      console.warn('[Agora] joinRoom called while already connecting, ignoring duplicate call');
      return;
    }
    this.isConnecting = true;

    try {
      await this.initClient();
    } catch (e) {
      this.isConnecting = false;
      throw e;
    }

    const channel = channelName(code);
    console.log('[Agora] joinRoom - channel:', channel);

    this.isHosting = false;
    this.localPlayerName = playerName;

    try {
      // Create microphone track
      this.localAudioTrack = await (await this.loadAgora()).createMicrophoneAudioTrack();

      // Join the channel
      console.log('[Agora] Joining channel:', channel);
      const uid = await this.client!.join(AGORA_APP_ID, channel, null, null);
      const localUid = uid as number;
      console.log('[Agora] Joined as UID:', localUid);

      // Publish audio track
      await this.client!.publish(this.localAudioTrack);

      // Create data stream for cross-platform messaging (iOS uses data streams)
      try {
        const clientAny = this.client as unknown as { createDataStream: (config: { ordered: boolean; reliable: boolean }) => Promise<number> };
        this.dataStreamId = await clientAny.createDataStream({ ordered: true, reliable: true });
        console.log('[Agora] Created data stream with ID:', this.dataStreamId);
      } catch (e) {
        console.warn('[Agora] Failed to create data stream:', e);
      }

      // Set up RTM for messaging
      await this.rtmManager.login(localUid);
      await this.rtmManager.subscribe(channel);
      this.setupRTMMessageHandler();

      // Create temporary room state (will be updated by host sync)
      this.roomState = createRoomState(code, 0);
      this.roomState.localUserId = localUid;

      // Determine slot and color
      const slot = 1; // Will be adjusted when sync received
      const colorHex = FACE_COLORS[slot % FACE_COLORS.length];
      this.localFaceColorHex = colorHex;

      // Add self to local player list
      const localPlayer: Player = {
        id: localUid,
        slotIndex: slot,
        name: playerName,
        isConnected: true,
        faceColorHex: colorHex,
      };
      this.roomState = addPlayer(this.roomState, localPlayer);

      // Request sync and announce join
      this.sendMessage({ type: 'requestSync' });
      this.sendMessage({
        type: 'playerJoined',
        userId: localUid,
        name: playerName,
        slotIndex: slot,
        faceColorHex: colorHex,
      });

      // Check for existing remote users already in the channel
      // (user-joined only fires for users joining AFTER us)
      setTimeout(() => {
        this.addExistingRemoteUsers();
      }, 1000);

      this.isConnecting = false;
      this.emit({ type: 'connected', roomState: this.roomState });
    } catch (error) {
      this.isConnecting = false;
      this.emit({ type: 'error', message: `Failed to join room: ${error}` });
      throw error;
    }
  }

  // Join quick match queue
  async joinQuickMatch(playerName: string): Promise<void> {
    // Prevent multiple simultaneous connection attempts (idempotent for React Strict Mode)
    if (this.isConnecting) {
      console.warn('[Agora] joinQuickMatch called while already connecting, ignoring duplicate call');
      return;
    }
    this.isConnecting = true;

    try {
      await this.initClient();
    } catch (e) {
      this.isConnecting = false;
      throw e;
    }

    this.isQuickMatching = true;
    this.isHosting = false;
    this.localPlayerName = playerName;
    this.allConnectedUIDs.clear();

    try {
      this.localAudioTrack = await (await this.loadAgora()).createMicrophoneAudioTrack();

      const uid = await this.client!.join(AGORA_APP_ID, QUICK_MATCH_CHANNEL, null, null);
      const localUid = uid as number;

      await this.client!.publish(this.localAudioTrack);

      // Create data stream for cross-platform messaging (iOS uses data streams)
      try {
        const clientAny = this.client as unknown as { createDataStream: (config: { ordered: boolean; reliable: boolean }) => Promise<number> };
        this.dataStreamId = await clientAny.createDataStream({ ordered: true, reliable: true });
        console.log('[Agora] Created data stream with ID:', this.dataStreamId);
      } catch (e) {
        console.warn('[Agora] Failed to create data stream:', e);
      }

      // Set up RTM for messaging
      await this.rtmManager.login(localUid);
      await this.rtmManager.subscribe(QUICK_MATCH_CHANNEL);
      this.setupRTMMessageHandler();

      this.allConnectedUIDs.add(localUid);

      // Create room state
      this.roomState = createRoomState('QUICK', localUid);
      this.roomState.localUserId = localUid;

      // Initially slot 0
      const slot = 0;
      const colorHex = FACE_COLORS[slot];
      this.localFaceColorHex = colorHex;

      const player: Player = {
        id: localUid,
        slotIndex: slot,
        name: playerName,
        isConnected: true,
        faceColorHex: colorHex,
      };
      this.roomState = addPlayer(this.roomState, player);

      // Announce presence
      this.sendMessage({
        type: 'playerJoined',
        userId: localUid,
        name: playerName,
        slotIndex: slot,
        faceColorHex: colorHex,
      });

      // Request state sync from host (to get info about existing players)
      this.sendMessage({ type: 'requestSync' });

      // Check for existing remote users already in the channel
      // (user-joined only fires for users joining AFTER us)
      setTimeout(() => {
        this.addExistingRemoteUsers();
      }, 1000);

      this.isConnecting = false;
      this.emit({ type: 'connected', roomState: this.roomState });
    } catch (error) {
      this.isConnecting = false;
      this.emit({ type: 'error', message: `Failed to join quick match: ${error}` });
      throw error;
    }
  }

  // Leave the current room
  async leaveRoom(): Promise<void> {
    this.isConnecting = false; // Reset connection flag
    this.stopVolumeMonitoring();

    // Logout from RTM
    await this.rtmManager.logout();

    if (this.localAudioTrack) {
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }

    if (this.client) {
      await this.client.leave();
    }

    this.roomState = null;
    this.playerVolumes.clear();
    this.isHosting = false;
    this.isQuickMatching = false;
    this.allConnectedUIDs.clear();
    this.dataStreamId = null;

    this.emit({ type: 'disconnected' });
  }

  // Start the game (host only)
  async startGame(): Promise<void> {
    if (!this.roomState || this.roomState.hostUserId !== this.roomState.localUserId) {
      return;
    }
    if (this.roomState.players.length < 2) return;

    const secretWord = SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
    const imposterIndex = Math.floor(Math.random() * this.roomState.players.length);
    const imposterUserId = this.roomState.players[imposterIndex].id;

    // Update local state
    this.roomState = {
      ...this.roomState,
      secretWord,
      imposterUserId,
      gamePhase: 'playing',
    };

    // Broadcast to all players first, then emit locally
    await this.sendMessage({
      type: 'gameStarted',
      secretWord,
      imposterUserId,
    });

    this.emit({
      type: 'gameStarted',
      secretWord,
      imposterUserId,
    });
  }

  // Return to lobby (host only)
  returnToLobby(): void {
    if (!this.roomState || this.roomState.hostUserId !== this.roomState.localUserId) {
      return;
    }

    this.roomState = {
      ...this.roomState,
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    };

    this.sendStateSync();
  }

  // Send a message via RTM (web-to-web) and data stream (web-to-iOS)
  private async sendMessage(message: GameMessage): Promise<void> {
    // Send via RTM (for web-to-web)
    await this.rtmManager.publish(message);

    // Also send via data stream (for cross-platform with iOS)
    // Web SDK 4.x API: sendStreamMessage(streamId, payload)
    if (this.client && this.dataStreamId !== null) {
      try {
        const jsonStr = JSON.stringify(message);
        console.log('[Agora] Sending data stream message:', jsonStr);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonStr);
        // TypeScript types are incomplete, but this method exists at runtime
        const client = this.client as unknown as { sendStreamMessage: (streamId: number, data: Uint8Array) => Promise<void> };
        await client.sendStreamMessage(this.dataStreamId, data);
        console.log('[Agora] Data stream message sent successfully');
      } catch (e) {
        console.warn('[Agora] Failed to send data stream message:', e);
      }
    }
  }

  private sendStateSync(): void {
    if (!this.roomState) return;

    const sync: GameMessage = {
      type: 'stateSync',
      stateSync: {
        hostUserId: this.roomState.hostUserId,
        players: this.roomState.players,
        gamePhase: this.roomState.gamePhase,
        secretWord: this.roomState.secretWord,
        imposterUserId: this.roomState.imposterUserId,
      },
    };

    this.sendMessage(sync);
  }

  private handleIncomingMessage(message: GameMessage, fromUid: number): void {
    if (!this.roomState) return;

    switch (message.type) {
      case 'playerJoined': {
        let { slotIndex, faceColorHex } = message;

        // Check if placeholder player already exists (from RTC user-joined)
        const existingPlayer = this.roomState.players.find(p => p.id === message.userId);

        if (existingPlayer) {
          // Update placeholder with real name from RTM message
          console.log('[Agora] Updating placeholder player with real name:', message.name);
          const updatedPlayers = this.roomState.players.map(p =>
            p.id === message.userId
              ? { ...p, name: message.name, faceColorHex: message.faceColorHex || p.faceColorHex }
              : p
          );
          this.roomState = { ...this.roomState, players: updatedPlayers };

          // Emit state sync to update UI
          const updatedPlayer = updatedPlayers.find(p => p.id === message.userId)!;
          this.emit({ type: 'stateSync', state: this.roomState });

          // If host, broadcast the update to others
          if (this.roomState.hostUserId === this.roomState.localUserId) {
            this.sendStateSync();
          }
        } else {
          // No placeholder exists - add the player normally
          // Host assigns proper slot for all joining players
          if (this.roomState.hostUserId === this.roomState.localUserId) {
            const availableSlot = nextAvailableSlot(this.roomState);
            if (availableSlot !== null) {
              slotIndex = availableSlot;
              faceColorHex = FACE_COLORS[slotIndex % FACE_COLORS.length];
            }
          }

          const player: Player = {
            id: message.userId,
            slotIndex,
            name: message.name,
            isConnected: true,
            faceColorHex,
          };

          this.roomState = addPlayer(this.roomState, player);
          this.emit({ type: 'playerJoined', player });

          // If host, send state sync to update everyone with correct slots
          if (this.roomState.hostUserId === this.roomState.localUserId) {
            this.sendStateSync();
          }
        }

        // Check auto-start for quick match
        if (this.isQuickMatching) {
          this.checkAutoStartQuickMatch();
        }
        break;
      }

      case 'playerLeft': {
        this.roomState = removePlayer(this.roomState, message.userId);
        this.emit({ type: 'playerLeft', userId: message.userId });
        break;
      }

      case 'gameStarted': {
        this.roomState = {
          ...this.roomState,
          secretWord: message.secretWord,
          imposterUserId: message.imposterUserId,
          gamePhase: 'playing',
        };
        this.emit({
          type: 'gameStarted',
          secretWord: message.secretWord,
          imposterUserId: message.imposterUserId,
        });
        break;
      }

      case 'stateSync': {
        const { stateSync } = message;
        this.roomState = {
          ...this.roomState,
          hostUserId: stateSync.hostUserId,
          players: stateSync.players,
          gamePhase: stateSync.gamePhase,
          secretWord: stateSync.secretWord,
          imposterUserId: stateSync.imposterUserId,
        };
        this.emit({ type: 'stateSync', state: this.roomState });
        break;
      }

      case 'requestSync': {
        // Only host responds
        if (this.roomState.hostUserId === this.roomState.localUserId) {
          this.sendStateSync();
        }
        break;
      }
    }
  }

  // Add existing remote users that were already in the channel when we joined
  private addExistingRemoteUsers(): void {
    if (!this.client || !this.roomState) return;

    const remoteUsers = this.client.remoteUsers;
    console.log('[Agora] Checking for existing remote users:', remoteUsers.length);

    for (const user of remoteUsers) {
      const uid = user.uid as number;
      const existingPlayer = this.roomState.players.find(p => p.id === uid);

      if (!existingPlayer) {
        const slot = nextAvailableSlot(this.roomState);
        if (slot !== null) {
          const colorHex = FACE_COLORS[slot % FACE_COLORS.length];
          const player: Player = {
            id: uid,
            slotIndex: slot,
            name: `Player ${slot + 1}`, // Placeholder name
            isConnected: true,
            faceColorHex: colorHex,
          };
          console.log('[Agora] Adding existing remote user:', player);
          this.roomState = addPlayer(this.roomState, player);
          this.emit({ type: 'playerJoined', player });
        }
      }
    }
  }

  // Quick match helpers
  private recalculateQuickMatchHost(): void {
    if (!this.isQuickMatching || !this.roomState) return;

    const lowestUID = Math.min(...Array.from(this.allConnectedUIDs));
    if (this.roomState.hostUserId !== lowestUID) {
      this.roomState = { ...this.roomState, hostUserId: lowestUID };

      // If we became host, send state sync
      if (lowestUID === this.roomState.localUserId) {
        this.sendStateSync();
      }
    }
  }

  private checkAutoStartQuickMatch(): void {
    if (!this.isQuickMatching || !this.roomState) return;
    if (this.roomState.gamePhase !== 'lobby') return;
    if (this.roomState.players.length < 4) return;
    if (this.roomState.hostUserId !== this.roomState.localUserId) return;

    // Auto-start after 2 seconds
    setTimeout(() => {
      if (
        this.isQuickMatching &&
        this.roomState &&
        this.roomState.gamePhase === 'lobby' &&
        this.roomState.players.length >= 4 &&
        this.roomState.hostUserId === this.roomState.localUserId
      ) {
        this.startGame();
      }
    }, 2000);
  }

  // Helper to get amplitude for a player
  getAmplitude(userId: number): number {
    return this.playerVolumes.get(userId) || 0;
  }

  isSpeaking(userId: number): boolean {
    return this.getAmplitude(userId) > 0.05;
  }

  // Cleanup
  destroy(): void {
    this.leaveRoom();
    this.listeners = [];
  }
}

// Singleton instance
let agoraManagerInstance: AgoraManager | null = null;

export function getAgoraManager(): AgoraManager {
  if (!agoraManagerInstance) {
    agoraManagerInstance = new AgoraManager();
  }
  return agoraManagerInstance;
}

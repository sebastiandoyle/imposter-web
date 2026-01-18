// Represents a player in the multiplayer room
export interface Player {
  id: number;          // Agora user ID (UID)
  slotIndex: number;   // 0-3 position in grid
  name: string;
  isConnected: boolean;
  faceColorHex: string;
}

// The phase of the multiplayer game
export type GamePhase = 'lobby' | 'playing' | 'revealing';

// The complete state of a multiplayer room
export interface RoomState {
  roomCode: string;
  hostUserId: number;
  localUserId: number;
  players: Player[];
  gamePhase: GamePhase;
  secretWord: string | null;
  imposterUserId: number | null;
}

// Messages sent between players via Agora data stream
// IMPORTANT: Must match iOS app's GameMessage format exactly for cross-platform play

export type GameMessage =
  | {
      type: 'playerJoined';
      userId: number;
      name: string;
      slotIndex: number;
      faceColorHex: string;
    }
  | {
      type: 'playerLeft';
      userId: number;
    }
  | {
      type: 'gameStarted';
      secretWord: string;
      imposterUserId: number;
    }
  | {
      type: 'stateSync';
      stateSync: StateSync;
    }
  | {
      type: 'requestSync';
    };

export interface StateSync {
  hostUserId: number;
  players: Player[];
  gamePhase: GamePhase;
  secretWord: string | null;
  imposterUserId: number | null;
}

// Helper functions
export function createRoomState(roomCode: string, hostUserId: number): RoomState {
  return {
    roomCode,
    hostUserId,
    localUserId: 0,
    players: [],
    gamePhase: 'lobby',
    secretWord: null,
    imposterUserId: null,
  };
}

export function isHost(state: RoomState): boolean {
  return state.localUserId === state.hostUserId;
}

export function getLocalPlayer(state: RoomState): Player | undefined {
  return state.players.find(p => p.id === state.localUserId);
}

export function getLocalWord(state: RoomState): string | null {
  const localPlayer = getLocalPlayer(state);
  if (!localPlayer) return null;
  if (localPlayer.id === state.imposterUserId) {
    return 'IMPOSTER';
  }
  return state.secretWord;
}

export function isLocalImposter(state: RoomState): boolean {
  return state.localUserId === state.imposterUserId;
}

export function nextAvailableSlot(state: RoomState): number | null {
  const usedSlots = new Set(state.players.map(p => p.slotIndex));
  for (let slot = 0; slot < 4; slot++) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }
  return null;
}

export function addPlayer(state: RoomState, player: Player): RoomState {
  if (state.players.some(p => p.id === player.id)) {
    return state;
  }
  const newPlayers = [...state.players, player].sort((a, b) => a.slotIndex - b.slotIndex);
  return { ...state, players: newPlayers };
}

export function removePlayer(state: RoomState, userId: number): RoomState {
  return { ...state, players: state.players.filter(p => p.id !== userId) };
}

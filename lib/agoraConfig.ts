// Configuration constants for Agora SDK
// IMPORTANT: Same App ID as iOS app for cross-platform play
export const AGORA_APP_ID = 'b4bd44cb2f7f46ad918fbe53914e3c55';

// Channel configuration
export const CHANNEL_PREFIX = 'imposter_';
export const MAX_PLAYERS_PER_ROOM = 4;

// Quick match channel (shared by all players looking for random match)
export const QUICK_MATCH_CHANNEL = 'imposter_quickmatch';

// Helper to generate a 4-digit room code
export function generateRoomCode(): string {
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString());
  return digits.join('');
}

// Convert room code to Agora channel name
export function channelName(roomCode: string): string {
  return `${CHANNEL_PREFIX}${roomCode}`;
}

// Available face colors
export const FACE_COLORS = [
  'F97316',  // Orange
  '22C55E',  // Green
  '3B82F6',  // Blue
  'EC4899',  // Pink
];

// Default player names for multiplayer
export const DEFAULT_PLAYER_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley'];

// Secret words pool
export const SECRET_WORDS = [
  'BANANA', 'ELEPHANT', 'PIZZA', 'GUITAR', 'ROCKET',
  'PENGUIN', 'RAINBOW', 'VOLCANO', 'TREASURE', 'UNICORN',
  'PANCAKE', 'DINOSAUR', 'SURFBOARD', 'ASTRONAUT', 'CHOCOLATE',
  'FIREWORK', 'WATERFALL', 'BUTTERFLY', 'LIGHTNING', 'MUSHROOM',
];

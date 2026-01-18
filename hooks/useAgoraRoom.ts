'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgoraManager, AgoraEvent } from '@/lib/agoraManager';
import { RoomState, Player } from '@/lib/gameTypes';

export interface UseAgoraRoomReturn {
  roomState: RoomState | null;
  playerVolumes: Map<number, number>;
  isConnected: boolean;
  error: string | null;
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (code: string, playerName: string) => Promise<void>;
  joinQuickMatch: (playerName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  returnToLobby: () => void;
  getAmplitude: (userId: number) => number;
  isSpeaking: (userId: number) => boolean;
}

export function useAgoraRoom(): UseAgoraRoomReturn {
  const manager = getAgoraManager();

  // Initialize state from manager's current state (important for page navigation)
  const [roomState, setRoomState] = useState<RoomState | null>(() => manager.getRoomState());
  const [playerVolumes, setPlayerVolumes] = useState<Map<number, number>>(
    () => manager.getPlayerVolumes()
  );
  const [isConnected, setIsConnected] = useState(() => manager.getRoomState() !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = manager.subscribe((event: AgoraEvent) => {
      switch (event.type) {
        case 'connected':
          setIsConnected(true);
          setRoomState(event.roomState);
          setError(null);
          break;

        case 'disconnected':
          setIsConnected(false);
          setRoomState(null);
          setPlayerVolumes(new Map());
          break;

        case 'error':
          setError(event.message);
          break;

        case 'playerJoined':
          setRoomState((prev) => {
            if (!prev) return prev;
            const exists = prev.players.some((p) => p.id === event.player.id);
            if (exists) return prev;
            return {
              ...prev,
              players: [...prev.players, event.player].sort(
                (a, b) => a.slotIndex - b.slotIndex
              ),
            };
          });
          break;

        case 'playerLeft':
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.filter((p) => p.id !== event.userId),
            };
          });
          break;

        case 'gameStarted':
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              gamePhase: 'playing',
              secretWord: event.secretWord,
              imposterUserId: event.imposterUserId,
            };
          });
          break;

        case 'stateSync':
          setRoomState((prev) => {
            if (!prev) return prev;
            return { ...prev, ...event.state };
          });
          break;

        case 'volumeUpdate':
          setPlayerVolumes(event.volumes);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [manager]);

  const createRoom = useCallback(
    async (playerName: string) => {
      return manager.createRoom(playerName);
    },
    [manager]
  );

  const joinRoom = useCallback(
    async (code: string, playerName: string) => {
      return manager.joinRoom(code, playerName);
    },
    [manager]
  );

  const joinQuickMatch = useCallback(
    async (playerName: string) => {
      return manager.joinQuickMatch(playerName);
    },
    [manager]
  );

  const leaveRoom = useCallback(async () => {
    return manager.leaveRoom();
  }, [manager]);

  const startGame = useCallback(async () => {
    return manager.startGame();
  }, [manager]);

  const returnToLobby = useCallback(() => {
    manager.returnToLobby();
  }, [manager]);

  const getAmplitude = useCallback(
    (userId: number) => {
      return playerVolumes.get(userId) || 0;
    },
    [playerVolumes]
  );

  const isSpeaking = useCallback(
    (userId: number) => {
      return (playerVolumes.get(userId) || 0) > 0.05;
    },
    [playerVolumes]
  );

  return {
    roomState,
    playerVolumes,
    isConnected,
    error,
    createRoom,
    joinRoom,
    joinQuickMatch,
    leaveRoom,
    startGame,
    returnToLobby,
    getAmplitude,
    isSpeaking,
  };
}

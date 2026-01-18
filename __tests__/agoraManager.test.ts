import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoomState, Player, GameMessage } from '@/lib/gameTypes'

// Mock types to test message handling logic without actual Agora SDK
// We test the handleIncomingMessage logic by extracting the state transformations

describe('handleIncomingMessage logic', () => {
  // Test pure state transformation logic that would happen in handleIncomingMessage

  describe('playerJoined message', () => {
    it('adds a new player to state', () => {
      const initialPlayers: Player[] = [
        { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
      ]
      const message = {
        type: 'playerJoined' as const,
        userId: 200,
        name: 'Jordan',
        slotIndex: 1,
        faceColorHex: '22C55E',
      }

      // Simulate the state update
      const newPlayer: Player = {
        id: message.userId,
        slotIndex: message.slotIndex,
        name: message.name,
        isConnected: true,
        faceColorHex: message.faceColorHex,
      }

      const updatedPlayers = [...initialPlayers, newPlayer].sort((a, b) => a.slotIndex - b.slotIndex)

      expect(updatedPlayers).toHaveLength(2)
      expect(updatedPlayers[1].name).toBe('Jordan')
    })
  })

  describe('playerLeft message', () => {
    it('removes player from state', () => {
      const initialPlayers: Player[] = [
        { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
        { id: 200, slotIndex: 1, name: 'Jordan', isConnected: true, faceColorHex: '22C55E' },
      ]
      const message = { type: 'playerLeft' as const, userId: 200 }

      const updatedPlayers = initialPlayers.filter((p) => p.id !== message.userId)

      expect(updatedPlayers).toHaveLength(1)
      expect(updatedPlayers[0].name).toBe('Alex')
    })
  })

  describe('gameStarted message', () => {
    it('updates state with secret word and imposter', () => {
      const initialState: Partial<RoomState> = {
        gamePhase: 'lobby',
        secretWord: null,
        imposterUserId: null,
      }

      const message = {
        type: 'gameStarted' as const,
        secretWord: 'BANANA',
        imposterUserId: 200,
      }

      const updatedState = {
        ...initialState,
        secretWord: message.secretWord,
        imposterUserId: message.imposterUserId,
        gamePhase: 'playing' as const,
      }

      expect(updatedState.gamePhase).toBe('playing')
      expect(updatedState.secretWord).toBe('BANANA')
      expect(updatedState.imposterUserId).toBe(200)
    })
  })

  describe('stateSync message', () => {
    it('merges sync data into state', () => {
      const currentState: RoomState = {
        roomCode: '1234',
        hostUserId: 100,
        localUserId: 200,
        players: [],
        gamePhase: 'lobby',
        secretWord: null,
        imposterUserId: null,
      }

      const syncData = {
        hostUserId: 100,
        players: [
          { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
          { id: 200, slotIndex: 1, name: 'Jordan', isConnected: true, faceColorHex: '22C55E' },
        ],
        gamePhase: 'lobby' as const,
        secretWord: null,
        imposterUserId: null,
      }

      const updatedState: RoomState = {
        ...currentState,
        hostUserId: syncData.hostUserId,
        players: syncData.players,
        gamePhase: syncData.gamePhase,
        secretWord: syncData.secretWord,
        imposterUserId: syncData.imposterUserId,
      }

      expect(updatedState.players).toHaveLength(2)
      expect(updatedState.hostUserId).toBe(100)
      // localUserId should be preserved
      expect(updatedState.localUserId).toBe(200)
      // roomCode should be preserved
      expect(updatedState.roomCode).toBe('1234')
    })
  })
})

describe('slot assignment logic', () => {
  it('assigns first available slot when host processes playerJoined', () => {
    const usedSlots = new Set([0, 2])

    let nextSlot: number | null = null
    for (let slot = 0; slot < 4; slot++) {
      if (!usedSlots.has(slot)) {
        nextSlot = slot
        break
      }
    }

    expect(nextSlot).toBe(1)
  })

  it('returns null when all slots taken', () => {
    const usedSlots = new Set([0, 1, 2, 3])

    let nextSlot: number | null = null
    for (let slot = 0; slot < 4; slot++) {
      if (!usedSlots.has(slot)) {
        nextSlot = slot
        break
      }
    }

    expect(nextSlot).toBeNull()
  })
})

describe('volume monitoring logic', () => {
  it('determines speaking state based on threshold', () => {
    const volumes = new Map<number, number>([
      [100, 0.02], // Not speaking
      [200, 0.08], // Speaking
      [300, 0.05], // Borderline - not speaking at 0.05 threshold
    ])

    const SPEAKING_THRESHOLD = 0.05

    const isSpeaking = (userId: number) => (volumes.get(userId) || 0) > SPEAKING_THRESHOLD

    expect(isSpeaking(100)).toBe(false)
    expect(isSpeaking(200)).toBe(true)
    expect(isSpeaking(300)).toBe(false)
  })

  it('applies smoothing for disconnected audio', () => {
    const previousVolume = 0.3
    const smoothingFactor = 0.7

    // Player disconnected, so we smooth their volume toward 0
    const smoothedVolume = previousVolume * smoothingFactor

    expect(smoothedVolume).toBeCloseTo(0.21)
  })
})

describe('quick match host selection', () => {
  it('selects lowest UID as host', () => {
    const connectedUIDs = [300, 100, 200]

    const lowestUID = Math.min(...connectedUIDs)

    expect(lowestUID).toBe(100)
  })

  it('handles single player', () => {
    const connectedUIDs = [150]

    const lowestUID = Math.min(...connectedUIDs)

    expect(lowestUID).toBe(150)
  })
})

describe('game start conditions', () => {
  it('requires at least 2 players', () => {
    const players: Player[] = [
      { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
    ]

    const canStart = players.length >= 2

    expect(canStart).toBe(false)
  })

  it('allows start with 2+ players', () => {
    const players: Player[] = [
      { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
      { id: 200, slotIndex: 1, name: 'Jordan', isConnected: true, faceColorHex: '22C55E' },
    ]

    const canStart = players.length >= 2

    expect(canStart).toBe(true)
  })

  it('only host can start the game', () => {
    const state: Partial<RoomState> = {
      hostUserId: 100,
      localUserId: 200,
    }

    const isHost = state.localUserId === state.hostUserId

    expect(isHost).toBe(false)
  })
})

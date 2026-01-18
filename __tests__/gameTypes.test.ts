import { describe, it, expect } from 'vitest'
import {
  createRoomState,
  isHost,
  getLocalPlayer,
  getLocalWord,
  isLocalImposter,
  nextAvailableSlot,
  addPlayer,
  removePlayer,
  RoomState,
  Player,
} from '@/lib/gameTypes'

describe('createRoomState', () => {
  it('creates a valid initial state', () => {
    const state = createRoomState('1234', 100)

    expect(state.roomCode).toBe('1234')
    expect(state.hostUserId).toBe(100)
    expect(state.localUserId).toBe(0)
    expect(state.players).toEqual([])
    expect(state.gamePhase).toBe('lobby')
    expect(state.secretWord).toBeNull()
    expect(state.imposterUserId).toBeNull()
  })
})

describe('isHost', () => {
  it('returns true when local user is host', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(isHost(state)).toBe(true)
  })

  it('returns false when local user is not host', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 200,
      players: [],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(isHost(state)).toBe(false)
  })
})

describe('getLocalPlayer', () => {
  it('returns the local player when found', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(getLocalPlayer(state)).toEqual(player)
  })

  it('returns undefined when local player not in list', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 200,
      players: [],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(getLocalPlayer(state)).toBeUndefined()
  })
})

describe('getLocalWord', () => {
  it('returns "IMPOSTER" when local player is imposter', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'playing',
      secretWord: 'BANANA',
      imposterUserId: 100,
    }

    expect(getLocalWord(state)).toBe('IMPOSTER')
  })

  it('returns the secret word when local player is not imposter', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'playing',
      secretWord: 'BANANA',
      imposterUserId: 200,
    }

    expect(getLocalWord(state)).toBe('BANANA')
  })

  it('returns null when local player not found', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 200,
      players: [],
      gamePhase: 'playing',
      secretWord: 'BANANA',
      imposterUserId: 300,
    }

    expect(getLocalWord(state)).toBeNull()
  })
})

describe('isLocalImposter', () => {
  it('returns true when local user is imposter', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [],
      gamePhase: 'playing',
      secretWord: 'BANANA',
      imposterUserId: 100,
    }

    expect(isLocalImposter(state)).toBe(true)
  })

  it('returns false when local user is not imposter', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [],
      gamePhase: 'playing',
      secretWord: 'BANANA',
      imposterUserId: 200,
    }

    expect(isLocalImposter(state)).toBe(false)
  })
})

describe('nextAvailableSlot', () => {
  it('returns 0 when no players', () => {
    const state = createRoomState('1234', 100)
    expect(nextAvailableSlot(state)).toBe(0)
  })

  it('returns first gap in slot sequence', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [
        { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
        { id: 200, slotIndex: 2, name: 'Sam', isConnected: true, faceColorHex: '3B82F6' },
      ],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(nextAvailableSlot(state)).toBe(1)
  })

  it('returns null when all 4 slots are filled', () => {
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [
        { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' },
        { id: 200, slotIndex: 1, name: 'Jordan', isConnected: true, faceColorHex: '22C55E' },
        { id: 300, slotIndex: 2, name: 'Sam', isConnected: true, faceColorHex: '3B82F6' },
        { id: 400, slotIndex: 3, name: 'Riley', isConnected: true, faceColorHex: 'EC4899' },
      ],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    expect(nextAvailableSlot(state)).toBeNull()
  })
})

describe('addPlayer', () => {
  it('adds a new player to the list', () => {
    const state = createRoomState('1234', 100)
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }

    const newState = addPlayer(state, player)

    expect(newState.players).toHaveLength(1)
    expect(newState.players[0]).toEqual(player)
  })

  it('does not add duplicate player', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    const duplicatePlayer: Player = {
      id: 100,
      slotIndex: 1,
      name: 'DifferentName',
      isConnected: true,
      faceColorHex: '22C55E',
    }

    const newState = addPlayer(state, duplicatePlayer)

    expect(newState.players).toHaveLength(1)
    expect(newState).toBe(state) // Returns same reference when no change
  })

  it('sorts players by slot index', () => {
    const state = createRoomState('1234', 100)
    const player1: Player = { id: 200, slotIndex: 2, name: 'Sam', isConnected: true, faceColorHex: '3B82F6' }
    const player2: Player = { id: 100, slotIndex: 0, name: 'Alex', isConnected: true, faceColorHex: 'F97316' }

    let newState = addPlayer(state, player1)
    newState = addPlayer(newState, player2)

    expect(newState.players[0].slotIndex).toBe(0)
    expect(newState.players[1].slotIndex).toBe(2)
  })
})

describe('removePlayer', () => {
  it('removes player from the list', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    const newState = removePlayer(state, 100)

    expect(newState.players).toHaveLength(0)
  })

  it('does nothing when player not found', () => {
    const player: Player = {
      id: 100,
      slotIndex: 0,
      name: 'Alex',
      isConnected: true,
      faceColorHex: 'F97316',
    }
    const state: RoomState = {
      roomCode: '1234',
      hostUserId: 100,
      localUserId: 100,
      players: [player],
      gamePhase: 'lobby',
      secretWord: null,
      imposterUserId: null,
    }

    const newState = removePlayer(state, 999)

    expect(newState.players).toHaveLength(1)
  })
})

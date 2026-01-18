import { describe, it, expect } from 'vitest'
import {
  generateRoomCode,
  channelName,
  CHANNEL_PREFIX,
  MAX_PLAYERS_PER_ROOM,
  FACE_COLORS,
  SECRET_WORDS,
} from '@/lib/agoraConfig'

describe('generateRoomCode', () => {
  it('generates a 4-digit string', () => {
    const code = generateRoomCode()

    expect(code).toHaveLength(4)
    expect(/^\d{4}$/.test(code)).toBe(true)
  })

  it('generates different codes on multiple calls', () => {
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode())
    }
    // With 10000 possible codes, 100 samples should have at least 90 unique
    expect(codes.size).toBeGreaterThan(90)
  })
})

describe('channelName', () => {
  it('prepends the channel prefix', () => {
    const code = '1234'
    const channel = channelName(code)

    expect(channel).toBe(`${CHANNEL_PREFIX}1234`)
    expect(channel).toBe('imposter_1234')
  })
})

describe('constants', () => {
  it('has correct MAX_PLAYERS_PER_ROOM', () => {
    expect(MAX_PLAYERS_PER_ROOM).toBe(4)
  })

  it('has exactly 4 face colors', () => {
    expect(FACE_COLORS).toHaveLength(4)
    // All should be valid hex colors (6 chars)
    FACE_COLORS.forEach((color) => {
      expect(color).toMatch(/^[0-9A-Fa-f]{6}$/)
    })
  })

  it('has a non-empty SECRET_WORDS array', () => {
    expect(SECRET_WORDS.length).toBeGreaterThan(0)
    // All words should be uppercase
    SECRET_WORDS.forEach((word) => {
      expect(word).toBe(word.toUpperCase())
    })
  })
})

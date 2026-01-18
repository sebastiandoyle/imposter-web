import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerSlot from '@/components/PlayerSlot'
import { Player } from '@/lib/gameTypes'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
}))

// Mock AnimatedFace to avoid canvas rendering in tests
vi.mock('@/components/AnimatedFace', () => ({
  default: ({ faceColor, size }: { faceColor: string; size: number }) => (
    <div data-testid="animated-face" data-face-color={faceColor} data-size={size} />
  ),
}))

describe('PlayerSlot', () => {
  const mockPlayer: Player = {
    id: 100,
    slotIndex: 0,
    name: 'Alex',
    isConnected: true,
    faceColorHex: 'F97316',
  }

  describe('filled slot', () => {
    it('renders player name', () => {
      render(<PlayerSlot slot={0} player={mockPlayer} isLocal={false} />)

      expect(screen.getByText('Alex')).toBeInTheDocument()
    })

    it('shows YOU badge when isLocal is true', () => {
      render(<PlayerSlot slot={0} player={mockPlayer} isLocal={true} />)

      expect(screen.getByText('YOU')).toBeInTheDocument()
    })

    it('does not show YOU badge when isLocal is false', () => {
      render(<PlayerSlot slot={0} player={mockPlayer} isLocal={false} />)

      expect(screen.queryByText('YOU')).not.toBeInTheDocument()
    })

    it('renders AnimatedFace with correct color', () => {
      render(<PlayerSlot slot={0} player={mockPlayer} isLocal={false} />)

      const face = screen.getByTestId('animated-face')
      expect(face).toHaveAttribute('data-face-color', 'F97316')
    })
  })

  describe('empty slot', () => {
    it('renders waiting text when no player', () => {
      render(<PlayerSlot slot={1} player={undefined} isLocal={false} />)

      expect(screen.getByText('Waiting...')).toBeInTheDocument()
    })

    it('does not render AnimatedFace when empty', () => {
      render(<PlayerSlot slot={1} player={undefined} isLocal={false} />)

      expect(screen.queryByTestId('animated-face')).not.toBeInTheDocument()
    })
  })

  describe('connection status', () => {
    it('renders green indicator for connected player', () => {
      const connectedPlayer = { ...mockPlayer, isConnected: true }
      const { container } = render(<PlayerSlot slot={0} player={connectedPlayer} isLocal={false} />)

      // Find the connection status indicator (small rounded div with w-2 h-2)
      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full')
      const connectionIndicator = Array.from(indicators).find((el) => {
        const bgColor = (el as HTMLElement).style.backgroundColor
        // Check for green color in any format (hex, rgb, or named)
        return bgColor.includes('34, 197, 94') || bgColor === '#22C55E' || bgColor === 'rgb(34,197,94)'
      })
      expect(connectionIndicator).toBeTruthy()
    })

    it('renders red indicator for disconnected player', () => {
      const disconnectedPlayer = { ...mockPlayer, isConnected: false }
      const { container } = render(<PlayerSlot slot={0} player={disconnectedPlayer} isLocal={false} />)

      // Find the connection status indicator
      const indicators = container.querySelectorAll('.w-2.h-2.rounded-full')
      const connectionIndicator = Array.from(indicators).find((el) => {
        const bgColor = (el as HTMLElement).style.backgroundColor
        // Check for red color in any format (hex, rgb, or named)
        return bgColor.includes('239, 68, 68') || bgColor === '#EF4444' || bgColor === 'rgb(239,68,68)'
      })
      expect(connectionIndicator).toBeTruthy()
    })
  })
})

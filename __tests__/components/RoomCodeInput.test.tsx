import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomCodeInput from '@/components/RoomCodeInput'

describe('RoomCodeInput', () => {
  it('renders 4 input fields', () => {
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(4)
  })

  it('only accepts digits', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'abc')

    expect(inputs[0]).toHaveValue('')
  })

  it('moves focus to next input after entering digit', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')

    expect(inputs[1]).toHaveFocus()
  })

  it('calls onComplete when all 4 digits entered', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1234')

    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('handles paste of 4 digits', async () => {
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')

    // Simulate paste event
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '5678',
      },
    })

    expect(onComplete).toHaveBeenCalledWith('5678')
  })

  it('moves focus back on backspace when current input empty', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')

    // Type in first input, then move to second
    await user.type(inputs[0], '1')
    expect(inputs[1]).toHaveFocus()

    // Clear second input and press backspace
    await user.keyboard('{Backspace}')

    expect(inputs[0]).toHaveFocus()
  })

  it('respects disabled state', () => {
    const onComplete = vi.fn()
    render(<RoomCodeInput onComplete={onComplete} disabled={true} />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input) => {
      expect(input).toBeDisabled()
    })
  })
})

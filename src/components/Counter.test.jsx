import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Counter from './Counter'

describe('Counter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a short click on + increments by 1', () => {
    const onChange = vi.fn()
    render(<Counter value={5} onChange={onChange} />)
    const plus = screen.getByLabelText('Increase')

    fireEvent.mouseDown(plus)
    fireEvent.mouseUp(plus)
    fireEvent.click(plus)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('the − button decrements by 1, not below 0', () => {
    const onChange = vi.fn()
    render(<Counter value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Decrease'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('a long-press on + decrements by 1 and the trailing click does not also increment (regression)', () => {
    const onChange = vi.fn()
    render(<Counter value={5} onChange={onChange} />)
    const plus = screen.getByLabelText('Increase')

    fireEvent.mouseDown(plus)
    vi.advanceTimersByTime(500) // long-press threshold fires
    fireEvent.mouseUp(plus)
    fireEvent.click(plus) // browser fires a click on release regardless

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('a long-press decrement is clamped to a minimum of 0', () => {
    const onChange = vi.fn()
    render(<Counter value={0} onChange={onChange} />)
    const plus = screen.getByLabelText('Increase')

    fireEvent.mouseDown(plus)
    vi.advanceTimersByTime(500)
    fireEvent.mouseUp(plus)
    fireEvent.click(plus)

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('releasing before the long-press threshold only increments once', () => {
    const onChange = vi.fn()
    render(<Counter value={5} onChange={onChange} />)
    const plus = screen.getByLabelText('Increase')

    fireEvent.mouseDown(plus)
    vi.advanceTimersByTime(200) // released early — long-press timer should be cancelled
    fireEvent.mouseUp(plus)
    fireEvent.click(plus)
    vi.advanceTimersByTime(500) // ensure the cancelled timer never fires later

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('clicking the value switches to an editable input', () => {
    render(<Counter value={5} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Click to edit'))
    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })
})

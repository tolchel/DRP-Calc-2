import { describe, it, expect } from 'vitest'
import { STARTUP_MINUTES, ASSET_PRIORITY, verifiersPerShift } from './constants'

describe('STARTUP_MINUTES (SIM-09)', () => {
  it('is exactly 30 minutes for all asset types', () => {
    expect(STARTUP_MINUTES).toBe(30)
  })
})

describe('ASSET_PRIORITY (SIM-05)', () => {
  it('has db first', () => {
    expect(ASSET_PRIORITY[0]).toBe('db')
  })
  it('has server second', () => {
    expect(ASSET_PRIORITY[1]).toBe('server')
  })
  it('has fs third', () => {
    expect(ASSET_PRIORITY[2]).toBe('fs')
  })
  it('has ws last', () => {
    expect(ASSET_PRIORITY[3]).toBe('ws')
  })
})

describe('verifiersPerShift', () => {
  it('returns 1 for 3 engineers', () => {
    expect(verifiersPerShift(3)).toBe(1)
  })
  it('returns 2 for 6 engineers', () => {
    expect(verifiersPerShift(6)).toBe(2)
  })
  it('returns 0 for 1 engineer — zero-capacity shift', () => {
    expect(verifiersPerShift(1)).toBe(0)
  })
  it('returns 0 for 2 engineers', () => {
    expect(verifiersPerShift(2)).toBe(0)
  })
})

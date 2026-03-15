// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScenarios } from './useScenarios'
import type { WizardFormData } from '../types/wizard'

const MOCK_FORM_DATA: WizardFormData = {
  assets: {
    db:     { count: 1, avgSizeGB: 100 },
    server: { count: 2, avgSizeGB: 50 },
    fs:     { count: 1, avgSizeGB: 200 },
    ws:     { count: 0, avgSizeGB: 0 },
  },
  libraries: [{ id: 'lib-1', name: 'Библиотека 1', driveCount: 1, driveThroughputMBs: 300 }],
  san: { maxSpeedGBs: 4, streamCount: 10, streamSpeedMBs: 400 },
  engineerCount: 3,
  fastNetworkGbps: 10,
  lanGbps: 1,
  uncertaintyPct: 15,
  trials: 10_000,
}

describe('useScenarios', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save(name, formData) writes an entry to localStorage key drp_scenarios', () => {
    const { result } = renderHook(() => useScenarios())
    act(() => {
      result.current.save('Test Scenario', MOCK_FORM_DATA)
    })
    const raw = localStorage.getItem('drp_scenarios')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('Test Scenario')
    expect(parsed[0].id).toBeTruthy()
    expect(parsed[0].date).toBeTruthy()
    expect(parsed[0].data).toEqual(MOCK_FORM_DATA)
  })

  it('save called twice returns scenarios sorted newest-first', () => {
    const { result } = renderHook(() => useScenarios())
    act(() => {
      result.current.save('Scenario A', MOCK_FORM_DATA)
    })
    act(() => {
      result.current.save('Scenario B', MOCK_FORM_DATA)
    })
    expect(result.current.scenarios[0].name).toBe('Scenario B')
    expect(result.current.scenarios[1].name).toBe('Scenario A')
  })

  it('remove(id) removes only the matching entry and preserves others', () => {
    const { result } = renderHook(() => useScenarios())
    act(() => {
      result.current.save('Scenario A', MOCK_FORM_DATA)
      result.current.save('Scenario B', MOCK_FORM_DATA)
    })
    const idToRemove = result.current.scenarios[1].id
    act(() => {
      result.current.remove(idToRemove)
    })
    expect(result.current.scenarios).toHaveLength(1)
    expect(result.current.scenarios[0].name).toBe('Scenario B')
  })

  it('load() discards entries that fail the isValidScenario type-guard (corrupt data)', () => {
    const corrupt = JSON.stringify([
      { id: 'bad-1', notAName: 'broken', date: '2024-01-01' },
      { id: 'valid-1', name: 'Valid', date: '2024-01-01', data: MOCK_FORM_DATA },
    ])
    localStorage.setItem('drp_scenarios', corrupt)
    const { result } = renderHook(() => useScenarios())
    expect(result.current.scenarios).toHaveLength(1)
    expect(result.current.scenarios[0].name).toBe('Valid')
  })

  it("save('', formData) falls back to name 'Без названия'", () => {
    const { result } = renderHook(() => useScenarios())
    act(() => {
      result.current.save('', MOCK_FORM_DATA)
    })
    expect(result.current.scenarios[0].name).toBe('Без названия')
  })
})

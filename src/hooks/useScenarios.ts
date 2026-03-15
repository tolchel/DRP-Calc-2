import { useState } from 'react'
import type { SavedScenario } from '../types/scenario'
import type { WizardFormData } from '../types/wizard'

const STORAGE_KEY = 'drp_scenarios'

export function isValidScenario(entry: unknown): entry is SavedScenario {
  if (typeof entry !== 'object' || entry === null) return false
  const e = entry as Record<string, unknown>
  if (typeof e.id !== 'string') return false
  if (typeof e.name !== 'string') return false
  if (typeof e.date !== 'string') return false
  if (typeof e.data !== 'object' || e.data === null) return false
  const d = e.data as Record<string, unknown>
  if (typeof d.assets !== 'object' || d.assets === null) return false
  if (!Array.isArray(d.libraries)) return false
  if (typeof d.san !== 'object' || d.san === null) return false
  return true
}

export function loadFromStorage(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(isValidScenario)
    return valid.sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

function persist(scenarios: SavedScenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  } catch (err) {
    console.error('Failed to persist scenarios to localStorage', err)
  }
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(loadFromStorage)

  function save(name: string, data: WizardFormData): void {
    const entry: SavedScenario = {
      id: crypto.randomUUID(),
      name: name.trim() !== '' ? name : 'Без названия',
      date: new Date().toISOString(),
      data,
    }
    setScenarios(prev => {
      const updated = [entry, ...prev]
      persist(updated)
      return updated
    })
  }

  function remove(id: string): void {
    setScenarios(prev => {
      const updated = prev.filter(s => s.id !== id)
      persist(updated)
      return updated
    })
  }

  return { scenarios, save, remove }
}

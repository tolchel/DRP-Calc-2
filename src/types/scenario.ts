import type { WizardFormData } from './wizard'

export interface SavedScenario {
  id: string           // crypto.randomUUID() at creation
  name: string         // user-supplied label, fallback 'Без названия'
  date: string         // ISO 8601 string from new Date().toISOString()
  data: WizardFormData // serialized inputs only — never SimulationResult
}

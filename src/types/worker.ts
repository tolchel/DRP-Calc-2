import type { SimulationInput, SimulationResult } from './simulation'

export type WorkerInMessage =
  | { type: 'run'; data: SimulationInput }

export type WorkerOutMessage =
  | { type: 'progress'; percent: number }
  | { type: 'result'; data: SimulationResult }

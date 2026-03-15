/// <reference lib="webworker" />
import { runSimulation } from '../engine/simulation'
import type { WorkerInMessage, WorkerOutMessage } from '../types/worker'

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === 'run') {
    const result = runSimulation(e.data.data, (percent) => {
      self.postMessage({ type: 'progress', percent } satisfies WorkerOutMessage)
    })
    self.postMessage({ type: 'result', data: result } satisfies WorkerOutMessage)
  }
}

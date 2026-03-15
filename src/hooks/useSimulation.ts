import { useEffect, useRef, useState } from 'react'
import type { SimulationResult } from '../types/simulation'
import type { WorkerInMessage, WorkerOutMessage } from '../types/worker'
// CRITICAL: ?worker&inline — do NOT use new Worker(new URL(...)) syntax
import SimWorker from '../workers/simulation.worker?worker&inline'
import { wizardToSimInput } from '../types/wizard'
import type { WizardFormData } from '../types/wizard'

export function useSimulation(): {
  run: (form: WizardFormData) => void
  cancel: () => void
  progress: number | null   // null = idle, 0-100 = running/complete
  result: SimulationResult | null
  isRunning: boolean
} {
  const workerRef = useRef<InstanceType<typeof SimWorker> | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  function run(form: WizardFormData): void {
    // Terminate any existing worker before starting a new one
    workerRef.current?.terminate()

    const worker = new SimWorker()
    workerRef.current = worker

    setProgress(0)
    setResult(null)
    setIsRunning(true)

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (e.data.type === 'progress') {
        setProgress(e.data.percent)
      }
      if (e.data.type === 'result') {
        setResult(e.data.data)
        setProgress(100)
        setIsRunning(false)
        worker.terminate()
      }
    }

    worker.postMessage({ type: 'run', data: wizardToSimInput(form) } satisfies WorkerInMessage)
  }

  function cancel(): void {
    workerRef.current?.terminate()
    workerRef.current = null
    setProgress(null)
    setIsRunning(false)
    // Leave result as-is (preserve last completed result if any)
  }

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  return { run, cancel, progress, result, isRunning }
}

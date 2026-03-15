import { useRef, useState } from 'react'
import type { SimulationResult } from './types/simulation'
import type { WorkerOutMessage, WorkerInMessage } from './types/worker'
// CRITICAL: ?worker&inline — do NOT use new Worker(new URL(...)) syntax
import SimWorker from './workers/simulation.worker?worker&inline'

const DEFAULT_INPUT = {
  assets: [{ type: 'db' as const, count: 10, avgSizeGB: 100 }],
  tapeLibraries: [{ driveCount: 2, driveThroughputMBs: 300 }],
  san: { maxSpeedGBs: 4, streamCount: 10, streamSpeedMBs: 400 },
  fastNetworkGbps: 10,
  lanGbps: 1,
  engineerCount: 3,
  uncertaintyPct: 0.15,
  trials: 10_000,
}

export default function App() {
  const workerRef = useRef<InstanceType<typeof SimWorker> | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)

  function runSim() {
    workerRef.current?.terminate()
    const worker = new SimWorker()
    workerRef.current = worker
    setProgress(0)
    setResult(null)

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (e.data.type === 'progress') {
        setProgress(e.data.percent)
      }
      if (e.data.type === 'result') {
        setResult(e.data.data)
        setProgress(100)
        worker.terminate()
      }
    }
    worker.postMessage({ type: 'run', data: DEFAULT_INPUT } satisfies WorkerInMessage)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>DRP Calculator — Engine Validation</h1>
      <button onClick={runSim}>Run Simulation (10,000 trials)</button>
      {progress !== null && (
        <p>Progress: {progress}%</p>
      )}
      {result && (
        <pre style={{ fontSize: 12 }}>
          {JSON.stringify({
            kyber: {
              p50: result.kyberbackup.p50.toFixed(2) + 'h',
              kde_points: result.kyberbackup.kde.length,
            },
            competitor: {
              p50: result.competitor.p50.toFixed(2) + 'h',
              kde_points: result.competitor.kde.length,
            },
          }, null, 2)}
        </pre>
      )}
    </div>
  )
}

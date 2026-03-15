import { useEffect } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { KDEPoint } from '../types/simulation'
import type { SavedScenario } from '../types/scenario'
import { useSimulation } from '../hooks/useSimulation'

// Helper: linearly interpolate a single x value from a sorted KDEPoint array.
// Returns 0 if array is empty, or x is outside the array's range.
function interpolate(points: KDEPoint[], x: number): number {
  if (points.length === 0) return 0
  if (x < points[0].x || x > points[points.length - 1].x) return 0

  // Find first index where points[i].x >= x
  const i = points.findIndex(p => p.x >= x)
  if (i === 0) return points[0].density
  const lo = points[i - 1]
  const hi = points[i]
  if (hi.x === lo.x) return lo.density
  const t = (x - lo.x) / (hi.x - lo.x)
  return lo.density + t * (hi.density - lo.density)
}

// mergeKDEs: accepts an array of KDE arrays, returns merged points with
// densityN keys (density0, density1, ...) for each input curve.
// All unique x values from all curves are included, sorted ascending.
export function mergeKDEs(
  kdes: KDEPoint[][],
): Array<{ x: number } & Record<string, number>> {
  if (kdes.length === 0) return []

  const xSet = new Set<number>()
  for (const curve of kdes) {
    for (const pt of curve) xSet.add(pt.x)
  }

  const xValues = Array.from(xSet).sort((a, b) => a - b)

  return xValues.map(x => {
    const entry: { x: number } & Record<string, number> = { x }
    kdes.forEach((curve, idx) => {
      entry[`density${idx}`] = interpolate(curve, x)
    })
    return entry
  })
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours % 1) * 60)
  if (m === 0) return `${h}ч`
  return `${h}ч ${m.toString().padStart(2, '0')}м`
}

interface Props {
  scenarioA: SavedScenario
  scenarioB: SavedScenario
  onBack: () => void
}

export default function ComparisonScreen({ scenarioA, scenarioB, onBack }: Props) {
  const simA = useSimulation()
  const simB = useSimulation()

  // Trigger simA on mount (once)
  useEffect(() => {
    simA.run(scenarioA.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guard simB start: only after simA completes
  useEffect(() => {
    if (!simA.isRunning && simA.result && !simB.result && !simB.isRunning) {
      simB.run(scenarioB.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simA.isRunning, simA.result])

  const isLoading = simA.isRunning || simB.isRunning || !simA.result || !simB.result

  if (isLoading) {
    const currentName = simA.isRunning ? scenarioA.name : scenarioB.name
    const currentProgress = (simA.isRunning ? simA.progress : simB.progress) ?? 0
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">
          {simA.isRunning ? `Симуляция "${currentName}"...` : `Симуляция "${currentName}"...`}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-3 max-w-sm mx-auto">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>
    )
  }

  const rA = simA.result!
  const rB = simB.result!

  const chartData = mergeKDEs([
    rA.kyberbackup.kde,
    rA.competitor.kde,
    rB.kyberbackup.kde,
    rB.competitor.kde,
  ])

  const metrics = [
    {
      label: `Сценарий A: ${scenarioA.name}`,
      kyber: rA.kyberbackup,
      competitor: rA.competitor,
    },
    {
      label: `Сценарий B: ${scenarioB.name}`,
      kyber: rB.kyberbackup,
      competitor: rB.competitor,
    },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Сравнение: {scenarioA.name} vs {scenarioB.name}
      </h2>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v.toFixed(1)}ч`}
          />
          <YAxis tickFormatter={(v: number) => v.toFixed(3)} width={60} />
          <Tooltip
            labelFormatter={(label: unknown) => {
              const v = typeof label === 'number' ? label.toFixed(2) : String(label)
              return `Время: ${v}ч`
            }}
            formatter={(value: unknown, name: unknown) => {
              const v = typeof value === 'number' ? value.toFixed(4) : String(value)
              return [v, String(name)]
            }}
          />
          <Legend />
          <Line
            dataKey="density0"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name={`Кибербакап: ${scenarioA.name}`}
          />
          <Line
            dataKey="density1"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name={`Конкурент: ${scenarioA.name}`}
          />
          <Line
            dataKey="density2"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name={`Кибербакап: ${scenarioB.name}`}
          />
          <Line
            dataKey="density3"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name={`Конкурент: ${scenarioB.name}`}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-600 font-medium">Сценарий</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Кибербакап Лучший</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Кибербакап Медиана</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Кибербакап Худший</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Конкурент Лучший</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Конкурент Медиана</th>
              <th className="text-right py-2 px-3 text-gray-600 font-medium">Конкурент Худший</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="py-2 px-3 text-gray-700 font-medium">{row.label}</td>
                <td className="py-2 px-3 text-right text-green-600">{formatHours(row.kyber.p10)}</td>
                <td className="py-2 px-3 text-right text-blue-600">{formatHours(row.kyber.p50)}</td>
                <td className="py-2 px-3 text-right text-red-600">{formatHours(row.kyber.p90)}</td>
                <td className="py-2 px-3 text-right text-green-600">{formatHours(row.competitor.p10)}</td>
                <td className="py-2 px-3 text-right text-blue-600">{formatHours(row.competitor.p50)}</td>
                <td className="py-2 px-3 text-right text-red-600">{formatHours(row.competitor.p90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <button
          onClick={onBack}
          className="border border-gray-300 rounded-lg px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          ← Назад
        </button>
      </div>
    </div>
  )
}

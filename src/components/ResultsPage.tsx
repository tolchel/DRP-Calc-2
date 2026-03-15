import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { SimulationResult } from '../types/simulation'
import type { WizardFormData } from '../types/wizard'
import { ASSET_PRIORITY } from '../engine/constants'

interface Props {
  result: SimulationResult
  formData: WizardFormData
  onBack: () => void
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours % 1) * 60)
  if (m === 0) return `${h}ч`
  return `${h}ч ${m.toString().padStart(2, '0')}м`
}

const ASSET_LABELS: Record<string, string> = {
  db: 'Базы данных',
  server: 'Серверы',
  fs: 'Файловые хранилища',
  ws: 'Рабочие станции',
}

interface ScenarioPanelProps {
  title: string
  titleClass: string
  scenario: SimulationResult['kyberbackup']
  strokeColor: string
  fillColor: string
}

function ScenarioPanel({ title, titleClass, scenario, strokeColor, fillColor }: ScenarioPanelProps) {
  const metricCards = [
    {
      label: 'Лучший сценарий',
      value: scenario.min,
      colorText: 'text-green-600',
      colorBg: 'bg-green-50 border-green-100',
    },
    {
      label: 'Худший сценарий',
      value: scenario.max,
      colorText: 'text-red-600',
      colorBg: 'bg-red-50 border-red-100',
    },
    {
      label: 'Вероятность лучшего',
      sublabel: '10-й перцентиль',
      value: scenario.p10,
      colorText: 'text-blue-600',
      colorBg: 'bg-blue-50 border-blue-100',
    },
    {
      label: 'Среднее значение',
      sublabel: 'Медиана',
      value: scenario.p50,
      colorText: 'text-purple-600',
      colorBg: 'bg-purple-50 border-purple-100',
    },
  ]

  return (
    <div>
      <h2 className={`${titleClass} font-semibold text-lg mb-4`}>{title}</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.colorBg}`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            {card.sublabel && (
              <p className="text-xs text-gray-400 mb-1">{card.sublabel}</p>
            )}
            <p className={`text-2xl font-bold ${card.colorText}`}>{formatHours(card.value)}</p>
            <p className="text-sm text-gray-400">часов</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={scenario.kde} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v.toFixed(1)}ч`}
            label={{ value: 'Время восстановления (часы)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            dataKey="density"
            tickFormatter={(v: number) => v.toFixed(3)}
            label={{ value: 'Плотность вероятности', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#6b7280' }}
            width={60}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value.toFixed(4), name === 'density' ? 'Плотность' : name]}
            labelFormatter={(label: number) => `Время: ${label.toFixed(2)}ч`}
          />
          <Area
            type="monotone"
            dataKey="density"
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.3}
            strokeWidth={2}
            dot={false}
            name="Распределение вероятности"
          />
          <ReferenceLine
            x={scenario.min}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{ value: 'Лучший', position: 'insideTopRight', fill: '#22c55e', fontSize: 11 }}
          />
          <ReferenceLine
            x={scenario.max}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{ value: 'Худший', position: 'insideTopLeft', fill: '#ef4444', fontSize: 11 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ResultsPage({ result, formData, onBack }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <ScenarioPanel
          title="Кибербакап"
          titleClass="text-blue-700"
          scenario={result.kyberbackup}
          strokeColor="#2563eb"
          fillColor="#93c5fd"
        />
        <ScenarioPanel
          title="Конкурент"
          titleClass="text-purple-700"
          scenario={result.competitor}
          strokeColor="#7c3aed"
          fillColor="#c4b5fd"
        />
      </div>

      <h3 className="text-base font-semibold text-gray-800 mt-8 mb-3">
        Разбивка по типам активов
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Тип системы</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Количество</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Объём на актив (ГБ)</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Общий объём (ГБ)</th>
          </tr>
        </thead>
        <tbody>
          {ASSET_PRIORITY.map((key, i) => {
            const row = formData.assets[key]
            const total = row.count * row.avgSizeGB
            return (
              <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="py-2 px-3 text-gray-700">{ASSET_LABELS[key]}</td>
                <td className="py-2 px-3 text-right text-gray-700">{row.count}</td>
                <td className="py-2 px-3 text-right text-gray-700">{row.avgSizeGB.toFixed(1)}</td>
                <td className="py-2 px-3 text-right text-gray-700">{total.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-6">
        <button
          onClick={onBack}
          className="border border-gray-300 rounded-lg px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          ← Вернуться к настройкам
        </button>
      </div>
    </div>
  )
}

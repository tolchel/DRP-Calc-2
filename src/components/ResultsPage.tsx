import { useState } from 'react'
import { Save } from 'lucide-react'
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
import type { SimulationResult, AssetBreakdownItem } from '../types/simulation'

interface Props {
  result: SimulationResult
  onBack: () => void
  onSave: (name: string) => void
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
  breakdown: AssetBreakdownItem[]
  strokeColor: string
  fillColor: string
}

function ScenarioPanel({ title, titleClass, scenario, breakdown, strokeColor, fillColor }: ScenarioPanelProps) {
  const metricCards = [
    { label: 'Лучший сценарий',      value: scenario.min, colorText: 'text-green-600' },
    { label: 'Худший сценарий',       value: scenario.max, colorText: 'text-red-600'   },
    { label: 'Вероятность лучшего',   value: scenario.p10, colorText: 'text-blue-600'  },
    { label: 'Среднее значение',      value: scenario.p50, colorText: 'text-purple-600'},
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <h2 className={`${titleClass} font-semibold text-lg mb-4`}>{title}</h2>

      {/* Metric cards — white bg, only number is colored */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {metricCards.map((card) => (
          <div key={card.label} className="border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <p className={`text-2xl font-bold ${card.colorText}`}>{formatHours(card.value)}</p>
            <p className="text-xs text-gray-400 mt-1">часов</p>
          </div>
        ))}
      </div>

      {/* KDE chart */}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={scenario.kde} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
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
            formatter={(value: unknown) => {
              const v = typeof value === 'number' ? value.toFixed(4) : String(value)
              return [v, 'Плотность']
            }}
            labelFormatter={(label: unknown) => {
              const v = typeof label === 'number' ? label.toFixed(2) : String(label)
              return `Время: ${v}ч`
            }}
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

      {/* Legend */}
      <div className="flex gap-5 mt-2 mb-5 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" />Лучший сценарий</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500" />Худший сценарий</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm opacity-40" style={{ backgroundColor: fillColor }} />Распределение вероятности</span>
      </div>

      {/* Per-asset breakdown table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Тип системы</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Количество</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Общий объём (ГБ)</th>
            <th className="text-right py-2 px-3 text-gray-600 font-medium">Время восстановления (худший)</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((item, i) => (
            <tr key={item.type} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
              <td className="py-2 px-3 text-gray-700">{ASSET_LABELS[item.type]}</td>
              <td className="py-2 px-3 text-right text-gray-700">{item.count}</td>
              <td className="py-2 px-3 text-right text-gray-700">{item.totalGB.toFixed(1)}</td>
              <td className="py-2 px-3 text-right text-gray-700 font-medium">{formatHours(item.worstCaseHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ResultsPage({ result, onBack, onSave }: Props) {
  const [saveName, setSaveName] = useState('')

  return (
    <div>
      <ScenarioPanel
        title="Кибербакап"
        titleClass="text-blue-700"
        scenario={result.kyberbackup}
        breakdown={result.kyberbreakdown}
        strokeColor="#2563eb"
        fillColor="#93c5fd"
      />
      <ScenarioPanel
        title="Конкурент"
        titleClass="text-purple-700"
        scenario={result.competitor}
        breakdown={result.competitorbreakdown}
        strokeColor="#7c3aed"
        fillColor="#c4b5fd"
      />

      {/* Save widget */}
      <div className="mt-2 mb-4 flex items-center gap-2">
        <input
          type="text"
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          placeholder="Название сценария"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={60}
        />
        <button
          onClick={() => { onSave(saveName.trim()); setSaveName('') }}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Save size={15} />
          Сохранить
        </button>
      </div>

      <div className="mt-4 mb-8">
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

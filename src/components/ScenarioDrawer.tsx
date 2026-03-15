import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import type { SavedScenario } from '../types/scenario'

interface ScenarioDrawerProps {
  isOpen: boolean
  onClose: () => void
  scenarios: SavedScenario[]
  onLoad: (scenario: SavedScenario) => void
  onDelete: (id: string) => void
  onCompare: (a: SavedScenario, b: SavedScenario) => void
  showSaveWidget: boolean
  saveWidget?: React.ReactNode
}

export function ScenarioDrawer({
  isOpen,
  onClose,
  scenarios,
  onLoad,
  onDelete,
  onCompare,
  showSaveWidget,
  saveWidget,
}: ScenarioDrawerProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  function toggleChecked(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <span className="font-semibold text-gray-800">Сценарии</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Save widget slot */}
        {showSaveWidget && saveWidget}
        {showSaveWidget && <div className="border-b border-gray-100" />}

        {/* Scenario list */}
        <div className="p-4">
          {scenarios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Нет сохранённых сценариев
            </p>
          ) : (
            <ul className="space-y-2">
              {scenarios.map(scenario => (
                <li
                  key={scenario.id}
                  className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                >
                  {/* Comparison checkbox */}
                  <input
                    type="checkbox"
                    checked={checkedIds.has(scenario.id)}
                    onChange={() => toggleChecked(scenario.id)}
                    className="flex-shrink-0 accent-blue-600"
                    aria-label={`Выбрать ${scenario.name} для сравнения`}
                  />

                  {/* Name + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{scenario.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(scenario.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  {/* Actions */}
                  {pendingDelete === scenario.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-600">Удалить?</span>
                      <button
                        onClick={() => {
                          onDelete(scenario.id)
                          setPendingDelete(null)
                        }}
                        className="text-xs text-red-600 font-medium hover:underline"
                      >
                        Да
                      </button>
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="text-xs text-gray-500 font-medium hover:underline"
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onLoad(scenario)}
                        className="text-gray-500 hover:text-blue-600"
                        aria-label={`Загрузить сценарий ${scenario.name}`}
                      >
                        <ChevronRight size={18} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(scenario.id)}
                        className="text-gray-400 hover:text-red-600"
                        aria-label={`Удалить сценарий ${scenario.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Compare button — only when exactly 2 checked */}
        {checkedIds.size === 2 && (
          <div className="p-4 border-t">
            <button
              onClick={() => {
                const [a, b] = [...checkedIds].map(id => scenarios.find(s => s.id === id)!)
                onCompare(a, b)
              }}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
            >
              Сравнить выбранные (2)
            </button>
          </div>
        )}
      </div>
    </>
  )
}

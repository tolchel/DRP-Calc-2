import type { WizardFormData } from '../../types/wizard'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  assets: WizardFormData['assets']
  onChange: (assets: WizardFormData['assets']) => void
  onNext: () => void
}

// ── Asset configuration ────────────────────────────────────────────────────

const ASSET_KEYS = ['db', 'server', 'fs', 'ws'] as const
type AssetKey = typeof ASSET_KEYS[number]

const ASSET_LABELS: Record<AssetKey, string> = {
  db: 'Базы данных',
  server: 'Серверы',
  fs: 'Файловые хранилища',
  ws: 'Рабочие станции',
}

// ── Component ─────────────────────────────────────────────────────────────

export function Step1Assets({ assets, onChange, onNext }: Props) {
  // Compute per-card subtotals and grand total
  const subtotals: Record<AssetKey, number> = {
    db: assets.db.count * assets.db.avgSizeGB,
    server: assets.server.count * assets.server.avgSizeGB,
    fs: assets.fs.count * assets.fs.avgSizeGB,
    ws: assets.ws.count * assets.ws.avgSizeGB,
  }
  const totalGB = subtotals.db + subtotals.server + subtotals.fs + subtotals.ws
  const totalTB = totalGB / 1024

  function handleCountChange(key: AssetKey, value: string) {
    const parsed = parseInt(value, 10)
    const count = isNaN(parsed) || parsed < 0 ? 0 : parsed
    onChange({
      ...assets,
      [key]: { ...assets[key], count },
    })
  }

  function handleAvgSizeChange(key: AssetKey, value: string) {
    const parsed = parseFloat(value)
    const avgSizeGB = isNaN(parsed) || parsed < 0 ? 0 : parsed
    onChange({
      ...assets,
      [key]: { ...assets[key], avgSizeGB },
    })
  }

  const isNextDisabled = totalGB === 0

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">
        Шаг 1: Активы для восстановления
      </h2>

      {/* Asset cards */}
      <div className="flex flex-col gap-4">
        {ASSET_KEYS.map(key => {
          const row = assets[key]
          const subtotal = subtotals[key]

          return (
            <div
              key={key}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <p className="text-base font-medium text-gray-800 mb-4">
                {ASSET_LABELS[key]}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Count input */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Количество активов
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={row.count === 0 ? '' : row.count}
                    onChange={e => handleCountChange(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Average size input */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Средний объём на актив (ГБ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="0"
                    value={row.avgSizeGB === 0 ? '' : row.avgSizeGB}
                    onChange={e => handleAvgSizeChange(key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Per-card subtotal */}
              <p className="text-sm text-gray-500 mt-3">
                Общий объём: {subtotal.toFixed(1)} ГБ
              </p>
            </div>
          )
        })}
      </div>

      {/* Blue grand-total footer */}
      <div className="bg-blue-600 text-white rounded-xl p-4 mt-6 flex justify-between items-center">
        <span>Общий объём данных для восстановления:</span>
        <span className="font-bold">
          {totalGB.toFixed(2)} ГБ ({totalTB.toFixed(2)} ТБ)
        </span>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={isNextDisabled ? undefined : onNext}
        disabled={isNextDisabled}
        className={`w-full mt-4 py-3 rounded-lg font-medium transition-colors text-white ${
          isNextDisabled
            ? 'bg-blue-600 opacity-50 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }`}
      >
        Далее: Инфраструктура →
      </button>
    </div>
  )
}

export default Step1Assets

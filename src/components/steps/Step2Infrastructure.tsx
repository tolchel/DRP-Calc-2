import { X } from 'lucide-react'
import type { WizardFormData, LibraryConfig } from '../../types/wizard'

interface Props {
  form: Pick<
    WizardFormData,
    'assets' | 'libraries' | 'san' | 'engineerCount' | 'fastNetworkGbps' | 'lanGbps' | 'uncertaintyPct' | 'trials'
  >
  totalVolumeGB: number
  onChange: (patch: Partial<WizardFormData>) => void
  onBack: () => void
  onNext: () => void
}

export function Step2Infrastructure({ form, totalVolumeGB, onChange, onBack, onNext }: Props) {
  const libraryCount = form.libraries.length
  const perLibraryGB = libraryCount > 0 ? totalVolumeGB / libraryCount : 0

  // Validation
  const libraryErrors = form.libraries.map(lib => ({
    driveCount: lib.driveCount < 1,
  }))
  const trialsError = form.trials < 10_000 || form.trials > 200_000
  const hasErrors = libraryErrors.some(e => e.driveCount) || trialsError

  function updateLibrary(index: number, patch: Partial<LibraryConfig>) {
    const updated = form.libraries.map((lib, i) =>
      i === index ? { ...lib, ...patch } : lib,
    )
    onChange({ libraries: updated })
  }

  function deleteLibrary(id: string) {
    const filtered = form.libraries.filter(lib => lib.id !== id)
    onChange({ libraries: filtered })
  }

  function addLibrary() {
    const newLib: LibraryConfig = {
      id: `lib-${Date.now()}`,
      name: `Библиотека ${form.libraries.length + 1}`,
      driveCount: 1,
      driveThroughputMBs: 300,
    }
    onChange({ libraries: [...form.libraries, newLib] })
  }

  return (
    <div className="pb-8">
      {/* Summary info box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-600">
          Общий объём данных: {totalVolumeGB.toFixed(2)} ГБ
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Объём на библиотеку: {perLibraryGB.toFixed(2)} ГБ
        </p>
      </div>

      {/* Libraries section */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">Ленточные библиотеки</h2>

      {form.libraries.map((lib, index) => (
        <div key={lib.id} className="border border-gray-200 rounded-xl p-4 mb-3 relative">
          {/* Library header row */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={lib.name}
              onChange={e => updateLibrary(index, { name: e.target.value })}
              className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => deleteLibrary(lib.id)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                aria-label="Удалить библиотеку"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Library fields */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Количество драйвов
              </label>
              <input
                type="number"
                min={1}
                value={lib.driveCount}
                onChange={e => updateLibrary(index, { driveCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              {libraryErrors[index]?.driveCount && (
                <p className="text-red-500 text-sm mt-1">
                  Количество драйвов должно быть ≥ 1
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Пропускная способность драйва (МБ/с)
              </label>
              <input
                type="number"
                min={1}
                value={lib.driveThroughputMBs}
                onChange={e => updateLibrary(index, { driveThroughputMBs: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add library button */}
      <button
        type="button"
        onClick={addLibrary}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        + Добавить библиотеку
      </button>

      {/* SAN parameters */}
      <h2 className="text-base font-semibold text-gray-800 mt-6 mb-3">Параметры СХД</h2>
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Макс. скорость (ГБ/с)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={form.san.maxSpeedGBs}
              onChange={e => onChange({ san: { ...form.san, maxSpeedGBs: parseFloat(e.target.value) || 0 } })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Количество потоков</label>
            <input
              type="number"
              min={1}
              value={form.san.streamCount}
              onChange={e => onChange({ san: { ...form.san, streamCount: parseInt(e.target.value, 10) || 0 } })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Скорость потока (МБ/с)</label>
            <input
              type="number"
              min={1}
              value={form.san.streamSpeedMBs}
              onChange={e => onChange({ san: { ...form.san, streamSpeedMBs: parseFloat(e.target.value) || 0 } })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Additional parameters */}
      <h2 className="text-base font-semibold text-gray-800 mt-6 mb-3">Дополнительные параметры</h2>
      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        {/* Row 1: Engineer count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Количество IT-инженеров</label>
            <input
              type="number"
              min={1}
              value={form.engineerCount}
              onChange={e => onChange({ engineerCount: parseInt(e.target.value, 10) || 1 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 2: Network speeds */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Скоростная сеть (Гбит/с)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={form.fastNetworkGbps}
              onChange={e => onChange({ fastNetworkGbps: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">ЛВС (Гбит/с)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={form.lanGbps}
              onChange={e => onChange({ lanGbps: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 3: Uncertainty + Monte Carlo iterations */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Поправка на неопределённость (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.uncertaintyPct}
              onChange={e => onChange({ uncertaintyPct: parseInt(e.target.value, 10) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Итерации Monte Carlo
            </label>
            <input
              type="number"
              min={10_000}
              max={200_000}
              step={1000}
              value={form.trials}
              onChange={e => onChange({ trials: parseInt(e.target.value, 10) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            {trialsError && (
              <p className="text-red-500 text-sm mt-1">
                Введите значение от 10 000 до 200 000
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="border border-gray-300 rounded-lg px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={hasErrors}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 font-medium transition-colors ${
            hasErrors ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Далее: Результаты →
        </button>
      </div>
    </div>
  )
}

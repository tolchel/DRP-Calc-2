import { useState } from 'react'
import type { SimulationResult } from './types/simulation'
import { DEFAULT_WIZARD_DATA } from './types/wizard'
import type { WizardFormData } from './types/wizard'
import { useSimulation } from './hooks/useSimulation'
import ProgressBar from './components/ProgressBar'
import Step1Assets from './components/steps/Step1Assets'
import Step2Infrastructure from './components/steps/Step2Infrastructure'

function ResultsPlaceholder({ progress, result, isRunning, onBack }: {
  progress: number | null
  result: SimulationResult | null
  isRunning: boolean
  onBack: () => void
}) {
  return (
    <div className="text-center py-16">
      {isRunning && (
        <div>
          <p className="text-gray-600 mb-2">Выполняется симуляция...</p>
          <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">{progress ?? 0}%</p>
        </div>
      )}
      {!isRunning && !result && (
        <p className="text-gray-400">Симуляция не запущена</p>
      )}
      {result && !isRunning && (
        <p className="text-green-600 font-medium">
          Симуляция завершена. Результаты будут здесь.
        </p>
      )}
      <button
        onClick={onBack}
        className="mt-8 border border-gray-300 rounded-lg px-6 py-2 text-gray-700 hover:bg-gray-50"
      >
        ← Вернуться к настройкам
      </button>
    </div>
  )
}

export default function App() {
  const [formData, setFormData] = useState<WizardFormData>(DEFAULT_WIZARD_DATA)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const { run, progress, result, isRunning } = useSimulation()

  const totalVolumeGB = Object.values(formData.assets)
    .reduce((sum, row) => sum + row.count * row.avgSizeGB, 0)

  function handleAssetsChange(assets: WizardFormData['assets']) {
    setFormData(prev => ({ ...prev, assets }))
  }

  function handleInfraChange(patch: Partial<WizardFormData>) {
    setFormData(prev => ({ ...prev, ...patch }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProgressBar currentStep={currentStep} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <Step1Assets
            assets={formData.assets}
            onChange={handleAssetsChange}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Infrastructure
            form={formData}
            totalVolumeGB={totalVolumeGB}
            onChange={handleInfraChange}
            onBack={() => setCurrentStep(1)}
            onNext={() => { run(formData); setCurrentStep(3) }}
          />
        )}
        {currentStep === 3 && (
          <ResultsPlaceholder
            progress={progress}
            result={result}
            isRunning={isRunning}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </main>
    </div>
  )
}

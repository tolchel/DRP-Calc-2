import { useState } from 'react'
import { DEFAULT_WIZARD_DATA } from './types/wizard'
import type { WizardFormData } from './types/wizard'
import { useSimulation } from './hooks/useSimulation'
import ProgressBar from './components/ProgressBar'
import Step1Assets from './components/steps/Step1Assets'
import { Step2Infrastructure } from './components/steps/Step2Infrastructure'
import ResultsPage from './components/ResultsPage'

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
          isRunning ? (
            <div className="text-center py-16">
              <p className="text-gray-600 mb-4 text-lg">Выполняется симуляция...</p>
              <div className="w-full bg-gray-200 rounded-full h-3 max-w-sm mx-auto">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-3">{progress ?? 0}%</p>
            </div>
          ) : result ? (
            <ResultsPage
              result={result}
              formData={formData}
              onBack={() => setCurrentStep(2)}
            />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p>Симуляция не запущена</p>
              <button
                onClick={() => setCurrentStep(2)}
                className="mt-4 border border-gray-300 rounded-lg px-6 py-2 text-gray-700 hover:bg-gray-50"
              >
                ← Назад
              </button>
            </div>
          )
        )}
      </main>
    </div>
  )
}

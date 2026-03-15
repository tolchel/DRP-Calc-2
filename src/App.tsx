import { useState } from 'react'
import { PanelRight } from 'lucide-react'
import { DEFAULT_WIZARD_DATA } from './types/wizard'
import type { WizardFormData } from './types/wizard'
import type { SavedScenario } from './types/scenario'
import { useSimulation } from './hooks/useSimulation'
import { useScenarios } from './hooks/useScenarios'
import ProgressBar from './components/ProgressBar'
import Step1Assets from './components/steps/Step1Assets'
import { Step2Infrastructure } from './components/steps/Step2Infrastructure'
import ResultsPage from './components/ResultsPage'
import { ScenarioDrawer } from './components/ScenarioDrawer'
import ComparisonScreen from './components/ComparisonScreen'

export default function App() {
  const [formData, setFormData] = useState<WizardFormData>(DEFAULT_WIZARD_DATA)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [comparisonScenarios, setComparisonScenarios] = useState<[SavedScenario, SavedScenario] | null>(null)
  const { run, progress, result, isRunning } = useSimulation()
  const { scenarios, save: saveScenario, remove: removeScenario } = useScenarios()

  const totalVolumeGB = Object.values(formData.assets)
    .reduce((sum, row) => sum + row.count * row.avgSizeGB, 0)

  function handleAssetsChange(assets: WizardFormData['assets']) {
    setFormData(prev => ({ ...prev, assets }))
  }

  function handleInfraChange(patch: Partial<WizardFormData>) {
    setFormData(prev => ({ ...prev, ...patch }))
  }

  function handleLoadScenario(scenario: SavedScenario) {
    setFormData(scenario.data)
    setDrawerOpen(false)
    run(scenario.data)
    setCurrentStep(3)
  }

  function handleCompare(a: SavedScenario, b: SavedScenario) {
    setComparisonScenarios([a, b])
    setDrawerOpen(false)
    setCurrentStep(4)
  }

  // ProgressBar only accepts 1|2|3; step 4 (comparison) shows all steps complete
  const progressStep: 1 | 2 | 3 = currentStep === 4 ? 3 : currentStep

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h1 className="text-base font-semibold text-gray-800">Калькулятор восстановления</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          <PanelRight size={16} />
          Сценарии
        </button>
      </header>

      <ProgressBar currentStep={progressStep} />

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
              onBack={() => setCurrentStep(2)}
              onSave={(name) => saveScenario(name, formData)}
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
        {currentStep === 4 && comparisonScenarios && (
          <ComparisonScreen
            scenarioA={comparisonScenarios[0]}
            scenarioB={comparisonScenarios[1]}
            onBack={() => { setCurrentStep(result ? 3 : 1); setComparisonScenarios(null) }}
          />
        )}
      </main>

      <ScenarioDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        scenarios={scenarios}
        onLoad={handleLoadScenario}
        onDelete={removeScenario}
        onCompare={handleCompare}
        showSaveWidget={currentStep === 3 && result !== null}
        saveWidget={undefined}
      />
    </div>
  )
}

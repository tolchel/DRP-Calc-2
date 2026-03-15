import { Check } from 'lucide-react'

interface Props {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { number: 1, label: 'Активы' },
  { number: 2, label: 'Инфраструктура' },
  { number: 3, label: 'Результаты' },
]

export default function ProgressBar({ currentStep }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((step, index) => {
            const isCompleted = step.number < currentStep
            const isActive = step.number === currentStep
            const isPending = step.number > currentStep
            const isLast = index === STEPS.length - 1

            return (
              <div key={step.number} className="flex items-center">
                {/* Step item: circle + label stacked */}
                <div className="flex flex-col items-center">
                  {/* Step circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCompleted
                        ? 'bg-blue-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : (
                      step.number
                    )}
                  </div>
                  {/* Step label */}
                  <span
                    className={`text-xs mt-1 text-center ${
                      isActive
                        ? 'text-blue-600 font-medium'
                        : isCompleted
                        ? 'text-blue-400'
                        : isPending
                        ? 'text-gray-400'
                        : ''
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector line (not after last step) */}
                {!isLast && (
                  <div
                    className={`flex-1 h-px mx-2 w-16 ${
                      isCompleted ? 'bg-blue-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

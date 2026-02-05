import { Spinner } from './Spinner.tsx'

interface Step {
  key: string
  label: string
}

interface StatusIndicatorProps {
  steps: Step[]
  currentStep: string
  error: string | null
}

export function StatusIndicator({
  steps,
  currentStep,
  error,
}: StatusIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)
  const isDone = currentStep === 'done'
  const isError = currentStep === 'error'

  return (
    <div className="space-y-1.5 mt-4">

      {/* Step list */}
      {steps.map((step, i) => {
        let status: 'done' | 'active' | 'pending'
        if (isDone || i < currentIndex) {
          status = 'done'
        } else if (i === currentIndex && !isError) {
          status = 'active'
        } else {
          status = 'pending'
        }

        return (
          <div key={step.key} className="flex items-center gap-2.5 text-sm py-0.5">
            {status === 'done' && (
              <span className="text-cyan-400 w-5 text-center text-xs">&#10003;</span>
            )}
            {status === 'active' && (
              <span className="w-5 flex justify-center">
                <Spinner size="sm" />
              </span>
            )}
            {status === 'pending' && (
              <span className="text-[var(--text-muted)] w-5 text-center text-[8px]">&#9679;</span>
            )}
            <span
              className={
                status === 'done'
                  ? 'text-[var(--text-tertiary)]'
                  : status === 'active'
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)]'
              }
            >
              {step.label}
            </span>
          </div>
        )
      })}

      {/* Error banner */}
      {isError && error && (
        <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm break-all">
          {error}
        </div>
      )}
    </div>
  )
}

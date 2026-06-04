"use client"

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { number: 1, label: "Información" },
  { number: 2, label: "Envío" },
  { number: 3, label: "Pago" },
]

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = step.number < currentStep
        const isActive = step.number === currentStep
        const isFuture = step.number > currentStep

        return (
          <div key={step.number} className="flex items-center">
            {/* Step */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-barlow transition-colors
                  ${isActive ? "bg-[#E31C23] text-white" : ""}
                  ${isCompleted ? "bg-[#1C1C1C] text-white" : ""}
                  ${isFuture ? "bg-[#E0E0E0] text-[#4A4A4A]" : ""}
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-1 text-xs font-montserrat whitespace-nowrap
                  ${isActive ? "text-[#1C1C1C] font-medium" : "text-[#4A4A4A]"}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {idx < STEPS.length - 1 && (
              <div
                className={`
                  h-px w-16 mx-2 mb-5 transition-colors
                  ${isCompleted ? "bg-[#1C1C1C]" : "bg-[#E0E0E0]"}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'

export default function ConfirmButton({ children, onConfirm, className = '', confirmText = 'Confirm?', doubleConfirm = false }) {
  const [step, setStep] = useState(0)

  const handle = () => {
    if (doubleConfirm) {
      if (step === 0) { setStep(1); return }
      if (step === 1) { setStep(2); return }
    } else {
      if (step === 0) { setStep(1); return }
    }
    onConfirm()
    setStep(0)
  }

  return (
    <button
      className={`${className} ${step > 0 ? 'ring-2 ring-red-500' : ''}`}
      onClick={handle}
      onBlur={() => setTimeout(() => setStep(0), 200)}
    >
      {step === 0 ? children : step === 1 && doubleConfirm ? 'Sure?' : confirmText}
    </button>
  )
}
